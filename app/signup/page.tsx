"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/logo"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useFirebaseAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!termsAccepted) {
      setErrorMessage("You must accept the terms and conditions")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp(email, password)

      if (result.success) {
        // In a real app, you would store the user's name in Firestore or another database
        router.push("/dashboard")
      } else {
        setErrorMessage(result.error || "Failed to create account")
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
      <Logo href="/" size="md" linkClassName="absolute top-8 left-8" />

      <div className="w-full max-w-md p-8 space-y-8 bg-black rounded-lg border border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-2">Join the #1 clip vault for faceless creators</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-gray-800 border-white text-white placeholder:text-gray-400"
              required
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="bg-gray-800 border-white text-white placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-300">Must be at least 8 characters</p>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            />
            <Label htmlFor="terms" className="text-sm leading-tight text-white">
              I agree to the{" "}
              <Link href="/terms" className="text-red-500 hover:text-red-400">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-red-500 hover:text-red-400">
                Privacy Policy
              </Link>
            </Label>
          </div>

          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-red-500 hover:text-red-400">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
