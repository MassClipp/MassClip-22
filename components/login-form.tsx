"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Link from "next/link"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

      const redirectUrl = redirect || "/dashboard"
      router.push(redirectUrl)
    } catch (error: any) {
      console.error("Login error:", error)
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)

      if (result.user) {
        console.log("Google login successful:", result.user.email)

        const redirectUrl = redirect || "/dashboard"
        router.push(redirectUrl)
      }
    } catch (error: any) {
      console.error("Google login error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled")
      } else {
        setError("Unable to sign in with Google. Please try again.")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className={cn("min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-4", className)}
      {...props}
    >
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute top-1/4 right-1/4 w-[1000px] h-[1000px] bg-teal-500/20 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[900px] h-[900px] bg-cyan-500/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-400/10 rounded-full blur-[120px]" />
      </div>

      {/* Logo - top left */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="inline-block cursor-pointer transition-transform hover:scale-105">
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              Vex
            </span>
          </div>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="flex flex-col md:flex-row rounded-3xl overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
          {/* Left side - Form with white background */}
          <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">Log In</h1>
                <p className="text-gray-600">Welcome back! Please enter your details</p>
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
                      <h3 className="font-semibold text-green-800">Purchase Complete!</h3>
                      <p className="text-sm text-green-700">
                        Your payment was successful. Sign in to access your content.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="border-red-300 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-10 bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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

                {/* Forgot Password */}
                <div className="text-right">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-teal-600 hover:text-teal-700"
                    onClick={() => router.push("/forgot-password")}
                    type="button"
                  >
                    forgot password ?
                  </Button>
                </div>

                {/* Log In Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200"
                  disabled={loading || googleLoading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or Continue With</span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 border border-gray-300"
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
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
                    <span>Google</span>
                  </>
                )}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have account? </span>
                <Button
                  variant="link"
                  className="h-auto p-0 text-teal-600 hover:text-teal-700 font-medium"
                  onClick={() => router.push(`/signup${redirect ? `?redirect=${redirect}` : ""}`)}
                  type="button"
                >
                  Sign up
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex w-1/2 bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-400 items-center justify-center relative p-12">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-7xl font-bold text-black leading-tight">Stop</h2>
                <h2 className="text-7xl font-bold text-black leading-tight">Consuming</h2>
              </div>
              <div className="w-20 h-1 bg-black/20 rounded-full" />
              <div className="space-y-2">
                <h2 className="text-7xl font-bold text-black leading-tight">Start</h2>
                <h2 className="text-7xl font-bold text-black leading-tight">Producing</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
