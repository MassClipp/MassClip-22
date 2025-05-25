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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)
  const { signIn } = useFirebaseAuth()
  const router = useRouter()

  // Use ref to track redirect attempts
  const redirectAttemptedRef = useRef(false)

  // Set up auth state listener
  useEffect(() => {
    // Only run this once
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Set auth as initialized
      setAuthInitialized(true)

      if (user && !redirectAttemptedRef.current) {
        // Only redirect if we're on the login page and haven't tried yet
        if (window.location.pathname === "/login") {
          redirectAttemptedRef.current = true

          // Use window.location for reliable redirect
          window.location.href = "/dashboard"
        }
      } else if (!user) {
        // Reset the redirect flag when user is null
        redirectAttemptedRef.current = false
      }
    })

    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.success) {
        // Redirect will be handled by auth state listener
        // But add a fallback just in case
        setTimeout(() => {
          if (window.location.pathname === "/login" && auth.currentUser) {
            window.location.href = "/dashboard"
          }
        }, 1000)
      } else {
        setErrorMessage(result.error || "Failed to sign in")
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setIsGoogleLoading(true)

    try {
      const result = await loginWithGoogle()

      if (result.success) {
        // Redirect will be handled by auth state listener
        // But add a fallback just in case
        setTimeout(() => {
          if (window.location.pathname === "/login" && auth.currentUser) {
            window.location.href = "/dashboard"
          }
        }, 1000)
      } else {
        if (result.error?.code === "auth/popup-closed-by-user") {
          setErrorMessage("Sign-in popup was closed. Please try again.")
        } else if (result.error?.code === "auth/popup-blocked") {
          await loginWithGoogleRedirect()
        } else {
          setErrorMessage("Failed to sign in with Google. Please try again.")
        }
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsGoogleLoading(false)
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
