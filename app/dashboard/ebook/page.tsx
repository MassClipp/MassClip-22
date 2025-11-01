"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Download, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface EbookPage {
  id: string
  title: string
  content: string
  imageUrl?: string
}

export default function EbookCreatorPage() {
  const [pages, setPages] = React.useState<EbookPage[]>([
    {
      id: "1",
      title: "Cover Page",
      content: "Your eBook Title",
      imageUrl: undefined,
    },
  ])
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0)
  const [ebookTitle, setEbookTitle] = React.useState("Untitled eBook")
  const [isGenerating, setIsGenerating] = React.useState(false)

  const currentPage = pages[currentPageIndex]

  const addPage = () => {
    const newPage: EbookPage = {
      id: Date.now().toString(),
      title: `Page ${pages.length + 1}`,
      content: "",
    }
    setPages([...pages, newPage])
    setCurrentPageIndex(pages.length)
  }

  const deletePage = (index: number) => {
    if (pages.length === 1) return
    const newPages = pages.filter((_, i) => i !== index)
    setPages(newPages)
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1)
    }
  }

  const updatePage = (updates: Partial<EbookPage>) => {
    const newPages = [...pages]
    newPages[currentPageIndex] = { ...currentPage, ...updates }
    setPages(newPages)
  }

  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const generateWithVex = async () => {
    setIsGenerating(true)
    // Placeholder for Vex AI generation
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">eBook Creator</h1>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={ebookTitle}
            onChange={(e) => setEbookTitle(e.target.value)}
            className="w-64 border-none bg-transparent text-lg font-medium focus-visible:ring-0"
            placeholder="eBook Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Viewer */}
        <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-8">
          <div className="relative w-full max-w-2xl">
            {/* Page Display */}
            <Card className="aspect-[8.5/11] w-full shadow-2xl">
              <CardContent className="flex h-full flex-col p-8">
                <ScrollArea className="flex-1">
                  <div className="space-y-6">
                    {currentPage.imageUrl && (
                      <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        <img
                          src={currentPage.imageUrl || "/placeholder.svg"}
                          alt="Page image"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="mb-4 text-3xl font-bold">{currentPage.title}</h2>
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                        {currentPage.content}
                      </p>
                    </div>
                  </div>
                </ScrollArea>
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
                  <span>{ebookTitle}</span>
                  <span>
                    Page {currentPageIndex + 1} of {pages.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={prevPage} disabled={currentPageIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {currentPageIndex + 1} / {pages.length}
              </span>
              <Button variant="outline" size="icon" onClick={nextPage} disabled={currentPageIndex === pages.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-96 border-l bg-card">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-6">
              {/* AI Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Generate with Vex AI
                  </CardTitle>
                  <CardDescription>Let AI create your eBook content automatically</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={isGenerating}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isGenerating ? "Generating..." : "Generate eBook"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate eBook with Vex AI</DialogTitle>
                        <DialogDescription>Describe what you want your eBook to be about</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Topic</Label>
                          <Input placeholder="e.g., Social Media Marketing" />
                        </div>
                        <div className="space-y-2">
                          <Label>Number of Pages</Label>
                          <Input type="number" placeholder="10" />
                        </div>
                        <div className="space-y-2">
                          <Label>Additional Instructions</Label>
                          <Textarea placeholder="Any specific requirements..." rows={3} />
                        </div>
                        <Button className="w-full" onClick={generateWithVex}>
                          Generate
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Separator />

              {/* Page Editor */}
              <div className="space-y-4">
                <h3 className="font-semibold">Edit Current Page</h3>

                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input
                    value={currentPage.title}
                    onChange={(e) => updatePage({ title: e.target.value })}
                    placeholder="Page title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={currentPage.content}
                    onChange={(e) => updatePage({ content: e.target.value })}
                    placeholder="Write your content here..."
                    rows={10}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Image URL (Optional)</Label>
                  <Input
                    value={currentPage.imageUrl || ""}
                    onChange={(e) => updatePage({ imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <Separator />

              {/* Page Management */}
              <div className="space-y-4">
                <h3 className="font-semibold">Pages</h3>
                <div className="space-y-2">
                  {pages.map((page, index) => (
                    <div
                      key={page.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        index === currentPageIndex ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <button
                        onClick={() => setCurrentPageIndex(index)}
                        className="flex-1 text-left text-sm font-medium"
                      >
                        {page.title}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deletePage(index)}
                        disabled={pages.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button onClick={addPage} variant="outline" className="w-full bg-transparent">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Page
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
