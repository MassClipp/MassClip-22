"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, Shield, Loader2 } from "lucide-react"

export default function PasswordResetForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [focused, setFocused] = useState(false)
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
    <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-12 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700">
            <Shield className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          {/* Form Header */}
          <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-8 py-6">
            <h2 className="text-center text-xl font-medium text-zinc-900">Reset your password</h2>
            <p className="mt-1 text-center text-sm text-zinc-500">We'll send you instructions to reset your password</p>
          </div>

          {/* Form Body */}
          <div className="px-8 py-8">
            {message && (
              <div className="mb-6 animate-in fade-in slide-in-from-top duration-300 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-100">
                <div className="flex">
                  <svg className="h-5 w-5 text-emerald-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p>{message}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 animate-in fade-in slide-in-from-top duration-300 rounded-lg bg-rose-50 p-4 text-sm text-rose-800 border border-rose-100">
                <div className="flex">
                  <svg className="h-5 w-5 text-rose-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  Email address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail
                      className={`h-5 w-5 ${focused ? "text-blue-600" : "text-zinc-400"} transition-colors duration-200`}
                    />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className={`block w-full rounded-lg border ${
                      focused ? "border-blue-600 ring-2 ring-blue-100" : "border-zinc-200"
                    } bg-white px-4 py-3 pl-11 text-zinc-900 placeholder-zinc-400 shadow-sm transition-all duration-200 focus:outline-none`}
                    placeholder="name@company.com"
                    required
                    disabled={isLoading}
                    aria-describedby="email-description"
                  />
                </div>
                <p id="email-description" className="text-xs text-zinc-500">
                  We'll never share your email with anyone else.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending instructions...
                  </>
                ) : (
                  <>
                    Send reset instructions
                    <span className="absolute inset-y-0 right-4 flex items-center pl-3">
                      <svg
                        className="h-5 w-5 text-blue-300 group-hover:text-blue-200"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Form Footer */}
          <div className="border-t border-zinc-100 bg-zinc-50 px-8 py-4">
            <button
              onClick={() => router.push("/login")}
              className="group flex w-full items-center justify-center text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-600" />
              Back to login
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-center space-x-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            <svg className="h-3.5 w-3.5 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Enterprise-grade security</span>
          </div>
        </div>
      </div>
    </div>
  )
}
