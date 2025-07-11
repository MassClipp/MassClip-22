"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, Check, X, AlertTriangle, RefreshCw } from "lucide-react"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Logo from "@/components/logo"

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameCheckFailed, setUsernameCheckFailed] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const router = useRouter()

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

    setIsLoading(true)

    try {
      console.log("📝 Starting signup process...")
      const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      if (result.user) {
        console.log("📝 Signup successful, redirecting...")
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("An account with this email already exists")
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("Password is too weak")
      } else {
        setErrorMessage("Failed to create account. Please try again.")
      }
    } finally {
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
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)

      if (result.user) {
        console.log("📝 Google signup successful, redirecting...")
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Google signup error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setErrorMessage("Sign-up was cancelled")
      } else if (error.code === "auth/popup-blocked") {
        setErrorMessage("Popup was blocked. Please allow popups and try again.")
      } else if (error.code === "auth/account-exists-with-different-credential") {
        setErrorMessage("An account already exists with this email using a different sign-in method")
      } else {
        setErrorMessage("Failed to sign up with Google. Please try again.")
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleAppleSignUp = () => {
    // Apple signup implementation would go here
    console.log("Apple signup clicked")
    setErrorMessage("Apple Sign-In is not yet implemented")
  }

  return (
    <div className={cn("min-h-screen bg-black flex flex-col relative overflow-hidden", className)} {...props}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Logo */}
        <div className="absolute top-6 left-6 z-20">
          <Logo
            href="/"
            size="md"
            className="cursor-pointer transition-transform hover:scale-105"
            linkClassName="inline-block"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-white">Start selling to your audience today</h1>
              <p className="text-gray-400 text-lg">Free plan available. No credit card required.</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <Alert variant="destructive" className="border-red-800 bg-red-900/20 backdrop-blur-sm">
                <AlertDescription className="text-red-400">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Google Sign Up */}
              <Button
                onClick={handleGoogleSignUp}
                className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm"
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
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
                <span>{isGoogleLoading ? "Creating account..." : "Continue with Google"}</span>
              </Button>

              {/* Apple Sign Up */}
              <Button
                onClick={handleAppleSignUp}
                className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 border border-gray-700 backdrop-blur-sm"
                disabled={isLoading || isGoogleLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span>Continue with Apple</span>
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-black text-gray-400">or continue with email</span>
                </div>
              </div>

              {/* Email Form Toggle */}
              {!showEmailForm ? (
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm"
                  />
                  <Button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 backdrop-blur-sm"
                    disabled={!formData.email}
                  >
                    Continue with email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Choose a unique username"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        className={cn(
                          "h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm",
                          usernameAvailable === false
                            ? "border-red-500"
                            : usernameCheckFailed
                              ? "border-yellow-500"
                              : "",
                        )}
                        required
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {isCheckingUsername && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                        {!isCheckingUsername && usernameAvailable === true && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {!isCheckingUsername && usernameAvailable === false && <X className="h-4 w-4 text-red-500" />}
                        {!isCheckingUsername && usernameCheckFailed && (
                          <button type="button" onClick={retryUsernameCheck}>
                            <RefreshCw className="h-4 w-4 text-yellow-500" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      This will be your public URL: massclip.pro/creator/
                      <span className="text-gray-300 font-medium">{formData.username || "username"}</span>
                    </p>
                    {usernameError && (
                      <p className="text-xs text-red-400 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {usernameError}
                      </p>
                    )}
                  </div>

                  {/* Display Name Field */}
                  <Input
                    type="text"
                    placeholder="How you'll appear to others"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange("displayName", e.target.value)}
                    className="h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm"
                    required
                  />

                  {/* Email Field (pre-filled) */}
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm"
                    required
                  />

                  {/* Password Field */}
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 6 characters)"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="h-12 pr-10 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="h-12 pr-10 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 mt-1"
                    />
                    <label htmlFor="terms" className="text-sm leading-tight text-gray-400">
                      I agree to the{" "}
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm text-red-500 hover:text-red-400 underline"
                        onClick={() => router.push("/terms")}
                        type="button"
                      >
                        Terms of Service
                      </Button>{" "}
                      and{" "}
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm text-red-500 hover:text-red-400 underline"
                        onClick={() => router.push("/privacy")}
                        type="button"
                      >
                        Privacy Policy
                      </Button>
                    </label>
                  </div>

                  {/* Create Account Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200"
                    disabled={isLoading || usernameAvailable === false || isGoogleLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <span className="text-gray-400">Already have an account? </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm text-red-500 hover:text-red-400 font-medium"
                onClick={() => router.push("/login")}
                type="button"
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-8 px-8">
          <div className="text-center text-sm text-gray-500">
            By continuing, you agree to our{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-gray-500 hover:text-gray-400 underline"
              onClick={() => router.push("/terms")}
              type="button"
            >
              Terms of Service
            </Button>
            . Read our{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-gray-500 hover:text-gray-400 underline"
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
