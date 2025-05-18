"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Share2, Lock, Edit, Plus, Play, Instagram, Twitter, Globe } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import Image from "next/image"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
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

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/creator/${creator.username}?tab=${value}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section with Gradient Overlay */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-zinc-900 to-black opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

        {/* Subtle animated gradient lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute h-px w-full top-1/4 left-0 bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent"></div>
          <div className="absolute h-px w-full top-2/4 left-0 bg-gradient-to-r from-transparent via-zinc-700/10 to-transparent"></div>
          <div className="absolute h-px w-full top-3/4 left-0 bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent"></div>
        </div>

        {/* Content positioned at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-6xl mx-auto px-4 pb-8 pt-16">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Profile Picture */}
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-zinc-800 border-4 border-black shadow-xl">
                {creator.profilePic ? (
                  <Image
                    src={creator.profilePic || "/placeholder.svg"}
                    alt={creator.displayName}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-400">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{creator.displayName}</h1>
                <p className="text-zinc-400 mt-1">@{creator.username}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 md:mt-0">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-white hover:bg-zinc-800 transition-all"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {copied ? "Copied!" : "Share"}
                </Button>

                {isOwner && (
                  <Button variant="default" size="sm" className="bg-crimson hover:bg-crimson/90 transition-all" asChild>
                    <Link href="/dashboard/profile/edit">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio and Social Links */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-2/3">
            {creator.bio ? (
              <p className="text-zinc-300 text-lg leading-relaxed">{creator.bio}</p>
            ) : isOwner ? (
              <p className="text-zinc-500 italic">Add a bio to tell people about your content</p>
            ) : null}
          </div>

          <div className="w-full md:w-1/3 flex justify-center md:justify-end space-x-4">
            {creator.socialLinks?.instagram && (
              <a
                href={creator.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <Instagram className="h-5 w-5 text-zinc-400 hover:text-white" />
              </a>
            )}

            {creator.socialLinks?.twitter && (
              <a
                href={creator.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <Twitter className="h-5 w-5 text-zinc-400 hover:text-white" />
              </a>
            )}

            {creator.socialLinks?.website && (
              <a
                href={creator.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <Globe className="h-5 w-5 text-zinc-400 hover:text-white" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="border-b border-zinc-800 mb-8">
            <TabsList className="bg-transparent w-full flex justify-start gap-8">
              <TabsTrigger
                value="free"
                className="text-lg py-4 px-1 border-b-2 border-transparent data-[state=active]:border-crimson data-[state=active]:text-white text-zinc-400 bg-transparent hover:text-white transition-colors"
              >
                Free Clips
              </TabsTrigger>
              <TabsTrigger
                value="premium"
                className="text-lg py-4 px-1 border-b-2 border-transparent data-[state=active]:border-crimson data-[state=active]:text-white text-zinc-400 bg-transparent hover:text-white transition-colors"
              >
                Premium Clips
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="free" className="mt-6 animate-in fade-in-50 duration-300">
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.freeClips.map((clip, index) => (
                  <Card
                    key={index}
                    className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800 overflow-hidden group hover:border-zinc-700 transition-all duration-300"
                  >
                    <div className="aspect-video relative bg-zinc-800 overflow-hidden">
                      {clip.thumbnail ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={clip.thumbnail || "/placeholder.svg"}
                            alt={clip.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-16 h-16 rounded-full bg-crimson/90 flex items-center justify-center">
                              <Play className="h-8 w-8 text-white" fill="white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-12 w-12 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-white line-clamp-1">{clip.title || "Untitled Clip"}</h3>
                      {clip.description && (
                        <p className="text-zinc-400 mt-1 text-sm line-clamp-2">{clip.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0 flex justify-between">
                      <Button size="sm" className="bg-crimson hover:bg-crimson/90 transition-all">
                        Watch
                      </Button>
                      <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800 transition-all">
                        Download
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    {isOwner ? (
                      <>
                        <h3 className="text-2xl font-bold mb-4">Share Your Vision</h3>
                        <p className="text-zinc-400 mb-8 leading-relaxed">
                          Add free clips to showcase your style and attract viewers to your premium content.
                        </p>
                        <Button asChild className="bg-crimson hover:bg-crimson/90 transition-all">
                          <Link href="/dashboard/clips/add">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Clip
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold mb-4">Coming Soon</h3>
                        <p className="text-zinc-400 mb-6 leading-relaxed">
                          {creator.displayName} hasn't added any free content yet. Check back soon or explore their
                          premium offerings.
                        </p>
                        <Button
                          onClick={() => handleTabChange("premium")}
                          className="bg-crimson hover:bg-crimson/90 transition-all"
                        >
                          View Premium Content
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-6 animate-in fade-in-50 duration-300">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.paidClips.map((clip, index) => (
                  <Card
                    key={index}
                    className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800 overflow-hidden group hover:border-zinc-700 transition-all duration-300"
                  >
                    <div className="aspect-video relative bg-zinc-800 overflow-hidden">
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <Lock className="h-10 w-10 text-crimson" />
                      </div>
                      {clip.thumbnail ? (
                        <Image
                          src={clip.thumbnail || "/placeholder.svg"}
                          alt={clip.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-12 w-12 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white line-clamp-1">
                          {clip.title || "Untitled Clip"}
                        </h3>
                        <span className="text-crimson font-bold">${clip.price || "9.99"}</span>
                      </div>
                      {clip.description && (
                        <p className="text-zinc-400 mt-1 text-sm line-clamp-2">{clip.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0">
                      <Button className="w-full bg-crimson hover:bg-crimson/90 transition-all">Unlock Content</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    {isOwner ? (
                      <>
                        <h3 className="text-2xl font-bold mb-4">Monetize Your Content</h3>
                        <p className="text-zinc-400 mb-8 leading-relaxed">
                          Start earning by adding premium clips that viewers can purchase.
                        </p>
                        <Button asChild className="bg-crimson hover:bg-crimson/90 transition-all">
                          <Link href="/dashboard/clips/add">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Premium Clip
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Lock className="h-12 w-12 text-crimson mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-4">Premium Content Coming Soon</h3>
                        <p className="text-zinc-400 mb-6 leading-relaxed">
                          {creator.displayName} is working on premium content. Check back soon for exclusive clips.
                        </p>
                        <Button
                          onClick={() => handleTabChange("free")}
                          className="bg-crimson hover:bg-crimson/90 transition-all"
                        >
                          View Free Content
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
