"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
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
  RefreshCw,
  Lock,
} from "lucide-react"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import CancelSubscriptionButton from "@/components/cancel-subscription-button"
import { Badge } from "@/components/ui/badge"
import { safelyFormatDate } from "@/lib/date-utils"
import { fetchSubscriptionData } from "@/lib/subscription-utils"
import { fetchPublicUrl } from "@/lib/get-public-url"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [profileData, setProfileData] = useState({
    displayName: "",
    username: "",
    bio: "",
    profilePic: null as string | null,
    socialLinks: {
      instagram: "",
      twitter: "",
      website: "",
    },
  })

  const [newProfilePic, setNewProfilePic] = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)

  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [isOnline, setIsOnline] = useState(true)

  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(false)
  const [trialStatus, setTrialStatus] = useState<{
    isOnTrial: boolean
    daysRemaining: number
    trialEndDate: string | null
  } | null>(null)

  const isProUser =
    (subscriptionData?.plan === "facelessprenuer" || subscriptionData?.plan === "faceless_pro") &&
    subscriptionData?.isActive

  const [publicUrl, setPublicUrl] = useState<string>("")

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

  useEffect(() => {
    const loadPublicUrl = async () => {
      if (user && profileData.username) {
        const url = await fetchPublicUrl(user.uid, profileData.username)
        setPublicUrl(url)
      }
    }

    if (!loading && profileData.username) {
      loadPublicUrl()
    }
  }, [user, profileData.username, loading])

  const fetchProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log("[v0] Fetching profile for user:", user.uid)

      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists()) {
        const data = userDoc.data()
        console.log("[v0] Profile data from database:", data)

        setProfileData({
          displayName: data.displayName || "",
          username: data.username || "",
          bio: data.bio || "",
          profilePic: data.profilePic || null,
          socialLinks: {
            instagram: data.socialLinks?.instagram || "",
            twitter: data.socialLinks?.twitter || "",
            website: data.socialLinks?.website || "",
          },
        })
      } else {
        // Create initial profile
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

        setProfileData({
          displayName: initialData.displayName,
          username: initialData.username,
          bio: initialData.bio,
          profilePic: initialData.profilePic,
          socialLinks: initialData.socialLinks,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchSubscriptionData(user, setSubscriptionData, setLoadingSubscription)
      fetchTrialStatus()
    }
  }, [user])

  const fetchTrialStatus = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/user/trial-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTrialStatus(data)
      }
    } catch (error) {
      console.error("Error fetching trial status:", error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      console.log("[v0] Saving profile data:", profileData)

      const updateData = {
        displayName: profileData.displayName.trim(),
        username: profileData.username.toLowerCase().trim(),
        bio: profileData.bio.trim(),
        socialLinks: {
          instagram: profileData.socialLinks.instagram.trim(),
          twitter: profileData.socialLinks.twitter.trim(),
          website: profileData.socialLinks.website.trim(),
        },
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, "users", user.uid), updateData, { merge: true })
      console.log("[v0] Profile saved successfully")

      // Refresh data from database
      await fetchProfile()

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      })
    } catch (error) {
      console.error("[v0] Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateProfileData = (field: string, value: string) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setProfileData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }))
    } else {
      setProfileData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

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

  const handleCropComplete = async (
    crop: Crop | undefined,
    setImageToCrop: any,
    setShowCropModal: any,
    setProfilePicPreview: any,
    setNewProfilePic: any,
  ) => {
    if (!crop || !imgRef.current) return

    const canvas = document.createElement("canvas")
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
    const ctx = canvas.getContext("2d")

    canvas.width = crop.width * scaleX
    canvas.height = crop.height * scaleY

    if (ctx) {
      ctx.drawImage(
        imgRef.current,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY,
      )
    }

    const croppedImageBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve)
    })

    if (croppedImageBlob) {
      setProfilePicPreview(URL.createObjectURL(croppedImageBlob))
      setNewProfilePic(croppedImageBlob)
    }

    setShowCropModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 px-3 sm:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-zinc-800/50">
        <div className="space-y-2 w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Profile Settings</h1>
          <p className="text-sm sm:text-base text-zinc-400">Manage your creator profile and settings</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50 w-full sm:w-auto grid grid-cols-4 sm:flex">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">
            Profile
          </TabsTrigger>
          <TabsTrigger value="membership" className="text-xs sm:text-sm">
            Membership
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm">
            Security
          </TabsTrigger>
          <TabsTrigger value="domain" className="text-xs sm:text-sm">
            Domain
          </TabsTrigger>
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
              <form onSubmit={handleSave}>
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
                      {profilePicPreview || profileData.profilePic ? (
                        <img
                          src={profilePicPreview || profileData.profilePic || ""}
                          alt={profileData.displayName || "Profile"}
                          className="w-full h-full object-cover"
                          key={profilePicPreview || profileData.profilePic}
                          onError={(e) => {
                            console.error("Failed to load profile image:", e)
                            setProfileData((prev) => ({ ...prev, profilePic: null }))
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-4xl font-light">
                          {profileData.displayName ? (
                            profileData.displayName.charAt(0).toUpperCase()
                          ) : (
                            <User className="h-8 w-8" />
                          )}
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
                      value={profileData.displayName}
                      onChange={(e) => updateProfileData("displayName", e.target.value)}
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
                      value={profileData.username}
                      onChange={(e) =>
                        updateProfileData("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white mt-1.5"
                      placeholder="username"
                      required
                    />
                    <p className="text-xs text-zinc-500 mt-1.5">
                      This will be your profile URL: massclip.pro/creator/{profileData.username || "username"}
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => updateProfileData("bio", e.target.value)}
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
                          value={profileData.socialLinks.instagram}
                          onChange={(e) =>
                            updateProfileData("socialLinks.instagram", e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))
                          }
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
                          value={profileData.socialLinks.twitter}
                          onChange={(e) =>
                            updateProfileData("socialLinks.twitter", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                          }
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
                        value={profileData.socialLinks.website}
                        onChange={(e) => updateProfileData("socialLinks.website", e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white mt-1.5"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-zinc-800/50 pt-6">
                  <Button
                    type="submit"
                    disabled={saving || !profileData.displayName.trim() || !profileData.username.trim()}
                    className="ml-auto bg-white hover:bg-gray-100 text-black"
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
                    {profilePicPreview || profileData.profilePic ? (
                      <img
                        src={profilePicPreview || profileData.profilePic || ""}
                        alt={profileData.displayName || "Profile"}
                        className="w-full h-full object-cover"
                        key={profilePicPreview || profileData.profilePic}
                        onError={(e) => {
                          console.error("Failed to load preview image:", e)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-3xl font-light">
                        {profileData.displayName ? (
                          profileData.displayName.charAt(0).toUpperCase()
                        ) : (
                          <User className="h-6 w-6" />
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-medium text-white">{profileData.displayName || "Your Name"}</h3>

                  <p className="text-sm text-zinc-400 mb-4">@{profileData.username || "username"}</p>

                  {profileData.bio && <p className="text-sm text-zinc-300 mb-4 line-clamp-4">{profileData.bio}</p>}

                  <div className="flex gap-2 mt-2">
                    {profileData.socialLinks.instagram && (
                      <div className="p-2 rounded-full bg-zinc-800">
                        <Instagram className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}

                    {profileData.socialLinks.twitter && (
                      <div className="p-2 rounded-full bg-zinc-800">
                        <Twitter className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}

                    {profileData.socialLinks.website && (
                      <div className="p-2 rounded-full bg-zinc-800">
                        <Globe className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                  </div>
                </div>

                {profileData.username && (
                  <Button
                    variant="outline"
                    className="w-full mt-6 border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    onClick={() => {
                      if (publicUrl && publicUrl.startsWith("https://")) {
                        window.open(publicUrl, "_blank")
                      } else {
                        router.push(publicUrl || `/creator/${profileData.username}`)
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Public Profile
                  </Button>
                )}

                {publicUrl && (
                  <p className="text-xs text-zinc-500 mt-2 text-center break-all">
                    {publicUrl.startsWith("https://") ? publicUrl.replace("https://", "") : `massclip.pro${publicUrl}`}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="membership">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Membership & Billing</CardTitle>
              <CardDescription>Manage your subscription and billing information</CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {loadingSubscription ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-3 text-zinc-400" />
                  <span className="text-zinc-400">Loading subscription data...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {!subscriptionData?.isActive && !trialStatus?.isOnTrial ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                      <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-zinc-400" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-white">Start Selling Your Content</h3>
                        <p className="text-zinc-400 max-w-md">
                          Upgrade to a paid plan to unlock all features and start monetizing your content.
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push("/dashboard/upgrade")}
                        className="bg-white hover:bg-gray-100 text-black font-medium px-8 py-6 text-lg"
                      >
                        Upgrade to Start Selling
                      </Button>
                    </div>
                  ) : (
                    <>
                      {trialStatus?.isOnTrial && (
                        <div
                          className={`p-4 rounded-lg border ${
                            trialStatus.daysRemaining <= 1
                              ? "bg-orange-900/20 border-orange-500/50"
                              : "bg-cyan-900/20 border-cyan-500/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                trialStatus.daysRemaining <= 1 ? "bg-orange-500" : "bg-cyan-500"
                              }`}
                            ></div>
                            <div className="flex-1">
                              <p
                                className={`font-medium mb-1 ${
                                  trialStatus.daysRemaining <= 1 ? "text-orange-200" : "text-cyan-200"
                                }`}
                              >
                                Free Trial Active
                              </p>
                              <p
                                className={`text-sm leading-relaxed ${
                                  trialStatus.daysRemaining <= 1 ? "text-orange-300/80" : "text-cyan-300/80"
                                }`}
                              >
                                You have {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"}{" "}
                                remaining in your 3-day Creator VIP trial. Your trial ends on{" "}
                                {trialStatus.trialEndDate
                                  ? new Date(trialStatus.trialEndDate).toLocaleDateString("en-US", {
                                      month: "long",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "soon"}
                                .
                              </p>
                              {trialStatus.daysRemaining <= 1 && (
                                <p className="text-sm text-orange-200 mt-2 font-medium">
                                  ⚠️ Your trial is ending soon! Upgrade now to keep your Creator VIP features.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-white">Current Plan</h3>
                          <Badge
                            variant={subscriptionData?.isActive ? "default" : "secondary"}
                            className={`px-3 py-1 font-medium ${
                              subscriptionData?.isActive
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-zinc-600 hover:bg-zinc-700 text-zinc-200"
                            }`}
                          >
                            {trialStatus?.isOnTrial
                              ? "Facelessprenuer (Trial)"
                              : subscriptionData?.plan === "facelessprenuer"
                                ? "Facelessprenuer"
                                : subscriptionData?.plan === "faceless_pro"
                                  ? "Faceless Pro"
                                  : "Free"}
                          </Badge>
                        </div>

                        {subscriptionData?.cancelAtPeriodEnd || subscriptionData?.status === "canceled" ? (
                          <div className="p-3 rounded-md bg-amber-900/20 border border-amber-500/30">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                              <div>
                                <p className="text-amber-200 text-sm font-medium mb-1">
                                  {trialStatus?.isOnTrial ? "Trial Canceled" : "Subscription Canceled"}
                                </p>
                                <p className="text-amber-300/80 text-xs leading-relaxed">
                                  {trialStatus?.isOnTrial ? (
                                    <>
                                      Your free trial will end in {trialStatus.daysRemaining}{" "}
                                      {trialStatus.daysRemaining === 1 ? "day" : "days"}
                                      {trialStatus.trialEndDate &&
                                        ` on ${new Date(trialStatus.trialEndDate).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}`}
                                      . After this, you will lose access to selling features and your storefront will be
                                      automatically disabled.
                                    </>
                                  ) : (
                                    <>
                                      Your{" "}
                                      {subscriptionData?.plan === "facelessprenuer"
                                        ? "Facelessprenuer"
                                        : "Faceless Pro"}{" "}
                                      access continues until {safelyFormatDate(subscriptionData.currentPeriodEnd)}.
                                      After this date, you will lose access to selling features and your storefront will
                                      be automatically disabled.
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : subscriptionData?.isActive ? (
                          <div className="p-3 rounded-md bg-emerald-900/20 border border-emerald-500/30">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                              <div>
                                <p className="text-emerald-200 text-sm font-medium mb-1">Active Subscription</p>
                                <p className="text-emerald-300/80 text-xs leading-relaxed">
                                  Your subscription will automatically renew on{" "}
                                  {safelyFormatDate(subscriptionData.currentPeriodEnd)}.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white">Plan Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {subscriptionData?.plan === "facelessprenuer" && subscriptionData?.isActive ? (
                            <>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">Unlimited Folders with Subfolders</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">Unlimited Bundles</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">Unlimited Videos per Bundle</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">Full Vex AI - Bundle Creation</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">Transcript Analysis</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">Only 10% Platform Fee</span>
                              </div>
                            </>
                          ) : subscriptionData?.plan === "faceless_pro" && subscriptionData?.isActive ? (
                            <>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">3 folders with subfolders</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">5 bundles max on storefront</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">15 videos per bundle limit</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">
                                  Basic Vex AI - file metadata & folder organization
                                </span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-zinc-200">20% platform fee on sales</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                                <span className="text-sm text-zinc-300">3 folders with subfolders</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                                <span className="text-sm text-zinc-300">5 bundles max on storefront</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                                <span className="text-sm text-zinc-300">15 videos per bundle limit</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                                <span className="text-sm text-zinc-300">
                                  Basic Vex AI - file metadata & folder organization
                                </span>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-800/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                                <span className="text-sm text-zinc-300">20% Platform Fee on sales</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-800/50">
                        {(subscriptionData?.plan !== "facelessprenuer" && subscriptionData?.plan !== "faceless_pro") ||
                        !subscriptionData?.isActive ? (
                          <Button
                            onClick={() => router.push("/dashboard/upgrade")}
                            className="bg-white hover:bg-gray-100 text-black font-medium px-6"
                          >
                            Upgrade to Pro
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => fetchSubscriptionData(user, setSubscriptionData, setLoadingSubscription)}
                              disabled={loadingSubscription}
                              className="border-zinc-600 hover:bg-zinc-800 bg-transparent text-zinc-200 font-medium"
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${loadingSubscription ? "animate-spin" : ""}`} />
                              Refresh Status
                            </Button>

                            {subscriptionData?.cancelAtPeriodEnd || subscriptionData?.status === "canceled" ? (
                              <Button
                                onClick={() => router.push("/dashboard/upgrade")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6"
                              >
                                Reactivate Subscription
                              </Button>
                            ) : (
                              <CancelSubscriptionButton />
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Security Settings</CardTitle>
              <CardDescription>Manage your account security and password</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Security Center</h3>
                <p className="text-zinc-400 mb-6">
                  Access comprehensive security settings including password management, account protection, and security
                  tips.
                </p>

                <Button
                  onClick={() => router.push("/dashboard/security")}
                  className="bg-white hover:bg-gray-100 text-black font-medium px-6"
                >
                  Go to Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Custom Domain</CardTitle>
              <CardDescription>Use your own domain for your storefront</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <Globe className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Custom Domain Management</h3>
                <p className="text-zinc-400 mb-6">
                  Manage your custom domain settings, DNS configuration, and domain verification all in one place.
                </p>

                <Button
                  onClick={() => router.push("/dashboard/custom-domain")}
                  className="bg-white hover:bg-gray-100 text-black font-medium px-6"
                >
                  Manage Custom Domain
                </Button>
              </div>
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
              <Button
                onClick={() =>
                  handleCropComplete(
                    completedCrop,
                    setImageToCrop,
                    setShowCropModal,
                    setProfilePicPreview,
                    setNewProfilePic,
                  )
                }
                className="bg-red-600 hover:bg-red-700"
                disabled={!completedCrop}
              >
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
