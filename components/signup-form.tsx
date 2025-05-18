"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import GoogleAuthButton from "@/components/google-auth-button"
import { isValidUsername } from "@/lib/username-validation"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">(
    "idle",
  )
  const router = useRouter()
  const { toast } = useToast()

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle")
      return
    }

    if (!isValidUsername(username)) {
      setUsernameStatus("invalid")
      return
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking")
      try {
        const response = await fetch(`/api/check-username?username=${username}`)
        const data = await response.json()
        setUsernameStatus(data.available ? "available" : "unavailable")
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameStatus("idle")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (usernameStatus !== "available") {
      toast({
        title: "Invalid username",
        description:
          usernameStatus === "invalid"
            ? "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores"
            : "Username is already taken",
        variant: "destructive",
      })
      return
    }

    if (!displayName) {
      toast({
        title: "Display name required",
        description: "Please enter a display name",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update user profile with display name
      await updateProfile(user, { displayName })

      // Get ID token for server-side verification
      const idToken = await user.getIdToken()

      // Create user profile in Firestore
      const response = await fetch("/api/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          username,
          displayName,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to create profile")
      }

      // Redirect to creator profile
      router.push(`/creator/${username}`)
    } catch (error: any) {
      console.error("Signup error:", error)
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className={`${
                usernameStatus === "available"
                  ? "border-green-500"
                  : usernameStatus === "unavailable" || usernameStatus === "invalid"
                    ? "border-red-500"
                    : ""
              }`}
              required
            />
            {usernameStatus === "checking" && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
              </div>
            )}
            {usernameStatus === "available" && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">✓</div>
            )}
            {(usernameStatus === "unavailable" || usernameStatus === "invalid") && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">✗</div>
            )}
          </div>
          {usernameStatus === "invalid" && (
            <p className="text-xs text-red-500">
              Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores
            </p>
          )}
          {usernameStatus === "unavailable" && <p className="text-xs text-red-500">Username is already taken</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || usernameStatus !== "available"}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <GoogleAuthButton disabled={isLoading} />
    </div>
  )
}
