"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, FileText, Share2, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreatorProfileProps {
  creator: {
    id: string
    username: string
    displayName: string
    bio?: string
    profilePicture?: string
    memberSince: string
    totalUploads: number
    freeContentCount: number
    profileViews?: number
  }
  freeContent: any[]
  premiumContent: any[]
  bundles: any[]
}

export function CreatorProfile({ creator, freeContent, premiumContent, bundles }: CreatorProfileProps) {
  const { toast } = useToast()
  const [currentUrl, setCurrentUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied!",
        description: "Profile URL copied to clipboard",
      })
    } catch (error) {
      console.error("Clipboard copy failed:", error)
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          <Avatar className="w-32 h-32">
            <AvatarImage src={creator.profilePicture || "/placeholder.svg"} alt={creator.displayName} />
            <AvatarFallback className="text-2xl bg-zinc-800">
              {creator.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{creator.displayName}</h1>
                <p className="text-zinc-400 text-lg">@{creator.username}</p>
              </div>
              <Button onClick={handleShare} variant="outline" size="sm" className="gap-2 bg-transparent">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>

            {creator.bio && <p className="text-zinc-300 mb-4 max-w-2xl">{creator.bio}</p>}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <CalendarDays className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm text-zinc-400">Member since</p>
                  <p className="font-semibold">{creator.memberSince}</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <FileText className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm text-zinc-400">Free content</p>
                  <p className="font-semibold">{creator.freeContentCount}</p>
                </CardContent>
              </Card>

              {creator.profileViews && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                    <p className="text-sm text-zinc-400">Profile views</p>
                    <p className="font-semibold">{creator.profileViews}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="free" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger value="free" className="data-[state=active]:bg-zinc-800">
              Free Content
            </TabsTrigger>
            <TabsTrigger value="premium" className="data-[state=active]:bg-zinc-800">
              Premium Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="free" className="mt-6">
            {freeContent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeContent.map((content) => (
                  <Card key={content.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                    <div className="aspect-video bg-zinc-800 relative">
                      {content.thumbnailUrl && (
                        <img
                          src={content.thumbnailUrl || "/placeholder.svg"}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <Badge className="absolute top-2 right-2 bg-green-600">Free</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{content.title}</h3>
                      {content.description && (
                        <p className="text-sm text-zinc-400 line-clamp-3">{content.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No free content available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            {premiumContent.length > 0 || bundles.length > 0 ? (
              <div className="space-y-8">
                {/* Bundles */}
                {bundles.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Bundles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {bundles.map((bundle) => (
                        <Card key={bundle.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                          <div className="aspect-video bg-zinc-800 relative">
                            {bundle.thumbnailUrl && (
                              <img
                                src={bundle.thumbnailUrl || "/placeholder.svg"}
                                alt={bundle.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <Badge className="absolute top-2 right-2 bg-red-600">{bundle.contentCount} clips</Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-2">{bundle.title}</h3>
                            <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{bundle.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-green-400">${bundle.price}</span>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                                Buy Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Premium Content */}
                {premiumContent.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Individual Content</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {premiumContent.map((content) => (
                        <Card key={content.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                          <div className="aspect-video bg-zinc-800 relative">
                            {content.thumbnailUrl && (
                              <img
                                src={content.thumbnailUrl || "/placeholder.svg"}
                                alt={content.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <Badge className="absolute top-2 right-2 bg-red-600">Premium</Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-2 line-clamp-2">{content.title}</h3>
                            {content.description && (
                              <p className="text-sm text-zinc-400 mb-3 line-clamp-3">{content.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-green-400">${content.price}</span>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                                Buy Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No premium content available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default CreatorProfile
