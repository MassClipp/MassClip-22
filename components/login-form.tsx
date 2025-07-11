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
    <div className={cn("min-h-screen bg-black flex flex-col", className)} {...props}>
      {/* Header with Logo */}
      <div className="absolute top-6 left-6 z-10">
        <Logo
          href="/"
          size="md"
          className="cursor-pointer transition-transform hover:scale-105"
          linkClassName="inline-block"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                  <p className="text-gray-600">Login to your MassClip account</p>
                </div>

                {/* Purchase Success Notice */}
                {redirect?.includes("purchase-success") && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-lg">🎉</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900">Purchase Complete!</h3>
                        <p className="text-sm text-green-700">
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
                      className="h-10 border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:ring-gray-900"
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
                        className="h-auto p-0 text-sm text-gray-900 hover:text-gray-700"
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
                        className="h-10 pr-10 border-gray-300 bg-white text-gray-900 focus:border-gray-900 focus:ring-gray-900"
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
                    className="w-full h-10 bg-black hover:bg-gray-900 text-white font-medium rounded-md transition-colors duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Social Login Options */}
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-12 h-12 p-0 border-gray-300 hover:bg-gray-50 bg-transparent"
                    onClick={() => {
                      // Apple login would go here
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.13997 6.91 8.85997 6.88C10.15 6.86 11.38 7.75 12.1 7.75C12.81 7.75 14.28 6.65 15.85 6.83C16.48 6.85 18.27 7.15 19.29 8.83C19.2 8.89 17.69 9.83 17.7 11.85C17.72 14.24 19.79 15.06 19.8 15.07C19.78 15.13 19.41 16.54 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                  </Button>
                  <GoogleAuthButton
                    onClick={handleGoogleSuccess}
                    isLoading={false}
                    className="w-12 h-12 p-0 border-gray-300 hover:bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-12 h-12 p-0 border-gray-300 hover:bg-gray-50 bg-transparent"
                    onClick={() => {
                      // Meta login would go here
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </Button>
                </div>

                {/* Sign Up Link */}
                <div className="text-center text-sm">
                  <span className="text-gray-600">Don't have an account? </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-sm text-gray-900 hover:text-gray-700 font-medium underline"
                    onClick={() => router.push(`/signup${redirect ? `?redirect=${redirect}` : ""}`)}
                    type="button"
                  >
                    Sign up
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-8">
        <div className="text-center text-sm text-gray-400">
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
          .
        </div>
      </div>
    </div>
  )
}
