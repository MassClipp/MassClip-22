"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Share2, Lock, Edit, Plus, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

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
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam === "premium" ? "premium" : "free")
  const [copied, setCopied] = useState(false)
  const isOwner = user && user.uid === creator.uid

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam === "premium") {
      setActiveTab("premium")
    } else if (tabParam === "free") {
      setActiveTab("free")
    }
  }, [tabParam])

  const handleShare = () => {
    const url = `${window.location.origin}/creator/${creator.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)

    toast({
      title: "Link copied!",
      description: "Share this link with your audience",
    })

    setTimeout(() => setCopied(false), 2000)
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

            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
              <Button onClick={handleShare} variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                <Share2 className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Share"}
              </Button>

              {isOwner && (
                <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800" asChild>
                  <Link href="/dashboard/profile/edit">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                {creator.freeClips.map((clip, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="aspect-video relative bg-gray-800">
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
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-white">{clip.title || "Untitled Clip"}</h3>
                      {clip.description && (
                        <p className="text-gray-400 mt-1 text-sm line-clamp-2">{clip.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0 flex justify-between">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        Watch
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-700 hover:bg-gray-800">
                        Download
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
                {isOwner ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Add Your First Free Clip</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Share free clips to attract viewers and showcase your content
                    </p>
                    <Button asChild className="bg-red-600 hover:bg-red-700">
                      <Link href="/dashboard/clips/add">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Clip
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">No Free Content Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                      {creator.displayName} hasn't added any free content yet. Check back later!
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.paidClips.map((clip, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="aspect-video relative bg-gray-800">
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <Lock className="h-10 w-10 text-red-500" />
                      </div>
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
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white">{clip.title || "Untitled Clip"}</h3>
                        <span className="text-red-500 font-bold">${clip.price || "9.99"}</span>
                      </div>
                      {clip.description && (
                        <p className="text-gray-400 mt-1 text-sm line-clamp-2">{clip.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0">
                      <Button className="w-full bg-red-600 hover:bg-red-700">Unlock Content</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
                {isOwner ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Add Your First Premium Clip</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Start monetizing your content by adding premium clips that viewers can purchase
                    </p>
                    <Button asChild className="bg-red-600 hover:bg-red-700">
                      <Link href="/dashboard/clips/add">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Premium Clip
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Lock className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                    <h3 className="text-xl font-semibold">Premium Content</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                      {creator.displayName} hasn't added any premium content yet. Check back later!
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
