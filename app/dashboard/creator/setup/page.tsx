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
import { AtSign, Check, X, Loader2, AlertCircle } from "lucide-react"
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

  const [usernameStatus, setUsernameStatus] = useState<"checking" | "available" | "unavailable" | "idle" | "error">(
    "idle",
  )
  const [usernameMessage, setUsernameMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [bypassUsernameCheck, setBypassUsernameCheck] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [useServerFallback, setUseServerFallback] = useState(false)

  // Generate a suggested username when component mounts
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "")

      // Generate a simple username suggestion based on display name or email
      if (!username && (user.displayName || user.email)) {
        let suggestion = ""

        if (user.displayName) {
          suggestion = user.displayName
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
        } else if (user.email) {
          suggestion = user.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
        }

        // Add random numbers to make it more unique
        suggestion = `${suggestion}${Math.floor(Math.random() * 1000)}`

        // Ensure it's at least 3 characters
        if (suggestion.length < 3) {
          suggestion = `user_${Math.floor(Math.random() * 10000)}`
        }

        setUsername(suggestion.substring(0, 30)) // Limit to 30 chars
      }
    }
  }, [user, username])

  // Basic client-side username validation
  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return { isValid: false, message: "Username must be at least 3 characters" }
    }

    if (username.length > 30) {
      return { isValid: false, message: "Username must be less than 30 characters" }
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return { isValid: false, message: "Username can only contain lowercase letters, numbers, and underscores" }
    }

    return { isValid: true }
  }

  // Check username availability with direct Firestore query and extensive error handling
  useEffect(() => {
    const checkUsername = async () => {
      // Skip if bypass is enabled
      if (bypassUsernameCheck) {
        setUsernameStatus("available")
        setUsernameMessage("Username check bypassed")
        return
      }

      // Basic validation first
      const validation = validateUsername(username)
      if (!validation.isValid) {
        setUsernameStatus("unavailable")
        setUsernameMessage(validation.message || "Invalid username")
        return
      }

      setUsernameStatus("checking")
      setUsernameMessage("Checking availability...")

      try {
        console.log("Checking username availability for:", username)

        // Direct Firestore query with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Username check timed out")), 5000),
        )

        const queryPromise = db.collection("creatorProfiles").where("username", "==", username.toLowerCase()).get()

        // Race between query and timeout
        const snapshot = (await Promise.race([queryPromise, timeoutPromise])) as any

        console.log("Username check result:", snapshot.empty ? "Available" : "Taken")

        if (snapshot.empty) {
          setUsernameStatus("available")
          setUsernameMessage("Username is available")
        } else {
          setUsernameStatus("unavailable")
          setUsernameMessage("Username is already taken")
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameStatus("error")
        setUsernameMessage("Error checking username. You can still proceed.")

        // Show toast with option to bypass
        toast({
          title: "Username check failed",
          description:
            "We couldn't verify if this username is available. You can proceed anyway, but the username might need to be changed later if it's already taken.",
          variant: "destructive",
        })
      }
    }

    // Only check if username has at least 3 characters
    if (username.length >= 3) {
      const debounce = setTimeout(checkUsername, 500)
      return () => clearTimeout(debounce)
    } else {
      setUsernameStatus("idle")
      setUsernameMessage("")
    }
  }, [username, bypassUsernameCheck, toast])

  // Function to create profile using the API endpoint
  const createProfileViaAPI = async (profileData: any) => {
    if (!user) return { success: false, error: "No user authenticated" }

    try {
      // Get the current user's ID token
      const idToken = await user.getIdToken()

      // Call the API endpoint
      const response = await fetch("/api/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create profile via API")
      }

      return { success: true }
    } catch (error) {
      console.error("API profile creation error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Basic validation
    const validation = validateUsername(username)
    if (!validation.isValid) {
      setError(validation.message || "Invalid username")
      return
    }

    // Allow proceeding if bypass is enabled or status is available
    if (!bypassUsernameCheck && usernameStatus !== "available" && usernameStatus !== "error") {
      setError("Please choose an available username or enable bypass")
      return
    }

    setIsSubmitting(true)
    setError("")
    setDebugInfo(null)

    try {
      console.log("Creating profile with username:", username)

      // Prepare profile data
      const profileData = {
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
        userId: user.uid, // Add user ID for reference
        email: user.email, // Add email for reference
      }

      // Log the data we're trying to save
      console.log("Profile data to save:", JSON.stringify(profileData))

      let success = false

      // Try client-side first if not using server fallback
      if (!useServerFallback) {
        try {
          // Create or update creator profile in Firebase with retry logic
          const profileRef = db.collection("creatorProfiles").doc(user.uid)

          // Try up to 3 times
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`Attempt ${attempt} to save profile...`)
              await profileRef.set(profileData, { merge: true })
              console.log("Profile created successfully on attempt", attempt)
              success = true
              break
            } catch (err) {
              console.error(`Error on attempt ${attempt}:`, err)
              // Wait a bit before retrying
              if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
              }
            }
          }
        } catch (err) {
          console.error("All client-side attempts failed:", err)
        }
      }

      // If client-side failed or we're using server fallback, try the API
      if (!success) {
        console.log("Trying server-side API fallback...")
        const apiResult = await createProfileViaAPI(profileData)

        if (apiResult.success) {
          console.log("Profile created successfully via API")
          success = true
        } else {
          throw new Error(`API fallback failed: ${apiResult.error}`)
        }
      }

      if (!success) {
        throw new Error("Failed to create profile after all attempts")
      }

      toast({
        title: "Profile created!",
        description: "Your creator profile has been set up successfully.",
      })

      // Redirect to creator dashboard
      router.push("/dashboard/creator")
    } catch (error) {
      console.error("Error creating profile:", error)

      // Detailed error information for debugging
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : "No stack trace"

      setDebugInfo(`Error: ${errorMessage}\n\nStack: ${errorStack}`)

      setError("Failed to create profile. Please try again or contact support.")

      // Show more detailed toast with option to try server fallback
      toast({
        title: "Profile creation failed",
        description: "There was an error creating your profile. Try using the server fallback option.",
        variant: "destructive",
      })

      // Offer server fallback option
      setUseServerFallback(true)
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
                    onChange={(e) => {
                      const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                      setUsername(newUsername)
                      setBypassUsernameCheck(false) // Reset bypass when username changes
                    }}
                    className={`pr-10 ${
                      usernameStatus === "unavailable" || usernameStatus === "error" ? "border-red-500" : ""
                    }`}
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
                  {usernameStatus === "error" && (
                    <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-yellow-500" />
                  )}
                </div>
                {usernameMessage && (
                  <p
                    className={`text-sm ${
                      usernameStatus === "available"
                        ? "text-green-500"
                        : usernameStatus === "error"
                          ? "text-yellow-500"
                          : "text-red-500"
                    }`}
                  >
                    {usernameMessage}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Only lowercase letters, numbers, and underscores. 3-30 characters.
                </p>

                {/* Bypass option for when username check fails */}
                {usernameStatus === "error" && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBypassUsernameCheck(true)}
                      className="text-xs"
                    >
                      Bypass username check
                    </Button>
                    <p className="text-xs text-yellow-500 mt-1">
                      Note: If this username is already taken, you may need to change it later.
                    </p>
                  </div>
                )}
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

              <div className="pt-4 space-y-4">
                {useServerFallback && (
                  <Alert className="bg-amber-900/20 border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertDescription>
                      Using server fallback method. This may help resolve permission issues.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    (usernameStatus !== "available" && usernameStatus !== "error" && !bypassUsernameCheck)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Create Profile"
                  )}
                </Button>

                {error && !useServerFallback && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setUseServerFallback(true)}>
                    Try Server Fallback Method
                  </Button>
                )}
              </div>

              {/* Debug information section */}
              {debugInfo && (
                <div className="mt-6 p-4 bg-gray-900 rounded-md">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Information</h4>
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">{debugInfo}</pre>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
