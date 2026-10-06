package expo.modules.batisave

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PersistableBundle
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Android's own "Save as", for a backup the hero wants somewhere of their choosing.
 *
 * expo-file-system can pick a file and a folder and cannot create a document, which is the one
 * thing "save a copy where I say" needs: with `ACTION_CREATE_DOCUMENT` the hero names the file,
 * picks Drive, Downloads or a USB stick in the system's own screen, and the app is never told
 * more than that one document. Two calls, so the picker comes first and the (possibly large,
 * possibly plaintext) snapshot is only made for a hero who did not back out of it.
 */
class BatiSaveModule : Module() {
  private lateinit var launcher: AppContextActivityResultLauncher<String, String?>

  override fun definition() =
    ModuleDefinition {
      Name("BatiSave")

      RegisterActivityContracts {
        launcher = registerForActivityResult(CreateDocumentContract())
      }

      /**
       * The URI of the document the hero created, or null when they backed out. Throws
       * `NO_FILE_PICKER` on a device with no app that can answer (some Android Go and TV builds),
       * and the caller falls back to the share sheet.
       */
      AsyncFunction("pickTarget") Coroutine { suggestedName: String ->
        try {
          launcher.launch(suggestedName)
        } catch (error: ActivityNotFoundException) {
          throw NoFilePickerException()
        }
      }

      /**
       * Writes `sourcePath` into the document at `uri`, truncating what is there ("wt": the plain
       * "w" mode of some providers leaves the tail of a longer old file), then reads back what the
       * provider says it holds. A size that is not the size written is a failed save, not a
       * saved one: a provider that cut the stream short must not be thanked in a toast.
       */
      AsyncFunction("discard") Coroutine { uri: String ->
        withContext(Dispatchers.IO) {
          val resolver = appContext.reactContext?.contentResolver ?: throw Exceptions.ReactContextLost()
          // Best effort: some providers refuse a delete, and the failure that matters is the caller's.
          runCatching { DocumentsContract.deleteDocument(resolver, Uri.parse(uri)) }
          Unit
        }
      }

      /**
       * Puts text on the clipboard marked sensitive (Android 13+: `EXTRA_IS_SENSITIVE`), so the system's
       * clipboard preview and keyboards that honour the flag do not show it. The twelve words of a
       * backup are what goes through here. Older Android has no such flag and gets a plain copy.
       */
      AsyncFunction("copySensitive") { text: String ->
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("", text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          clip.description.extras = PersistableBundle().apply { putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true) }
        }
        clipboard.setPrimaryClip(clip)
      }

      AsyncFunction("writeTo") Coroutine { uri: String, sourcePath: String ->
        withContext(Dispatchers.IO) {
          val resolver = appContext.reactContext?.contentResolver ?: throw Exceptions.ReactContextLost()
          val target = Uri.parse(uri)
          try {
            var written = 0L
            resolver.openOutputStream(target, "wt")?.use { out ->
              File(sourcePath.removePrefix("file://")).inputStream().use { written = it.copyTo(out) }
            } ?: throw IllegalStateException("Could not open the destination")

            var name: String? = null
            var size: Long? = null
            val columns = arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)
            // The provider can answer 0 for a moment after the stream closes (seen on an emulator, one
            // save in four, a whole file behind it): ask again for up to two seconds before calling a
            // size wrong, because a wrong size deletes the document below.
            for (attempt in 0 until SIZE_ATTEMPTS) {
              if (attempt > 0) Thread.sleep(SIZE_WAIT_MS)
              resolver.query(target, columns, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                  name = cursor.getString(0)
                  size = if (cursor.isNull(1)) null else cursor.getLong(1)
                }
              }
              // Right, or not reported at all (some providers never do): nothing to wait for.
              if (size == null || size == written) break
            }
            // Only a size that is reported and still wrong fails.
            if (size != null && size != written) {
              throw IllegalStateException("The destination holds $size bytes, $written were written")
            }
            mapOf("name" to (name ?: target.lastPathSegment ?: ""), "bytes" to written.toDouble())
          } catch (error: Exception) {
            // The document exists before a byte is written: left behind, it is an empty file that
            // looks like a backup. Best effort, the failure that matters is the one rethrown.
            runCatching { DocumentsContract.deleteDocument(resolver, target) }
            throw error
          }
        }
      }
    }
}

private class CreateDocumentContract : AppContextActivityResultContract<String, String?> {
  override fun createIntent(
    context: Context,
    input: String,
  ): Intent =
    Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "application/octet-stream"
      putExtra(Intent.EXTRA_TITLE, input)
    }

  override fun parseResult(
    input: String,
    resultCode: Int,
    intent: Intent?,
  ): String? = if (resultCode == Activity.RESULT_OK) intent?.data?.toString() else null
}

private class NoFilePickerException : CodedException("NO_FILE_PICKER", "No app on this device can save a file", null)

private const val SIZE_ATTEMPTS = 10
private const val SIZE_WAIT_MS = 200L
