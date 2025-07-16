"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import Link from "next/link"

function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleGoogleSignup = async () => {
    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await signInWithGoogle(username, displayName)
      if (result.success) {
        toast({
          title: "Account created successfully!",
          description: "Welcome to MassClip",
        })
        router.push("/dashboard")
      } else {
        toast({
          title: "Signup failed",
          description: result.error || "Failed to create account with Google",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await signUp(email, password, username, displayName)
      if (result.success) {
        toast({
          title: "Account created successfully!",
          description: "Welcome to MassClip",
        })
        router.push("/dashboard")
      } else {
        toast({
          title: "Signup failed",
          description: result.error || "Failed to create account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleSignup = async () => {
    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Coming Soon",
      description: "Apple Sign In will be available soon",
    })
  }

  if (showEmailForm) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-zinc-400">Enter your details to get started</p>
        </div>

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
              required
            />
          </div>

          <div>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
              required
            />
          </div>

          <div>
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
              required
            />
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start space-x-2 py-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              className="border-zinc-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
            />
            <label htmlFor="terms" className="text-sm text-zinc-300 leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-red-400 hover:text-red-300 underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-red-400 hover:text-red-300 underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="text-center">
          <button onClick={() => setShowEmailForm(false)} className="text-zinc-400 hover:text-white text-sm">
            ← Back to other options
          </button>
        </div>

        <div className="text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-red-400 hover:text-red-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Start selling to your audience today</h1>
        <p className="text-zinc-400">Free plan available. No credit card required.</p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleGoogleSignup}
          disabled={isLoading}
          className="w-full bg-white hover:bg-gray-100 text-black font-medium py-3"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </Button>

        <Button
          onClick={handleAppleSignup}
          disabled={isLoading}
          className="w-full bg-black hover:bg-gray-900 text-white font-medium py-3 border border-zinc-700"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          )}
          Continue with Apple
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-2 text-zinc-400">or continue with email</span>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
          />

          <Button
            onClick={() => setShowEmailForm(true)}
            disabled={!email || isLoading}
            className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-3"
          >
            Continue with email
          </Button>
        </div>

        {/* Terms and Conditions Checkbox */}
        <div className="flex items-start space-x-2 py-4">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            className="border-zinc-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
          />
          <label htmlFor="terms" className="text-sm text-zinc-300 leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" className="text-red-400 hover:text-red-300 underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-red-400 hover:text-red-300 underline">
              Privacy Policy
            </Link>
          </label>
        </div>

        <div className="text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-red-400 hover:text-red-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-zinc-500 mt-8">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-zinc-400">
          Terms of Service
        </Link>
        . Read our{" "}
        <Link href="/privacy" className="underline hover:text-zinc-400">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  )
}

export { SignupForm }
export default SignupForm
