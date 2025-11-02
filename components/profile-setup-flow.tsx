"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, User, CheckCircle } from "lucide-react"

interface ProfileSetupFlowProps {
  onComplete: () => void
}

export default function ProfileSetupFlow({ onComplete }: ProfileSetupFlowProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)

  // Check if user profile exists
  useEffect(() => {
    const checkProfile = async () => {
      if (!user || !db) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Check if user has a complete profile
          if (userData.username && userData.displayName) {
            console.log("✅ User profile exists and is complete")
            onComplete()
            return
          }
        }

        // User needs profile setup
        console.log("📝 User needs profile setup")
        setNeedsSetup(true)

        // Pre-fill with available data
        setFormData({
          username: "",
          displayName: user.displayName || "",
          bio: "",
        })
      } catch (error) {
        console.error("Error checking profile:", error)
        toast({
          title: "Error",
          description: "Failed to check profile status",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    checkProfile()
  }, [user, onComplete, toast])

  // Check username availability
  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    try {
      const response = await fetch("/api/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()
      setUsernameAvailable(data.available)
    } catch (error) {
      console.error("Error checking username:", error)
      setUsernameAvailable(null)
    } finally {
      setCheckingUsername(false)
    }
  }

  // Handle username input change
  const handleUsernameChange = (value: string) => {
    const cleanUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, "")
    setFormData((prev) => ({ ...prev, username: cleanUsername }))

    // Debounce username check
    const timeoutId = setTimeout(() => {
      checkUsername(cleanUsername)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  // Submit profile setup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.username || !formData.displayName) return

    setSubmitting(true)
    try {
      // Create user profile
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username: formData.username,
        displayName: formData.displayName,
        bio: formData.bio,
        profilePic: user.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Reserve username
      await setDoc(doc(db, "usernames", formData.username), {
        uid: user.uid,
        createdAt: serverTimestamp(),
      })

      // Create creator profile
      await setDoc(doc(db, "creators", formData.username), {
        uid: user.uid,
        username: formData.username,
        displayName: formData.displayName,
        bio: formData.bio,
        profilePic: user.photoURL || null,
        totalVideos: 0,
        totalDownloads: 0,
        totalEarnings: 0,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "Profile Created!",
        description: "Your creator profile has been set up successfully.",
      })

      onComplete()
    } catch (error) {
      console.error("Error creating profile:", error)
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!needsSetup) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Set up your creator profile to start sharing content</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-200">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pr-10"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                  {!checkingUsername && usernameAvailable === true && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <div className="h-4 w-4 rounded-full bg-red-500" />
                  )}
                </div>
              </div>
              {usernameAvailable === false && <p className="text-xs text-red-400">Username is already taken</p>}
              {usernameAvailable === true && <p className="text-xs text-green-400">Username is available</p>}
              <p className="text-xs text-zinc-400">This will be your unique identifier and profile URL</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-zinc-200">
                Display Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="displayName"
                placeholder="Your Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
                required
                maxLength={50}
              />
              <p className="text-xs text-zinc-400">This is how your name will appear to others</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium text-zinc-200">
                Bio (Optional)
              </label>
              <Input
                id="bio"
                placeholder="Tell people about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
                maxLength={160}
              />
              <p className="text-xs text-zinc-400">{formData.bio.length}/160 characters</p>
            </div>

            <Button
              type="submit"
              disabled={submitting || !formData.username || !formData.displayName || usernameAvailable === false}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
