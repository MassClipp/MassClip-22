"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase-safe"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const createServerSideRecords = async (user: any) => {
    try {
      console.log("🔄 Creating server-side records for user:", user.uid)

      const idToken = await user.getIdToken()

      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          username: username || user.displayName,
          displayName: user.displayName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ Server-side record creation failed:", data)
        throw new Error(data.details || data.error || "Failed to create server-side records")
      }

      console.log("✅ Server-side records created successfully:", data)
      return data
    } catch (error) {
      console.error("❌ Error creating server-side records:", error)
      throw error
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      console.log("🔄 Creating user with email and password...")
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log("✅ Firebase user created successfully")

      // Create server-side records
      await createServerSideRecords(userCredential.user)

      console.log("✅ Signup completed successfully, redirecting...")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("❌ Email signup error:", error)
      setError(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError("")
    setLoading(true)

    try {
      console.log("🔄 Starting Google signup...")
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)
      console.log("✅ Google signup successful:", result.user.email)

      // Create server-side records
      await createServerSideRecords(result.user)

      console.log("✅ Google signup completed successfully, redirecting...")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("❌ Google signup error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Signup cancelled")
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups and try again.")
      } else {
        setError(error.message || "Failed to sign up with Google")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tl from-white/3 via-white/1 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/1 to-white/2" />
      <div className="absolute inset-0 bg-gradient-radial from-white/4 via-white/2 to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl opacity-20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Logo */}
        <div className="absolute top-6 left-6 z-20 hidden md:block">
          <Link href="/" className="inline-block cursor-pointer transition-transform hover:scale-105">
            <span className="text-2xl font-thin">
              <span className="text-white">Mass</span>
              <span className="bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
                Clip
              </span>
            </span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 pt-8 md:pt-8">
          <div className="w-full max-w-md space-y-6 md:space-y-8">
            {/* Header */}
            <div className="text-center space-y-3 md:space-y-4">
              <h1 className="text-3xl md:text-4xl font-thin bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
                Create Account
              </h1>
              <p className="text-gray-400 text-base md:text-lg">Sign up to start using MassClip</p>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="border-red-800 bg-red-900/20 backdrop-blur-sm">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* Google Sign Up */}
              <Button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full h-11 md:h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-black text-gray-400">OR CONTINUE WITH EMAIL</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSignup} className="space-y-3 md:space-y-4">
                {/* Username Field */}
                <div className="space-y-1 md:space-y-2">
                  <label className="text-sm font-medium text-gray-300">Username (optional)</label>
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 md:h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-gray-600 focus:ring-0 backdrop-blur-sm"
                    disabled={loading}
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-1 md:space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email</label>
                  <Input
                    type="email"
                    placeholder="massclip@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 md:h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-gray-600 focus:ring-0 backdrop-blur-sm"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-1 md:space-y-2">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 md:h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-gray-600 focus:ring-0 backdrop-blur-sm"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1 md:space-y-2">
                  <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 md:h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-gray-600 focus:ring-0 backdrop-blur-sm"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {/* Create Account Button with gradient */}
                <Button
                  type="submit"
                  className="w-full h-11 md:h-12 bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white text-black font-medium rounded-lg transition-all duration-200 hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <span className="text-gray-400">Already have an account? </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm bg-gradient-to-br from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent hover:opacity-80 font-medium"
                onClick={() => router.push("/login")}
                disabled={loading}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-6 md:pb-8 px-4 md:px-8">
          <div className="text-center text-sm text-gray-400">
            By continuing, you agree to our{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-gray-300 hover:text-white underline"
              onClick={() => router.push("/terms")}
              type="button"
            >
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-gray-300 hover:text-white underline"
              onClick={() => router.push("/privacy")}
              type="button"
            >
              Privacy Policy
            </Button>
            .
          </div>
        </div>
      </div>
    </div>
  )
}
