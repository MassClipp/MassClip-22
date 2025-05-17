"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Crown, LogOut, Check, User2, Clock, Heart, Download, Shield, Video } from "lucide-react"
import UpgradeButton from "@/components/upgrade-button"
import DownloadStats from "@/components/download-stats"
import { useUserPlan } from "@/hooks/use-user-plan"
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"

export default function UserDashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { isProUser } = useUserPlan()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
      // The redirect is handled in the auth context
    } catch (error) {
      console.error("Error during logout:", error)
      // Fallback redirect
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
    }
  }

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
              <h1 className="text-3xl font-extralight tracking-tight text-white">
                {user.displayName ? `Welcome, ${user.displayName}` : "Welcome to Your Dashboard"}
              </h1>
              <p className="text-zinc-400 mt-1 font-light">Manage your account and subscription</p>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-4 md:mt-0 flex gap-3">
              <Button
                variant="outline"
                className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                onClick={() => router.push("/dashboard/profile")}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </motion.div>
          </motion.div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-zinc-900/30 border-b border-zinc-800/50 w-full justify-start rounded-none mb-6">
              <TabsTrigger
                value="overview"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Overview
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
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Account Settings Card */}
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <User2 className="mr-2 h-5 w-5 text-crimson" /> Account Information
                      </CardTitle>
                      <CardDescription className="text-zinc-400">Your account details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-sm font-medium text-zinc-400 mb-1">Email</h3>
                          <p className="text-white font-light">{user.email}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-zinc-400 mb-1">Display Name</h3>
                          <p className="text-white font-light">{user.displayName || "Not set"}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-zinc-400 mb-1">Account Created</h3>
                          <p className="text-white font-light">
                            {user.metadata?.creationTime
                              ? new Date(user.metadata.creationTime).toLocaleDateString()
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-zinc-400 mb-1">Last Sign In</h3>
                          <p className="text-white font-light">
                            {user.metadata?.lastSignInTime
                              ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                        onClick={() => router.push("/dashboard/profile")}
                      >
                        Edit Profile
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                {/* Download Stats Card */}
                <motion.div variants={itemVariants} className="md:col-span-1">
                  <DownloadStats />
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants} className="md:col-span-3">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Clock className="mr-2 h-5 w-5 text-crimson" /> Quick Actions
                      </CardTitle>
                      <CardDescription className="text-zinc-400">Access your content quickly</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard")}
                        >
                          <Download className="h-6 w-6 text-crimson" />
                          <span>Browse Clips</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/favorites")}
                        >
                          <Heart className="h-6 w-6 text-crimson" />
                          <span>Favorites</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/history")}
                        >
                          <Clock className="h-6 w-6 text-crimson" />
                          <span>History</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-auto py-6 flex flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/profile")}
                        >
                          <User2 className="h-6 w-6 text-crimson" />
                          <span>Profile</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Creator Hub Card */}
                <motion.div variants={itemVariants} className="md:col-span-3">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Video className="mr-2 h-5 w-5 text-crimson" /> Creator Hub
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Share your own video clips with the community
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-light text-white mb-3">Your Creator Profile</h3>
                          <p className="text-zinc-300 mb-4 font-light">
                            Upload and share your own video clips. Create free and premium clip packs that others can
                            discover and purchase.
                          </p>
                          <Button
                            onClick={() => router.push("/dashboard/creator")}
                            className="bg-crimson hover:bg-crimson/90 text-white"
                          >
                            Go to Creator Dashboard
                          </Button>
                        </div>

                        <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
                          <h3 className="text-lg font-light text-white mb-3">Creator Benefits</h3>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center text-zinc-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                              <span className="font-light">Custom profile page</span>
                            </li>
                            <li className="flex items-center text-zinc-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                              <span className="font-light">Organize clips into packs</span>
                            </li>
                            <li className="flex items-center text-zinc-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                              <span className="font-light">Sell premium clip packs</span>
                            </li>
                            <li className="flex items-center text-zinc-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                              <span className="font-light">Build your audience</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="link"
                        className="text-crimson hover:text-crimson/80 p-0"
                        onClick={() => router.push("/dashboard/creator/setup")}
                      >
                        Set up your creator profile
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                {/* Subscription Card */}
                <motion.div variants={itemVariants} className="md:col-span-3">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Crown className="mr-2 h-5 w-5 text-yellow-500" /> Your Subscription
                      </CardTitle>
                      <CardDescription className="text-zinc-400">Manage your subscription plan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-light text-white mb-3">
                            Current Plan:{" "}
                            <span className={isProUser ? "text-yellow-500" : "text-zinc-400"}>
                              {isProUser ? "Creator Pro" : "Free"}
                            </span>
                          </h3>
                          <ul className="space-y-2 text-sm">
                            {isProUser ? (
                              <div className="space-y-2">
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">Unlimited downloads</span>
                                </p>
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">Access to all clips</span>
                                </p>
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">High video quality</span>
                                </p>
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">Priority support</span>
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">10 downloads per month</span>
                                </p>
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">Access to free clips</span>
                                </p>
                                <p className="flex items-center text-white">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="font-light">Standard video quality</span>
                                </p>
                              </div>
                            )}
                          </ul>
                        </div>

                        {!isProUser && (
                          <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
                            <h3 className="text-lg font-light text-white mb-3">Upgrade to Pro</h3>
                            <p className="text-zinc-300 mb-3 font-light">
                              Get unlimited access to all premium features
                            </p>
                            <ul className="space-y-2 text-sm mb-4">
                              <li className="flex items-center text-zinc-300">
                                <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                                <span className="font-light">Access to ALL premium clips</span>
                              </li>
                              <li className="flex items-center text-zinc-300">
                                <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                                <span className="font-light">Unlimited downloads</span>
                              </li>
                              <li className="flex items-center text-zinc-300">
                                <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                                <span className="font-light">Advanced organization features</span>
                              </li>
                              <li className="flex items-center text-zinc-300">
                                <Check className="h-4 w-4 mr-2 text-crimson" />{" "}
                                <span className="font-light">Early access to new clips</span>
                              </li>
                            </ul>
                            <UpgradeButton className="w-full">Upgrade Now - $19/month</UpgradeButton>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="link"
                        className="text-crimson hover:text-crimson/80 p-0"
                        onClick={() => router.push("/membership-plans")}
                      >
                        View all plan options
                      </Button>
                      {isProUser && <CancelSubscriptionButton />}
                    </CardFooter>
                  </Card>
                </motion.div>

                {/* Account Actions Card */}
                <motion.div variants={itemVariants} className="md:col-span-3">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-white text-xl font-light">
                        <Shield className="mr-2 h-5 w-5 text-crimson" /> Account Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={() => router.push("/dashboard/password")}
                        >
                          Change Password
                        </Button>
                        <Button
                          variant="outline"
                          className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" /> {isLoggingOut ? "Logging out..." : "Log Out"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-white text-xl font-light">Account Settings</CardTitle>
                      <CardDescription className="text-zinc-400">Manage your account preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-light text-white mb-2">Profile Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-zinc-400 mb-1">Email</p>
                              <p className="text-white font-light">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-400 mb-1">Display Name</p>
                              <p className="text-white font-light">{user.displayName || "Not set"}</p>
                            </div>
                          </div>
                          <Button
                            className="mt-4 border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                            onClick={() => router.push("/dashboard/profile")}
                            variant="outline"
                          >
                            Edit Profile
                          </Button>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/50">
                          <h3 className="text-lg font-light text-white mb-2">Account Security</h3>
                          <Button
                            className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                            onClick={() => router.push("/dashboard/password")}
                            variant="outline"
                          >
                            Change Password
                          </Button>
                        </div>
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
