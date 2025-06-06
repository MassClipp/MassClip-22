"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateProfile } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, User, AtSign, FileText, ArrowLeft, Save } from "lucide-react"

export default function EditProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [originalUsername, setOriginalUsername] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [xHandle, setXHandle] = useState("")
  const [tiktokHandle, setTiktokHandle] = useState("")
  const [instagramHandle, setInstagramHandle] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setDisplayName(userData.displayName || user.displayName || "")
          setUsername(userData.username || "")
          setOriginalUsername(userData.username || "")
          setBio(userData.bio || "")
          setXHandle(userData.xHandle || "")
          setTiktokHandle(userData.tiktokHandle || "")
          setInstagramHandle(userData.instagramHandle || "")
        } else {
          // If user doc doesn't exist, initialize with auth data
          setDisplayName(user.displayName || "")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        setMessage({
          type: "error",
          text: "Failed to load profile data. Please try again.",
        })
      }
    }

    fetchUserProfile()
  }, [user, router])

  const isUsernameValid = (username: string) => {
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(username)
  }

  const checkUsernameAvailability = async (username: string) => {
    // Skip check if username hasn't changed
    if (username === originalUsername) return true

    try {
      // Query Firestore to check if username exists
      const usersRef = db.collection("users")
      const query = usersRef.where("username", "==", username.toLowerCase())
      const snapshot = await query.get()

      return snapshot.empty
    } catch (error) {
      console.error("Error checking username availability:", error)
      return false
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate username
    if (username && !isUsernameValid(username)) {
      setMessage({
        type: "error",
        text: "Username must be 3-20 characters and contain only letters, numbers, and underscores.",
      })
      return
    }

    setIsUpdating(true)
    setMessage(null)

    try {
      // Check username availability if it changed
      if (username !== originalUsername) {
        const isAvailable = await checkUsernameAvailability(username)
        if (!isAvailable) {
          setMessage({
            type: "error",
            text: "This username is already taken. Please choose another one.",
          })
          setIsUpdating(false)
          return
        }
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName,
      })

      // Update Firestore document
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        displayName: displayName,
        username: username.toLowerCase(),
        bio: bio,
        instagramHandle: instagramHandle,
        xHandle: xHandle,
        tiktokHandle: tiktokHandle,
        updatedAt: new Date(),
      })

      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      })

      // Update original username after successful update
      setOriginalUsername(username)
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage({
        type: "error",
        text: "Failed to update profile. Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-light tracking-tight text-white">Edit Profile</h1>
        </div>

        {message && (
          <Alert
            variant={message.type === "error" ? "destructive" : "default"}
            className="mb-6 border-gray-800 bg-black/80 backdrop-blur-sm"
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2 text-zinc-300">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span>Display Name</span>
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="border-zinc-700 bg-zinc-800/70 text-white focus-visible:ring-crimson"
                  placeholder="Your display name"
                />
                <p className="text-xs text-zinc-500">This is the name that will be displayed on your profile.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2 text-zinc-300">
                  <AtSign className="h-4 w-4 text-zinc-400" />
                  <span>Username</span>
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-zinc-700 bg-zinc-800/70 text-white focus-visible:ring-crimson"
                  placeholder="your_username"
                />
                <p className="text-xs text-zinc-500">
                  Your unique username for your profile URL: massclip.pro/creator/username
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2 text-zinc-300">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>Bio</span>
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[100px] border-zinc-700 bg-zinc-800/70 text-white focus-visible:ring-crimson"
                  placeholder="Tell others about yourself..."
                />
                <p className="text-xs text-zinc-500">A short bio to introduce yourself to others.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Social Links</h3>

                <div className="space-y-2">
                  <Label htmlFor="instagramHandle" className="flex items-center gap-2 text-zinc-300">
                    <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.205.012-3.584.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.354 0-3.745.013-5.032.078-3.666.208-6.146 2.705-6.354 6.354-.065 1.287-.078 1.677-.078 5.032 0 3.355.013 3.751.078 5.032.208 3.657 2.694 6.146 6.354 6.354 1.277.065 1.671.077 5.032.077 3.355 0 3.739-.013 5.032-.077 3.666-.208 6.146-2.704 6.354-6.354.065-1.287.077-1.671.077-5.032 0-3.355-.013-3.739-.077-5.032-.208-3.657-2.694-6.146-6.354-6.354-1.277-.065-1.671-.077-5.032-.077zm0 5.838a4.162 4.162 0 1 1 0 8.324 4.162 4.162 0 0 1 0-8.324zm0 1.136a3.026 3.026 0 1 0 0 6.052 3.026 3.026 0 0 0 0-6.052zm8.696-1.128a1.081 1.081 0 1 1 0 2.162 1.081 1.081 0 0 1 0-2.162z" />
                    </svg>
                    <span>Instagram</span>
                  </Label>
                  <Input
                    id="instagramHandle"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/70 text-white focus-visible:ring-crimson"
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xHandle" className="flex items-center gap-2 text-zinc-300">
                    <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>X (Twitter)</span>
                  </Label>
                  <Input
                    id="xHandle"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/70 text-white focus-visible:ring-crimson"
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktokHandle" className="flex items-center gap-2 text-zinc-300">
                    <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                    <span>TikTok</span>
                  </Label>
                  <Input
                    id="tiktokHandle"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/70 text-white focus-visible:ring-crimson"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-crimson hover:bg-crimson/90" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
