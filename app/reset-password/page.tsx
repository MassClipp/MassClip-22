"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"
import Link from "next/link"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [oobCode, setOobCode] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  // Extract the oobCode from the URL
  useEffect(() => {
    const code = searchParams.get("oobCode")
    if (code) {
      setOobCode(code)
      verifyCode(code)
    } else {
      setIsVerifying(false)
      setStatus("error")
      setMessage("Invalid password reset link. Please request a new one.")
    }
  }, [searchParams])

  // Verify the reset code
  const verifyCode = async (code: string) => {
    try {
      const email = await verifyPasswordResetCode(auth, code)
      setEmail(email)
      setIsVerifying(false)
    } catch (error) {
      console.error("Error verifying reset code:", error)
      setIsVerifying(false)
      setStatus("error")
      setMessage("This password reset link is invalid or has expired. Please request a new one.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!oobCode) {
      setStatus("error")
      setMessage("Invalid reset code. Please request a new password reset link.")
      return
    }

    if (password !== confirmPassword) {
      setStatus("error")
      setMessage("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setStatus("error")
      setMessage("Password must be at least 6 characters long.")
      return
    }

    setIsLoading(true)
    setStatus("idle")

    try {
      await confirmPasswordReset(auth, oobCode, password)
      setStatus("success")
      setMessage("Your password has been reset successfully!")

      // Clear form
      setPassword("")
      setConfirmPassword("")

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      console.error("Error resetting password:", error)
      setStatus("error")
      setMessage("Failed to reset password. This link may have expired. Please request a new one.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="container max-w-screen-xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Verifying Reset Link</CardTitle>
              <CardDescription>Please wait while we verify your reset link...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="container max-w-screen-xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
              <CardDescription>Your password has been reset successfully.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-center">You will be redirected to the login page in a few seconds.</p>
            </CardContent>
            <CardFooter>
              <Link href="/login" className="w-full">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <CardDescription>
              {email ? `Create a new password for ${email}` : "Create a new password for your account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {status === "error" && (
              <div className="flex items-start gap-2 p-3 mb-4 text-sm rounded-md bg-red-50 text-red-800">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <p>{message}</p>
              </div>
            )}

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
                  disabled={isLoading || status === "error"}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || status === "error"}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || status === "error"}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">
              Back to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
