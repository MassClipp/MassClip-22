"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import UploadForm from "@/components/upload-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Upload, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")

  // Set active tab based on URL query parameter
  useEffect(() => {
    const premium = searchParams.get("premium")
    if (premium === "true") {
      setActiveTab("premium")
    }
  }, [searchParams])

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with gradient background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        <div className="container mx-auto relative z-10 px-4">
          <div className="pt-8 pb-6 flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="mr-4 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">Upload Content</h1>
            </div>

            <div className="flex items-center">
              <Upload className="h-5 w-5 mr-2 text-red-500" />
              <span className="text-sm text-zinc-400">Creator Studio</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 pb-20">
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "free" | "premium")}
          className="w-full"
        >
          <div className="flex justify-center mb-8">
            <TabsList className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-1">
              <TabsTrigger
                value="free"
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-gradient-to-r from-red-500 to-red-600 data-[state=active]:text-white",
                  "transition-all duration-200",
                )}
              >
                <Unlock className="h-4 w-4" />
                <span>Free Content</span>
              </TabsTrigger>
              <TabsTrigger
                value="premium"
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-gradient-to-r from-amber-400 to-amber-600 data-[state=active]:text-black",
                  "transition-all duration-200",
                )}
              >
                <Lock className="h-4 w-4" />
                <span>Premium Content</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="free" className="mt-0">
            <UploadForm contentType="free" />
          </TabsContent>

          <TabsContent value="premium" className="mt-0">
            <UploadForm contentType="premium" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
