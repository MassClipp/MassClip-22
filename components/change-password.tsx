"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ChangePassword() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Password validation
  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long")
      return false
    }
    setPasswordError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !user.email) {
      setMessage({ type: "error", text: "User not found. Please log in again." })
      return
    }

    // Reset messages
    setMessage(null)
    setPasswordError(null)

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords don't match." })
      return
    }

    if (!validatePassword(newPassword)) {
      return
    }

    setIsUpdating(true)

    try {
      // First, re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Then update the password
      await updatePassword(user, newPassword)

      // Clear form and show success message
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage({ type: "success", text: "Password updated successfully!" })
    } catch (error) {
      console.error("Error updating password:", error)

      // Handle specific Firebase errors
      if (error instanceof Error) {
        if (error.message.includes("auth/wrong-password") || error.message.includes("auth/user-mismatch")) {
          setMessage({ type: "error", text: "Current password is incorrect." })
        } else if (error.message.includes("auth/requires-recent-login")) {
          setMessage({
            type: "error",
            text: "For security reasons, please log out and log back in before changing your password.",
          })
        } else {
          setMessage({ type: "error", text: `Failed to update password: ${error.message}` })
        }
      } else {
        setMessage({ type: "error", text: "An unknown error occurred. Please try again." })
      }
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user) {
    return (
      <Card className="bg-black border-gray-800">
        <CardContent className="pt-6">
          <p className="text-white">Please log in to change your password.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Change Password</CardTitle>
        <CardDescription className="text-white">Update your account password</CardDescription>
      </CardHeader>

      <CardContent>
        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-6">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-white">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-white">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
            <p className="text-xs text-gray-400">Password must be at least 8 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full border border-crimson bg-transparent text-white hover:bg-crimson/10"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
