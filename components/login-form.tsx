"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, ArrowRight } from "lucide-react"
import Link from "next/link"
import { GoogleAuthButton } from "@/components/google-auth-button"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get("redirect")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      setError(error.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex">
      {/* Left Section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-gray-700 shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
              <CardDescription className="text-gray-300">Sign in to your MassClip account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900 px-2 text-gray-400">Or continue with</span>
                </div>
              </div>

              <GoogleAuthButton />

              <div className="text-center">
                <span className="text-gray-400">{"Don't have an account? "}</span>
                <Link href="/signup" className="text-red-500 hover:text-red-400 font-medium">
                  Create account
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Terms moved to left section */}
          <div className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-red-500 hover:text-red-400">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-red-500 hover:text-red-400">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">Premium Content</h1>
            <h2 className="text-4xl font-bold text-red-500">Awaits You</h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              Access exclusive video content, connect with creators, and discover premium experiences tailored just for
              you.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Unlimited access to premium content</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Connect directly with creators</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">High-quality video streaming</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
