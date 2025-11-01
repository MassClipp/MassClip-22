"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Type,
  ImageIcon,
  AlignLeft,
  Save,
  Download,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface EbookPage {
  id: string
  content: string
  pageNumber: number
}

interface EbookMetadata {
  title: string
  author: string
  description: string
}

export function EbookEditor() {
  const [metadata, setMetadata] = useState<EbookMetadata>({
    title: "Untitled eBook",
    author: "",
    description: "",
  })

  const [pages, setPages] = useState<EbookPage[]>([{ id: "1", content: "", pageNumber: 1 }])

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const currentPage = pages[currentPageIndex]

  const addPage = () => {
    const newPage: EbookPage = {
      id: Date.now().toString(),
      content: "",
      pageNumber: pages.length + 1,
    }
    setPages([...pages, newPage])
    setCurrentPageIndex(pages.length)
  }

  const deletePage = (pageId: string) => {
    if (pages.length === 1) return
    const newPages = pages.filter((p) => p.id !== pageId)
    setPages(newPages)
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1)
    }
  }

  const updatePageContent = (content: string) => {
    const newPages = [...pages]
    newPages[currentPageIndex] = { ...currentPage, content }
    setPages(newPages)
  }

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  const generateWithAI = async () => {
    setIsGenerating(true)
    // AI generation will be implemented in next step
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-16rem)]">
      {/* Control Panel */}
      <Card className="w-80 bg-zinc-900/50 border-zinc-800 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Metadata Section */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">eBook Details</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-zinc-400 text-xs">
                  Title
                </Label>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="Enter eBook title"
                />
              </div>
              <div>
                <Label htmlFor="author" className="text-zinc-400 text-xs">
                  Author
                </Label>
                <Input
                  id="author"
                  value={metadata.author}
                  onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-zinc-400 text-xs">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-20"
                  placeholder="Brief description"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* AI Generation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">AI Assistant</h3>
            <Button
              onClick={generateWithAI}
              disabled={isGenerating}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate with AI"}
            </Button>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Page Management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Pages ({pages.length})</h3>
              <Button onClick={addPage} size="sm" variant="ghost" className="h-7 text-white hover:bg-zinc-800">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    index === currentPageIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  }`}
                  onClick={() => setCurrentPageIndex(index)}
                >
                  <span className="text-sm text-white">Page {page.pageNumber}</span>
                  {pages.length > 1 && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        deletePage(page.id)
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full bg-white text-black hover:bg-zinc-200">
              <Save className="h-4 w-4 mr-2" />
              Save eBook
            </Button>
            <Button variant="outline" className="w-full border-zinc-700 text-white hover:bg-zinc-800 bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Display Area */}
      <div className="flex-1 flex flex-col">
        {/* Page Display */}
        <Card className="flex-1 bg-zinc-900/50 border-zinc-800 p-8 flex items-center justify-center">
          <div className="w-full max-w-2xl h-full flex flex-col">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-zinc-400">
                Page {currentPage.pageNumber} of {pages.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={goToPreviousPage}
                  disabled={currentPageIndex === 0}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={goToNextPage}
                  disabled={currentPageIndex === pages.length - 1}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Page Content Editor */}
            <div className="flex-1 bg-white rounded-lg shadow-2xl p-12 overflow-y-auto">
              <Textarea
                value={currentPage.content}
                onChange={(e) => updatePageContent(e.target.value)}
                className="w-full h-full border-0 resize-none focus-visible:ring-0 text-black text-base leading-relaxed"
                placeholder="Start writing your content here..."
              />
            </div>
          </div>
        </Card>

        {/* Toolbar */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Type className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <AlignLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
