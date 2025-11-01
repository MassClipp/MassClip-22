"use client"

import { useState } from "react"
import { BookOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaywallWrapper } from "@/components/paywall-wrapper"
import { EbookEditor } from "@/components/ebook-editor"

export default function EbooksPage() {
  const [activeTab, setActiveTab] = useState<"my-ebooks" | "create">("my-ebooks")

  return (
    <PaywallWrapper>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-white" />
              eBook Creation
            </h1>
            <p className="text-zinc-400 mt-1">Create, edit, and publish professional eBooks with AI assistance</p>
          </div>
          <Button onClick={() => setActiveTab("create")} className="bg-white text-black hover:bg-zinc-200">
            <Plus className="h-4 w-4 mr-2" />
            New eBook
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("my-ebooks")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "my-ebooks" ? "text-white border-b-2 border-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            My eBooks
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "create" ? "text-white border-b-2 border-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Create New
          </button>
        </div>

        {/* Content Area */}
        {activeTab === "my-ebooks" ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Your eBooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No eBooks yet</h3>
                <p className="text-zinc-400 mb-6">Create your first eBook to start selling digital content</p>
                <Button onClick={() => setActiveTab("create")} className="bg-white text-black hover:bg-zinc-100">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First eBook
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EbookEditor />
        )}
      </div>
    </PaywallWrapper>
  )
}
