"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useFirebaseAuthSafe } from "@/hooks/use-firebase-auth-safe"
import { GoogleAuthButton } from "@/components/google-auth-button"
import Link from "next/link"

export function SignupForm() {
  const router = useRouter()
  const { signUp, signInWithGoogle, loading, configError, isConfigured } = useFirebaseAuthSafe()

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.username) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, hyphens, and underscores"
    }

    if (!formData.displayName) {
      newErrors.displayName = "Display name is required"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await signUp(formData.email, formData.password, formData.username, formData.displayName)

      if (result.success) {
        console.log("✅ Account created successfully")
        router.push("/login-success")
      } else {
        if (result.demo) {
          setErrors({ general: "Demo mode: Firebase not configured. Please check your environment variables." })
        } else {
          setErrors({ general: result.error || "Failed to create account" })
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      setErrors({ general: error.message || "An unexpected error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!formData.username || !formData.displayName) {
      setErrors({
        username: !formData.username ? "Username is required for Google signup" : "",
        displayName: !formData.displayName ? "Display name is required for Google signup" : "",
      })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await signInWithGoogle(formData.username, formData.displayName)

      if (result.success) {
        if (result.redirect) {
          console.log("🔄 Redirecting for Google authentication...")
        } else {
          console.log("✅ Google signup successful")
          router.push("/login-success")
        }
      } else {
        if (result.demo) {
          setErrors({ general: "Demo mode: Firebase not configured. Please check your environment variables." })
        } else {
          setErrors({ general: result.error || "Failed to sign up with Google" })
        }
      }
    } catch (error: any) {
      console.error("Google signup error:", error)
      setErrors({ general: error.message || "An unexpected error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  // Show configuration error if Firebase is not configured
  if (!isConfigured && configError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Configuration Error</CardTitle>
            <CardDescription className="text-gray-300">Firebase is not properly configured</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-500 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">{configError}</AlertDescription>
            </Alert>
            <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700 text-white">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
          <CardDescription className="text-gray-300">Sign up to start using our platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.general && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">{errors.general}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                placeholder="Enter your email"
                disabled={isSubmitting || loading}
              />
              {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value.toLowerCase())}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                placeholder="Choose a username"
                disabled={isSubmitting || loading}
              />
              {errors.username && <p className="text-sm text-red-400">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange("displayName", e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                placeholder="Your display name"
                disabled={isSubmitting || loading}
              />
              {errors.displayName && <p className="text-sm text-red-400">{errors.displayName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-10"
                  placeholder="Create a password"
                  disabled={isSubmitting || loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-10"
                  placeholder="Confirm your password"
                  disabled={isSubmitting || loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting || loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          <GoogleAuthButton
            onClick={handleGoogleSignup}
            disabled={isSubmitting || loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing up...
              </>
            ) : (
              "Sign up with Google"
            )}
          </GoogleAuthButton>

          <div className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-red-400 hover:text-red-300 font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SignupForm
