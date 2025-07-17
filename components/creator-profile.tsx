"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, Share, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CreatorUploadsSection } from "./creator-uploads-section"
import { PremiumContentSection } from "./premium-content-section"

interface CreatorProfileProps {
  creator: {
    id: string
    username: string
    displayName: string
    bio?: string
    profilePicture?: string
    memberSince: string
    location?: string
    followers?: number
    totalUploads?: number
    freeContentCount?: number
  }
  uploads: any[]
  premiumContent: any[]
  isOwnProfile?: boolean
}

export function CreatorProfile({
  creator,
  uploads = [],
  premiumContent = [],
  isOwnProfile = false,
}: CreatorProfileProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("free")

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/creator/${creator.username}`

    try {
      await navigator.clipboard.writeText(profileUrl)
      toast({
        title: "Link copied!",
        description: "Profile link has been copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  const formatMemberSince = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <Avatar className="w-32 h-32 mx-auto md:mx-0">
            <AvatarImage src={creator.profilePicture || "/placeholder-user.jpg"} alt={creator.displayName} />
            <AvatarFallback className="text-2xl bg-zinc-800">
              {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold">{creator.displayName}</h1>
                <p className="text-zinc-400">@{creator.username}</p>
              </div>

              <div className="flex gap-2 justify-center md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {creator.bio && <p className="text-zinc-300 mb-4">{creator.bio}</p>}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <CalendarDays className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm text-zinc-400">Member since</p>
                  <p className="font-semibold">{formatMemberSince(creator.memberSince)}</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <Gift className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm text-zinc-400">Free content</p>
                  <p className="font-semibold">{creator.freeContentCount || 0}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger value="free" className="data-[state=active]:bg-zinc-800">
              Free Content
            </TabsTrigger>
            <TabsTrigger value="premium" className="data-[state=active]:bg-zinc-800">
              Premium Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="free" className="mt-6">
            <CreatorUploadsSection uploads={uploads} creatorId={creator.id} isOwnProfile={isOwnProfile} />
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            <PremiumContentSection premiumContent={premiumContent} creatorId={creator.id} isOwnProfile={isOwnProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
