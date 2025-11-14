"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from "firebase/auth"
import { auth } from "@/lib/firebase-safe"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from 'lucide-react'
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const createServerSideRecords = async (user: any) => {
    try {
      console.log("[v0] Creating server-side records for user:", user.uid)

      const idToken = await user.getIdToken()
      console.log("[v0] Got ID token")

      console.log("[v0] Calling create-user API...")
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
      console.log("[v0] Create-user API response:", data)

      if (!response.ok) {
        console.error("[v0] Server-side record creation failed:", data)
        console.warn("[v0] Continuing despite error to ensure redirect happens")
      } else {
        console.log("[v0] Server-side records created successfully")
      }

      return data
    } catch (error) {
      console.error("[v0] Error creating server-side records:", error)
      console.warn("[v0] Continuing despite error to ensure redirect happens")
      return { success: false, error: error }
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
      console.log("[v0] Starting email signup...")
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log("[v0] Firebase user created successfully:", userCredential.user.uid)

      const idToken = await userCredential.user.getIdToken()
      const trialCheckResponse = await fetch("/api/user/trial-status", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      console.log("[v0] Trial check response status:", trialCheckResponse.status)

      let shouldRedirectToTrial = true
      if (trialCheckResponse.ok) {
        const trialData = await trialCheckResponse.json()
        console.log("[v0] Trial data received:", trialData)
        if (trialData.hasUsedFreeTrial || trialData.isOnTrial || trialData.hasActiveCreatorPro) {
          console.log("[v0] User not eligible for trial:", {
            hasUsedFreeTrial: trialData.hasUsedFreeTrial,
            isOnTrial: trialData.isOnTrial,
            hasActiveCreatorPro: trialData.hasActiveCreatorPro,
          })
          shouldRedirectToTrial = false
        } else {
          console.log("[v0] User IS eligible for trial")
        }
      } else {
        console.log("[v0] Trial check failed, response not ok")
      }

      createServerSideRecords(userCredential.user)

      console.log("[v0] Should redirect to trial?", shouldRedirectToTrial)
      if (shouldRedirectToTrial) {
        console.log("[v0] Redirecting to free trial page...")
        window.location.href = "/welcome/free-trial"
      } else {
        console.log("[v0] User already used trial or has Creator Pro, redirecting to dashboard...")
        window.location.href = "/dashboard"
      }
    } catch (error: any) {
      console.error("[v0] Email signup error:", error)
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.")
      } else {
        setError(error.message || "Failed to create account")
      }
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError("")
    setLoading(true)

    try {
      console.log("[v0] Starting Google signup...")
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)

      const additionalUserInfo = getAdditionalUserInfo(result)

      if (!additionalUserInfo?.isNewUser) {
        // This is an existing account trying to sign up
        console.log("[v0] Existing user tried to sign up, logging them out and redirecting")
        await auth.signOut()

        toast({
          title: "Account already exists",
          description: "You already have an account. Please sign in instead.",
          variant: "destructive",
        })

        router.push("/")
        return
      }

      console.log("[v0] Google signup successful - new user:", result.user.uid)

      const idToken = await result.user.getIdToken()
      const trialCheckResponse = await fetch("/api/user/trial-status", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      console.log("[v0] Google - Trial check response status:", trialCheckResponse.status)

      let shouldRedirectToTrial = true
      if (trialCheckResponse.ok) {
        const trialData = await trialCheckResponse.json()
        console.log("[v0] Google - Trial data received:", trialData)
        if (trialData.hasUsedFreeTrial || trialData.isOnTrial || trialData.hasActiveCreatorPro) {
          console.log("[v0] Google - User not eligible for trial:", {
            hasUsedFreeTrial: trialData.hasUsedFreeTrial,
            isOnTrial: trialData.isOnTrial,
            hasActiveCreatorPro: trialData.hasActiveCreatorPro,
          })
          shouldRedirectToTrial = false
        } else {
          console.log("[v0] Google - User IS eligible for trial")
        }
      } else {
        console.log("[v0] Google - Trial check failed, response not ok")
      }

      createServerSideRecords(result.user)

      console.log("[v0] Google - Should redirect to trial?", shouldRedirectToTrial)
      if (shouldRedirectToTrial) {
        console.log("[v0] Redirecting to free trial page...")
        window.location.href = "/welcome/free-trial"
      } else {
        console.log("[v0] User already used trial or has Creator Pro, redirecting to dashboard...")
        window.location.href = "/dashboard"
      }
    } catch (error: any) {
      console.error("[v0] Google signup error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Signup cancelled")
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups and try again.")
      } else {
        setError(error.message || "Failed to sign up with Google")
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-white/[0.15] rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[600px] h-[600px] bg-white/[0.12] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.1] rounded-full blur-[100px]" />
      </div>

      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="inline-block cursor-pointer transition-transform hover:scale-105">
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
          </div>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid md:grid-cols-2 gap-0 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 md:p-12">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Create Account</h1>
                <p className="text-white/60">Sign up to start using Vex</p>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-800 bg-red-900/20 backdrop-blur-sm">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
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
                    <span>Continue with Google</span>
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/60">OR CONTINUE WITH EMAIL</span>
                </div>
              </div>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Username (optional)</label>
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white focus:ring-1 focus:ring-white"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Email</label>
                  <Input
                    type="email"
                    placeholder="vex@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white focus:ring-1 focus:ring-white"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white focus:ring-1 focus:ring-white"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white focus:ring-1 focus:ring-white"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-white text-black font-medium rounded-lg transition-all duration-200 hover:bg-gray-200"
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

              <div className="text-center pt-2">
                <span className="text-white/60">Already have an account? </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm text-white hover:text-gray-300 font-medium"
                  onClick={() => router.push("/login")}
                  disabled={loading}
                >
                  Sign in
                </Button>
              </div>

              <div className="text-center text-xs text-white/40 pt-2">
                By continuing, you agree to our{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-white/60 hover:text-white underline"
                  onClick={() => router.push("/terms")}
                  type="button"
                >
                  Terms of Service
                </Button>{" "}
                and{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-white/60 hover:text-white underline"
                  onClick={() => router.push("/privacy")}
                  type="button"
                >
                  Privacy Policy
                </Button>
                .
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute left-1/2 top-1/4 bottom-1/4 w-px bg-white/10" />

          <div className="hidden md:flex items-center justify-center p-12 relative overflow-hidden">
            <div className="relative z-10 text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                  Stop
                  <br />
                  Consuming
                </h2>
              </div>
              <div className="h-px w-24 bg-white/40 mx-auto" />
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                  Start
                  <br />
                  Producing
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden text-center mt-6">
          <p className="text-white/60 text-lg font-medium">Stop Consuming, Start Producing</p>
        </div>
      </div>
    </div>
  )
}
