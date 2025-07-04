import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// ────────────────────────────────────────────────────────────
// NextAuth configuration (required as a named export)
// This minimal config keeps the build from failing. Update
// the callbacks/providers as your auth logic evolves.
// ────────────────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
}
