"use client"

import type React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import type { Profile } from "@/lib/types"

interface CreatorProfileProps {
  profile: Profile | undefined
  isLoading: boolean
}

const CreatorProfile: React.FC<CreatorProfileProps> = ({ profile, isLoading }) => {
  const { toast } = useToast()

  const handleShare = async () => {
    try {
      const profileUrl = `${window.location.origin}/creator/${profile.username}`
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </CardFooter>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="text-center">Could not load creator profile.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={profile.imageUrl || "/placeholder.svg"} alt={profile.name} />
            <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle>{profile.name}</CardTitle>
            <CardDescription>@{profile.username}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{profile.bio || "No bio provided."}</CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleShare}>Share</Button>
      </CardFooter>
    </Card>
  )
}

export default CreatorProfile
