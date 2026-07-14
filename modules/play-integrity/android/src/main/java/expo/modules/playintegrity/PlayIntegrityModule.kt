package expo.modules.playintegrity

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener

class PlayIntegrityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PlayIntegrity")

    // getInstallReferrer() -> the raw referrer string set on the Play Store install
    // link (e.g. "ref=AB3D9K"), or null. JS parses the code out of it. Resolves once.
    AsyncFunction("getInstallReferrer") { promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) { promise.resolve(null); return@AsyncFunction }
      try {
        val client = InstallReferrerClient.newBuilder(context).build()
        var settled = false
        fun settle(value: String?) {
          if (settled) return
          settled = true
          promise.resolve(value)
          try { client.endConnection() } catch (_: Exception) {}
        }
        client.startConnection(object : InstallReferrerStateListener {
          override fun onInstallReferrerSetupFinished(responseCode: Int) {
            try {
              if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                settle(client.installReferrer.installReferrer)
              } else {
                settle(null)
              }
            } catch (e: Exception) { settle(null) }
          }
          override fun onInstallReferrerServiceDisconnected() { settle(null) }
        })
      } catch (e: Exception) { promise.resolve(null) }
    }

    // requestIntegrityToken(nonce, cloudProjectNumber) -> Google-signed token string.
    // The classic Play Integrity request binds the token to `nonce`; the backend
    // decodes it and checks the verdict + nonce. cloudProjectNumber may be 0 for
    // Play-distributed apps (the project is linked automatically in Play Console).
    AsyncFunction("requestIntegrityToken") { nonce: String, cloudProjectNumber: Double, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "Android context unavailable", null)
        return@AsyncFunction
      }
      try {
        val manager = IntegrityManagerFactory.create(context)
        val builder = IntegrityTokenRequest.builder().setNonce(nonce)
        if (cloudProjectNumber > 0) {
          builder.setCloudProjectNumber(cloudProjectNumber.toLong())
        }
        manager.requestIntegrityToken(builder.build())
          .addOnSuccessListener { response -> promise.resolve(response.token()) }
          .addOnFailureListener { e -> promise.reject("INTEGRITY_FAILED", e.message ?: "unknown", e) }
      } catch (e: Exception) {
        promise.reject("INTEGRITY_EXCEPTION", e.message ?: "unknown", e)
      }
    }
  }
}
