"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share2, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: string
}

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("free")

  const handleShare = () => {
    const url = `${window.location.origin}/creator/${creator.username}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied!",
      description: "Share this link with your audience",
    })
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Creator Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
            {creator.profilePic ? (
              <img
                src={creator.profilePic || "/placeholder.svg"}
                alt={creator.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                {creator.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white">{creator.displayName}</h1>
            <p className="text-gray-400 mt-1">@{creator.username}</p>
            {creator.bio && <p className="text-gray-300 mt-4">{creator.bio}</p>}
          </div>

          <Button onClick={handleShare} variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="free" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-900">
            <TabsTrigger value="free" className="data-[state=active]:bg-red-600">
              Free Clips
            </TabsTrigger>
            <TabsTrigger value="premium" className="data-[state=active]:bg-red-600">
              Premium Clips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="free" className="mt-6">
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Free clips would go here */}
                <p className="text-gray-400 col-span-full">Free clips will appear here</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No free clips available yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Premium clips would go here */}
                <p className="text-gray-400 col-span-full">Premium clips will appear here</p>
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center">
                <Lock className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400">Premium clips are locked</p>
                <Button className="mt-4 bg-red-600 hover:bg-red-700">Unlock Premium Content</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
