/**
 * Build-safe Firebase Admin helper.
 *
 * - Restores the original public API (initializeFirebaseAdmin, db, auth, FieldValue,
 *   withRetry, verifyIdToken, getAuthenticatedUser) so existing imports work.
 * - Never crashes the Next.js build if service-account env-vars are missing.
 * - Falls back to applicationDefault() or a harmless stub in that situation.
 * - Lazily initialises on first real server request (when env-vars are present).
 */

import { initializeApp, getApps, applicationDefault, cert, type App } from "firebase-admin/app"
import { getFirestore as _getFirestore, FieldValue as _FieldValue } from "firebase-admin/firestore"
import { getAuth as _getAuth, type DecodedIdToken } from "firebase-admin/auth"

/* -------------------------------------------------------------------------- */
/*                         Internal lazy-initialisation                       */
/* -------------------------------------------------------------------------- */

let adminApp: App | null = null
let firestoreInstance: ReturnType<typeof _getFirestore> | null = null
let authInstance: ReturnType<typeof _getAuth> | null = null
let initialised = false

/**
 * Attempt to initialise firebase-admin exactly once.
 * Falls back gracefully if credentials are missing during `next build`.
 */
export function initializeFirebaseAdmin(): App | null {
  if (initialised) return adminApp
  initialised = true

  try {
    if (!getApps().length) {
      const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

      if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        // Full service-account creds ➜ ideal path.
        initializeApp({
          credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        })
        console.log("✅ [firebase-admin] Initialised with service-account creds")
      } else {
        // Build or local env without secrets ➜ use ADC if it exists, else stub.
        initializeApp({
          credential: applicationDefault(),
        })
        console.log("⚠️  [firebase-admin] Falling back to applicationDefault() " + "(service-account env-vars missing)")
      }
    }

    adminApp = getApps()[0]!
  } catch (err) {
    // Even applicationDefault() failed – create a minimal stub so imports don’t
    // crash the build. Any real use at runtime will throw loudly.
    console.error("❌ [firebase-admin] Could not initialise – running in stub mode.", err)
    adminApp = null
  }

  return adminApp
}

/* -------------------------------------------------------------------------- */
/*                       Firestore / Auth singletons                          */
/* -------------------------------------------------------------------------- */

function ensureFirestore() {
  if (firestoreInstance) return firestoreInstance

  const app = initializeFirebaseAdmin()
  if (app) {
    firestoreInstance = _getFirestore(app)
    firestoreInstance.settings({ ignoreUndefinedProperties: true })
    return firestoreInstance
  }

  // Stub that throws on any property access – prevents silent failures.
  return (firestoreInstance = new Proxy(
    {},
    {
      get() {
        throw new Error("firebase-admin Firestore is unavailable – credentials missing in this environment.")
      },
    },
  ) as unknown as ReturnType<typeof _getFirestore>)
}

function ensureAuth() {
  if (authInstance) return authInstance

  const app = initializeFirebaseAdmin()
  if (app) {
    authInstance = _getAuth(app)
    return authInstance
  }

  return (authInstance = new Proxy(
    {},
    {
      get() {
        throw new Error("firebase-admin Auth is unavailable – credentials missing in this environment.")
      },
    },
  ) as unknown as ReturnType<typeof _getAuth>)
}

/* -------------------------------------------------------------------------- */
/*                            Public named exports                            */
/* -------------------------------------------------------------------------- */

// Restored constants (still lazy – only throw when actually used)
export const db = ensureFirestore()
export const auth = ensureAuth()
export const FieldValue = _FieldValue

/**
 * Generic retry helper (unchanged from original file).
 */
export async function withRetry<T>(op: () => Promise<T>, maxRetries = 3, delay = 1_000): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await op()
    } catch (err) {
      lastError = err
      console.error(`❌ Firestore attempt ${attempt} failed`, err)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay))
        delay *= 2 // exponential back-off
      }
    }
  }
  throw lastError
}

/**
 * Verify a Firebase ID token.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return ensureAuth().verifyIdToken(idToken)
}

/**
 * Extract authenticated user info from request headers.
 */
export async function getAuthenticatedUser(headers: Headers): Promise<{
  uid: string
  email?: string
}> {
  const authHeader = headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token")
  }
  const token = authHeader.slice(7)
  const decoded = await verifyIdToken(token)
  return { uid: decoded.uid, email: decoded.email }
}
