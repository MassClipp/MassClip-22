"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AtSign, Check, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CreatorProfileSetup() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [instagram, setInstagram] = useState("")
  const [twitter, setTwitter] = useState("")
  const [youtube, setYoutube] = useState("")
  const [website, setWebsite] = useState("")

  const [usernameStatus, setUsernameStatus] = useState<"checking" | "available" | "unavailable" | "idle">("idle")
  const [usernameMessage, setUsernameMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "")
    }
  }, [user])

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameStatus("idle")
        setUsernameMessage("")
        return
      }

      setUsernameStatus("checking")

      try {
        // Check if username exists in Firebase
        const snapshot = await db.collection("creatorProfiles").where("username", "==", username.toLowerCase()).get()

        if (snapshot.empty) {
          setUsernameStatus("available")
          setUsernameMessage("Username is available")
        } else {
          setUsernameStatus("unavailable")
          setUsernameMessage("Username is already taken")
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameStatus("unavailable")
        setUsernameMessage("Error checking username")
      }
    }

    const debounce = setTimeout(checkUsername, 500)
    return () => clearTimeout(debounce)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    if (usernameStatus !== "available") {
      setError("Please choose an available username")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Create or update creator profile in Firebase
      const profileRef = db.collection("creatorProfiles").doc(user.uid)

      await profileRef.set(
        {
          username: username.toLowerCase(),
          displayName: displayName || user.displayName || "Creator",
          bio: bio || "",
          socialLinks: {
            instagram: instagram || "",
            twitter: twitter || "",
            youtube: youtube || "",
            website: website || "",
          },
          profileImage: "",
          coverImage: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          isVerified: false,
        },
        { merge: true },
      )

      toast({
        title: "Profile created!",
        description: "Your creator profile has been set up successfully.",
      })

      // Redirect to creator dashboard
      router.push("/dashboard/creator")
    } catch (error) {
      console.error("Error creating profile:", error)
      setError("Failed to create profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-crimson" />
              <span className="ml-2 text-gray-300">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Set Up Your Creator Profile</h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle>Your Public Profile URL</CardTitle>
            <CardDescription>
              Your profile will be accessible at:{" "}
              <span className="font-mono text-white">
                {window.location.origin}/creator/
                <span className="text-crimson">{username || "your-username"}</span>
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Set up your creator profile to start sharing your clips</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center">
                  <AtSign className="h-4 w-4 mr-1" />
                  Username (required)
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="pr-10"
                    placeholder="your_username"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                  {usernameStatus === "checking" && (
                    <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                  )}
                  {usernameStatus === "available" && (
                    <Check className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {usernameStatus === "unavailable" && <X className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />}
                </div>
                {usernameMessage && (
                  <p className={`text-sm ${usernameStatus === "available" ? "text-green-500" : "text-red-500"}`}>
                    {usernameMessage}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Only lowercase letters, numbers, and underscores. 3-30 characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself and your content"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400">{bio.length}/500 characters</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Social Links (Optional)</h3>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram Username</Label>
                  <Input
                    id="instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter Username</Label>
                  <Input
                    id="twitter"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube Channel</Label>
                  <Input
                    id="youtube"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="channel name or ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    type="url"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting || usernameStatus !== "available"}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Create Profile"
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
