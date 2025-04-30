"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"

export default function PasswordResetForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/send-reset-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Something went wrong")
      }

      setMessage("If an account exists with this email, a password reset link has been sent.")
      setEmail("")
    } catch (err: any) {
      console.error("Password reset error:", err)
      setError(err.message || "Failed to send password reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="space-y-8 bg-black/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-xl">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Reset Password</h2>
          <p className="text-sm text-zinc-500">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {message && (
          <div className="animate-in fade-in slide-in-from-top duration-300 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-100">
            {message}
          </div>
        )}

        {error && (
          <div className="animate-in fade-in slide-in-from-top duration-300 rounded-lg bg-rose-50 p-4 text-sm text-rose-800 border border-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="name@example.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200 ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
