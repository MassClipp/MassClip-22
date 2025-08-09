"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Logo from "@/components/logo"

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState("")
  const [showEmailForm, setShowEmailForm] = useState(false)
  const router = useRouter()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError("")

    try {
      await createUserWithEmailAndPassword(auth, email, password)
      router.push("/login-success")
    } catch (error: any) {
      console.error("Signup error:", error)
      setError("Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)

      if (result.user) {
        console.log("Google signup successful:", result.user.email)
        router.push("/login-success")
      }
    } catch (error: any) {
      console.error("Google signup error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-up was cancelled")
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups and try again.")
      } else if (error.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google sign-up. Please contact support.")
      } else {
        setError("Failed to sign up with Google. Please try again.")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleAppleSignup = async () => {
    setAppleLoading(true)
    setError("")

    try {
      const provider = new OAuthProvider("apple.com")
      provider.addScope("email")
      provider.addScope("name")

      // Set custom parameters for Apple Sign-In
      provider.setCustomParameters({
        locale: "en",
      })

      const result = await signInWithPopup(auth, provider)

      if (result.user) {
        console.log("Apple signup successful:", result.user.email)
        router.push("/login-success")
      }
    } catch (error: any) {
      console.error("Apple signup error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-up was cancelled")
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups and try again.")
      } else if (error.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Apple sign-up. Please contact support.")
      } else if (error.code === "auth/operation-not-allowed") {
        setError("Apple Sign-In is not enabled. Please contact support.")
      } else {
        setError("Failed to sign up with Apple. Please try again.")
      }
    } finally {
      setAppleLoading(false)
    }
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
              <h1 className="text-4xl font-bold text-white">Create your account</h1>
              <p className="text-gray-400 text-lg">Join MassClip to start sharing your content</p>
            </div>

            <div className="space-y-4">
              {!showEmailForm ? (
                <>
                  {/* Google Sign Up */}
                  <Button
                    onClick={handleGoogleSignup}
                    className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm"
                    disabled={googleLoading || loading || appleLoading}
                  >
                    {googleLoading ? (
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
                    <span>{googleLoading ? "Signing up..." : "Continue with Google"}</span>
                  </Button>

                  {/* Apple Sign Up */}
                  <Button
                    onClick={handleAppleSignup}
                    className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 border border-gray-700 backdrop-blur-sm"
                    disabled={loading || googleLoading || appleLoading}
                  >
                    {appleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    )}
                    <span>{appleLoading ? "Signing up..." : "Continue with Apple"}</span>
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
                  <Button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full h-12 bg-transparent hover:bg-white/10 text-white font-medium rounded-lg border border-gray-600 transition-all duration-200 backdrop-blur-sm"
                  >
                    Continue with email
                  </Button>
                </>
              ) : (
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  {/* Email Field */}
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 backdrop-blur-sm"
                    required
                  />

                  {/* Password Field */}
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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

                  {/* Error Message */}
                  {error && (
                    <Alert variant="destructive" className="border-red-800 bg-red-900/20 backdrop-blur-sm">
                      <AlertDescription className="text-red-400">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Create Account Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200"
                    disabled={loading || googleLoading || appleLoading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>

                  {/* Back Button */}
                  <div className="text-center">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm text-gray-400 hover:text-gray-300"
                      onClick={() => setShowEmailForm(false)}
                      type="button"
                    >
                      ← Back to signup options
                    </Button>
                  </div>
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
            </Button>{" "}
            and{" "}
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

// Default export for compatibility
export default SignupForm
