"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, Lock, Unlock, AlertCircle, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StorefrontPreviewPage() {
  const { user } = useAuth()
  const { isProUser, planData, loading: planLoading } = useUserPlan()
  const router = useRouter()
  const { toast } = useToast()

  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [storefrontActive, setStorefrontActive] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)
          setStorefrontActive(data.storefrontActive ?? false)
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

    fetchUserData()
  }, [user])

  const handleToggleStorefront = async () => {
    if (!user) return

    // If user is not pro and trying to activate, redirect to upgrade
    if (!isProUser && !storefrontActive) {
      router.push("/dashboard/upgrade")
      return
    }

    try {
      setUpdating(true)
      const newStatus = !storefrontActive

      await updateDoc(doc(db, "users", user.uid), {
        storefrontActive: newStatus,
        storefrontUpdatedAt: new Date(),
      })

      setStorefrontActive(newStatus)

      // Refresh iframe
      setIframeKey((prev) => prev + 1)

      toast({
        title: newStatus ? "Storefront Activated" : "Storefront Deactivated",
        description: newStatus
          ? "Your storefront is now live and visible to visitors"
          : "Your storefront has been deactivated",
      })
    } catch (error) {
      console.error("Error toggling storefront:", error)
      toast({
        title: "Error",
        description: "Failed to update storefront status",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleStartTrial = () => {
    router.push("/dashboard/upgrade")
  }

  if (loading || planLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <span className="ml-3 text-zinc-400">Loading storefront...</span>
      </div>
    )
  }

  if (!userData?.username) {
    return (
      <div className="p-6">
        <Alert className="bg-zinc-900 border-zinc-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-zinc-300">
            Please set up your username in{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-400 hover:text-blue-300"
              onClick={() => router.push("/dashboard/profile")}
            >
              profile settings
            </Button>{" "}
            to access your storefront.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const storefrontUrl = `/creator/${userData.username}`

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">Storefront Preview</h1>
            <p className="text-zinc-400 text-sm">Preview and manage your public storefront</p>
          </div>

          <Button
            variant="outline"
            onClick={() => window.open(storefrontUrl, "_blank")}
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>

        {/* Activation Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-white flex items-center gap-2">
                  Storefront Status
                  {isProUser && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                      <Sparkles className="h-3 w-3 mr-1" />
                      PRO
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {isProUser ? "Control your storefront visibility" : "Upgrade to activate your storefront"}
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant={storefrontActive ? "default" : "secondary"}
                  className={
                    storefrontActive
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-zinc-700 text-zinc-300"
                  }
                >
                  {storefrontActive ? (
                    <>
                      <Unlock className="h-3 w-3 mr-1" />
                      Live
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Not Live
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {!isProUser ? (
              <Alert className="bg-zinc-800/50 border-zinc-700">
                <Lock className="h-4 w-4" />
                <AlertDescription className="text-zinc-300">
                  Your storefront is currently disabled. Upgrade to Creator Pro or start a free trial to activate your
                  storefront and start selling.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-center justify-between mt-4 p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  checked={storefrontActive}
                  onCheckedChange={handleToggleStorefront}
                  disabled={updating || (!isProUser && !storefrontActive)}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-zinc-700"
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    {storefrontActive ? "Storefront Active" : "Storefront Inactive"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {storefrontActive
                      ? "Your storefront is visible to the public"
                      : isProUser
                        ? "Toggle to activate your storefront"
                        : "Requires Creator Pro membership"}
                  </p>
                </div>
              </div>

              {!isProUser && (
                <Button
                  onClick={handleStartTrial}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </div>

            {isProUser && (
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                <AlertCircle className="h-3 w-3" />
                <span>When inactive, visitors will see a "Coming Soon" message on your storefront</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Frame */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white text-lg">Live Preview</CardTitle>
            <CardDescription className="text-zinc-400">This is how your storefront appears to visitors</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="relative w-full bg-black" style={{ height: "calc(100vh - 400px)", minHeight: "500px" }}>
              {!storefrontActive && !isProUser && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center">
                      <Lock className="h-8 w-8 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Storefront Not Active</h3>
                      <p className="text-zinc-400 mb-4">Upgrade to Creator Pro to activate your storefront</p>
                      <Button onClick={handleStartTrial} className="bg-white text-black hover:bg-zinc-200">
                        Start Free Trial
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <iframe
                key={iframeKey}
                src={storefrontUrl}
                className="w-full h-full border-0"
                title="Storefront Preview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Customize Theme</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">Change colors and styling</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/storefront")}
                className="w-full border-zinc-700 hover:bg-zinc-800 bg-transparent"
              >
                Edit Theme
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Profile Settings</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">Update bio and social links</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/profile")}
                className="w-full border-zinc-700 hover:bg-zinc-800 bg-transparent"
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
