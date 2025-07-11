"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Chrome } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signInWithEmailAndPassword(auth, email, password)

      // Check if this is a purchase flow redirect
      if (redirect.includes("purchase-success")) {
        router.push(redirect)
      } else {
        router.push(redirect)
      }
    } catch (error: any) {
      console.error("Login error:", error)
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email address")
          break
        case "auth/wrong-password":
          setError("Incorrect password")
          break
        case "auth/invalid-email":
          setError("Invalid email address")
          break
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later")
          break
        default:
          setError("Failed to sign in. Please try again")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)
      console.log("Google sign-in successful:", result.user.email)

      // Check if this is a purchase flow redirect
      if (redirect.includes("purchase-success")) {
        router.push(redirect)
      } else {
        router.push(redirect)
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      switch (error.code) {
        case "auth/popup-blocked":
          setError("Popup was blocked. Please allow popups and try again")
          break
        case "auth/popup-closed-by-user":
          setError("Sign-in was cancelled")
          break
        case "auth/account-exists-with-different-credential":
          setError("An account already exists with this email using a different sign-in method")
          break
        case "auth/network-request-failed":
          setError("Network error. Please check your connection and try again")
          break
        default:
          setError("Failed to sign in with Google. Please try again")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleAppleLogin = () => {
    setError("Apple Sign-In is not yet implemented. Please use Google or email instead.")
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      {/* Enhanced Background Gradients */}
      <div className="absolute inset-0">
        {/* Base gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
        <div className="absolute inset-0 bg-gradient-to-tl from-white/3 via-transparent to-white/8" />

        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/4 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-8 z-10">
        <Link href="/" className="text-2xl font-bold text-red-500">
          MassClip
        </Link>
      </div>

      {/* Main Content */}
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
          <CardDescription className="text-gray-400">Sign in to your MassClip account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-white hover:bg-gray-100 text-black border-0 h-12 font-medium transition-all duration-200"
            >
              {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Continue with Google
            </Button>

            <Button
              onClick={handleAppleLogin}
              className="w-full bg-black hover:bg-gray-900 text-white border border-white/20 h-12 font-medium transition-all duration-200"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/40 px-2 text-gray-400 backdrop-blur-sm">or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm focus:bg-white/10 focus:border-white/20 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 backdrop-blur-sm focus:bg-white/10 focus:border-white/20 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12 font-medium transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Continue with email"
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Forgot your password?
            </Link>

            <div className="text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href={`/signup${redirect !== "/dashboard" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
                className="text-red-400 hover:text-red-300 transition-colors duration-200"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Terms */}
          <div className="text-xs text-gray-500 text-center">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-400 transition-colors duration-200">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-gray-400 transition-colors duration-200">
              Privacy Policy
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
