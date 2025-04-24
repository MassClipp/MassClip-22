"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/logo"
import { Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)

      setMessage({
        type: "success",
        text: "Password reset link sent! Check your email.",
      })
      setEmail("")
    } catch (error) {
      console.error("Error sending password reset email:", error)

      // Handle specific Firebase errors
      if (error instanceof Error) {
        if (error.message.includes("auth/user-not-found")) {
          setMessage({
            type: "error",
            text: "No account found with this email address.",
          })
        } else if (error.message.includes("auth/invalid-email")) {
          setMessage({
            type: "error",
            text: "Please enter a valid email address.",
          })
        } else {
          setMessage({
            type: "error",
            text: "Failed to send password reset email. Please try again.",
          })
        }
      } else {
        setMessage({
          type: "error",
          text: "An unexpected error occurred",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
      <Logo href="/" size="md" linkClassName="absolute top-8 left-8" />

      <div className="w-full max-w-md p-8 space-y-8 bg-black rounded-lg border border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-gray-400 mt-2">Enter your email to receive a password reset link</p>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-gray-800 border-white text-white placeholder:text-gray-400"
              required
            />
          </div>

          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-400">
          Remember your password?{" "}
          <Link href="/login" className="text-red-500 hover:text-red-400">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
