"use client"

import type React from "react"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Eye,
  FileDown,
  Rocket,
  List,
  X,
  ImageIcon,
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
  title?: string
}

interface EbookMetadata {
  title: string
  author: string
  description: string
  coverImage?: string
}

export function EbookEditor() {
  const [metadata, setMetadata] = useState<EbookMetadata>({
    title: "Untitled eBook",
    author: "",
    description: "",
  })

  const [pages, setPages] = useState<EbookPage[]>([{ id: "1", content: "", pageNumber: 1, title: "Chapter 1" }])

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right")
  const [editingTitle, setEditingTitle] = useState(false)

  const currentPage = pages[currentPageIndex]

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setMetadata({ ...metadata, coverImage: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const addPage = () => {
    const newPage: EbookPage = {
      id: Date.now().toString(),
      content: "",
      pageNumber: pages.length + 1,
      title: `Chapter ${pages.length + 1}`,
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
      setFlipDirection("left")
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentPageIndex(currentPageIndex - 1)
        setIsFlipping(false)
      }, 300)
    }
  }

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setFlipDirection("right")
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentPageIndex(currentPageIndex + 1)
        setIsFlipping(false)
      }, 300)
    }
  }

  const jumpToPage = (index: number) => {
    setCurrentPageIndex(index)
    setShowTOC(false)
  }

  const generateWithAI = async () => {
    setIsGenerating(true)
    // AI generation will be implemented in next step
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black">
        <div className="flex items-center gap-4">
          <div className="text-xs text-zinc-500">Dashboard / eBooks /</div>
          {editingTitle ? (
            <Input
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="h-8 bg-transparent border-0 border-b border-zinc-700 rounded-none px-0 text-lg font-bold text-white focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-bold text-white cursor-pointer hover:text-zinc-300 transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {metadata.title}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
            Save Draft
          </Button>
          <Separator orientation="vertical" className="h-6 bg-zinc-800" />
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
            <Rocket className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 p-6 overflow-hidden">
        <Card className="w-80 bg-zinc-900/50 border-zinc-800 rounded-xl p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Book Info Section */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Book Info</h3>

              <div className="mb-4">
                <Label className="text-zinc-400 text-xs mb-2 block">Cover</Label>
                <div className="relative group">
                  {metadata.coverImage ? (
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
                      <img
                        src={metadata.coverImage || "/placeholder.svg"}
                        alt="Book cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label htmlFor="cover-upload" className="cursor-pointer">
                          <Upload className="h-6 w-6 text-white" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="cover-upload"
                      className="aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 transition-colors flex flex-col items-center justify-center cursor-pointer bg-zinc-800/50"
                    >
                      <Upload className="h-8 w-8 text-zinc-600 mb-2" />
                      <span className="text-xs text-zinc-500">Upload Cover</span>
                    </label>
                  )}
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-zinc-400 text-xs">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-white mt-1 rounded-lg"
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
                    className="bg-zinc-800/50 border-zinc-700 text-white mt-1 rounded-lg"
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
                    className="bg-zinc-800/50 border-zinc-700 text-white mt-1 min-h-20 rounded-lg"
                    placeholder="Brief description"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* AI Generation */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">AI Assistant</h3>
              <Button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="w-full bg-white text-black hover:bg-zinc-200 rounded-lg"
              >
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Page Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Pages ({pages.length})</h3>
                <Button
                  onClick={addPage}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-white hover:bg-zinc-800 rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pages.map((page, index) => (
                  <div
                    key={page.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      index === currentPageIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                    }`}
                    onClick={() => jumpToPage(index)}
                  >
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">{page.title}</div>
                      <div className="text-xs text-zinc-500">Page {page.pageNumber}</div>
                    </div>
                    {pages.length > 1 && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePage(page.id)
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Main Display Area */}
        <div className="flex-1 flex flex-col relative">
          <Button
            onClick={() => setShowTOC(!showTOC)}
            size="sm"
            variant="ghost"
            className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
          >
            <List className="h-4 w-4 mr-2" />
            TOC
          </Button>

          {showTOC && (
            <div className="absolute top-0 right-0 w-64 h-full bg-zinc-900 border-l border-zinc-800 z-20 p-4 rounded-l-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Table of Contents</h3>
                <Button
                  onClick={() => setShowTOC(false)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {pages.map((page, index) => (
                  <button
                    key={page.id}
                    onClick={() => jumpToPage(index)}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      index === currentPageIndex
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                    }`}
                  >
                    <div className="text-sm font-medium">{page.title}</div>
                    <div className="text-xs text-zinc-500">Page {page.pageNumber}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative w-full max-w-3xl h-full">
              {/* Page navigation arrows */}
              <Button
                onClick={goToPreviousPage}
                disabled={currentPageIndex === 0}
                size="sm"
                variant="ghost"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 rounded-full h-10 w-10 p-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                onClick={goToNextPage}
                disabled={currentPageIndex === pages.length - 1}
                size="sm"
                variant="ghost"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 rounded-full h-10 w-10 p-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              <div className="relative h-full flex items-center justify-center">
                {/* Fake spine */}
                <div className="absolute left-12 top-8 bottom-8 w-2 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-l-sm shadow-lg z-0" />

                {/* Page with animation */}
                <div
                  className={`relative w-full h-full transition-all duration-300 ${
                    isFlipping
                      ? flipDirection === "right"
                        ? "translate-x-8 opacity-0"
                        : "-translate-x-8 opacity-0"
                      : "translate-x-0 opacity-100"
                  }`}
                >
                  <div className="w-full h-full bg-[#f8f8f8] rounded-r-lg shadow-2xl p-16 flex flex-col overflow-hidden">
                    {/* Page header */}
                    <div className="mb-6">
                      <Input
                        value={currentPage.title}
                        onChange={(e) => {
                          const newPages = [...pages]
                          newPages[currentPageIndex] = { ...currentPage, title: e.target.value }
                          setPages(newPages)
                        }}
                        className="text-2xl font-serif font-bold text-black bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-black"
                        placeholder="Chapter Title"
                      />
                    </div>

                    {/* Page content */}
                    <Textarea
                      value={currentPage.content}
                      onChange={(e) => updatePageContent(e.target.value)}
                      className="flex-1 w-full border-0 resize-none focus-visible:ring-0 text-black text-base leading-relaxed font-serif bg-transparent"
                      placeholder="Start writing your content here..."
                    />

                    {/* Page number */}
                    <div className="text-center text-sm text-zinc-500 mt-4 font-serif">{currentPage.pageNumber}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all hover:scale-105"
              title="Add text block"
            >
              <Plus className="h-4 w-4 mr-1" />
              Text
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all hover:scale-105"
              title="Insert image"
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
