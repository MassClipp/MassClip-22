"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/logo"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"

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
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <Logo href="/" size="md" linkClassName="absolute top-8 left-8 z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-8 bg-black/60 backdrop-blur-sm rounded-xl border border-gray-800 shadow-2xl relative z-10"
      >
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-bold text-white"
          >
            Reset your password
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-400 mt-2"
          >
            Enter your email to receive a password reset link
          </motion.p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
              className={
                message.type === "error"
                  ? "bg-red-900/20 border-red-900/30 text-red-400"
                  : "bg-green-900/20 border-green-900/30 text-green-400"
              }
            >
              <AlertDescription className="flex items-center">
                {message.type === "success" && <CheckCircle className="h-4 w-4 mr-2" />}
                {message.text}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-sm text-gray-400"
        >
          <Link href="/login" className="text-red-500 hover:text-red-400 transition-colors inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
