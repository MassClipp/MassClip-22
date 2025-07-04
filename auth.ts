// --- NextAuth ---
// You can add or change providers here as needed.
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"
import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Initialize Firebase Auth
export const auth = getAuth(app)

// Initialize Firestore
export const db = getFirestore(app)

// Connect to emulators in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    try {
      // Connect to Auth emulator
      if (!auth.config.emulator) {
        connectAuthEmulator(auth, "http://localhost:9099")
      }

      // Connect to Firestore emulator
      if (!(db as any)._delegate._databaseId.database.includes("localhost")) {
        connectFirestoreEmulator(db, "localhost", 8080)
      }
    } catch (error) {
      console.log("Emulators already connected or not available")
    }
  }
}

// ---------------------------------------------------------------------------
// NextAuth configuration
// This object is re-used by the [...nextauth] route and anywhere else that
// needs `authOptions`.
export const authOptions: NextAuthOptions = {
  // Add additional providers as needed.
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  // Use JWT sessions (stateless, works great with the App Router).
  session: {
    strategy: "jwt",
  },

  // Example callbacks – extend/modify to fit your needs.
  callbacks: {
    async session({ session, token }) {
      // Expose the user id on the client if required
      if (token.sub) {
        //@ts-ignore
        session.user.id = token.sub
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
// ---------------------------------------------------------------------------

export default app
