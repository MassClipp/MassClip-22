"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { validateUsername, isUsernameUnique } from "@/lib/username-validation"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function SetupProfileForm() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameError, setUsernameError] = useState("")
  const [isUsernameValid, setIsUsernameValid] = useState(false)

  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Debounced username check
  useEffect(() => {
    const validation = validateUsername(username)

    if (!validation.isValid) {
      setUsernameError(validation.message)
      setIsUsernameValid(false)
      return
    }

    // Check uniqueness after local validation passes
    const checkUniqueness = async () => {
      if (username.length >= 3) {
        setIsChecking(true)
        try {
          const unique = await isUsernameUnique(username)
          setIsUsernameValid(unique)
          setUsernameError(unique ? "" : "Username is already taken")
        } catch (error) {
          console.error("Error checking username:", error)
          setUsernameError("Error checking username availability")
        } finally {
          setIsChecking(false)
        }
      }
    }

    const timer = setTimeout(checkUniqueness, 500)
    return () => clearTimeout(timer)
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

    if (!isUsernameValid) {
      toast({
        title: "Invalid Username",
        description: usernameError || "Please choose a valid username",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create creator document
      await setDoc(doc(db, "creators", user.uid), {
        uid: user.uid,
        username: username.toLowerCase(),
        displayName: displayName || username,
        bio: bio || "",
        profilePic: user.photoURL || "",
        freeClips: [],
        paidClips: [],
        createdAt: serverTimestamp(),
      })

      // Update user document to mark profile as set up
      await setDoc(
        doc(db, "users", user.uid),
        {
          hasSetupProfile: true,
          username: username.toLowerCase(),
        },
        { merge: true },
      )

      toast({
        title: "Profile Created",
        description: "Your creator profile has been set up successfully!",
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error setting up profile:", error)
      toast({
        title: "Error",
        description: "Failed to set up your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-zinc-900 rounded-lg shadow-lg border border-zinc-800">
      <h1 className="text-2xl font-bold text-white mb-6">Set Up Your Creator Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-zinc-300">
            Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-crimson focus:border-transparent"
              placeholder="e.g. viralclips24"
              required
            />
            {isChecking && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-5 w-5 border-2 border-zinc-500 border-t-crimson rounded-full"></div>
              </div>
            )}
            {!isChecking && isUsernameValid && username.length >= 3 && (
              <div className="absolute right-3 top-2.5 text-green-500">✓</div>
            )}
          </div>
          {usernameError && <p className="text-sm text-red-500 mt-1">{usernameError}</p>}
          <p className="text-xs text-zinc-500 mt-1">
            This will be your profile URL: massclip.pro/creator/{username || "username"}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-300">
            Display Name (optional)
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-crimson focus:border-transparent"
            placeholder="Your brand or display name"
          />
          <p className="text-xs text-zinc-500 mt-1">
            This will be displayed on your profile page. If left empty, your username will be used.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-medium text-zinc-300">
            Bio (optional)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-crimson focus:border-transparent"
            placeholder="Tell visitors about yourself and your content"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={!isUsernameValid || isSubmitting}
          className="w-full py-2 px-4 bg-crimson hover:bg-crimson/90 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crimson disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Setting Up..." : "Create Profile"}
        </button>
      </form>
    </div>
  )
}
