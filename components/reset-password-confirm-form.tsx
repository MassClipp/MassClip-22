"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { confirmPasswordReset } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordConfirmForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oobCode, setOobCode] = useState<string | null>(null)
  const [isCodeValid, setIsCodeValid] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    // Get the oobCode from the URL
    const code = searchParams.get("oobCode")
    const mode = searchParams.get("mode")

    if (!code || mode !== "resetPassword") {
      setIsCodeValid(false)
      setError("Invalid or missing reset code. Please try requesting a new password reset link.")
      return
    }

    setOobCode(code)
  }, [searchParams])

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Check if oobCode exists
    if (!oobCode) {
      setError("Missing reset code. Please try requesting a new password reset link.")
      return
    }

    // Validate passwords
    if (!validatePassword(password)) {
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      // Confirm password reset with Firebase
      await confirmPasswordReset(auth, oobCode, password)

      // Show success toast
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now log in with your new password.",
        variant: "default",
      })

      // Redirect to login page
      router.push("/login?reset=success")
    } catch (error) {
      console.error("Error resetting password:", error)

      // Handle specific Firebase errors
      if (error instanceof Error) {
        const errorCode = (error as any).code

        if (errorCode === "auth/expired-action-code") {
          setError("This password reset link has expired. Please request a new one.")
        } else if (errorCode === "auth/invalid-action-code") {
          setError("Invalid reset link. Please request a new password reset link.")
        } else if (errorCode === "auth/weak-password") {
          setError("Password is too weak. Please choose a stronger password.")
        } else {
          setError("Failed to reset password. Please try again later.")
        }
      } else {
        setError("An unexpected error occurred. Please try again later.")
      }

      toast({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isCodeValid) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 text-sm rounded-md bg-red-50 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
        <Button onClick={() => router.push("/forgot-password")} className="w-full">
          Request New Reset Link
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          New Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your new password"
          disabled={isLoading}
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your new password"
          disabled={isLoading}
          required
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-sm rounded-md bg-red-50 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting Password...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>

      <div className="text-center mt-4">
        <a href="/login" className="text-sm text-gray-500 hover:text-gray-800">
          Back to Login
        </a>
      </div>
    </form>
  )
}
