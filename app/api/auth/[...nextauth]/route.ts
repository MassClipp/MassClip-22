import { initializeApp, getApps, cert } from "firebase-admin/app"
import { type NextRequest, NextResponse } from "next/server"

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
  providers: [],
  pages: {
    signIn: "/login",
    signUp: "/signup",
  },
  callbacks: {
    async session({ session, token }: any) {
      return session
    },
    async jwt({ token, user }: any) {
      return token
    },
  },
}

// Handle all auth routes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = request.nextUrl.pathname

  // Handle different auth routes
  if (path.includes("session")) {
    return NextResponse.json({
      status: "Auth service running",
      path: path,
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json(
    {
      status: "Auth service running",
      availableRoutes: ["/session", "/signin", "/signout"],
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = request.nextUrl.pathname

  try {
    const body = await request.json().catch(() => ({}))

    return NextResponse.json(
      {
        status: "Auth endpoint ready",
        path: path,
        method: "POST",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  } catch (error) {
    console.error("Auth POST error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
