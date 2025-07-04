// -----------------------------------------------------------------------------
// Firebase *client-side* initialisation (unchanged from original)
// -----------------------------------------------------------------------------
import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let clientApp
if (getApps().length === 0) {
  clientApp = initializeApp(firebaseConfig)
} else {
  clientApp = getApps()[0]
}

export const auth = getAuth(clientApp)
export const db = getFirestore(clientApp)

// Connect to local emulators in development (optional)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    try {
      if (!auth.config.emulator) {
        connectAuthEmulator(auth, "http://localhost:9099")
      }
      if (!(db as any)._delegate._databaseId.database.includes("localhost")) {
        connectFirestoreEmulator(db, "localhost", 8080)
      }
    } catch {
      /* ignore – emulator may already be connected */
    }
  }
}

// -----------------------------------------------------------------------------
// NextAuth configuration – exported as `authOptions`
// -----------------------------------------------------------------------------
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        // @ts-ignore – extend session type ad-hoc
        session.user.id = token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Re-export the Firebase app in case other modules import default
export default clientApp
