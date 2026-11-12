package expo.modules.batihealth

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * What Health Connect opens when the hero asks why Bati wants the permission: Bati's own privacy
 * screen, through the app's `bati://` link. Nothing to draw here, so it hands over and goes.
 */
class HealthRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val privacy =
      Intent(Intent.ACTION_VIEW, Uri.parse("bati://privacy"))
        .setPackage(packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    startActivity(privacy)
    finish()
  }
}
