"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { GoogleAuthButton } from "@/components/google-auth-button"
import Logo from "@/components/logo"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get("redirect")

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signInWithEmailAndPassword(auth, email, password)

      // Check for stored redirect URL from purchase flow
      const storedRedirect = localStorage.getItem("redirectAfterLogin")
      if (storedRedirect) {
        localStorage.removeItem("redirectAfterLogin")
        window.location.href = storedRedirect
        return
      }

      // Use redirect parameter or default to dashboard
      const redirectUrl = redirect || "/dashboard"
      router.push(redirectUrl)
    } catch (error: any) {
      console.error("Login error:", error)
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = () => {
    // Check for stored redirect URL from purchase flow
    const storedRedirect = localStorage.getItem("redirectAfterLogin")
    if (storedRedirect) {
      localStorage.removeItem("redirectAfterLogin")
      window.location.href = storedRedirect
      return
    }

    // Use redirect parameter or default to dashboard
    const redirectUrl = redirect || "/dashboard"
    router.push(redirectUrl)
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
                      Welcome back
                    </h1>
                    <p className="text-gray-600 text-lg">Sign in to your MassClip account</p>
                  </div>

                  {/* Purchase Success Notice */}
                  {redirect?.includes("purchase-success") && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-emerald-600 text-lg">🎉</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-emerald-900">Purchase Complete!</h3>
                          <p className="text-sm text-emerald-700">
                            Your payment was successful. Sign in to access your content.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleEmailLogin} className="space-y-6">
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
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
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
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                          Password
                        </Label>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-sm text-red-600 hover:text-red-700"
                          onClick={() => router.push("/forgot-password")}
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
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
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => setFocusedField(null)}
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

                    {/* Error Message */}
                    {error && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-700">{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Sign In Button */}
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in
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

                  {/* Google Sign In */}
                  <div className="space-y-4">
                    <GoogleAuthButton
                      onClick={handleGoogleSuccess}
                      isLoading={false}
                      text="Continue with Google"
                      className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    />
                  </div>

                  {/* Sign Up Link */}
                  <div className="text-center">
                    <span className="text-gray-600">Don't have an account? </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 font-semibold text-red-600 hover:text-red-700"
                      onClick={() => router.push(`/signup${redirect ? `?redirect=${redirect}` : ""}`)}
                      type="button"
                    >
                      Create account
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
                    Premium Content
                    <br />
                    <span className="text-red-500">Awaits You</span>
                  </h2>
                  <p className="text-xl text-slate-300 leading-relaxed">
                    Access exclusive video content, connect with creators, and discover premium experiences tailored
                    just for you.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Unlimited access to premium content</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Connect directly with creators</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>High-quality video streaming</span>
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
          By signing in, you agree to our{" "}
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
