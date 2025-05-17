"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCreatorProfile } from "@/app/actions/profile-actions"
import { Loader2, Copy, Check, ExternalLink, Settings, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function CreatorDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const { profile } = await getCreatorProfile(user.uid)
        setProfile(profile)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleCopyProfileLink = () => {
    if (!profile?.username) return

    const profileUrl = `${window.location.origin}/creator/${profile.username}`
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)

    toast({
      title: "Profile link copied!",
      description: "Your profile link has been copied to clipboard.",
    })

    setTimeout(() => setCopied(false), 2000)
  }

  const handleSetupProfile = () => {
    router.push("/dashboard/creator/setup")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-crimson" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4 py-8">
        <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Creator Profile</CardTitle>
            <CardDescription>You haven't set up your creator profile yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-6">
              Set up your creator profile to start sharing your clips and building your audience.
            </p>
            <Button onClick={handleSetupProfile}>Set Up Profile</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
          <p className="text-gray-400">Manage your clips and track your performance</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* View Profile Button */}
          <Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800" asChild>
            <Link href={`/creator/${profile.username}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </Button>

          {/* Copy Profile Link Button */}
          <Button
            variant="outline"
            className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            onClick={handleCopyProfileLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Profile Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Profile URL Card */}
      <Card className="border-gray-800 bg-black/50 backdrop-blur-sm mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Your Public Profile</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">URL:</span>
                <code className="bg-gray-800 px-3 py-1 rounded text-sm text-crimson">
                  {window.location.origin}/creator/{profile.username}
                </code>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
              asChild
            >
              <Link href="/dashboard/creator/setup">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md bg-gray-900/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clips">Clips</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Clips</h3>
                <p className="text-3xl font-bold text-white">0</p>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Views</h3>
                <p className="text-3xl font-bold text-white">0</p>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Sales</h3>
                <p className="text-3xl font-bold text-white">$0.00</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Clips</h2>
              <Button asChild>
                <Link href="/dashboard/creator/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Clip
                </Link>
              </Button>
            </div>

            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center py-12">
                <p className="text-gray-400">You haven't uploaded any clips yet.</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/creator/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Clip
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clips" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your Clips</h2>
            <Button asChild>
              <Link href="/dashboard/creator/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Clip
              </Link>
            </Button>
          </div>

          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center py-12">
              <p className="text-gray-400">You haven't uploaded any clips yet.</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/creator/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Clip
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center py-12">
              <p className="text-gray-400">Analytics will be available once you start getting views and sales.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
