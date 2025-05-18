"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Share2, Lock, Edit, Plus } from "lucide-react"
import { useEffect } from "react"

interface CreatorProfileProps {
  creator: {
    uid: string
    username: string
    displayName: string
    bio?: string
    profilePic?: string
    freeClips: any[]
    paidClips: any[]
  }
}

export default function CreatorProfile({ creator }: CreatorProfileProps) {
  const { user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [copied, setCopied] = useState(false)

  // Check if the current user is the owner of this profile
  useEffect(() => {
    if (user && creator) {
      setIsOwner(user.uid === creator.uid)
    }
  }, [user, creator])

  // Share profile function
  const shareProfile = () => {
    const url = `${window.location.origin}/creator/${creator.username}`

    if (navigator.share) {
      navigator
        .share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url: url,
        })
        .catch((err) => console.error("Error sharing:", err))
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center space-y-6">
        {/* Profile header */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-6 p-6 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800">
          {/* Profile picture */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-zinc-800">
            {creator.profilePic ? (
              <Image
                src={creator.profilePic || "/placeholder.svg"}
                alt={creator.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-500">
                {creator.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Profile info */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName}</h1>

            {creator.bio ? (
              <p className="text-zinc-300">{creator.bio}</p>
            ) : (
              isOwner && <p className="text-zinc-500 italic">Add a bio to tell people about your content</p>
            )}

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Button variant="outline" size="sm" onClick={shareProfile} className="flex items-center gap-1">
                <Share2 className="w-4 h-4" />
                {copied ? "Copied!" : "Share"}
              </Button>

              {isOwner && (
                <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                  <Link href="/dashboard/profile/edit">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="free" className="w-full max-w-4xl">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="free">Free Content</TabsTrigger>
            <TabsTrigger value="premium">Premium Content</TabsTrigger>
          </TabsList>

          {/* Free content tab */}
          <TabsContent value="free">
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.freeClips.map((clip, index) => (
                  <Card key={index} className="bg-zinc-900/60 border-zinc-800 overflow-hidden">
                    <div className="aspect-video relative">
                      <Image
                        src={clip.thumbnail || "/placeholder-video.jpg"}
                        alt={clip.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg truncate">{clip.title}</h3>
                      <p className="text-zinc-400 text-sm line-clamp-2">{clip.description}</p>
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0 flex justify-between">
                      <Button size="sm" asChild>
                        <Link href={`/clip/${clip.id}`}>Watch</Link>
                      </Button>
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800">
                {isOwner ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Add Your First Free Clip</h3>
                    <p className="text-zinc-400 max-w-md mx-auto">
                      Share free clips to attract viewers and showcase your content
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/clips/add">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Clip
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">No Free Content Yet</h3>
                    <p className="text-zinc-400 max-w-md mx-auto">
                      {creator.displayName} hasn't added any free content yet. Check back later!
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Premium content tab */}
          <TabsContent value="premium">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.paidClips.map((clip, index) => (
                  <Card key={index} className="bg-zinc-900/60 border-zinc-800 overflow-hidden">
                    <div className="aspect-video relative">
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <Lock className="w-8 h-8 text-red-500" />
                      </div>
                      <Image
                        src={clip.thumbnail || "/placeholder-video.jpg"}
                        alt={clip.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg truncate">{clip.title}</h3>
                        <span className="text-red-500 font-bold">${clip.price || "9.99"}</span>
                      </div>
                      <p className="text-zinc-400 text-sm line-clamp-2">{clip.description}</p>
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0">
                      <Button className="w-full bg-red-600 hover:bg-red-700">Unlock Content</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800">
                {isOwner ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Add Your First Premium Clip</h3>
                    <p className="text-zinc-400 max-w-md mx-auto">
                      Start monetizing your content by adding premium clips that viewers can purchase
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/clips/add">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Premium Clip
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">No Premium Content Yet</h3>
                    <p className="text-zinc-400 max-w-md mx-auto">
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
