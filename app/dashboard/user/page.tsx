"use client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Settings, Crown, LogOut, Check } from "lucide-react"
import UpgradeButton from "@/components/upgrade-button"
import DownloadStats from "@/components/download-stats"
import { useUserPlan } from "@/hooks/use-user-plan"
import CancelSubscriptionButton from "@/components/cancel-subscription-button"

export default function UserDashboardPage() {
  const { user, logOut } = useAuth()
  const router = useRouter()
  const { isProUser } = useUserPlan()

  const handleLogout = async () => {
    const result = await logOut()
    if (result.success) {
      router.push("/login")
    }
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
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {user.displayName ? `Welcome, ${user.displayName}` : "Welcome to Your Dashboard"}
              </h1>
              <p className="text-gray-400 mt-1">Manage your account and subscription</p>
            </div>

            <div className="mt-4 md:mt-0 flex gap-3">
              <Button
                variant="outline"
                className="border-crimson bg-transparent text-white hover:bg-crimson/10 hover:text-white"
                onClick={() => router.push("/dashboard/profile")}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-gray-900 border-b border-gray-800 w-full justify-start rounded-none mb-6">
              <TabsTrigger
                value="overview"
                className="text-white data-[state=active]:bg-gray-800 hover:bg-transparent hover:border-red-600 hover:border hover:rounded-md transition-all duration-200"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="text-white data-[state=active]:bg-gray-800 hover:bg-transparent hover:border-red-600 hover:border hover:rounded-md transition-all duration-200"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Account Settings Card */}
                <Card className="bg-black border-gray-800 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Settings className="mr-2 h-5 w-5 text-gray-400" /> Account Information
                    </CardTitle>
                    <CardDescription className="text-white">Your account details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-white mb-1">Email</h3>
                        <p className="text-white">{user.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white mb-1">Display Name</h3>
                        <p className="text-white">{user.displayName || "Not set"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white mb-1">Account Created</h3>
                        <p className="text-white">
                          {user.metadata.creationTime
                            ? new Date(user.metadata.creationTime).toLocaleDateString()
                            : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white mb-1">Last Sign In</h3>
                        <p className="text-white">
                          {user.metadata.lastSignInTime
                            ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="border-crimson bg-transparent text-white hover:bg-crimson/10 hover:text-white"
                      onClick={() => router.push("/dashboard/profile")}
                    >
                      Edit Profile
                    </Button>
                  </CardFooter>
                </Card>

                {/* Download Stats Card */}
                <div className="md:col-span-1">
                  <DownloadStats />
                </div>

                {/* Subscription Card */}
                <Card className="bg-black border-gray-800 md:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Crown className="mr-2 h-5 w-5 text-yellow-500" /> Your Subscription
                    </CardTitle>
                    <CardDescription className="text-white">Manage your subscription plan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3">
                          Current Plan: {isProUser ? "Pro" : "Free"}
                        </h3>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center text-gray-300">
                            <Check className="h-4 w-4 mr-2 text-green-500" /> Access to {isProUser ? "all" : "free"}{" "}
                            clips
                          </li>
                          <li className="flex items-center text-gray-300">
                            <Check className="h-4 w-4 mr-2 text-green-500" /> Save favorites
                          </li>
                          {isProUser ? (
                            <>
                              <li className="flex items-center text-gray-300">
                                <Check className="h-4 w-4 mr-2 text-green-500" /> Unlimited downloads
                              </li>
                              <li className="flex items-center text-gray-300">
                                <Check className="h-4 w-4 mr-2 text-green-500" /> Advanced organization features
                              </li>
                              <li className="flex items-center text-gray-300">
                                <Check className="h-4 w-4 mr-2 text-green-500" /> Early access to new clips
                              </li>
                            </>
                          ) : (
                            <li className="flex items-center text-gray-300">
                              <Check className="h-4 w-4 mr-2 text-green-500" /> 5 downloads per month
                            </li>
                          )}
                        </ul>
                      </div>

                      {!isProUser && (
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                          <h3 className="text-lg font-medium text-white mb-3">Upgrade to Pro</h3>
                          <p className="text-gray-300 mb-3">Get unlimited access to all premium features</p>
                          <ul className="space-y-2 text-sm mb-4">
                            <li className="flex items-center text-gray-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" /> Access to ALL premium clips
                            </li>
                            <li className="flex items-center text-gray-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" /> Unlimited downloads
                            </li>
                            <li className="flex items-center text-gray-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" /> Advanced organization features
                            </li>
                            <li className="flex items-center text-gray-300">
                              <Check className="h-4 w-4 mr-2 text-crimson" /> Early access to new clips
                            </li>
                          </ul>
                          <UpgradeButton>Upgrade Now - $19/month</UpgradeButton>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="link"
                      className="text-crimson hover:text-crimson/80 p-0"
                      onClick={() => router.push("/pricing")}
                    >
                      View all plan options
                    </Button>
                    {isProUser && <CancelSubscriptionButton />}
                  </CardFooter>
                </Card>

                {/* Account Actions Card */}
                <Card className="bg-black border-gray-800 md:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-white">Account Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => router.push("/dashboard/profile")} className="vault-button inline-block">
                        <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300">
                          <Edit className="inline-block mr-2 h-4 w-4" /> Edit Profile
                        </span>
                      </button>
                      <button onClick={() => router.push("/dashboard/password")} className="vault-button inline-block">
                        <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300">
                          Change Password
                        </span>
                      </button>
                      <button onClick={() => router.push("/dashboard")} className="vault-button inline-block">
                        <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300">
                          Browse Videos
                        </span>
                      </button>
                      <button onClick={handleLogout} className="vault-button inline-block">
                        <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300">
                          <LogOut className="inline-block mr-2 h-4 w-4" /> Log Out
                        </span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Account Settings</CardTitle>
                  <CardDescription className="text-white">Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">Profile Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Email</p>
                          <p className="text-white">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Display Name</p>
                          <p className="text-white">{user.displayName || "Not set"}</p>
                        </div>
                      </div>
                      <Button
                        className="mt-4 border border-crimson bg-transparent text-white hover:bg-crimson/10"
                        onClick={() => router.push("/dashboard/profile")}
                      >
                        Edit Profile
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-gray-800">
                      <h3 className="text-lg font-medium text-white mb-2">Account Security</h3>
                      <Button
                        variant="outline"
                        className="border-crimson bg-transparent text-white hover:bg-crimson/10"
                        onClick={() => router.push("/dashboard/password")}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
