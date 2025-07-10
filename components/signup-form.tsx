"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AtSign,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react"
import { useFirebaseAuthStable } from "@/hooks/use-firebase-auth-stable"
import { GoogleAuthButton } from "@/components/google-auth-button"
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
  const [focusedField, setFocusedField] = useState<string | null>(null)

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-red-600" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100", className)} {...props}>
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <Logo
          href="/"
          size="md"
          className="cursor-pointer transition-transform hover:scale-105"
          linkClassName="inline-block"
        />
      </div>

      {/* Main Content */}
      <div className="flex min-h-screen">
        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-8 lg:p-10">
                <div className="space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Create your account
                    </h1>
                    <p className="text-gray-600 text-lg">Join the #1 clip vault for faceless creators</p>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username Field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                          Username
                        </Label>
                        <div className="flex items-center space-x-2 text-xs">
                          {isCheckingUsername && <span className="text-gray-400">Checking...</span>}
                          {!isCheckingUsername && usernameAvailable === true && (
                            <span className="text-green-600 flex items-center">
                              <Check className="h-3 w-3 mr-1" /> Available
                            </span>
                          )}
                          {!isCheckingUsername && usernameAvailable === false && (
                            <span className="text-red-600 flex items-center">
                              <X className="h-3 w-3 mr-1" /> Taken
                            </span>
                          )}
                          {!isCheckingUsername && usernameCheckFailed && (
                            <button
                              type="button"
                              onClick={retryUsernameCheck}
                              className="text-yellow-600 flex items-center hover:text-yellow-700"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="relative group">
                        <AtSign
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                            focusedField === "username" ? "text-red-600" : "text-gray-400",
                          )}
                        />
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => handleInputChange("username", e.target.value)}
                          onFocus={() => setFocusedField("username")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Choose a unique username"
                          className={cn(
                            "pl-10 h-12 border-2 transition-all duration-200 bg-white/50",
                            focusedField === "username"
                              ? "border-red-600 ring-4 ring-red-600/10"
                              : usernameAvailable === false
                                ? "border-red-500"
                                : usernameCheckFailed
                                  ? "border-yellow-500"
                                  : "border-gray-200 hover:border-gray-300",
                          )}
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        This will be your public URL: massclip.pro/creator/
                        <span className="text-gray-700 font-medium">{formData.username || "username"}</span>
                      </p>
                      {usernameError && (
                        <p className="text-xs text-red-600 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {usernameError}
                        </p>
                      )}
                      {usernameCheckFailed && (
                        <p className="text-xs text-yellow-600">
                          Username check failed. You can still proceed with signup.
                        </p>
                      )}
                    </div>

                    {/* Display Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                        Display Name
                      </Label>
                      <div className="relative group">
                        <User
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                            focusedField === "displayName" ? "text-red-600" : "text-gray-400",
                          )}
                        />
                        <Input
                          id="displayName"
                          type="text"
                          value={formData.displayName}
                          onChange={(e) => handleInputChange("displayName", e.target.value)}
                          onFocus={() => setFocusedField("displayName")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="How you'll appear to others"
                          className={cn(
                            "pl-10 h-12 border-2 transition-all duration-200 bg-white/50",
                            focusedField === "displayName"
                              ? "border-red-600 ring-4 ring-red-600/10"
                              : "border-gray-200 hover:border-gray-300",
                          )}
                          required
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email address
                      </Label>
                      <div className="relative group">
                        <Mail
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                            focusedField === "email" ? "text-red-600" : "text-gray-400",
                          )}
                        />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Enter your email"
                          className={cn(
                            "pl-10 h-12 border-2 transition-all duration-200 bg-white/50",
                            focusedField === "email"
                              ? "border-red-600 ring-4 ring-red-600/10"
                              : "border-gray-200 hover:border-gray-300",
                          )}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="relative group">
                        <Lock
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                            focusedField === "password" ? "text-red-600" : "text-gray-400",
                          )}
                        />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Create a password (min 6 characters)"
                          className={cn(
                            "pl-10 pr-10 h-12 border-2 transition-all duration-200 bg-white/50",
                            focusedField === "password"
                              ? "border-red-600 ring-4 ring-red-600/10"
                              : "border-gray-200 hover:border-gray-300",
                          )}
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
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password
                      </Label>
                      <div className="relative group">
                        <Lock
                          className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                            focusedField === "confirmPassword" ? "text-red-600" : "text-gray-400",
                          )}
                        />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Confirm your password"
                          className={cn(
                            "pl-10 pr-10 h-12 border-2 transition-all duration-200 bg-white/50",
                            focusedField === "confirmPassword"
                              ? "border-red-600 ring-4 ring-red-600/10"
                              : "border-gray-200 hover:border-gray-300",
                          )}
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
                    </div>

                    {/* Terms Checkbox */}
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 mt-1"
                      />
                      <Label htmlFor="terms" className="text-sm leading-tight text-gray-700">
                        I agree to the{" "}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-sm text-red-600 hover:text-red-700 underline"
                          onClick={() => router.push("/terms")}
                          type="button"
                        >
                          Terms of Service
                        </Button>{" "}
                        and{" "}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-sm text-red-600 hover:text-red-700 underline"
                          onClick={() => router.push("/privacy")}
                          type="button"
                        >
                          Privacy Policy
                        </Button>
                      </Label>
                    </div>

                    {/* Create Account Button */}
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                      disabled={isLoading || usernameAvailable === false}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create account
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                    </div>
                  </div>

                  {/* Google Sign Up */}
                  <div className="space-y-4">
                    <GoogleAuthButton
                      onClick={handleGoogleSignUp}
                      isLoading={isGoogleLoading}
                      text="Sign up with Google"
                      className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                      disabled={isGoogleLoading}
                    />
                  </div>

                  {/* Sign In Link */}
                  <div className="text-center">
                    <span className="text-gray-600">Already have an account? </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 font-semibold text-red-600 hover:text-red-700"
                      onClick={() => router.push("/login")}
                      type="button"
                    >
                      Sign in
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Visual */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col justify-center items-center h-full p-16 text-center">
              <div className="space-y-8 max-w-lg">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white leading-tight">
                    Join the Future of
                    <br />
                    <span className="text-red-500">Content Creation</span>
                  </h2>
                  <p className="text-xl text-slate-300 leading-relaxed">
                    Connect with thousands of creators, access premium content, and build your audience with our
                    cutting-edge platform.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Upload and monetize your content</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Build your creator profile</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Connect with your audience</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="text-center text-sm text-gray-500">
          By creating an account, you agree to our{" "}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm text-gray-600 hover:text-gray-900 underline"
            onClick={() => router.push("/terms")}
            type="button"
          >
            Terms of Service
          </Button>{" "}
          and{" "}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm text-gray-600 hover:text-gray-900 underline"
            onClick={() => router.push("/privacy")}
            type="button"
          >
            Privacy Policy
          </Button>
        </div>
      </div>
    </div>
  )
}
