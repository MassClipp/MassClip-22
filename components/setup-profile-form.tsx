"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { validateUsername } from "@/lib/username-validation"

export function SetupProfileForm() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const router = useRouter()
  const { user } = useAuth()

  // Debounced username check
  useEffect(() => {
    if (!username) {
      setUsernameAvailable(null)
      return
    }

    const validation = validateUsername(username)
    if (!validation.isValid) {
      setUsernameAvailable(false)
      setErrorMessage(validation.message || "Invalid username")
      return
    }

    const timer = setTimeout(async () => {
      setIsChecking(true)
      try {
        const response = await fetch("/api/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        })

        const data = await response.json()
        setUsernameAvailable(data.available)
        if (!data.available) {
          setErrorMessage(data.message)
        } else {
          setErrorMessage("")
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setErrorMessage("Error checking username availability")
      } finally {
        setIsChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usernameAvailable) {
      setErrorMessage("Please choose a valid and available username")
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/setup-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, bio }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage("Profile created successfully!")
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setErrorMessage(data.message || "Error setting up profile")
      }
    } catch (error) {
      console.error("Error setting up profile:", error)
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Set Up Your Creator Profile</h1>

      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{successMessage}</div>}

      {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{errorMessage}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username (required)
          </label>
          <div className="relative">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className={`w-full px-3 py-2 border rounded-md ${
                username &&
                (usernameAvailable === null
                  ? "border-gray-300"
                  : usernameAvailable
                    ? "border-green-500"
                    : "border-red-500")
              }`}
              placeholder="e.g. viralclips24"
              required
            />
            {isChecking && <span className="absolute right-3 top-2 text-sm text-gray-500">Checking...</span>}
            {username && !isChecking && usernameAvailable !== null && (
              <span
                className={`absolute right-3 top-2 text-sm ${usernameAvailable ? "text-green-500" : "text-red-500"}`}
              >
                {usernameAvailable ? "Available" : "Unavailable"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Must be 3-20 characters, lowercase, and contain only letters, numbers, and underscores.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name (optional)
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g. Viral Clips 24"
          />
          <p className="mt-1 text-xs text-gray-500">
            This is how your name will appear on your profile. If left blank, your username will be used.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio (optional)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            placeholder="Tell visitors about yourself and your content..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !usernameAvailable}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Setting Up..." : "Create Profile"}
        </button>
      </form>
    </div>
  )
}
