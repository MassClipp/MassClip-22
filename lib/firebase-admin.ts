import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"

/* -------------------------------------------------------------------------- */
/*                           ONE-TIME INITIALISATION                          */
/* -------------------------------------------------------------------------- */

export function initializeFirebaseAdmin(): { app: App; db: Firestore; auth: Auth } {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error(
      "❌  Missing Firebase Admin ENV variables: " + "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    )
  }

  // Normalise private key (newline chars get escaped in Vercel env)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")

  const app =
    getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId: process.env.FIREBASE_PROJECT_ID,
        })
      : getApps()[0]

  const db = getFirestore(app)
  db.settings({ ignoreUndefinedProperties: true })
  const auth = getAuth(app)

  return { app, db, auth }
}

const { db, auth } = initializeFirebaseAdmin()

/* -------------------------------------------------------------------------- */
/*                               HELPER UTILITIES                             */
/* -------------------------------------------------------------------------- */

export async function withRetry<T>(op: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await op()
    } catch (err) {
      lastErr = err
      console.error(`Firestore attempt ${attempt}/${maxRetries} failed`, err)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay))
        delay *= 2
      }
    }
  }
  throw lastErr
}

export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return auth.verifyIdToken(idToken)
}

export async function getAuthenticatedUser(headers: Headers) {
  const authHeader = headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token")
  }
  const decoded = await verifyIdToken(authHeader.slice(7))
  return { uid: decoded.uid, email: decoded.email }
}

/* -------------------------------------------------------------------------- */
/*                        EXAMPLE PROFILE UPDATER (UNCHANGED)                 */
/* -------------------------------------------------------------------------- */

export async function createOrUpdateUserProfile(uid: string, data: Record<string, unknown>) {
  return withRetry(async () => {
    const ref = db.collection("users").doc(uid)
    const now = new Date()

    if ((await ref.get()).exists) {
      await ref.update({ ...data, updatedAt: now })
    } else {
      await ref.set({ ...data, createdAt: now, updatedAt: now })
    }
    return ref.id
  })
}

/* -------------------------------------------------------------------------- */
/*                             REQUIRED EXPORTS                               */
/* -------------------------------------------------------------------------- */

export { db, auth, FieldValue }
