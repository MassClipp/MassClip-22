"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Video, Package, Users, Settings, Plus } from "lucide-react"

export default function CreatorDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

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

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
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
              <h1 className="text-3xl font-extralight tracking-tight text-white">Creator Dashboard</h1>
              <p className="text-zinc-400 mt-1 font-light">Manage your clips and creator profile</p>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-4 md:mt-0 flex gap-3">
              <Button
                variant="outline"
                className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                onClick={() => router.push("/dashboard/creator/setup")}
              >
                <Settings className="mr-2 h-4 w-4" /> Profile Settings
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
                value="clip-packs"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Clip Packs
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Creator Profile Card */}
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Video className="mr-2 h-5 w-5 text-crimson" /> Creator Profile
                      </CardTitle>
                      <CardDescription className="text-zinc-400">Your public creator profile</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-6 rounded-lg border border-zinc-800/50 bg-zinc-900/50">
                          <h3 className="text-lg font-light text-white mb-3">Set Up Your Creator Profile</h3>
                          <p className="text-zinc-300 mb-4 font-light">
                            Create your public profile to start sharing your clip packs with the community.
                          </p>
                          <Button
                            onClick={() => router.push("/dashboard/creator/setup")}
                            className="bg-crimson hover:bg-crimson/90 text-white"
                          >
                            Set Up Profile
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Quick Stats Card */}
                <motion.div variants={itemVariants} className="md:col-span-1">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Package className="mr-2 h-5 w-5 text-crimson" /> Your Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50">
                          <span className="text-zinc-300">Clip Packs</span>
                          <span className="text-white font-medium">0</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50">
                          <span className="text-zinc-300">Total Clips</span>
                          <span className="text-white font-medium">0</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50">
                          <span className="text-zinc-300">Profile Views</span>
                          <span className="text-white font-medium">0</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants} className="md:col-span-3">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Video className="mr-2 h-5 w-5 text-crimson" /> Quick Actions
                      </CardTitle>
                      <CardDescription className="text-zinc-400">Manage your creator content</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/creator/clip-packs/new")}
                        >
                          <Plus className="h-6 w-6 text-crimson" />
                          <span>New Clip Pack</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/creator/clip-packs")}
                        >
                          <Package className="h-6 w-6 text-crimson" />
                          <span>Manage Packs</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/creator/setup")}
                        >
                          <Settings className="h-6 w-6 text-crimson" />
                          <span>Profile Settings</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/creator/analytics")}
                        >
                          <Users className="h-6 w-6 text-crimson" />
                          <span>View Analytics</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="clip-packs">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-white text-xl font-light">Your Clip Packs</CardTitle>
                      <CardDescription className="text-zinc-400">
                        Manage your clip packs and individual clips
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Video className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                        <h3 className="text-lg font-light text-white mb-2">No Clip Packs Yet</h3>
                        <p className="text-zinc-400 max-w-md mx-auto mb-6">
                          Create your first clip pack to start sharing your content with the community.
                        </p>
                        <Button
                          onClick={() => router.push("/dashboard/creator/clip-packs/new")}
                          className="bg-crimson hover:bg-crimson/90 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Create Clip Pack
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="analytics">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-white text-xl font-light">Analytics</CardTitle>
                      <CardDescription className="text-zinc-400">
                        Track the performance of your creator profile and clip packs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                        <h3 className="text-lg font-light text-white mb-2">No Analytics Available</h3>
                        <p className="text-zinc-400 max-w-md mx-auto mb-6">
                          Set up your creator profile and add clip packs to start tracking analytics.
                        </p>
                        <Button
                          onClick={() => router.push("/dashboard/creator/setup")}
                          className="bg-crimson hover:bg-crimson/90 text-white"
                        >
                          Set Up Creator Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
