"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2, ExternalLink, Settings, User, Lock, Crown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function ViewStorefrontPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [isStorefrontActive, setIsStorefrontActive] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [isOnTrial, setIsOnTrial] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const token = await user.getIdToken()

        // Fetch user profile
        const profileResponse = await fetch(`/api/user-profile?uid=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUsername(profileData.username)
        }

        // Fetch membership status
        const membershipResponse = await fetch("/api/membership-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json()
          setIsPro(membershipData.isPro || false)
          setIsOnTrial(membershipData.isOnTrial || false)
          setIsStorefrontActive(membershipData.isPro || membershipData.isOnTrial)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error",
          description: "Failed to load storefront data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchUserData()
    }
  }, [user, toast])

  const handleToggleStorefront = () => {
    if (!isPro && !isOnTrial) {
      // Redirect to upgrade page
      router.push("/dashboard/upgrade")
      toast({
        title: "Upgrade Required",
        description: "Subscribe to activate your storefront",
      })
    } else {
      // Toggle storefront (this would need an API endpoint to persist the state)
      setIsStorefrontActive(!isStorefrontActive)
      toast({
        title: isStorefrontActive ? "Storefront Deactivated" : "Storefront Activated",
        description: isStorefrontActive
          ? "Your storefront is now hidden from public view"
          : "Your storefront is now live and visible to everyone",
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!user || !username) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Profile Required</h2>
          <p className="text-zinc-400">Please complete your profile to view your storefront.</p>
        </div>
      </div>
    )
  }

  const storefrontUrl = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/creator/${username}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-zinc-800/50">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Storefront Preview</h1>
          <p className="text-zinc-400 text-sm">Preview and manage your public creator storefront</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(storefrontUrl, "_blank")}
            className="border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-300"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button
            onClick={() => router.push("/dashboard/storefront")}
            className="bg-white text-black hover:bg-zinc-100 font-medium px-6"
          >
            <Settings className="h-4 w-4 mr-2" />
            Customize Theme
          </Button>
        </div>
      </div>

      {/* Storefront Status Card */}
      <Card className="bg-zinc-900/30 border-zinc-800/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-white">Storefront Status</h3>
                <Badge
                  variant={isStorefrontActive ? "default" : "secondary"}
                  className={
                    isStorefrontActive
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-zinc-700/20 text-zinc-400 border-zinc-700/30"
                  }
                >
                  {isStorefrontActive ? "Live" : "Not Live"}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400">
                {isStorefrontActive
                  ? "Your storefront is visible to everyone"
                  : isPro || isOnTrial
                    ? "Your storefront is currently hidden"
                    : "Upgrade to activate your storefront"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isPro && !isOnTrial && <Lock className="h-5 w-5 text-zinc-500" />}
              <Switch
                checked={isStorefrontActive}
                onCheckedChange={handleToggleStorefront}
                disabled={!isPro && !isOnTrial}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          {!isPro && !isOnTrial && (
            <div className="mt-4 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-white mb-1">Upgrade to Activate Your Storefront</h4>
                  <p className="text-sm text-zinc-400 mb-3">
                    Subscribe to a membership or start a free trial to make your storefront live and start selling your
                    content.
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/upgrade")}
                    className="bg-white text-black hover:bg-zinc-100 font-medium"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50 transition-colors cursor-pointer"
          onClick={() => router.push("/dashboard/profile")}
        >
          <CardContent className="p-6">
            <User className="h-8 w-8 text-white mb-3" />
            <h3 className="font-medium text-white mb-1">Edit Profile</h3>
            <p className="text-sm text-zinc-400">Update your bio, avatar, and social links</p>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50 transition-colors cursor-pointer"
          onClick={() => router.push("/dashboard/bundles")}
        >
          <CardContent className="p-6">
            <Settings className="h-8 w-8 text-white mb-3" />
            <h3 className="font-medium text-white mb-1">Manage Bundles</h3>
            <p className="text-sm text-zinc-400">Create and edit your content bundles</p>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50 transition-colors cursor-pointer"
          onClick={() => router.push("/dashboard/free-content")}
        >
          <CardContent className="p-6">
            <Settings className="h-8 w-8 text-white mb-3" />
            <h3 className="font-medium text-white mb-1">Free Content</h3>
            <p className="text-sm text-zinc-400">Manage your free content library</p>
          </CardContent>
        </Card>
      </div>

      {/* Storefront Preview */}
      <Card className="bg-zinc-900/30 border-zinc-800/30 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full" style={{ height: "calc(100vh - 300px)", minHeight: "600px" }}>
            {!isPro && !isOnTrial && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <Lock className="h-16 w-16 text-zinc-500 mx-auto" />
                  <h3 className="text-2xl font-semibold text-white">Storefront Locked</h3>
                  <p className="text-zinc-400 max-w-md">
                    Subscribe to a membership or start a free trial to unlock your storefront and start selling.
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/upgrade")}
                    className="bg-white text-black hover:bg-zinc-100 font-medium px-8"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Unlock
                  </Button>
                </div>
              </div>
            )}
            <iframe
              src={storefrontUrl}
              className="w-full h-full border-0"
              title="Storefront Preview"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
