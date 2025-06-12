import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

// Export the auth options that can be imported elsewhere
export const authOptions = {
  // Your auth configuration
  providers: [],
  // Other options
}

// Simple handler for NextAuth routes
export async function GET(request: Request) {
  return new Response(JSON.stringify({ status: "Auth service running" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(request: Request) {
  return new Response(JSON.stringify({ status: "Auth endpoint ready" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
