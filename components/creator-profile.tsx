"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import type { Profile } from "@/lib/types"
import { Share2 } from "lucide-react"

interface CreatorProfileProps {
  profile: Profile
}

const CreatorProfile = ({ profile }: CreatorProfileProps) => {
  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/creator/${profile.username}`
      await navigator.clipboard.writeText(url)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{profile.name}</CardTitle>
        <CardDescription>{profile.bio}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Avatar className="h-32 w-32">
          <AvatarImage src={profile.imageUrl || "/placeholder.svg"} alt={profile.name} />
          <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <p>@{profile.username}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </CardFooter>
    </Card>
  )
}

export default CreatorProfile
