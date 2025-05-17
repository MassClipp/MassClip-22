"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { AtSign, User, Link2, ArrowLeft } from "lucide-react"

export default function CreatorProfileSetupPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    displayName: user?.displayName || "",
    bio: "",
    website: "",
    instagram: "",
    twitter: "",
    tiktok: "",
  })

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Profile saved",
        description: "Your creator profile has been set up successfully.",
      })

      router.push("/dashboard/creator")
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
              <Button
                variant="ghost"
                className="mb-2 -ml-4 text-zinc-400 hover:text-white"
                onClick={() => router.push("/dashboard/creator")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
              <h1 className="text-3xl font-extralight tracking-tight text-white">Set Up Creator Profile</h1>
              <p className="text-zinc-400 mt-1 font-light">
                Create your public profile to share your clips with the community
              </p>
            </motion.div>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}>
              <form onSubmit={handleSubmit}>
                <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-white text-xl font-light">
                      <User className="mr-2 h-5 w-5 text-crimson" /> Profile Information
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      This information will be displayed on your public profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-zinc-400">
                          Username <span className="text-crimson">*</span>
                        </Label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                          <Input
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="your-username"
                            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                            required
                          />
                        </div>
                        <p className="text-xs text-zinc-500">
                          This will be your unique profile URL: massclip.com/creator/
                          <span className="text-zinc-400">{formData.username || "your-username"}</span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-zinc-400">
                          Display Name <span className="text-crimson">*</span>
                        </Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleChange}
                          placeholder="Your Name"
                          className="bg-zinc-900/50 border-zinc-800 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-zinc-400">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Tell the community about yourself and your content..."
                        className="bg-zinc-900/50 border-zinc-800 text-white min-h-[120px]"
                      />
                    </div>

                    <div>
                      <h3 className="text-white font-light mb-3">Social Links</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-zinc-400">
                            Website
                          </Label>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                              id="website"
                              name="website"
                              value={formData.website}
                              onChange={handleChange}
                              placeholder="https://yourwebsite.com"
                              className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instagram" className="text-zinc-400">
                            Instagram
                          </Label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                              id="instagram"
                              name="instagram"
                              value={formData.instagram}
                              onChange={handleChange}
                              placeholder="your_instagram"
                              className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="twitter" className="text-zinc-400">
                            Twitter
                          </Label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                              id="twitter"
                              name="twitter"
                              value={formData.twitter}
                              onChange={handleChange}
                              placeholder="your_twitter"
                              className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tiktok" className="text-zinc-400">
                            TikTok
                          </Label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                              id="tiktok"
                              name="tiktok"
                              value={formData.tiktok}
                              onChange={handleChange}
                              placeholder="your_tiktok"
                              className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                      onClick={() => router.push("/dashboard/creator")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-crimson hover:bg-crimson/90 text-white" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save Profile"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
