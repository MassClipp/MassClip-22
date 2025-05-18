"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { validateUsername, isUsernameAvailable, saveCreatorProfile } from "@/lib/creator-utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export function SetupProfileForm() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState("")

  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Check username validity and availability when it changes
  useEffect(() => {
    const checkUsername = async () => {
      if (!username) {
        setUsernameValid(null)
        setUsernameAvailable(null)
        setValidationMessage("")
        return
      }

      // Validate format
      const validation = validateUsername(username)
      setUsernameValid(validation.valid)

      if (!validation.valid) {
        setValidationMessage(validation.message || "Invalid username")
        setUsernameAvailable(null)
        return
      }

      // Check availability
      setIsCheckingUsername(true)
      try {
        const available = await isUsernameAvailable(username)
        setUsernameAvailable(available)
        setValidationMessage(available ? "Username is available" : "Username is already taken")
      } catch (error) {
        console.error("Error checking username:", error)
        setValidationMessage("Error checking username")
      } finally {
        setIsCheckingUsername(false)
      }
    }

    const debounceTimer = setTimeout(checkUsername, 500)
    return () => clearTimeout(debounceTimer)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to set up your profile",
        variant: "destructive",
      })
      return
    }

    if (!usernameValid || !usernameAvailable) {
      toast({
        title: "Invalid Username",
        description: validationMessage,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await saveCreatorProfile(user.uid, {
        username,
        displayName: displayName || username,
        bio,
      })

      toast({
        title: "Profile Created",
        description: "Your creator profile has been set up successfully!",
      })

      // Redirect to dashboard or profile page
      router.push(`/creator/${username}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set up profile",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-white">
          Username <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="your_username"
            className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 pr-10"
            required
          />
          {isCheckingUsername ? (
            <Loader2 className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 animate-spin" />
          ) : username ? (
            usernameValid && usernameAvailable ? (
              <CheckCircle className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
            )
          ) : null}
        </div>
        {validationMessage && (
          <p className={`text-xs ${usernameValid && usernameAvailable ? "text-green-500" : "text-red-400"}`}>
            {validationMessage}
          </p>
        )}
        <p className="text-xs text-gray-400">
          This will be your public URL: massclip.pro/creator/{username || "your_username"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-white">
          Display Name
        </Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your Brand Name"
          className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
        />
        <p className="text-xs text-gray-400">This is the name shown on your profile (leave blank to use username)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-white">
          Bio
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell visitors about your content..."
          className="bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 min-h-[100px]"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        disabled={isSubmitting || isCheckingUsername || !usernameValid || !usernameAvailable}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting Up Profile...
          </>
        ) : (
          "Create Profile"
        )}
      </Button>
    </form>
  )
}
