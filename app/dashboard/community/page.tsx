"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Upload, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchPublicVideos, fetchVideosByCategory } from "@/lib/upload-utils"
import UserVideoCard from "@/components/user-video-card"
import type { UserVideo } from "@/lib/types"

// Predefined categories for tabs
const FEATURED_CATEGORIES = [
  "All",
  "Morning Routine",
  "Workout",
  "Motivation",
  "Hustle Mentality",
  "Business Tips",
  "Lifestyle",
]

export default function CommunityPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("All")
  const [videos, setVideos] = useState<UserVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch videos based on selected category
  useEffect(() => {
    const loadVideos = async () => {
      setIsLoading(true)
      try {
        let fetchedVideos: UserVideo[]

        if (activeTab === "All") {
          fetchedVideos = await fetchPublicVideos(50)
        } else {
          fetchedVideos = await fetchVideosByCategory(activeTab, 50)
        }

        setVideos(fetchedVideos)
      } catch (error) {
        console.error("Failed to fetch videos:", error)
        toast({
          title: "Failed to load videos",
          description: "There was an error loading community videos.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadVideos()
  }, [activeTab])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Filter videos based on search query
  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-white">Community Videos</h1>
                <p className="text-zinc-400 mt-1 font-light">Discover content from the MassClip community</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search videos..."
                    className="pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-md text-white w-full sm:w-[250px] focus:outline-none focus:ring-1 focus:ring-crimson"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {user && (
                  <Button className="bg-crimson hover:bg-crimson/90" onClick={() => router.push("/dashboard/uploads")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Video
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="All" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="bg-zinc-900/30 border-b border-zinc-800/50 w-full justify-start rounded-none mb-6 overflow-x-auto flex pb-0">
                {FEATURED_CATEGORIES.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3 whitespace-nowrap"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              {FEATURED_CATEGORIES.map((category) => (
                <TabsContent key={category} value={category} className="mt-0">
                  {isLoading ? (
                    <div className="py-12 flex justify-center">
                      <RefreshCw className="h-8 w-8 text-zinc-500 animate-spin" />
                    </div>
                  ) : filteredVideos.length === 0 ? (
                    <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm p-12 text-center">
                      <CardContent className="pt-6">
                        <h3 className="text-xl font-light mb-2">No videos found</h3>
                        <p className="text-zinc-400 font-extralight mb-6">
                          {searchQuery ? "Try a different search term" : `No videos found in ${category} category`}
                        </p>
                        {user && (
                          <Button
                            className="bg-crimson hover:bg-crimson/90"
                            onClick={() => router.push("/dashboard/uploads")}
                          >
                            Upload Your Own Video
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                      {filteredVideos.map((video, index) => (
                        <UserVideoCard key={video.id} video={video} priority={index < 8} />
                      ))}
                    </motion.div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
