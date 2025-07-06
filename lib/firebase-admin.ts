// lib/firebase-admin.ts
//
// A build-safe Firebase Admin helper.
// -------------------------------------------------
import type * as admin from "firebase-admin"

// We soft-require firebase-admin so the file is tree-shakable during
// static analysis (and so jest / build pipelines without the module
// don’t explode).
let _admin: typeof import("firebase-admin") | null = null
let _initialised = false

function loadAdmin(): typeof admin {
  if (_admin) return _admin

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _admin = require("firebase-admin") as typeof admin
  return _admin
}

function init(): void {
  if (_initialised) return
  const admin = loadAdmin()

  if (admin.apps.length) {
    _initialised = true
    return
  }

  try {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      // Full service-account credentials present ➜ use them.
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          // Replace literal \n with real new-lines – common on Vercel.
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      })
      console.log("✅ [firebase-admin] Initialised with service-account credentials")
    } else {
      // No explicit credentials ➜ fall back to ADC or stub.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      })
      console.log(
        "⚠️  [firebase-admin] Falling back to applicationDefault() " + "(credentials not provided at build time)",
      )
    }
  } catch (err) {
    console.error("❌ [firebase-admin] Failed to initialise – running in stub mode.", err)
    // Create a tiny stub so imports don’t crash during static builds.
    // Any attempt to use Firestore/Auth in this mode will throw clearly.
    const stub = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "firebase-admin is not initialised – service-account variables " + "are missing in this environment.",
          )
        },
      },
    )
    // @ts-expect-error – we purposely lie about the shape.
    _admin = {
      firestore: () => stub,
      auth: () => stub,
    }
  }

  _initialised = true
}

// Public helpers -------------------------------------------------------------
export function getFirestore() {
  init()
  return loadAdmin().firestore()
}

export function getAuth() {
  init()
  return loadAdmin().auth()
}

// Backwards-compat named exports (so existing imports keep working)
export const db = getFirestore()
export const auth = getAuth()
