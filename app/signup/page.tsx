"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirebaseAuthSafe } from "@/hooks/use-firebase-auth-safe"
import { useAuthRedirect } from "@/hooks/use-auth-redirect"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/logo"
import { Loader2, ArrowRight, Check, X } from "lucide-react"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { doc, getDoc, getFirestore } from "firebase/firestore"
import { initializeFirebaseApp } from "@/lib/firebase"
import { FirebaseConfigBanner } from "@/components/firebase-config-banner"

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [authCheckLoading, setAuthCheckLoading] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  const { signUp, signInWithGoogle, authChecked, user, loading, configError, isConfigured } = useFirebaseAuthSafe()
  const { hasRedirected } = useAuthRedirect({ user, loading, redirectTo })

  const validateUsername = useCallback((username: string): { valid: boolean; error?: string } => {
    if (!username) return { valid: false, error: "Username is required" }

    if (username.length < 3 || username.length > 20) {
      return { valid: false, error: "Username must be between 3 and 20 characters" }
    }

    const usernameRegex = /^[a-z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return { valid: false, error: "Username can only contain lowercase letters, numbers, and underscores" }
    }

    return { valid: true }
  }, [])

  // Check if username is available
  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      if (!username) return

      const validation = validateUsername(username)
      if (!validation.valid) {
        setUsernameError(validation.error)
        setUsernameAvailable(false)
        return
      }

      setIsCheckingUsername(true)
      setUsernameError(null)

      try {
        const db = getFirestore()
        const usernameSnapshot = await getDoc(doc(db, "usernames", username))
        const isAvailable = !usernameSnapshot.exists()

        setUsernameAvailable(isAvailable)
        if (!isAvailable) {
          setUsernameError("Username is already taken")
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameError("Error checking username availability")
      } finally {
        setIsCheckingUsername(false)
      }
    },
    [validateUsername],
  )

  useEffect(() => {
    try {
      initializeFirebaseApp()
    } catch (error) {
      console.error("Error initializing Firebase:", error)
    }
  }, [])

  useEffect(() => {
    if (authChecked && !hasRedirected) {
      setAuthCheckLoading(false)
    }
  }, [authChecked, hasRedirected])

  // Show loading while checking auth state or if redirecting
  if (authCheckLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  // Check username availability when username changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username)
      } else {
        setUsernameAvailable(null)
        setUsernameError(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username, checkUsernameAvailability])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!termsAccepted) {
      setErrorMessage("You must accept the terms and conditions")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters")
      return
    }

    if (!username) {
      setErrorMessage("Username is required")
      return
    }

    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      setErrorMessage(usernameValidation.error)
      return
    }

    if (usernameAvailable === false) {
      setErrorMessage("Username is already taken")
      return
    }

    setIsLoading(true)

    try {
      console.log("Signing up with:", { email, username, displayName })
      const result = await signUp(email, password, username, displayName)

      if (result.success) {
        console.log("Signup successful, redirecting to:", redirectTo)
        router.replace(redirectTo)
      } else {
        setErrorMessage(result.error || "Failed to create account")
      }
    } catch (error) {
      console.error("Signup error:", error)
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!termsAccepted) {
      setErrorMessage("You must accept the terms and conditions")
      return
    }

    if (!username) {
      setErrorMessage("Username is required")
      return
    }

    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      setErrorMessage(usernameValidation.error)
      return
    }

    if (usernameAvailable === false) {
      setErrorMessage("Username is already taken")
      return
    }

    setErrorMessage(null)
    setIsGoogleLoading(true)

    try {
      console.log("Signing up with Google:", { username, displayName })
      const result = await signInWithGoogle(username, displayName)

      if (result.success) {
        console.log("Google signup successful, redirecting to:", redirectTo)
        router.replace(redirectTo)
      } else {
        setErrorMessage(result.error || "Failed to sign up with Google")
      }
    } catch (error) {
      console.error("Google signup error:", error)
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <Logo href="/" size="md" linkClassName="absolute top-8 left-8 z-10" />
      <FirebaseConfigBanner />

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
            Create your account
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-400 mt-2"
          >
            Join the #1 clip vault for faceless creators
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Label htmlFor="username" className="text-white flex items-center justify-between">
              Username
              {isCheckingUsername && <span className="text-xs text-gray-400">Checking...</span>}
              {!isCheckingUsername && usernameAvailable === true && (
                <span className="text-xs text-green-500 flex items-center">
                  <Check className="h-3 w-3 mr-1" /> Available
                </span>
              )}
              {!isCheckingUsername && usernameAvailable === false && (
                <span className="text-xs text-red-500 flex items-center">
                  <X className="h-3 w-3 mr-1" /> {usernameError}
                </span>
              )}
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Choose a unique username"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-400">
              This will be your public URL: massclip.pro/creator/
              <span className="text-gray-300">{username || "username"}</span>
            </p>
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Label htmlFor="displayName" className="text-white">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you'll appear to others"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-400">This will be shown on your public profile</p>
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
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
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-400">Must be at least 8 characters</p>
          </motion.div>

          <motion.div
            className="flex items-start space-x-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
            />
            <Label htmlFor="terms" className="text-sm leading-tight text-white">
              I agree to the{" "}
              <Link href="/terms" className="text-red-500 hover:text-red-400 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-red-500 hover:text-red-400 transition-colors">
                Privacy Policy
              </Link>
            </Label>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white transition-all duration-300 flex items-center justify-center gap-2 group"
              disabled={isLoading || usernameAvailable === false}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative px-4 bg-black text-xs text-gray-500">or</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <GoogleAuthButton
            onClick={handleGoogleSignUp}
            isLoading={isGoogleLoading}
            text="Sign up with Google"
            disabled={usernameAvailable === false || !username}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.5 }}
          className="text-center text-sm text-gray-400"
        >
          Already have an account?{" "}
          <Link href="/login" className="text-red-500 hover:text-red-400 transition-colors">
            Log in
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
