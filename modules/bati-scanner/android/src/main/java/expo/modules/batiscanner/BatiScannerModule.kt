package expo.modules.batiscanner

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BatiScannerModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name("BatiScanner")

      View(BatiScannerView::class) {
        Events("onScan", "onCameraError")
      }
    }
}
