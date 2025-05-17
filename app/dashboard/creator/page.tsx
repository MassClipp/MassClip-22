"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Copy, Check, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
        const profileDoc = await db.collection("creatorProfiles").doc(user.uid).get()

        if (profileDoc.exists) {
          setProfile(profileDoc.data())
        }
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
      title: "Link copied!",
      description: "Your profile link has been copied to clipboard.",
    })

    setTimeout(() => setCopied(false), 2000)
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
        <Card>
          <CardHeader>
            <CardTitle>Creator Profile</CardTitle>
            <CardDescription>You haven't set up your creator profile yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-6">
              Set up your creator profile to start sharing your clips and building your audience.
            </p>
            <Button onClick={() => router.push("/dashboard/creator/setup")}>Set Up Profile</Button>
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
              <Link href="/dashboard/creator/setup">Edit Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content placeholder */}
      <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Follow these steps to set up your creator profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-crimson/20 text-crimson rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-medium text-white">Share your profile</h3>
                <p className="text-gray-400 text-sm">
                  Your public profile is now live at{" "}
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-xs text-crimson">
                    {window.location.origin}/creator/{profile.username}
                  </code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-gray-800 text-gray-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-medium text-white">Upload your first clip</h3>
                <p className="text-gray-400 text-sm">
                  Start building your library by uploading clips that viewers can access
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-gray-800 text-gray-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-medium text-white">Customize your profile</h3>
                <p className="text-gray-400 text-sm">
                  Add a profile picture, cover image, and complete your bio to attract more viewers
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
