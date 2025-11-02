"use client"

import type React from "react"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Upload, Eye, FileDown, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface EbookMetadata {
  title: string
  author: string
  description: string
  coverImage?: string
  pages: string[]
}

export function EbookEditor() {
  const [metadata, setMetadata] = useState<EbookMetadata>({
    title: "Untitled eBook",
    author: "",
    description: "",
    pages: [],
  })

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right")
  const [editingTitle, setEditingTitle] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file for the cover")
        return
      }

      setIsUploading(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMetadata({ ...metadata, coverImage: reader.result as string })
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setIsUploading(true)
    const fileArray = Array.from(files)
    const pagePromises: Promise<string[]>[] = []

    for (const file of fileArray) {
      if (file.type === "application/pdf") {
        pagePromises.push(
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve([reader.result as string])
            }
            reader.readAsDataURL(file)
          }),
        )
      } else if (file.type.startsWith("image/")) {
        pagePromises.push(
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve([reader.result as string])
            }
            reader.readAsDataURL(file)
          }),
        )
      }
    }

    try {
      const results = await Promise.all(pagePromises)
      const allPages = results.flat()
      setMetadata({ ...metadata, pages: allPages })
      setCurrentPageIndex(0)
      console.log("[v0] Uploaded pages:", allPages.length)
    } catch (error) {
      console.error("[v0] Error uploading pages:", error)
      alert("Error uploading files. Please try again.")
    } finally {
      setIsUploading(false)
    }
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
    if (currentPageIndex < metadata.pages.length - 1) {
      setFlipDirection("right")
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentPageIndex(currentPageIndex + 1)
        setIsFlipping(false)
      }, 300)
    }
  }

  const hasContent = metadata.coverImage || metadata.pages.length > 0

  const isPDF = (dataUrl: string) => dataUrl.startsWith("data:application/pdf")

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-800 bg-black gap-3 md:gap-0">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-xs text-zinc-500 hidden md:block">Dashboard / eBooks /</div>
          {editingTitle ? (
            <Input
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="h-8 bg-transparent border-0 border-b border-zinc-700 rounded-none px-0 text-base md:text-lg font-bold text-white focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <h1
              className="text-base md:text-lg font-bold text-white cursor-pointer hover:text-zinc-300 transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {metadata.title}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs md:text-sm whitespace-nowrap"
          >
            Save Draft
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs md:text-sm whitespace-nowrap"
          >
            <Eye className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">Preview</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs md:text-sm whitespace-nowrap"
          >
            <FileDown className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">Export PDF</span>
          </Button>
          <Button size="sm" className="bg-white text-black hover:bg-zinc-200 text-xs md:text-sm whitespace-nowrap">
            <Rocket className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 p-4 md:p-6 overflow-hidden">
        <Card className="w-full md:w-80 bg-zinc-900/50 border-zinc-800 rounded-xl p-4 md:p-6 overflow-y-auto max-h-[40vh] md:max-h-none">
          <div className="space-y-4 md:space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 md:mb-4">eBook Details</h3>

              <div className="mb-4">
                <Label className="text-zinc-400 text-xs mb-2 block">Cover Image</Label>
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
                      <Upload className="h-6 w-6 md:h-8 md:w-8 text-zinc-600 mb-2" />
                      <span className="text-xs text-zinc-500">Upload Cover</span>
                    </label>
                  )}
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-zinc-400 text-xs mb-2 block">Pages ({metadata.pages.length})</Label>
                <label
                  htmlFor="pages-upload"
                  className="w-full rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 transition-colors flex flex-col items-center justify-center cursor-pointer bg-zinc-800/50 py-6 md:py-8"
                >
                  <Upload className="h-6 w-6 md:h-8 md:w-8 text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500 text-center px-4">
                    {isUploading
                      ? "Uploading..."
                      : metadata.pages.length > 0
                        ? `${metadata.pages.length} pages uploaded`
                        : "Upload PDF or Images"}
                  </span>
                  <span className="text-xs text-zinc-600 mt-1">PDF, JPG, PNG</span>
                </label>
                <input
                  id="pages-upload"
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handlePagesUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <Label htmlFor="title" className="text-zinc-400 text-xs">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-white mt-1 rounded-lg text-sm"
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
                    className="bg-zinc-800/50 border-zinc-700 text-white mt-1 rounded-lg text-sm"
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
                    className="bg-zinc-800/50 border-zinc-700 text-white mt-1 min-h-16 md:min-h-20 rounded-lg text-sm"
                    placeholder="Brief description"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex-1 flex flex-col relative min-h-[50vh] md:min-h-0">
          {!hasContent ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <Upload className="h-12 w-12 md:h-16 md:w-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">Upload Your eBook</h3>
                <p className="text-xs md:text-sm text-zinc-500 max-w-md">
                  Upload a cover image and your eBook pages to preview how it will look to your viewers
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
              <div className="relative w-full max-w-3xl h-full">
                {metadata.pages.length > 0 && (
                  <>
                    <Button
                      onClick={goToPreviousPage}
                      disabled={currentPageIndex === 0}
                      size="sm"
                      variant="ghost"
                      className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 rounded-full h-8 w-8 md:h-10 md:w-10 p-0"
                    >
                      <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                    <Button
                      onClick={goToNextPage}
                      disabled={currentPageIndex === metadata.pages.length - 1}
                      size="sm"
                      variant="ghost"
                      className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 rounded-full h-8 w-8 md:h-10 md:w-10 p-0"
                    >
                      <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </>
                )}

                <div className="relative h-full flex items-center justify-center">
                  <div className="absolute left-4 md:left-12 top-4 md:top-8 bottom-4 md:bottom-8 w-1 md:w-2 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-l-sm shadow-lg z-0" />

                  <div
                    className={`relative w-full h-full transition-all duration-300 ${
                      isFlipping
                        ? flipDirection === "right"
                          ? "translate-x-8 opacity-0"
                          : "-translate-x-8 opacity-0"
                        : "translate-x-0 opacity-100"
                    }`}
                  >
                    <div className="w-full h-full bg-white rounded-r-lg shadow-2xl overflow-hidden flex items-center justify-center">
                      {metadata.pages.length > 0 ? (
                        <div className="relative w-full h-full">
                          {isPDF(metadata.pages[currentPageIndex]) ? (
                            <iframe
                              src={metadata.pages[currentPageIndex]}
                              className="w-full h-full border-0"
                              title={`Page ${currentPageIndex + 1}`}
                            />
                          ) : (
                            <img
                              src={metadata.pages[currentPageIndex] || "/placeholder.svg"}
                              alt={`Page ${currentPageIndex + 1}`}
                              className="w-full h-full object-contain"
                            />
                          )}
                          <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 text-xs md:text-sm text-zinc-400 bg-white/80 px-2 md:px-3 py-1 rounded">
                            Page {currentPageIndex + 1} of {metadata.pages.length}
                          </div>
                        </div>
                      ) : metadata.coverImage ? (
                        <div className="relative w-full h-full">
                          <img
                            src={metadata.coverImage || "/placeholder.svg"}
                            alt="Cover"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 text-xs md:text-sm text-zinc-400 bg-white/80 px-2 md:px-3 py-1 rounded">
                            Cover
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
