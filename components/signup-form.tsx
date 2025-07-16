"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { useFirebaseAuthStable } from "@/hooks/use-firebase-auth-stable"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2, Apple } from "lucide-react"
import Link from "next/link"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [isSignup, setIsSignup] = useState(true)
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuthStable()

  useEffect(() => {
    if (user && !authLoading) {
      router.push("/login-success")
    }
  }, [user, authLoading, router])

  const handleEmailContinue = () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }
    setShowPasswordFields(true)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      router.push("/login-success")
    } catch (error: any) {
      console.error("Auth error:", error)
      if (error.code === "auth/email-already-in-use") {
        setIsSignup(false)
        setError("Account exists. Please enter your password to sign in.")
      } else if (error.code === "auth/user-not-found") {
        setIsSignup(true)
        setError("No account found. Creating a new account...")
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.")
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address")
      } else {
        setError(error.message || "An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setShowPasswordFields(false)
    setPassword("")
    setConfirmPassword("")
    setError("")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-red-600" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-white">
            <span className="text-red-500">Mass</span>Clip
          </Link>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Start selling to your audience today</h1>
          <p className="text-gray-400 text-lg">Free plan available. No credit card required.</p>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-4">
          {!showPasswordFields ? (
            <>
              {/* Google Auth */}
              <GoogleAuthButton />

              {/* Apple Auth */}
              <Button
                variant="outline"
                className="w-full h-12 bg-black border-gray-700 text-white hover:bg-gray-900"
                disabled
              >
                <Apple className="mr-2 h-5 w-5" />
                Continue with Apple
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-gray-400">or continue with email</span>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  onKeyPress={(e) => e.key === "Enter" && handleEmailContinue()}
                />
                <Button
                  onClick={handleEmailContinue}
                  className="w-full h-12 bg-gray-600 hover:bg-gray-700 text-white"
                  disabled={!email}
                >
                  Continue with email
                </Button>
              </div>
            </>
          ) : (
            /* Password Fields */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  disabled
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                />
                {isSignup && (
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                )}
              </div>

              {error && <div className="text-red-400 text-sm text-center">{error}</div>}

              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 bg-black border-gray-700 text-white hover:bg-gray-900"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? "Create Account" : "Sign In"}
                </Button>
              </div>
            </form>
          )}

          {/* Terms and Conditions - Moved here */}
          <div className="text-center text-sm text-gray-500 mt-6">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-gray-400 hover:text-white underline">
              Terms of Service
            </Link>
            . Read our{" "}
            <Link href="/privacy" className="text-gray-400 hover:text-white underline">
              Privacy Policy
            </Link>
            .
          </div>

          {/* Sign In Link */}
          <div className="text-center text-gray-400 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-red-500 hover:text-red-400">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
