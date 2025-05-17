"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { User, Upload, BarChart2, ChevronRight, FileText, DollarSign } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function CreatorHubPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // Sample data for the interface
  const stats = {
    totalClips: 28,
    totalSales: 1660.0,
    clipViews: "32.5K",
  }

  const freeClips = [
    { id: 1, title: "Dynamic edit", views: 1204, thumbnail: "/dynamic-zoom-thumbnail.png" },
    { id: 2, title: "Street interview clip", views: 986, thumbnail: "/abstract-zoom-blur.png" },
    { id: 3, title: "Street interview clip", views: 654, thumbnail: "/digital-distortion.png" },
  ]

  const paidClips = [
    { id: 4, title: "Premium transition", views: 8764, price: 4.99, thumbnail: "/abstract-glitch-thumbnail.png" },
    { id: 5, title: "Professional lower third", views: 6532, price: 3.99, thumbnail: "/diagonal-wipe-transition.png" },
    { id: 6, title: "Cinematic title sequence", views: 5421, price: 7.99, thumbnail: "/molecular-spin-change.png" },
  ]

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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-zinc-900">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-zinc-900/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-zinc-900/20 to-transparent"></div>
      </div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          >
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-extralight tracking-tight text-white">Creator Hub</h1>
              <p className="text-zinc-400 mt-1 font-light">Manage and track your content</p>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-4 md:mt-0">
              <Button
                onClick={() => router.push("/dashboard/creator-hub/upload")}
                className="bg-crimson hover:bg-crimson/90 text-white"
              >
                <Upload className="mr-2 h-4 w-4" /> Upload clip
              </Button>
            </motion.div>
          </motion.div>

          <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900/30 border-b border-zinc-800/50 w-full justify-start rounded-none mb-6">
              <TabsTrigger
                value="overview"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="free-clips"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Free Clips
              </TabsTrigger>
              <TabsTrigger
                value="paid-clips"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Paid Clips
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              >
                <motion.div variants={itemVariants}>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 text-sm uppercase tracking-wider mb-2">Total Clips</span>
                        <span className="text-4xl font-bold text-white">{stats.totalClips}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 text-sm uppercase tracking-wider mb-2">Total Sales</span>
                        <span className="text-4xl font-bold text-white">${stats.totalSales.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
                          Clip Views (Last 50 Days)
                        </span>
                        <span className="text-4xl font-bold text-white">{stats.clipViews}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <h2 className="text-2xl font-light text-white mb-4">Free Clips</h2>
                  <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
                    <div className="grid grid-cols-12 p-4 text-sm font-medium text-zinc-400 border-b border-zinc-800/50">
                      <div className="col-span-7 md:col-span-8">Clip</div>
                      <div className="col-span-3 md:col-span-3 text-right">Views</div>
                      <div className="col-span-2 md:col-span-1"></div>
                    </div>
                    <div className="divide-y divide-zinc-800/30">
                      {freeClips.map((clip) => (
                        <div
                          key={clip.id}
                          className="grid grid-cols-12 items-center p-4 hover:bg-zinc-800/20 transition-colors"
                        >
                          <div className="col-span-7 md:col-span-8 flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded bg-zinc-800">
                              <Image
                                src={clip.thumbnail || "/placeholder.svg"}
                                alt={clip.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium text-white">{clip.title}</span>
                          </div>
                          <div className="col-span-3 md:col-span-3 text-right font-medium text-zinc-300">
                            {clip.views.toLocaleString()}
                          </div>
                          <div className="col-span-2 md:col-span-1 text-right">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-light text-white">Paid Clips</h2>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("paid-clips")}
                      className="text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600"
                    >
                      View All
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
                    <div className="grid grid-cols-12 p-4 text-sm font-medium text-zinc-400 border-b border-zinc-800/50">
                      <div className="col-span-5 md:col-span-6">Clip</div>
                      <div className="col-span-2 md:col-span-2 text-right">Price</div>
                      <div className="col-span-3 md:col-span-3 text-right">Views</div>
                      <div className="col-span-2 md:col-span-1"></div>
                    </div>
                    <div className="divide-y divide-zinc-800/30">
                      {paidClips.slice(0, 2).map((clip) => (
                        <div
                          key={clip.id}
                          className="grid grid-cols-12 items-center p-4 hover:bg-zinc-800/20 transition-colors"
                        >
                          <div className="col-span-5 md:col-span-6 flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded bg-zinc-800">
                              <Image
                                src={clip.thumbnail || "/placeholder.svg"}
                                alt={clip.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium text-white">{clip.title}</span>
                          </div>
                          <div className="col-span-2 md:col-span-2 text-right font-medium text-green-500">
                            ${clip.price.toFixed(2)}
                          </div>
                          <div className="col-span-3 md:col-span-3 text-right font-medium text-zinc-300">
                            {clip.views.toLocaleString()}
                          </div>
                          <div className="col-span-2 md:col-span-1 text-right">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="free-clips">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-light text-white">Free Clips</h2>
                  <Button
                    onClick={() => router.push("/dashboard/creator-hub/upload?type=free")}
                    className="bg-crimson hover:bg-crimson/90 text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Free Clip
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
                    <div className="grid grid-cols-12 p-4 text-sm font-medium text-zinc-400 border-b border-zinc-800/50">
                      <div className="col-span-7 md:col-span-8">Clip</div>
                      <div className="col-span-3 md:col-span-3 text-right">Views</div>
                      <div className="col-span-2 md:col-span-1"></div>
                    </div>
                    <div className="divide-y divide-zinc-800/30">
                      {freeClips.map((clip) => (
                        <div
                          key={clip.id}
                          className="grid grid-cols-12 items-center p-4 hover:bg-zinc-800/20 transition-colors"
                        >
                          <div className="col-span-7 md:col-span-8 flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded bg-zinc-800">
                              <Image
                                src={clip.thumbnail || "/placeholder.svg"}
                                alt={clip.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium text-white">{clip.title}</span>
                          </div>
                          <div className="col-span-3 md:col-span-3 text-right font-medium text-zinc-300">
                            {clip.views.toLocaleString()}
                          </div>
                          <div className="col-span-2 md:col-span-1 text-right">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="paid-clips">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-light text-white">Paid Clips</h2>
                  <Button
                    onClick={() => router.push("/dashboard/creator-hub/upload?type=paid")}
                    className="bg-crimson hover:bg-crimson/90 text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Paid Clip
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
                    <div className="grid grid-cols-12 p-4 text-sm font-medium text-zinc-400 border-b border-zinc-800/50">
                      <div className="col-span-5 md:col-span-6">Clip</div>
                      <div className="col-span-2 md:col-span-2 text-right">Price</div>
                      <div className="col-span-3 md:col-span-3 text-right">Views</div>
                      <div className="col-span-2 md:col-span-1"></div>
                    </div>
                    <div className="divide-y divide-zinc-800/30">
                      {paidClips.map((clip) => (
                        <div
                          key={clip.id}
                          className="grid grid-cols-12 items-center p-4 hover:bg-zinc-800/20 transition-colors"
                        >
                          <div className="col-span-5 md:col-span-6 flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded bg-zinc-800">
                              <Image
                                src={clip.thumbnail || "/placeholder.svg"}
                                alt={clip.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium text-white">{clip.title}</span>
                          </div>
                          <div className="col-span-2 md:col-span-2 text-right font-medium text-green-500">
                            ${clip.price.toFixed(2)}
                          </div>
                          <div className="col-span-3 md:col-span-3 text-right font-medium text-zinc-300">
                            {clip.views.toLocaleString()}
                          </div>
                          <div className="col-span-2 md:col-span-1 text-right">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <h2 className="text-2xl font-light text-white mb-6">Creator Settings</h2>
                  <div className="space-y-6">
                    <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white text-lg font-medium">Creator Profile</h3>
                            <p className="text-zinc-400 text-sm">Manage your public creator profile</p>
                          </div>
                          <Button
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            <User className="mr-2 h-4 w-4" /> Edit Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white text-lg font-medium">Payout Settings</h3>
                            <p className="text-zinc-400 text-sm">Manage how you receive payments</p>
                          </div>
                          <Button
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            <DollarSign className="mr-2 h-4 w-4" /> Manage Payouts
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white text-lg font-medium">Analytics</h3>
                            <p className="text-zinc-400 text-sm">View detailed performance metrics</p>
                          </div>
                          <Button
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            <BarChart2 className="mr-2 h-4 w-4" /> View Analytics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white text-lg font-medium">Legal Agreements</h3>
                            <p className="text-zinc-400 text-sm">View and accept creator terms</p>
                          </div>
                          <Button
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            <FileText className="mr-2 h-4 w-4" /> View Terms
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
