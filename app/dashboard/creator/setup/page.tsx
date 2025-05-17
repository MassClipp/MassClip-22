"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { checkUsernameAvailability, updateCreatorProfile } from "@/app/actions/profile-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Instagram, Twitter, Youtube, Globe, AtSign, Check, X, Loader2, Info } from "lucide-react"
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

  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameStatus("idle")
        setUsernameMessage("")
        return
      }

      setUsernameStatus("checking")

      const result = await checkUsernameAvailability(username)

      if (result.available) {
        setUsernameStatus("available")
        setUsernameMessage("Username is available")
      } else {
        setUsernameStatus("unavailable")
        setUsernameMessage(result.message || "Username is not available")
      }
    }

    const debounce = setTimeout(checkUsername, 500)
    return () => clearTimeout(debounce)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (usernameStatus !== "available" && username.length > 0) {
      setError("Please choose a valid username")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const result = await updateCreatorProfile(user.uid, {
        username,
        displayName,
        bio,
        socialLinks: {
          instagram,
          twitter,
          youtube,
          website,
        },
      })

      if (result.success) {
        toast({
          title: "Profile updated",
          description: "Your creator profile has been set up successfully.",
        })
        router.push("/dashboard/creator")
      } else {
        setError(result.message || "Failed to update profile")
      }
    } catch (error) {
      setError("An unexpected error occurred")
      console.error(error)
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
        <h1 className="text-3xl font-light tracking-tight text-white mb-6 text-center">Set Up Your Creator Profile</h1>

        {error && (
          <Alert variant="destructive" className="mb-6 border-gray-800 bg-black/80 backdrop-blur-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Your Shareable Profile URL</CardTitle>
            <CardDescription>Choose a unique username to create your public profile link</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-md">
              <Info className="h-5 w-5 text-crimson" />
              <p className="text-sm text-gray-300">
                Your profile will be publicly accessible at:{" "}
                <span className="font-mono text-white">
                  {window.location.origin}/creator/
                  <span className="text-crimson">{username || "your-username"}</span>
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription>Set up your creator profile to start sharing your clips</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300 flex items-center">
                  <AtSign className="h-4 w-4 mr-1 text-gray-400" />
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="border-gray-700 bg-gray-800/70 text-white pr-10 focus-visible:ring-crimson"
                    placeholder="your_username"
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-gray-300">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson"
                  placeholder="Your Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-300">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson min-h-[100px]"
                  placeholder="Tell others about yourself and your content"
                />
                <p className="text-xs text-gray-400">{bio.length}/500 characters</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Social Links</h3>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-gray-300 flex items-center">
                    <Instagram className="h-4 w-4 mr-1 text-gray-400" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
                    className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson"
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter" className="text-gray-300 flex items-center">
                    <Twitter className="h-4 w-4 mr-1 text-gray-400" />
                    Twitter
                  </Label>
                  <Input
                    id="twitter"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson"
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube" className="text-gray-300 flex items-center">
                    <Youtube className="h-4 w-4 mr-1 text-gray-400" />
                    YouTube
                  </Label>
                  <Input
                    id="youtube"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson"
                    placeholder="channel name or ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-gray-300 flex items-center">
                    <Globe className="h-4 w-4 mr-1 text-gray-400" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="border-gray-700 bg-gray-800/70 text-white focus-visible:ring-crimson"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-gray-900/30 border-t border-gray-800 px-6 py-4">
            <div className="text-sm text-gray-400">
              <p>
                <strong className="text-white">Note:</strong> Your username cannot be changed once your profile gains
                followers or sales. Choose wisely!
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
