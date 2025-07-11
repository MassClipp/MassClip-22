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
import { Loader2, Eye, EyeOff } from "lucide-react"
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
    <div className={cn("min-h-screen bg-black", className)} {...props}>
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 p-6">
        <Logo
          href="/"
          size="md"
          className="cursor-pointer transition-transform hover:scale-105"
          linkClassName="inline-block"
        />
      </div>

      {/* Main Content */}
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
                  <p className="text-gray-600">Login to your MassClip account</p>
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
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                        Password
                      </Label>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm text-gray-600 hover:text-gray-900"
                        onClick={() => router.push("/forgot-password")}
                        type="button"
                      >
                        Forgot your password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 pr-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
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

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="h-10 border-gray-300 hover:bg-gray-50 bg-transparent"
                    onClick={() => {
                      // Apple login implementation
                    }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  </Button>

                  <GoogleAuthButton
                    onClick={handleGoogleSuccess}
                    isLoading={false}
                    className="h-10 border-gray-300 hover:bg-gray-50"
                    showText={false}
                  />

                  <Button
                    variant="outline"
                    className="h-10 border-gray-300 hover:bg-gray-50 bg-transparent"
                    onClick={() => {
                      // Meta login implementation
                    }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
                    </svg>
                  </Button>
                </div>

                {/* Sign Up Link */}
                <div className="text-center text-sm">
                  <span className="text-gray-600">Don't have an account? </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 font-medium text-gray-900 hover:text-gray-700 underline"
                    onClick={() => router.push(`/signup${redirect ? `?redirect=${redirect}` : ""}`)}
                    type="button"
                  >
                    Sign up
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <div className="mt-6 text-center text-sm text-gray-400">
            By clicking continue, you agree to our{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-gray-400 hover:text-gray-300 underline"
              onClick={() => router.push("/terms")}
              type="button"
            >
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-gray-400 hover:text-gray-300 underline"
              onClick={() => router.push("/privacy")}
              type="button"
            >
              Privacy Policy
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
