import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { initializeApp, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import type { NextRequest } from "next/server"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const adminDb = getFirestore()
const adminAuth = getAuth()

// Add the missing decodeToken function
export async function decodeToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Error decoding token:", error)
    throw new Error("Invalid token")
  }
}

// Helper function to extract token from request
export async function extractTokenFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // Also check for token in body for POST requests
  try {
    const body = await request.json()
    return body.buyerToken || body.idToken || null
  } catch {
    return null
  }
}

// Helper function to require authentication
export async function requireAuth(request: NextRequest) {
  const token = await extractTokenFromRequest(request)

  if (!token) {
    throw new Error("Authentication token required")
  }

  return await decodeToken(token)
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string
        session.user.id = token.uid as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Create or update user profile in Firestore
          const userRef = adminDb.collection("users").doc(user.id)
          const userDoc = await userRef.get()

          if (!userDoc.exists) {
            // Create new user profile
            await userRef.set({
              email: user.email,
              name: user.name,
              image: user.image,
              createdAt: new Date(),
              updatedAt: new Date(),
              plan: "free",
              downloadCount: 0,
              maxDownloads: 5,
            })
          } else {
            // Update existing user
            await userRef.update({
              name: user.name,
              image: user.image,
              updatedAt: new Date(),
            })
          }

          return true
        } catch (error) {
          console.error("Error creating/updating user:", error)
          return false
        }
      }
      return true
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
  },
}
