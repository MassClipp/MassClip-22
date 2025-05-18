"use client"

import { useState } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Share2, Lock, Download, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  freeClips: any[]
  paidClips: any[]
}

interface CreatorProfileProps {
  creator: Creator
}

export default function CreatorProfile({ creator }: CreatorProfileProps) {
  const [activeTab, setActiveTab] = useState("free")
  const { toast } = useToast()
  const { user } = useAuth()

  const isOwner = user?.uid === creator.uid

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url: window.location.href,
        })
        .catch((error) => console.log("Error sharing", error))
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied!",
        description: "Profile link copied to clipboard",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8">
          {creator.profilePic ? (
            <Image
              src={creator.profilePic || "/placeholder.svg"}
              alt={creator.displayName}
              width={96}
              height={96}
              className="rounded-full border-2 border-red-500 mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-2xl font-bold mb-4">
              {creator.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-3xl font-bold mb-2">{creator.displayName}</h1>

          {creator.bio && <p className="text-gray-400 text-center max-w-2xl mb-4">{creator.bio}</p>}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Profile
            </Button>

            {isOwner && (
              <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800" asChild>
                <a href="/dashboard/profile">Edit Profile</a>
              </Button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="free" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-6">
            <TabsList className="bg-gray-900">
              <TabsTrigger value="free" className="data-[state=active]:bg-red-600">
                Free Clips
              </TabsTrigger>
              <TabsTrigger value="premium" className="data-[state=active]:bg-red-600">
                Premium Clips
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="free" className="mt-0">
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.freeClips.map((clip, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="relative aspect-video">
                      <Image
                        src={clip.thumbnail || "/placeholder.svg?height=200&width=350&query=video thumbnail"}
                        alt={clip.title || `Free clip ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" className="mr-2">
                          <Play className="h-4 w-4 mr-1" /> Play
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium">{clip.title || `Free clip ${index + 1}`}</h3>
                      {clip.description && <p className="text-sm text-gray-400 mt-1">{clip.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No free clips available yet</h3>
                <p className="text-gray-400">Check back soon for new content</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-0">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.paidClips.map((clip, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="relative aspect-video">
                      <div className="absolute inset-0 backdrop-blur-md z-10"></div>
                      <Image
                        src={clip.thumbnail || "/placeholder.svg?height=200&width=350&query=premium video thumbnail"}
                        alt={clip.title || `Premium clip ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                        <Lock className="h-8 w-8 text-red-500 mb-2" />
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">
                          Unlock Premium
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium">{clip.title || `Premium clip ${index + 1}`}</h3>
                      {clip.description && <p className="text-sm text-gray-400 mt-1">{clip.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No premium clips available yet</h3>
                <p className="text-gray-400">Check back soon for exclusive content</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
