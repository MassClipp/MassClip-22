"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { confirmPasswordReset } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidLink, setIsValidLink] = useState(false)

  const mode = searchParams?.get("mode")
  const oobCode = searchParams?.get("oobCode")

  useEffect(() => {
    // Validate the link parameters
    if (mode !== "resetPassword" || !oobCode) {
      setIsValidLink(false)
      setError("Invalid or expired password reset link. Please request a new link.")
    } else {
      setIsValidLink(true)
      setError(null)
    }
  }, [mode, oobCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError(null)

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (!oobCode) {
      setError("Invalid reset code")
      return
    }

    setIsLoading(true)

    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login?reset=success")
      }, 2000)
    } catch (error: any) {
      console.error("Error resetting password:", error)

      // Handle specific Firebase errors
      if (error.code === "auth/expired-action-code") {
        setError("This password reset link has expired. Please request a new one.")
      } else if (error.code === "auth/invalid-action-code") {
        setError("Invalid reset link. Please request a new password reset link.")
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.")
      } else {
        setError(`Failed to reset password: ${error.message || "Unknown error"}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Reset Your Password</h1>

        {!isValidLink ? (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : success ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Password reset successful!</p>
              <p className="text-gray-300 mt-1">Redirecting you to login...</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-1">
                  New Password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full bg-gray-800 border-gray-700"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
