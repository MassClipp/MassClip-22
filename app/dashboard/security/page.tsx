"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Shield, Eye, EyeOff, Lock, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { updatePassword } from "firebase/auth"

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function SecurityPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) score += 1
    else feedback.push("At least 8 characters")

    if (/[a-z]/.test(password)) score += 1
    else feedback.push("Include lowercase letters")

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push("Include uppercase letters")

    if (/\d/.test(password)) score += 1
    else feedback.push("Include numbers")

    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback.push("Include special characters")

    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"]
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]

    return {
      score,
      feedback,
      color: colors[score] || colors[0],
    }
  }

  const passwordStrength = calculatePasswordStrength(newPassword)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to change your password")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password")
      return
    }

    setLoading(true)
    setError("")

    try {
      await updatePassword(user, newPassword)

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      })

      // Clear form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Password update error:", error)

      if (error.code === "auth/requires-recent-login") {
        setError("For security reasons, please log out and log back in before changing your password.")
      } else {
        setError(error.message || "Failed to update password")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account security and password</p>
      </div>

      {/* Password Change Section */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Password Strength</span>
                    <span style={{ color: passwordStrength.color }}>
                      {["Very Weak", "Weak", "Fair", "Good", "Strong"][passwordStrength.score]}
                    </span>
                  </div>
                  <Progress
                    value={(passwordStrength.score / 5) * 100}
                    className="h-2"
                    style={{
                      background: `linear-gradient(to right, ${passwordStrength.color} ${(passwordStrength.score / 5) * 100}%, #374151 ${(passwordStrength.score / 5) * 100}%)`,
                    }}
                  />
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-zinc-400">Missing: {passwordStrength.feedback.join(", ")}</div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-red-500">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <Alert className="border-red-600 bg-red-600/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !passwordsMatch || passwordStrength.score < 3}
              className="w-full"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-600 bg-blue-600/10">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Keep your account secure:</div>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Use a unique password that you don't use elsewhere</li>
                  <li>Include a mix of letters, numbers, and special characters</li>
                  <li>Avoid using personal information in your password</li>
                  <li>Consider using a password manager</li>
                  <li>Log out from shared or public devices</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your current account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <div className="text-sm text-zinc-400 mt-1">{user?.email || "Not available"}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Account Created</Label>
              <div className="text-sm text-zinc-400 mt-1">
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString()
                  : "Not available"}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Sign In</Label>
              <div className="text-sm text-zinc-400 mt-1">
                {user?.metadata?.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                  : "Not available"}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Email Verified</Label>
              <div className="text-sm text-zinc-400 mt-1">{user?.emailVerified ? "Yes" : "No"}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
