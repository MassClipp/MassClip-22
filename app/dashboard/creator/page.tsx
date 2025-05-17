"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getClipPacks } from "@/app/actions/clip-pack-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, Settings, Package, Plus, ExternalLink, Copy, Check } from "lucide-react"
import type { ClipPack, CreatorProfile } from "@/lib/types"
import Link from "next/link"

export default function CreatorDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch creator profile
        const profileResponse = await fetch(`/api/creator-profile?userId=${user.uid}`)
        const profileData = await profileResponse.json()

        if (profileData.profile) {
          setProfile(profileData.profile)
        }

        // Fetch clip packs
        const { clipPacks: packs, error: packsError } = await getClipPacks(user.uid)

        if (packsError) {
          setError(packsError)
        } else {
          setClipPacks(packs)
        }
      } catch (err) {
        setError("Failed to load creator data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleCopyProfileLink = () => {
    if (!profile) return

    const url = `${window.location.origin}/creator/${profile.username}`
    navigator.clipboard.writeText(url)

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin text-crimson" />
          <span className="ml-2 text-gray-300">Loading creator dashboard...</span>
        </div>
      </div>
    )
  }

  // If no profile exists, redirect to setup
  if (!profile && !loading) {
    return (
      <div className="min-h-screen bg-black p-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">Set Up Your Creator Profile</CardTitle>
              <CardDescription>
                You need to set up your creator profile before you can start sharing your clips
              </CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-gray-300 mb-6">
                Create your creator profile to start uploading and sharing your clip packs with others. You'll be able
                to customize your profile, set up your username, and manage your content.
              </p>

              <Button
                onClick={() => router.push("/dashboard/creator/setup")}
                className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all"
              >
                <User className="h-4 w-4 mr-2" />
                Set Up Creator Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white">Creator Dashboard</h1>
            {profile && <p className="text-gray-400">@{profile.username}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {profile && (
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={handleCopyProfileLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Profile Link
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              onClick={() => profile && window.open(`/creator/${profile.username}`, "_blank")}
              disabled={!profile}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Profile
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border-gray-800 bg-black/80 backdrop-blur-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clip-packs">Clip Packs</TabsTrigger>
            <TabsTrigger value="settings">Profile Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Clip Packs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{clipPacks.length}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {clipPacks.filter((pack) => pack.isPublished).length} published
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">
                    {clipPacks.reduce((total, pack) => total + (pack.totalViews || 0), 0)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">Across all clip packs</p>
                </CardContent>
              </Card>

              <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">
                    ${clipPacks.reduce((total, pack) => total + (pack.totalSales || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">From paid clip packs</p>
                </CardContent>
              </Card>
            </div>

            {/* Featured Clip Packs */}
            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Featured Clip Packs</CardTitle>
                <CardDescription>These clip packs are highlighted on your public profile</CardDescription>
              </CardHeader>

              <CardContent>
                {profile?.featured && profile.featured.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.featured.map((id) => {
                      const pack = clipPacks.find((p) => p.id === id)
                      if (!pack) return null

                      return (
                        <div key={id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                          <h3 className="text-white font-medium mb-1">{pack.title}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                            {pack.description || "No description"}
                          </p>

                          <Link href={`/dashboard/creator/clip-packs/${pack.id}`}>
                            <Button variant="link" className="text-crimson p-0 h-auto">
                              Manage
                            </Button>
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 mb-4">You haven't featured any clip packs yet</p>
                    <Link href="/dashboard/creator/clip-packs">
                      <Button className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all">
                        Manage Clip Packs
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all h-auto py-6 flex flex-col"
                    onClick={() => router.push("/dashboard/creator/clip-packs/new")}
                  >
                    <Plus className="h-6 w-6 mb-2" />
                    <span className="text-base">Create New Clip Pack</span>
                  </Button>

                  <Button
                    className="border border-gray-700 bg-transparent text-white hover:bg-gray-800/50 transition-all h-auto py-6 flex flex-col"
                    onClick={() => router.push("/dashboard/creator/clip-packs")}
                  >
                    <Package className="h-6 w-6 mb-2" />
                    <span className="text-base">Manage Clip Packs</span>
                  </Button>

                  <Button
                    className="border border-gray-700 bg-transparent text-white hover:bg-gray-800/50 transition-all h-auto py-6 flex flex-col"
                    onClick={() => router.push("/dashboard/creator/settings")}
                  >
                    <Settings className="h-6 w-6 mb-2" />
                    <span className="text-base">Edit Profile Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clip-packs">
            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Your Clip Packs</CardTitle>
                  <CardDescription>Manage and organize your clip packs</CardDescription>
                </div>

                <Button
                  onClick={() => router.push("/dashboard/creator/clip-packs/new")}
                  className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Clip Pack
                </Button>
              </CardHeader>

              <CardContent>
                {clipPacks.length > 0 ? (
                  <div className="space-y-4">
                    {clipPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="flex items-center justify-between border-b border-gray-800 pb-4 last:border-0 last:pb-0"
                      >
                        <div>
                          <h3 className="text-white font-medium">{pack.title}</h3>
                          <div className="flex items-center text-sm text-gray-400 mt-1">
                            <span className="mr-4">{pack.clips.length} clips</span>
                            <span>{pack.isPaid ? `$${pack.price.toFixed(2)}` : "Free"}</span>
                            {!pack.isPublished && <span className="ml-4 text-yellow-400">Draft</span>}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                          onClick={() => router.push(`/dashboard/creator/clip-packs/${pack.id}`)}
                        >
                          Manage
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 mb-4">You haven't created any clip packs yet</p>
                    <Button
                      onClick={() => router.push("/dashboard/creator/clip-packs/new")}
                      className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Clip Pack
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Profile Settings</CardTitle>
                <CardDescription>Manage your creator profile settings</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <div>
                      <h3 className="text-white font-medium">Profile Information</h3>
                      <p className="text-gray-400 text-sm">Update your display name, bio, and social links</p>
                    </div>

                    <Button
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => router.push("/dashboard/creator/settings/profile")}
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <div>
                      <h3 className="text-white font-medium">Profile Images</h3>
                      <p className="text-gray-400 text-sm">Update your profile picture and cover image</p>
                    </div>

                    <Button
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => router.push("/dashboard/creator/settings/images")}
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-white font-medium">Payment Settings</h3>
                      <p className="text-gray-400 text-sm">Manage your payment methods and payout settings</p>
                    </div>

                    <Button
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => router.push("/dashboard/creator/settings/payments")}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
