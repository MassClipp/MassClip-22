"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateProfile } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { Loader2, User, Clock, Mail, Info } from "lucide-react"

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
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading user profile...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-center text-3xl font-light tracking-tight text-white">Your Profile</h1>

        {message && (
          <Alert
            variant={message.type === "error" ? "destructive" : "default"}
            className="mb-6 border-gray-800 bg-black/80 backdrop-blur-sm"
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information Card */}
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5 text-crimson" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your display name</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">Email</span>
                  </div>
                  <p className="rounded-md bg-gray-800/50 px-3 py-2 text-gray-300">{user.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2 text-gray-300">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">Display Name</span>
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson"
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="submit"
                    className="border border-crimson bg-transparent text-white transition-all hover:bg-crimson/10"
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
                    className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800/70 hover:text-white"
                    onClick={handleSkip}
                    disabled={isUpdating || isRedirecting}
                  >
                    I'll do it later
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Information Card */}
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Info className="h-5 w-5 text-crimson" />
                Account Information
              </CardTitle>
              <CardDescription>Details about your account</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-md border border-gray-800 bg-gray-900/20 p-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Account Created</span>
                </div>
                <p className="text-sm text-gray-400">
                  {user.metadata.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Unknown"}
                </p>
              </div>

              <div className="space-y-3 rounded-md border border-gray-800 bg-gray-900/20 p-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Last Sign In</span>
                </div>
                <p className="text-sm text-gray-400">
                  {user.metadata.lastSignInTime
                    ? new Date(user.metadata.lastSignInTime).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Unknown"}
                </p>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                <p>
                  Note: If the page doesn't load after updating, please reload your page and click 'I'll do it later'.
                  Your display name will still be updated.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
