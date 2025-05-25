"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PremiumPricingControl from "./premium-pricing-control"

// Mock data
const mockVideos = [
  { id: "1", title: "Video 1", type: "free", views: 120, likes: 15, url: "/videos/sample1.mp4" },
  { id: "2", title: "Video 2", type: "free", views: 85, likes: 9, url: "/videos/sample2.mp4" },
  { id: "3", title: "Premium Tutorial", type: "premium", views: 42, likes: 7, url: "/videos/premium1.mp4" },
  { id: "4", title: "Exclusive Content", type: "premium", views: 36, likes: 5, url: "/videos/premium2.mp4" },
]

export default function CreatorProfileWithPricing({ creator, isOwner = true }) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "premium" ? "premium" : "free"
  const [activeTab, setActiveTab] = useState(initialTab)

  const freeVideos = mockVideos.filter((video) => video.type === "free")
  const premiumVideos = mockVideos.filter((video) => video.type === "premium")

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-20">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg">
          <TabsTrigger value="free" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Free Clips
          </TabsTrigger>
          <TabsTrigger value="premium" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Premium Clips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="free" className="mt-6">
          {freeVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {freeVideos.map((video) => (
                <div key={video.id} className="bg-zinc-900 rounded-lg overflow-hidden">
                  <div className="aspect-[9/16] bg-zinc-800"></div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white">{video.title}</h3>
                    <div className="flex justify-between mt-1 text-xs text-zinc-400">
                      <span>{video.views} views</span>
                      <span>{video.likes} likes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">No free videos available</div>
          )}
        </TabsContent>

        <TabsContent value="premium" className="mt-6">
          {/* Premium pricing control - only visible for premium tab */}
          <PremiumPricingControl creatorId="123" username="creator" currentPrice={4.99} isOwner={isOwner} />

          {premiumVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {premiumVideos.map((video) => (
                <div key={video.id} className="bg-zinc-900 rounded-lg overflow-hidden">
                  <div className="aspect-[9/16] bg-zinc-800 relative">
                    <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full">
                      PRO
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white">{video.title}</h3>
                    <div className="flex justify-between mt-1 text-xs text-zinc-400">
                      <span>{video.views} views</span>
                      <span>{video.likes} likes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">No premium videos available</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
