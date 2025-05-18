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
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  // Set initial display name from user's display name if available
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName)
    }
  }, [user])

  // Check username availability with debounce
  useEffect(() => {
    if (!username) {
      setIsAvailable(null)
      setErrorMessage("")
      return
    }

    // Validate username format first
    const validation = validateUsername(username)
    if (!validation.isValid) {
      setIsAvailable(false)
      setErrorMessage(validation.message)
      return
    }

    const timer = setTimeout(async () => {
      setIsChecking(true)
      try {
        const response = await fetch(`/api/check-username?username=${username}`)
        const data = await response.json()

        setIsAvailable(data.available)
        setErrorMessage(data.available ? "" : data.message || "Username is already taken")
      } catch (error) {
        console.error("Error checking username:", error)
        setErrorMessage("Failed to check username availability")
      } finally {
        setIsChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !isAvailable) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/setup-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          displayName,
          bio,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to set up profile")
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error setting up profile:", error)
      setErrorMessage(error instanceof Error ? error.message : "Failed to set up profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Set Up Your Creator Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username (required)
          </label>
          <div className="relative">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                isAvailable === true
                  ? "border-green-500 focus:ring-green-500"
                  : isAvailable === false
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="e.g. johndoe"
              required
            />
            {isChecking && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="animate-spin h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            )}
            {!isChecking && isAvailable === true && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            This will be your unique URL: massclip.pro/creator/{username || "username"}
          </p>
          {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name (optional)
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. John Doe"
          />
          <p className="mt-1 text-sm text-gray-500">This is how your name will appear on your profile</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio (optional)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Tell people about yourself..."
          />
        </div>

        <button
          type="submit"
          disabled={!isAvailable || isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Setting Up..." : "Set Up Profile"}
        </button>
      </form>
    </div>
  )
}
