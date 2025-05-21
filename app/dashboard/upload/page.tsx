"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UploadForm from "@/components/upload-form"
import { DollarSign, Video } from "lucide-react"
import { redirect } from "next/navigation"

export default function UploadPage() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")

  // Redirect if not logged in
  if (!loading && !user) {
    redirect("/login?redirect=/dashboard/upload")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Upload Your Content</h1>

      <Tabs
        defaultValue="free"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "free" | "premium")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8">
          <TabsTrigger value="free" className="flex items-center gap-2 py-3">
            <Video className="h-4 w-4" />
            <span>Free Content</span>
          </TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center gap-2 py-3">
            <DollarSign className="h-4 w-4" />
            <span>Premium Content</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="free">
          <UploadForm contentType="free" />
        </TabsContent>

        <TabsContent value="premium">
          <UploadForm contentType="premium" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
