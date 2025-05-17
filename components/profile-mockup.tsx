"use client"

import { useState } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Share2,
  MessageCircle,
  Heart,
  Play,
  Clock,
} from "lucide-react"

export default function ProfileMockup() {
  const [activeTab, setActiveTab] = useState("all")

  // Sample data
  const creator = {
    displayName: "Sarah Johnson",
    username: "sarahjcreates",
    isVerified: true,
    bio: "Professional video creator specializing in transitions and effects. I create premium video clips for content creators.",
    stats: {
      clips: 48,
      followers: 1250,
      views: "32.5K",
    },
    social: {
      instagram: "sarahjcreates",
      twitter: "sarahjcreates",
      youtube: "sarahjcreates",
      website: "sarahjohnson.com",
    },
  }

  const freeClips = [
    {
      id: "clip1",
      title: "Smooth Slide Transition",
      thumbnail: "/dynamic-zoom-thumbnail.png",
      duration: "0:12",
      createdAt: "2 days ago",
      views: 1240,
    },
    {
      id: "clip2",
      title: "Abstract Geometric Transition",
      thumbnail: "/abstract-geometric-transition.png",
      duration: "0:08",
      createdAt: "1 week ago",
      views: 3450,
    },
    {
      id: "clip3",
      title: "Digital Distortion Effect",
      thumbnail: "/digital-distortion.png",
      duration: "0:15",
      createdAt: "2 weeks ago",
      views: 2180,
    },
  ]

  const premiumClips = [
    {
      id: "premium1",
      title: "Professional Slide Transition Pack",
      thumbnail: "/presentation-slide-transition.png",
      duration: "0:45",
      createdAt: "3 days ago",
      views: 780,
      price: "$4.99",
    },
    {
      id: "premium2",
      title: "Abstract Zoom Blur Transitions",
      thumbnail: "/abstract-zoom-blur.png",
      duration: "0:30",
      createdAt: "5 days ago",
      views: 1120,
      price: "$3.99",
    },
  ]

  return (
    <div className="w-full bg-black text-white min-h-screen">
      {/* Cover Image and Profile Section */}
      <div className="relative h-64 md:h-80 w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10"></div>
        <Image src="/abstract-geometric-transition.png" alt="Cover" fill className="object-cover" priority />

        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 flex flex-col md:flex-row items-start md:items-end gap-6">
          <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-black overflow-hidden bg-zinc-800">
            <Image src="/abstract-profile.png" alt={creator.displayName} fill className="object-cover" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName}</h1>
              {creator.isVerified && <CheckCircle className="h-5 w-5 text-crimson" />}
            </div>
            <p className="text-zinc-400 mb-3">@{creator.username}</p>

            <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
              <div>
                <span className="font-semibold">{creator.stats.clips}</span>{" "}
                <span className="text-zinc-400">clips</span>
              </div>
              <div>
                <span className="font-semibold">{creator.stats.followers}</span>{" "}
                <span className="text-zinc-400">followers</span>
              </div>
              <div>
                <span className="font-semibold">{creator.stats.views}</span>{" "}
                <span className="text-zinc-400">views</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="default" className="bg-crimson hover:bg-crimson/90">
              Follow
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bio and Social Links */}
      <div className="container mx-auto px-4 py-6 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-lg font-medium mb-2">About</h2>
          <p className="text-zinc-300 mb-6">{creator.bio}</p>

          <div className="flex flex-wrap gap-4">
            {creator.social.instagram && (
              <a href="#" className="flex items-center gap-2 text-zinc-400 hover:text-white">
                <Instagram className="h-4 w-4" />
                <span>Instagram</span>
              </a>
            )}
            {creator.social.twitter && (
              <a href="#" className="flex items-center gap-2 text-zinc-400 hover:text-white">
                <Twitter className="h-4 w-4" />
                <span>Twitter</span>
              </a>
            )}
            {creator.social.youtube && (
              <a href="#" className="flex items-center gap-2 text-zinc-400 hover:text-white">
                <Youtube className="h-4 w-4" />
                <span>YouTube</span>
              </a>
            )}
            {creator.social.website && (
              <a href="#" className="flex items-center gap-2 text-zinc-400 hover:text-white">
                <Globe className="h-4 w-4" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <div className="border-b border-zinc-800 mb-6">
            <TabsList className="bg-transparent">
              <TabsTrigger
                value="all"
                className={`text-sm data-[state=active]:text-white data-[state=active]:border-crimson pb-2 ${
                  activeTab === "all" ? "border-b-2" : ""
                }`}
              >
                All Clips
              </TabsTrigger>
              <TabsTrigger
                value="free"
                className={`text-sm data-[state=active]:text-white data-[state=active]:border-crimson pb-2 ${
                  activeTab === "free" ? "border-b-2" : ""
                }`}
              >
                Free
              </TabsTrigger>
              <TabsTrigger
                value="premium"
                className={`text-sm data-[state=active]:text-white data-[state=active]:border-crimson pb-2 ${
                  activeTab === "premium" ? "border-b-2" : ""
                }`}
              >
                Premium
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">Premium Clips</h2>
                <Button variant="link" className="text-crimson">
                  View All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {premiumClips.map((clip) => (
                  <Card key={clip.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                    <div className="relative aspect-video group cursor-pointer">
                      <Image
                        src={clip.thumbnail || "/placeholder.svg"}
                        alt={clip.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="h-12 w-12 rounded-full bg-crimson/90 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white" fill="white" />
                        </div>
                      </div>
                      <Badge className="absolute top-2 right-2 bg-crimson">PREMIUM</Badge>
                      <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-xs flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {clip.duration}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1 line-clamp-1">{clip.title}</h3>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{clip.createdAt}</span>
                        <span className="font-medium text-white">{clip.price}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">Free Clips</h2>
                <Button variant="link" className="text-crimson">
                  View All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeClips.map((clip) => (
                  <Card key={clip.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                    <div className="relative aspect-video group cursor-pointer">
                      <Image
                        src={clip.thumbnail || "/placeholder.svg"}
                        alt={clip.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="h-12 w-12 rounded-full bg-crimson/90 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white" fill="white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-xs flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {clip.duration}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1 line-clamp-1">{clip.title}</h3>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{clip.createdAt}</span>
                        <div className="flex items-center">
                          <Heart className="h-3 w-3 mr-1" />
                          <span>{clip.views}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="free">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {freeClips.map((clip) => (
                <Card key={clip.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                  <div className="relative aspect-video group cursor-pointer">
                    <Image src={clip.thumbnail || "/placeholder.svg"} alt={clip.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-crimson/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" fill="white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-xs flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {clip.duration}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1 line-clamp-1">{clip.title}</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{clip.createdAt}</span>
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        <span>{clip.views}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="premium">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumClips.map((clip) => (
                <Card key={clip.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                  <div className="relative aspect-video group cursor-pointer">
                    <Image src={clip.thumbnail || "/placeholder.svg"} alt={clip.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-crimson/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" fill="white" />
                      </div>
                    </div>
                    <Badge className="absolute top-2 right-2 bg-crimson">PREMIUM</Badge>
                    <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-xs flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {clip.duration}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1 line-clamp-1">{clip.title}</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{clip.createdAt}</span>
                      <span className="font-medium text-white">{clip.price}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
