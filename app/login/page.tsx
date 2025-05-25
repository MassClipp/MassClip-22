"use client"

import type React from "react"
import { useState, useEffect } from "react"
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

  // Add diagnostic info
  const addDiagnostic = (info: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDiagnosticInfo((prev) => [...prev, `[${timestamp}] ${info}`])
  }

  // Check router functionality
  useEffect(() => {
    log("Router initialized", { pathname: window.location.pathname })
    addDiagnostic(`Router ready at ${window.location.pathname}`)
  }, [])

  // Set up auth state listener with detailed logging
  useEffect(() => {
    log("Setting up auth state listener")
    addDiagnostic("Setting up auth state listener")

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      log("Auth state changed", {
        user: user ? { email: user.email, uid: user.uid } : null,
        currentPath: window.location.pathname,
      })

      if (user) {
        addDiagnostic(`User detected: ${user.email}`)
        addDiagnostic(`Current path: ${window.location.pathname}`)
        addDiagnostic("Attempting redirect to /dashboard...")

        // Try multiple redirect methods
        try {
          log("Attempting router.push")
          router.push("/dashboard")
          addDiagnostic("router.push('/dashboard') called")

          // Fallback redirect after delay
          setTimeout(() => {
            if (window.location.pathname !== "/dashboard") {
              log("Router.push failed, trying window.location")
              addDiagnostic("Router.push failed, trying window.location")
              window.location.href = "/dashboard"
            }
          }, 1000)
        } catch (error) {
          log("Redirect error", error)
          addDiagnostic(`Redirect error: ${error}`)
        }
      } else {
        addDiagnostic("No user detected")
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
      router.push("/dashboard")
      addDiagnostic("router.push called")
      setTimeout(() => {
        addDiagnostic(`Current path after redirect: ${window.location.pathname}`)
      }, 500)
    } catch (error) {
      addDiagnostic(`Manual redirect error: ${error}`)
    }
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
        <Button onClick={testRedirect} className="mt-2 text-xs" size="sm" variant="outline">
          Test Manual Redirect
        </Button>
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
