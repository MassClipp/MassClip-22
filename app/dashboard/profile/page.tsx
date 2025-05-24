"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, User, Camera, Instagram, Twitter, Globe, Save, CheckCircle } from "lucide-react"
import PremiumPricingControl from "@/components/premium-pricing-control"

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Profile state
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [profilePic, setProfilePic] = useState<string | null>(null)
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)

  // Social links
  const [instagramHandle, setInstagramHandle] = useState("")
  const [twitterHandle, setTwitterHandle] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        setLoading(true)
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setDisplayName(userData.displayName || "")
          setUsername(userData.username || "")
          setBio(userData.bio || "")
          setProfilePic(userData.profilePic || null)

          // Social links
          setInstagramHandle(userData.socialLinks?.instagram || "")
          setTwitterHandle(userData.socialLinks?.twitter || "")
          setWebsiteUrl(userData.socialLinks?.website || "")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user])

  // Handle profile picture change
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile picture must be less than 2MB",
        variant: "destructive",
      })
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    setNewProfilePic(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setProfilePicPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      setSaving(true)

      // Upload new profile pic if selected
      let profilePicUrl = profilePic

      if (newProfilePic) {
        const storageRef = ref(storage, `profile_pics/${user.uid}`)
        await uploadBytes(storageRef, newProfilePic)
        profilePicUrl = await getDownloadURL(storageRef)
      }

      // Update user profile in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        username,
        bio,
        profilePic: profilePicUrl,
        socialLinks: {
          instagram: instagramHandle,
          twitter: twitterHandle,
          website: websiteUrl,
        },
        updatedAt: new Date(),
      })

      // Show success message
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your creator profile and settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="premium">Premium Content</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm md:col-span-2">
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your profile details and social links</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center space-y-4">
                    <div
                      className="relative w-24 h-24 rounded-full overflow-hidden bg-zinc-800 cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {profilePicPreview || profilePic ? (
                        <img
                          src={profilePicPreview || profilePic || ""}
                          alt={displayName || "Profile"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-4xl font-light">
                          {displayName ? displayName.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-6 w-6 text-white" />
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePicChange}
                      />
                    </div>
                    <p className="text-sm text-zinc-400">Click to change profile picture</p>
                  </div>

                  {/* Display Name */}
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white mt-1.5"
                      placeholder="Your display name"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white mt-1.5"
                      placeholder="username"
                    />
                    <p className="text-xs text-zinc-500 mt-1.5">
                      This will be your profile URL: massclip.pro/creator/{username || "username"}
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white mt-1.5 resize-none"
                      placeholder="Tell viewers about yourself"
                      rows={4}
                    />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-white">Social Links</h3>

                    <div>
                      <Label htmlFor="instagram" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-zinc-400" />
                        Instagram
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">@</span>
                        <Input
                          id="instagram"
                          value={instagramHandle}
                          onChange={(e) => setInstagramHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
                          className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white pl-8"
                          placeholder="username"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="twitter" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-zinc-400" />
                        Twitter
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">@</span>
                        <Input
                          id="twitter"
                          value={twitterHandle}
                          onChange={(e) => setTwitterHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                          className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white pl-8"
                          placeholder="username"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="website" className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-zinc-400" />
                        Website
                      </Label>
                      <Input
                        id="website"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white mt-1.5"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-zinc-800/50 pt-6">
                  <Button type="submit" disabled={saving} className="ml-auto bg-red-600 hover:bg-red-700">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Profile Preview</CardTitle>
                <CardDescription>How others will see your profile</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 mb-4">
                    {profilePicPreview || profilePic ? (
                      <img
                        src={profilePicPreview || profilePic || ""}
                        alt={displayName || "Profile"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-3xl font-light">
                        {displayName ? displayName.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-medium text-white">{displayName || "Your Name"}</h3>

                  <p className="text-sm text-zinc-400 mb-4">@{username || "username"}</p>

                  {bio && <p className="text-sm text-zinc-300 mb-4 line-clamp-4">{bio}</p>}

                  <div className="flex gap-2 mt-2">
                    {instagramHandle && (
                      <div className="p-2 rounded-full bg-zinc-800">
                        <Instagram className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}

                    {twitterHandle && (
                      <div className="p-2 rounded-full bg-zinc-800">
                        <Twitter className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}

                    {websiteUrl && (
                      <div className="p-2 rounded-full bg-zinc-800">
                        <Globe className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                  </div>
                </div>

                {username && (
                  <Button
                    variant="outline"
                    className="w-full mt-6 border-zinc-700 hover:bg-zinc-800"
                    onClick={() => window.open(`/creator/${username}`, "_blank")}
                  >
                    View Public Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="premium">
          <div className="grid grid-cols-1 gap-6">
            {user && <PremiumPricingControl creatorId={user.uid} username={username} isOwner={true} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
