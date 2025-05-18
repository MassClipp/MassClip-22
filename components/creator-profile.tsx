"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Lock, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreatorProfileProps {
  creator: {
    username: string
    displayName: string
    bio: string
    profilePic: string
    freeClips: any[]
    paidClips: any[]
    createdAt: string
    uid: string
  }
}

export default function CreatorProfile({ creator }: CreatorProfileProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("free")

  const handleShare = () => {
    const url = `${window.location.origin}/creator/${creator.username}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied!",
      description: "Share this profile with your audience",
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-black pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {creator.profilePic ? (
                <img
                  src={creator.profilePic || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-red-500"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center border-2 border-red-500">
                  <span className="text-2xl font-bold">{creator.displayName.charAt(0)}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{creator.displayName}</h1>
                <p className="text-gray-400">@{creator.username}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
          {creator.bio && <p className="mt-4 text-gray-300">{creator.bio}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="free" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="free">Free Clips</TabsTrigger>
            <TabsTrigger value="premium">Premium Clips</TabsTrigger>
          </TabsList>
          <TabsContent value="free">
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creator.freeClips.map((clip, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800">
                    <CardHeader className="p-0">
                      <div className="relative aspect-video bg-gray-800">
                        {clip.thumbnail ? (
                          <img
                            src={clip.thumbnail || "/placeholder.svg"}
                            alt={clip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-lg">{clip.title || "Untitled Clip"}</CardTitle>
                      {clip.description && (
                        <CardDescription className="text-gray-400 mt-1">{clip.description}</CardDescription>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No free clips available yet.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="premium">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creator.paidClips.map((clip, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800">
                    <CardHeader className="p-0">
                      <div className="relative aspect-video bg-gray-800">
                        {clip.thumbnail ? (
                          <img
                            src={clip.thumbnail || "/placeholder.svg"}
                            alt={clip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-lg">{clip.title || "Untitled Clip"}</CardTitle>
                      {clip.description && (
                        <CardDescription className="text-gray-400 mt-1">{clip.description}</CardDescription>
                      )}
                      <div className="mt-3">
                        <Button className="w-full bg-red-600 hover:bg-red-700">Buy for ${clip.price || "9.99"}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No premium clips available yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
