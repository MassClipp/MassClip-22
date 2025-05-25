"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/logo"
import { Loader2, ArrowRight } from "lucide-react"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { loginWithGoogle, loginWithGoogleRedirect } from "@/lib/auth"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

// Diagnostic logging function
const log = (step: string, data?: any) => {
  const timestamp = new Date().toISOString()
  console.log(`[LOGIN DIAGNOSTIC ${timestamp}] ${step}`, data || "")
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [diagnosticInfo, setDiagnosticInfo] = useState<string[]>([])
  const { signIn } = useFirebaseAuth()
  const router = useRouter()

  // Use useRef instead of let for redirectAttempted to persist across renders
  const redirectAttempted = useRef(false)

  // Add diagnostic info
  const addDiagnostic = (info: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDiagnosticInfo((prev) => [...prev, `[${timestamp}] ${info}`])
    // Also log to console for easier debugging
    log(info)
  }

  // Check router functionality
  useEffect(() => {
    log("Router initialized", { pathname: window.location.pathname })
    addDiagnostic(`Router ready at ${window.location.pathname}`)

    // Check if user is already logged in on initial load
    if (auth.currentUser) {
      addDiagnostic(`User already logged in on page load: ${auth.currentUser.email}`)
      log("User already logged in on page load", {
        email: auth.currentUser.email,
        uid: auth.currentUser.uid,
      })
    }
  }, [])

  // Set up auth state listener with detailed logging
  useEffect(() => {
    log("Setting up auth state listener")
    addDiagnostic("Setting up auth state listener")

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Log every auth state change with detailed info
      log("Auth state changed", {
        user: user ? { email: user.email, uid: user.uid } : null,
        currentPath: window.location.pathname,
        redirectAttempted: redirectAttempted.current,
      })

      addDiagnostic(`Auth state changed: user ${user ? "present" : "absent"}, path: ${window.location.pathname}`)

      if (user) {
        addDiagnostic(`User detected: ${user.email}`)

        // Only redirect if we're actually on the login page and haven't attempted redirect yet
        if (window.location.pathname === "/login" && !redirectAttempted.current) {
          addDiagnostic("On login page with authenticated user - attempting redirect...")
          redirectAttempted.current = true

          try {
            log("Attempting router.push to /dashboard")

            // Verify router.push is actually being hit
            addDiagnostic("Executing router.push('/dashboard')")

            // Use a promise to track router.push completion
            Promise.resolve(router.push("/dashboard"))
              .then(() => {
                addDiagnostic("router.push('/dashboard') completed")

                // Check if we're still on the login page after router.push
                setTimeout(() => {
                  addDiagnostic(`Path after router.push: ${window.location.pathname}`)
                  if (window.location.pathname === "/login") {
                    addDiagnostic("Still on login page after router.push, trying window.location")
                    window.location.href = "/dashboard"
                  }
                }, 500)
              })
              .catch((error) => {
                addDiagnostic(`router.push error: ${error}`)
                // Fallback to window.location if router.push fails
                addDiagnostic("Falling back to window.location.href")
                window.location.href = "/dashboard"
              })
          } catch (error) {
            log("Redirect error", error)
            addDiagnostic(`Redirect error: ${error}`)
            // Fallback to window.location if router.push throws
            window.location.href = "/dashboard"
          }
        } else if (redirectAttempted.current) {
          addDiagnostic("Redirect already attempted, not redirecting again")
        } else {
          addDiagnostic("Not on login page, skipping redirect")
        }
      } else {
        addDiagnostic("No user detected")
        // Reset the redirect flag when user is null
        redirectAttempted.current = false
      }

      setAuthInitialized(true)
    })

    return () => {
      log("Cleaning up auth listener")
      unsubscribe()
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)
    addDiagnostic("Starting email/password login...")

    try {
      log("Attempting email/password sign in", { email })
      const result = await signIn(email, password)
      log("Sign in result", result)

      if (result.success) {
        addDiagnostic("Sign in successful, waiting for auth state change...")

        // Verify user is actually logged in
        if (auth.currentUser) {
          addDiagnostic(`User confirmed in auth.currentUser: ${auth.currentUser.email}`)
        } else {
          addDiagnostic("Warning: auth.currentUser is null after successful login")
        }

        // Don't redirect here - let auth state listener handle it
      } else {
        addDiagnostic(`Sign in failed: ${result.error}`)
        setErrorMessage(result.error || "Failed to sign in")
      }
    } catch (error) {
      log("Sign in error", error)
      addDiagnostic(`Sign in error: ${error}`)
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setIsGoogleLoading(true)
    addDiagnostic("Starting Google sign in...")

    try {
      log("Attempting Google sign in")
      const result = await loginWithGoogle()
      log("Google sign in result", result)

      if (result.success) {
        addDiagnostic("Google sign in successful, waiting for auth state change...")

        // Verify user is actually logged in
        if (auth.currentUser) {
          addDiagnostic(`User confirmed in auth.currentUser after Google login: ${auth.currentUser.email}`)
          log("User confirmed in auth.currentUser", {
            email: auth.currentUser.email,
            uid: auth.currentUser.uid,
          })
        } else {
          addDiagnostic("Warning: auth.currentUser is null after successful Google login")
        }

        // Don't redirect here - let auth state listener handle it
      } else {
        if (result.error?.code === "auth/popup-closed-by-user") {
          addDiagnostic("Popup closed by user")
          setErrorMessage("Sign-in popup was closed. Please try again.")
        } else if (result.error?.code === "auth/popup-blocked") {
          addDiagnostic("Popup blocked, trying redirect method")
          await loginWithGoogleRedirect()
        } else {
          addDiagnostic(`Google sign in failed: ${result.error?.message}`)
          setErrorMessage("Failed to sign in with Google. Please try again.")
        }
      }
    } catch (error) {
      log("Google sign in error", error)
      addDiagnostic(`Google sign in error: ${error}`)
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Manual redirect test button
  const testRedirect = () => {
    addDiagnostic("Testing manual redirect...")
    try {
      addDiagnostic("Executing router.push('/dashboard')")
      router.push("/dashboard")

      // Check if redirect worked after a short delay
      setTimeout(() => {
        addDiagnostic(`Current path after redirect attempt: ${window.location.pathname}`)
        if (window.location.pathname === "/login") {
          addDiagnostic("Still on login page, trying window.location.href")
          window.location.href = "/dashboard"
        }
      }, 500)
    } catch (error) {
      addDiagnostic(`Manual redirect error: ${error}`)
      // Fallback
      window.location.href = "/dashboard"
    }
  }

  // Force redirect to dashboard if user is already logged in
  const forceRedirect = () => {
    addDiagnostic("Forcing redirect to dashboard...")
    window.location.href = "/dashboard"
  }

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center">
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <p className="text-white mt-4">Initializing authentication...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
      {/* Diagnostic Panel */}
      <div className="fixed top-0 right-0 w-96 max-h-96 overflow-y-auto bg-black/90 border border-red-500 p-4 m-4 rounded-lg z-50">
        <h3 className="text-red-500 font-bold mb-2">Login Diagnostics</h3>
        <div className="text-xs text-gray-300 space-y-1">
          {diagnosticInfo.map((info, index) => (
            <div key={index}>{info}</div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Button onClick={testRedirect} className="text-xs" size="sm" variant="outline">
            Test Manual Redirect
          </Button>
          <Button onClick={forceRedirect} className="text-xs" size="sm" variant="destructive">
            Force Redirect
          </Button>
        </div>
      </div>

      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <Logo href="/" size="md" linkClassName="absolute top-8 left-8 z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-8 bg-black/60 backdrop-blur-sm rounded-xl border border-gray-800 shadow-2xl relative z-10"
      >
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-bold text-white"
          >
            Welcome back
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-400 mt-2"
          >
            Log in to access your clip vault
          </motion.p>
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="bg-red-900/20 border-red-900/30 text-red-400">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <GoogleAuthButton onClick={handleGoogleSignIn} isLoading={isGoogleLoading} text="Continue with Google" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative px-4 bg-black text-xs text-gray-500">or continue with email</div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Link href="/forgot-password" className="text-sm text-red-500 hover:text-red-400 transition-colors">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white transition-all duration-300 flex items-center justify-center gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Log in
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center text-sm text-gray-400"
        >
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-red-500 hover:text-red-400 transition-colors">
            Sign up
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
