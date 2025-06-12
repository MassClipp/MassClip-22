"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirebaseAuthStable } from "@/hooks/use-firebase-auth-stable"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/logo"
import { Loader2, ArrowRight, Check, X, AlertTriangle, RefreshCw } from "lucide-react"
import { GoogleAuthButton } from "@/components/google-auth-button"

export default function SignupPage() {
  // State management
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameCheckFailed, setUsernameCheckFailed] = useState(false)

  const router = useRouter()
  const { signUp, signInWithGoogle, authChecked, user, loading, isInitialized } = useFirebaseAuthStable()

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isInitialized && authChecked && user) {
      console.log("🔄 User already authenticated, redirecting to login-success")
      router.push("/login-success")
    }
  }, [isInitialized, authChecked, user, router])

  // Username validation
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

  // Check username availability
  const checkUsernameAvailability = useCallback(
    async (username: string, isRetry = false) => {
      if (!username) {
        setUsernameAvailable(null)
        setUsernameError(null)
        setUsernameCheckFailed(false)
        return
      }

      const validation = validateUsername(username)
      if (!validation.valid) {
        setUsernameError(validation.error)
        setUsernameAvailable(false)
        setUsernameCheckFailed(false)
        return
      }

      setIsCheckingUsername(true)
      setUsernameError(null)
      setUsernameCheckFailed(false)

      try {
        console.log(`🔍 Checking availability for username: ${username}${isRetry ? " (retry)" : ""}`)

        const response = await fetch("/api/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        })

        console.log(`📋 Username check response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`📋 Username check result:`, data)

          if (data.error) {
            setUsernameError(`Check failed: ${data.error}`)
            setUsernameAvailable(null)
            setUsernameCheckFailed(true)
          } else {
            setUsernameAvailable(data.available)
            setUsernameCheckFailed(false)

            if (!data.available) {
              setUsernameError(data.reason || "Username is already taken")
            } else {
              setUsernameError(null)
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error("❌ Username check failed:", response.status, errorData)
          setUsernameError(`Server error (${response.status}): ${errorData.error || "Unknown error"}`)
          setUsernameAvailable(null)
          setUsernameCheckFailed(true)
        }
      } catch (error) {
        console.error("❌ Username check error:", error)
        setUsernameError("Network error - please check your connection")
        setUsernameAvailable(null)
        setUsernameCheckFailed(true)
      } finally {
        setIsCheckingUsername(false)
      }
    },
    [validateUsername],
  )

  // Retry username check
  const retryUsernameCheck = () => {
    if (formData.username) {
      checkUsernameAvailability(formData.username, true)
    }
  }

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability(formData.username)
      } else {
        setUsernameAvailable(null)
        setUsernameError(null)
        setUsernameCheckFailed(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.username, checkUsernameAvailability])

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "username" ? value.toLowerCase().replace(/[^a-z0-9_]/g, "") : value,
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validation
    if (!termsAccepted) {
      setErrorMessage("You must accept the terms and conditions")
      return
    }

    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    if (!formData.username) {
      setErrorMessage("Username is required")
      return
    }

    const usernameValidation = validateUsername(formData.username)
    if (!usernameValidation.valid) {
      setErrorMessage(usernameValidation.error)
      return
    }

    // Don't allow signup if username is taken
    if (usernameAvailable === false) {
      setErrorMessage("Username is already taken")
      return
    }

    // Allow signup if username check failed (graceful degradation)
    if (usernameCheckFailed) {
      console.log("⚠️ Proceeding with signup despite username check failure")
    }

    setIsLoading(true)

    try {
      console.log("📝 Starting signup process...")
      const result = await signUp(formData.email, formData.password)

      if (result.success) {
        console.log("📝 Signup successful, redirecting...")
        router.push("/login-success")
      } else {
        setErrorMessage(result.error || "Failed to create account")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Signup error:", error)
      setErrorMessage("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  // Handle Google signup
  const handleGoogleSignUp = async () => {
    if (!termsAccepted) {
      setErrorMessage("You must accept the terms and conditions")
      return
    }

    setErrorMessage(null)
    setIsGoogleLoading(true)

    try {
      console.log("📝 Starting Google signup...")
      const result = await signInWithGoogle()

      if (result.success) {
        console.log("📝 Google signup successful, redirecting...")
        router.push("/login-success")
      } else {
        setErrorMessage(result.error || "Failed to sign up with Google")
        setIsGoogleLoading(false)
      }
    } catch (error) {
      console.error("Google signup error:", error)
      setErrorMessage("An unexpected error occurred")
      setIsGoogleLoading(false)
    }
  }

  // Show loading while checking auth state
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
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
                  <X className="h-3 w-3 mr-1" /> Taken
                </span>
              )}
              {!isCheckingUsername && usernameCheckFailed && (
                <button
                  type="button"
                  onClick={retryUsernameCheck}
                  className="text-xs text-yellow-500 flex items-center hover:text-yellow-400"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </button>
              )}
            </Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              placeholder="Choose a unique username"
              className={`bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 ${
                usernameAvailable === false ? "border-red-500" : ""
              } ${usernameCheckFailed ? "border-yellow-500" : ""}`}
              required
            />
            <p className="text-xs text-gray-400">
              This will be your public URL: massclip.pro/creator/
              <span className="text-gray-300">{formData.username || "username"}</span>
            </p>
            {usernameError && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {usernameError}
              </p>
            )}
            {usernameCheckFailed && (
              <p className="text-xs text-yellow-500">Username check failed. You can still proceed with signup.</p>
            )}
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
              value={formData.displayName}
              onChange={(e) => handleInputChange("displayName", e.target.value)}
              placeholder="How you'll appear to others"
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
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
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
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Create a password (min 6 characters)"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Label htmlFor="confirmPassword" className="text-white">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              placeholder="Confirm your password"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
          </motion.div>

          <motion.div
            className="flex items-start space-x-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
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
            transition={{ delay: 1.0, duration: 0.5 }}
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
          transition={{ delay: 1.1, duration: 0.5 }}
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
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <GoogleAuthButton
            onClick={handleGoogleSignUp}
            isLoading={isGoogleLoading}
            text="Sign up with Google"
            disabled={isGoogleLoading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
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
