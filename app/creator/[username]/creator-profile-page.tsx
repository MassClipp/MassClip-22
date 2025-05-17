"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Instagram, Twitter, Youtube, Globe, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CreatorProfilePage({ profile }: { profile: any }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Function to copy profile URL to clipboard
  const copyProfileUrl = async () => {
    try {
      const url = `${window.location.origin}/creator/${profile.username}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Profile link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero section */}
      <div className="relative h-48 md:h-64 w-full bg-gradient-to-r from-gray-900 to-black">
        {profile.coverImage && (
          <Image
            src={profile.coverImage || "/placeholder.svg"}
            alt={`${profile.displayName}'s cover`}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Profile content */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile image */}
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black bg-gray-800 flex-shrink-0">
            {profile.profileImage ? (
              <Image
                src={profile.profileImage || "/placeholder.svg"}
                alt={profile.displayName}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-4xl">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Profile details */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
                <p className="text-gray-400">@{profile.username}</p>

                {/* URL display */}
                <div className="mt-2 text-sm text-gray-500">
                  {window.location.origin}/creator/{profile.username}
                </div>
              </div>

              {/* Share button */}
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                onClick={copyProfileUrl}
              >
                {copied ? (
                  <>
                    <span className="text-green-500 mr-2">✓</span>
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </>
                )}
              </Button>
            </div>

            {/* Bio */}
            {profile.bio && <p className="mt-4 text-gray-300">{profile.bio}</p>}

            {/* Social links */}
            {profile.socialLinks && (
              <div className="mt-4 flex flex-wrap gap-3">
                {profile.socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Instagram size={16} />
                    <span>{profile.socialLinks.instagram}</span>
                  </a>
                )}
                {profile.socialLinks.twitter && (
                  <a
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Twitter size={16} />
                    <span>{profile.socialLinks.twitter}</span>
                  </a>
                )}
                {profile.socialLinks.youtube && (
                  <a
                    href={`https://youtube.com/${profile.socialLinks.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Youtube size={16} />
                    <span>YouTube</span>
                  </a>
                )}
                {profile.socialLinks.website && (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Globe size={16} />
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content tabs */}
        <div className="mt-12">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-3 max-w-md mx-auto bg-gray-900/50">
              <TabsTrigger value="all">All Clips</TabsTrigger>
              <TabsTrigger value="free">Free</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="text-center py-12">
                <p className="text-gray-400">No clips available yet.</p>
              </div>
            </TabsContent>

            <TabsContent value="free" className="mt-6">
              <div className="text-center py-12">
                <p className="text-gray-400">No free clips available yet.</p>
              </div>
            </TabsContent>

            <TabsContent value="premium" className="mt-6">
              <div className="text-center py-12">
                <p className="text-gray-400">No premium clips available yet.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
