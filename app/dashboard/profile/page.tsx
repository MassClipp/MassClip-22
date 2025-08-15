"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  User,
  Camera,
  Instagram,
  Twitter,
  Globe,
  Save,
  CheckCircle,
  ExternalLink,
  XCircle,
  Crown,
  RefreshCw,
} from "lucide-react"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import CancelSubscriptionButton from "@/components/cancel-subscription-button"
import { Badge } from "@/components/ui/badge"

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

  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [isOnline, setIsOnline] = useState(true)

  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        setLoading(true)
        console.log("🔍 Fetching user profile for:", user.uid)

        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log("✅ User data loaded:", userData)

          setDisplayName(userData.displayName || "")
          setUsername(userData.username || "")
          setBio(userData.bio || "")

          // Handle profile picture
          const profilePicUrl = userData.profilePic
          if (profilePicUrl) {
            const cacheBustedUrl = profilePicUrl.includes("?")
              ? `${profilePicUrl}&cb=${Date.now()}`
              : `${profilePicUrl}?cb=${Date.now()}`
            setProfilePic(cacheBustedUrl)
          } else {
            setProfilePic(null)
          }

          // Social links - handle both old and new structure
          const socialLinks = userData.socialLinks || {}
          setInstagramHandle(socialLinks.instagram || userData.instagramHandle || "")
          setTwitterHandle(socialLinks.twitter || userData.twitterHandle || "")
          setWebsiteUrl(socialLinks.website || userData.websiteUrl || "")
        } else {
          console.log("❌ No user document found, creating one...")
          // Create initial user document
          const initialData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "",
            username: "",
            bio: "",
            profilePic: user.photoURL || null,
            socialLinks: {
              instagram: "",
              twitter: "",
              website: "",
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          await setDoc(doc(db, "users", user.uid), initialData)
          console.log("✅ Initial user document created")

          // Set the state with initial data
          setDisplayName(initialData.displayName)
          setUsername(initialData.username)
          setBio(initialData.bio)
          setProfilePic(initialData.profilePic)
        }
      } catch (error) {
        console.error("❌ Error fetching user profile:", error)
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
  }, [user, toast])

  useEffect(() => {
    if (user) {
      fetchSubscriptionData()
    }
  }, [user])

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile picture must be less than 5MB",
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

    // Create preview for cropping
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setImageToCrop(imageUrl)
      setShowCropModal(true)
    }
    reader.readAsDataURL(file)
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        1, // aspect ratio 1:1 for square
        width,
        height,
      ),
      width,
      height,
    )
    setCrop(crop)
  }

  const getCroppedImg = (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio

    canvas.width = crop.width * pixelRatio * scaleX
    canvas.height = crop.height * pixelRatio * scaleY

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.imageSmoothingQuality = "high"

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY,
    )

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          }
        },
        "image/jpeg",
        0.9,
      )
    })
  }

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      setCroppedImageBlob(croppedBlob)

      // Create preview URL
      const previewUrl = URL.createObjectURL(croppedBlob)
      setProfilePicPreview(previewUrl)

      setShowCropModal(false)
      setImageToCrop(null)
    } catch (error) {
      console.error("Error cropping image:", error)
      toast({
        title: "Cropping failed",
        description: "Failed to crop image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to update your profile.",
        variant: "destructive",
      })
      return
    }

    if (!isOnline) {
      toast({
        title: "No internet connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      console.log("🔄 Starting profile update for user:", user.uid)

      let profilePicUrl = profilePic

      // Upload new profile pic if cropped
      if (croppedImageBlob) {
        console.log("📸 Uploading new profile picture...")

        try {
          // Get fresh auth token
          const idToken = await user.getIdToken(true)

          const formData = new FormData()
          formData.append("file", croppedImageBlob, "profile.jpg")
          formData.append("userId", user.uid)

          const uploadResponse = await fetch("/api/upload-profile-pic", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            throw new Error(`Upload failed: ${errorText}`)
          }

          const uploadResult = await uploadResponse.json()
          profilePicUrl = uploadResult.url
          console.log("✅ Profile picture uploaded:", profilePicUrl)
        } catch (uploadError) {
          console.error("❌ Profile picture upload failed:", uploadError)
          toast({
            title: "Upload failed",
            description: "Failed to upload profile picture. Continuing with other updates.",
            variant: "destructive",
          })
          // Continue with other updates even if image upload fails
        }
      }

      // Prepare profile data
      const profileData = {
        displayName: displayName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim(),
        profilePic: profilePicUrl,
        socialLinks: {
          instagram: instagramHandle.trim(),
          twitter: twitterHandle.trim(),
          website: websiteUrl.trim(),
        },
        email: user.email,
        updatedAt: serverTimestamp(),
      }

      console.log("💾 Updating user profile with data:", profileData)

      // Update user profile in Firestore
      const userDocRef = doc(db, "users", user.uid)

      // Check if document exists first
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userDocRef, profileData)
        console.log("✅ User profile updated successfully")
      } else {
        // Create new document with createdAt timestamp
        await setDoc(userDocRef, {
          ...profileData,
          uid: user.uid,
          createdAt: serverTimestamp(),
        })
        console.log("✅ User profile created successfully")
      }

      // Also update the creators collection if username exists
      if (username.trim()) {
        try {
          const creatorDocRef = doc(db, "creators", username.toLowerCase().trim())
          const creatorData = {
            uid: user.uid,
            username: username.toLowerCase().trim(),
            displayName: displayName.trim(),
            bio: bio.trim(),
            profilePic: profilePicUrl,
            email: user.email,
            updatedAt: serverTimestamp(),
          }

          const creatorDoc = await getDoc(creatorDocRef)

          if (creatorDoc.exists()) {
            await updateDoc(creatorDocRef, creatorData)
          } else {
            await setDoc(creatorDocRef, {
              ...creatorData,
              totalVideos: 0,
              totalDownloads: 0,
              totalEarnings: 0,
              isVerified: false,
              createdAt: serverTimestamp(),
            })
          }

          console.log("✅ Creator profile updated successfully")
        } catch (creatorError) {
          console.error("⚠️ Creator profile update failed:", creatorError)
          // Don't fail the whole operation if creator update fails
        }
      }

      // Clear the cropped image blob after successful upload
      setCroppedImageBlob(null)
      setProfilePicPreview(null)

      // Update the profile pic state with the new URL
      setProfilePic(profilePicUrl)

      // Show success message
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })

      // Refresh the page data
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("❌ Error updating profile:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleViewProfile = () => {
    if (username) {
      window.open(`/creator/${username}?updated=true`, "_blank")
    }
  }

  const fetchSubscriptionData = async () => {
    if (!user) return

    setLoadingSubscription(true)
    try {
      const response = await fetch("/api/membership-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (response.ok) {
        const data = await response.json()
        setSubscriptionData(data)
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error)
    } finally {
      setLoadingSubscription(false)
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
          <TabsTrigger value="membership">Membership</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm md:col-span-2">
              {!isOnline && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">
                    ⚠️ You appear to be offline. Changes may not save until your connection is restored.
                  </p>
                </div>
              )}
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
                          key={profilePicPreview || profilePic}
                          onError={(e) => {
                            console.error("Failed to load profile image:", e)
                            setProfilePic(null)
                          }}
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
                      required
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
                      required
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
                  <Button
                    type="submit"
                    disabled={saving || !displayName.trim() || !username.trim()}
                    className="ml-auto bg-red-600 hover:bg-red-700"
                  >
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
                        key={profilePicPreview || profilePic}
                        onError={(e) => {
                          console.error("Failed to load preview image:", e)
                        }}
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
                    className="w-full mt-6 border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    onClick={handleViewProfile}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Public Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="membership">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Membership & Billing</CardTitle>
              <CardDescription>Manage your subscription and billing information</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {loadingSubscription ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading subscription data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Plan */}
                  <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Current Plan</h3>
                      <Badge
                        variant={subscriptionData?.isActive ? "default" : "secondary"}
                        className={subscriptionData?.isActive ? "bg-green-600" : "bg-zinc-600"}
                      >
                        {subscriptionData?.plan === "creator_pro" ? "Creator Pro" : "Free"}
                      </Badge>
                    </div>

                    {subscriptionData?.isActive && subscriptionData?.currentPeriodEnd && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Next Billing:</span>
                        <span>{new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Plan Features */}
                  <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30">
                    <h3 className="text-lg font-medium mb-4">Plan Features</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        {subscriptionData?.plan === "creator_pro" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Unlimited Downloads</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {subscriptionData?.plan === "creator_pro" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Unlimited Bundles</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {subscriptionData?.plan === "creator_pro" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Unlimited Videos per Bundle</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {subscriptionData?.plan === "creator_pro" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Access to All Clips</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {subscriptionData?.plan === "creator_pro" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">No Watermark</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {subscriptionData?.plan === "creator_pro" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Only 10% Platform Fee</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    {subscriptionData?.plan !== "creator_pro" || !subscriptionData?.isActive ? (
                      <Button onClick={() => window.open("/pricing", "_blank")} className="bg-red-600 hover:bg-red-700">
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    ) : (
                      <div className="flex gap-4">
                        <Button
                          variant="outline"
                          onClick={fetchSubscriptionData}
                          disabled={loadingSubscription}
                          className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loadingSubscription ? "animate-spin" : ""}`} />
                          Refresh Status
                        </Button>

                        <CancelSubscriptionButton />
                      </div>
                    )}
                  </div>

                  {/* Billing History */}
                  {subscriptionData?.plan === "creator_pro" && subscriptionData?.isActive && (
                    <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30">
                      <h3 className="text-lg font-medium mb-4">Billing Information</h3>
                      <p className="text-sm text-zinc-400 mb-2">
                        For detailed billing history and invoices, please visit your Stripe customer portal.
                      </p>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/create-portal-session", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ userId: user?.uid }),
                            })

                            if (response.ok) {
                              const { url } = await response.json()
                              window.open(url, "_blank")
                            } else {
                              throw new Error("Failed to create portal session")
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Unable to access billing portal. Please try again.",
                              variant: "destructive",
                            })
                          }
                        }}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Billing Portal
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Crop Modal */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-medium text-white mb-4">Crop Profile Picture</h3>

            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageToCrop || "/placeholder.svg"}
                  onLoad={onImageLoad}
                  className="max-w-full h-auto"
                />
              </ReactCrop>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop(null)
                }}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button onClick={handleCropComplete} className="bg-red-600 hover:bg-red-700" disabled={!completedCrop}>
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
