"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateProfile } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()

  // Update the fetchUserProfile function to handle offline scenarios better
  const fetchUserProfile = async () => {
    if (!user) return

    try {
      // Skip Firestore operations if Firebase is not configured or offline
      if (!isFirebaseConfigured) {
        console.log("Firebase not configured, skipping Firestore fetch")
        return
      }

      // Add a try/catch specifically for the Firestore operations
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists() && userDoc.data().displayName) {
          setDisplayName(userDoc.data().displayName)
        }
      } catch (firestoreError) {
        console.log("Firestore operation failed (continuing anyway):", firestoreError)
        // Don't let this error affect the rest of the component
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      // Don't let this error affect the rest of the component
    }
  }

  useEffect(() => {
    // Fetch user profile data from Firestore if available
    fetchUserProfile()
  }, [user])

  // Update the handleUpdateProfile function to fix the loading and redirect issues

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsUpdating(true)
    setMessage(null)

    try {
      console.log("Starting profile update...")

      // Update Firebase Auth profile - this should work even if Firestore is offline
      try {
        await updateProfile(user, {
          displayName: displayName,
        })
        console.log("Firebase Auth profile updated successfully")
      } catch (authError) {
        console.error("Error updating Firebase Auth profile:", authError)
        throw new Error("Failed to update profile information")
      }

      // Only try to update Firestore if Firebase is configured
      if (isFirebaseConfigured) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              displayName: displayName,
              email: user.email,
              updatedAt: new Date(),
            },
            { merge: true },
          )
          console.log("Firestore profile updated successfully")
        } catch (firestoreError) {
          console.error("Error updating Firestore (continuing anyway):", firestoreError)
          // Continue with the profile update even if Firestore fails
        }
      }

      setMessage({
        type: "success",
        text: "Profile updated successfully! Redirecting to your dashboard...",
      })

      // Add a delay before redirecting to ensure the UI updates
      setTimeout(() => {
        setIsRedirecting(true)
        console.log("Redirecting to dashboard...")
        router.push("/dashboard/user")
      }, 1500) // Give time for the success message to be seen
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
      })
      setIsRedirecting(false)
      setIsUpdating(false) // Make sure to reset the updating state on error
    }
  }

  const handleSkip = () => {
    setIsRedirecting(true)
    router.push("/dashboard/user")
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 bg-black">
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-black rounded-lg border border-gray-800">
          <p className="text-white">Loading user profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 bg-black">
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-black rounded-lg border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-6">Your Profile</h1>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-6">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <p className="text-white mb-1">Email</p>
            <p className="text-white font-medium">{user.email}</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                className="border border-crimson bg-transparent text-white hover:bg-crimson/10"
                disabled={isUpdating || isRedirecting}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                  </>
                ) : isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="border-crimson bg-transparent text-white hover:bg-crimson/10"
                onClick={handleSkip}
                disabled={isUpdating || isRedirecting}
              >
                I'll do it later
              </Button>

              {/* Add the explanation text */}
              <div className="mt-3 sm:mt-0 sm:ml-3 text-sm text-gray-400 max-w-md">
                Note: If the page doesn't load after updating, please reload your page and click 'I'll do it later'.
                Your display name will still be updated.
              </div>
            </div>
          </form>

          <div className="pt-4 border-t border-gray-800">
            <p className="text-white mb-2">Account Information</p>
            <p className="text-sm text-gray-500">
              Account created:{" "}
              {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleString() : "Unknown"}
            </p>
            <p className="text-sm text-gray-500">
              Last sign in:{" "}
              {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
