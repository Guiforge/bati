package expo.modules.batiscanner

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import zxingcpp.BarcodeReader
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * The camera while this view is on screen, and the text of each new QR code it sees. Binds on
 * attach and unbinds on detach, so the camera can only be on while the scanner is showing. The
 * caller holds the permission before mounting it.
 */
class BatiScannerView(
  context: Context,
  appContext: AppContext,
) : ExpoView(context, appContext) {
  // PreviewView adds and sizes its own children after mount, which RN's layout would never run.
  override val shouldUseAndroidLayout = true

  private val onScan by EventDispatcher<Map<String, String>>()
  private val onCameraError by EventDispatcher<Map<String, String>>()

  private val preview =
    PreviewView(context).also {
      // The default SurfaceView punches through RN's view tree and ignores its clipping.
      it.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
      addView(it, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }
  private val reader =
    BarcodeReader(BarcodeReader.Options(formats = setOf(BarcodeReader.Format.QR_CODE)))

  private var provider: ProcessCameraProvider? = null
  private var worker: ExecutorService? = null
  private var attached = false
  private var lastText: String? = null

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attached = true
    val owner = appContext.currentActivity as? LifecycleOwner
    if (owner == null) {
      onCameraError(mapOf("message" to "no activity"))
      return
    }
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener(
      {
        try {
          // The view may have left the screen while the provider was loading.
          if (attached) bind(future.get(), owner)
        } catch (e: Exception) {
          // No back camera, or another app holds it: the screen says so instead of staying black.
          onCameraError(mapOf("message" to (e.message ?: e.javaClass.name)))
        }
      },
      ContextCompat.getMainExecutor(context),
    )
  }

  override fun onDetachedFromWindow() {
    attached = false
    provider?.unbindAll()
    provider = null
    worker?.shutdown()
    worker = null
    super.onDetachedFromWindow()
  }

  private fun bind(
    camera: ProcessCameraProvider,
    owner: LifecycleOwner,
  ) {
    val thread = Executors.newSingleThreadExecutor()
    worker = thread
    provider = camera

    val shown = Preview.Builder().build().also { it.surfaceProvider = preview.surfaceProvider }
    val analysis =
      ImageAnalysis
        .Builder()
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
    analysis.setAnalyzer(thread) { image ->
      val text = image.use { reader.read(it).firstOrNull()?.text }
      // A held QR is seen thirty times a second and means one thing.
      if (!text.isNullOrEmpty() && text != lastText) {
        lastText = text
        post { onScan(mapOf("text" to text)) }
      }
    }

    camera.unbindAll()
    camera.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, shown, analysis)
  }
}
