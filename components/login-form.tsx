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
  const [showEmailForm, setShowEmailForm] = useState(false)
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

      // Simple redirect to dashboard or specified redirect
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

        // Simple redirect to dashboard or specified redirect
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
      className={cn(
        "min-h-screen bg-black flex items-center justify-center p-4 md:p-8 relative overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-teal-400/[0.15] rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[600px] h-[600px] bg-cyan-400/[0.12] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-400/[0.1] rounded-full blur-[100px]" />
      </div>

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
        <div className="grid md:grid-cols-2 gap-0 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 md:p-12">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Log In</h1>
                <p className="text-white/60">Welcome back! Please enter your details</p>
              </div>

              {redirect?.includes("purchase-success") && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-green-400 text-lg">🎉</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-400">Purchase Complete!</h3>
                      <p className="text-sm text-green-300">
                        Your payment was successful. Sign in to access your content.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3"
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
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>{googleLoading ? "Signing in..." : "Sign in with Google"}</span>
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-white/60">or continue with email</span>
                  </div>
                </div>

                {!showEmailForm ? (
                  <Button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full h-12 bg-transparent hover:bg-white/10 text-white font-medium rounded-lg border border-white/20 transition-all duration-200"
                  >
                    Continue with email
                  </Button>
                ) : (
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/80">Email</label>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/80">Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 pr-10 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
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
                            <EyeOff className="h-4 w-4 text-white/60" />
                          ) : (
                            <Eye className="h-4 w-4 text-white/60" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm text-white/60 hover:text-white"
                        onClick={() => router.push("/forgot-password")}
                        type="button"
                      >
                        forgot password ?
                      </Button>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="border-red-800 bg-red-900/20 backdrop-blur-sm">
                        <AlertDescription className="text-red-400">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-teal-500 to-cyan-400 text-white font-medium rounded-lg transition-all duration-200 hover:from-teal-600 hover:to-cyan-500"
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
                )}
              </div>

              <div className="text-center pt-2">
                <span className="text-white/60">Don't have an account? </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm text-teal-400 hover:text-teal-300 font-medium"
                  onClick={() => router.push(`/signup${redirect ? `?redirect=${redirect}` : ""}`)}
                  type="button"
                >
                  Sign up
                </Button>
              </div>

              <div className="text-center text-xs text-white/40 pt-2">
                By continuing, you agree to our{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-white/60 hover:text-white underline"
                  onClick={() => router.push("/terms")}
                  type="button"
                >
                  Terms of Service
                </Button>{" "}
                and{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-white/60 hover:text-white underline"
                  onClick={() => router.push("/privacy")}
                  type="button"
                >
                  Privacy Policy
                </Button>
                .
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute left-1/2 top-1/4 bottom-1/4 w-px bg-white/10" />

          <div className="hidden md:flex items-center justify-center p-12 relative overflow-hidden">
            <div className="relative z-10 text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                  Stop
                  <br />
                  Consuming
                </h2>
              </div>
              <div className="h-px w-24 bg-white/40 mx-auto" />
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                  Start
                  <br />
                  Producing
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
