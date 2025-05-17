"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Video, Share2, ExternalLink } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface CreatorProfileCardProps {
  username?: string
  compact?: boolean
}

export function CreatorProfileCard({ username, compact = false }: CreatorProfileCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isCopying, setIsCopying] = useState(false)

  const hasProfile = !!username

  const handleCopyProfileLink = () => {
    if (!username) return

    setIsCopying(true)
    const profileUrl = `${window.location.origin}/creator/${username}`

    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "Your profile link has been copied to clipboard",
        })
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast({
          title: "Failed to copy",
          description: "Please try again",
          variant: "destructive",
        })
      })
      .finally(() => {
        setIsCopying(false)
      })
  }

  if (compact) {
    return (
      <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-white text-lg font-light">
            <Video className="mr-2 h-4 w-4 text-crimson" /> Creator Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {hasProfile ? (
            <div className="flex flex-col space-y-3">
              <p className="text-sm text-zinc-300">
                Your profile: <span className="text-crimson font-medium">@{username}</span>
              </p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                  onClick={handleCopyProfileLink}
                  disabled={isCopying}
                >
                  <Share2 className="h-3.5 w-3.5 mr-1" />
                  {isCopying ? "Copying..." : "Copy Link"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                  onClick={() => router.push(`/creator/${username}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <p className="text-sm text-zinc-300">You haven't set up your creator profile yet.</p>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/creator/setup")}
                className="bg-crimson hover:bg-crimson/90 text-white"
              >
                Set Up Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-white text-xl font-light">
          <Video className="mr-2 h-5 w-5 text-crimson" /> Creator Profile
        </CardTitle>
        <CardDescription className="text-zinc-400">Share your own video clips with the community</CardDescription>
      </CardHeader>
      <CardContent>
        {hasProfile ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-light text-white mb-2">Your Profile</h3>
              <p className="text-zinc-300 mb-4 font-light">
                Your public profile is live at <span className="text-crimson font-medium">@{username}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleCopyProfileLink}
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                  disabled={isCopying}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {isCopying ? "Copying..." : "Copy Profile Link"}
                </Button>
                <Button
                  onClick={() => router.push(`/creator/${username}`)}
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/50">
              <h3 className="text-lg font-light text-white mb-2">Manage Your Content</h3>
              <Button
                onClick={() => router.push("/dashboard/creator")}
                className="bg-crimson hover:bg-crimson/90 text-white"
              >
                Go to Creator Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-light text-white mb-2">Get Started as a Creator</h3>
              <p className="text-zinc-300 mb-4 font-light">
                Set up your creator profile to share your own video clips and build your audience.
              </p>
              <Button
                onClick={() => router.push("/dashboard/creator/setup")}
                className="bg-crimson hover:bg-crimson/90 text-white"
              >
                Set Up Creator Profile
              </Button>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800/50 backdrop-blur-sm mt-4">
              <h3 className="text-lg font-light text-white mb-3">Creator Benefits</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center text-zinc-300">
                  <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                  <span className="font-light">Custom profile page</span>
                </li>
                <li className="flex items-center text-zinc-300">
                  <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                  <span className="font-light">Organize clips into packs</span>
                </li>
                <li className="flex items-center text-zinc-300">
                  <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                  <span className="font-light">Sell premium clip packs</span>
                </li>
                <li className="flex items-center text-zinc-300">
                  <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                  <span className="font-light">Build your audience</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
