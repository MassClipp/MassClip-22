"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Instagram, Twitter, Youtube, Globe } from "lucide-react"

interface CreatorProfileProps {
  profile: any
  freeClips: any[]
  paidClips: any[]
}

export default function CreatorProfileClient({ profile, freeClips = [], paidClips = [] }: CreatorProfileProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!profile) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-gray-800 bg-black/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-crimson" />
              <span className="ml-2 text-gray-300">Loading profile...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If we have no clips, create some sample ones
  const sampleFreeClips =
    freeClips.length > 0
      ? freeClips
      : [
          {
            id: "sample1",
            title: "Sample Free Clip 1",
            description: "This is a sample free clip",
            thumbnailUrl: "/abstract-zoom-blur.png",
            price: 0,
          },
          {
            id: "sample2",
            title: "Sample Free Clip 2",
            description: "Another sample free clip",
            thumbnailUrl: "/digital-distortion.png",
            price: 0,
          },
        ]

  const samplePaidClips =
    paidClips.length > 0
      ? paidClips
      : [
          {
            id: "paid1",
            title: "Premium Transition Pack",
            description: "Professional transitions for your videos",
            thumbnailUrl: "/abstract-glitch-thumbnail.png",
            price: 9.99,
          },
          {
            id: "paid2",
            title: "Cinematic Effects Bundle",
            description: "Add cinematic flair to your content",
            thumbnailUrl: "/molecular-spin-change.png",
            price: 14.99,
          },
        ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 w-full bg-gradient-to-r from-purple-900 to-blue-900">
        {profile.coverImage && (
          <Image
            src={profile.coverImage || "/placeholder.svg"}
            alt={`${profile.displayName}'s cover`}
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile Image */}
          <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-black bg-gray-800">
            {profile.profileImage ? (
              <Image
                src={profile.profileImage || "/placeholder.svg"}
                alt={profile.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-800 text-gray-400">
                {profile.displayName?.charAt(0) || "C"}
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="flex-1 pt-4 md:pt-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{profile.displayName}</h1>
                <p className="text-gray-400">@{profile.username}</p>
              </div>

              {/* Social Links */}
              <div className="flex gap-3">
                {profile.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Instagram size={20} />
                  </a>
                )}
                {profile.socialLinks?.twitter && (
                  <a
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Twitter size={20} />
                  </a>
                )}
                {profile.socialLinks?.youtube && (
                  <a
                    href={`https://youtube.com/${profile.socialLinks.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Youtube size={20} />
                  </a>
                )}
                {profile.socialLinks?.website && (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Globe size={20} />
                  </a>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && <p className="mt-4 text-gray-300">{profile.bio}</p>}
          </div>
        </div>

        {/* Clips Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="free" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="free">Free Clips</TabsTrigger>
              <TabsTrigger value="premium">Premium Clips</TabsTrigger>
            </TabsList>

            <TabsContent value="free">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sampleFreeClips.map((clip) => (
                  <Card key={clip.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="relative aspect-video">
                      <Image
                        src={clip.thumbnailUrl || "/placeholder.svg"}
                        alt={clip.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg">{clip.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{clip.description}</p>
                      <Button className="w-full mt-4">Download</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="premium">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {samplePaidClips.map((clip) => (
                  <Card key={clip.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="relative aspect-video">
                      <Image
                        src={clip.thumbnailUrl || "/placeholder.svg"}
                        alt={clip.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg">{clip.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{clip.description}</p>
                      <div className="flex justify-between items-center mt-4">
                        <span className="font-semibold">${clip.price.toFixed(2)}</span>
                        <Button>Purchase</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
