"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Send, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { LandingVideoSidebar, type UploadedVideo } from "@/components/landing-video-sidebar"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function LandingVexInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (uploadedVideos.length + files.length > 5) {
      toast.error("Maximum 5 files without signup")
      return
    }

    setIsUploading(true)
    console.log("[v0] Starting file upload for", files.length, "files")

    const placeholderVideos: UploadedVideo[] = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: file.name,
      url: "",
      status: "uploading",
      progress: 0,
    }))

    setUploadedVideos((prev) => [...prev, ...placeholderVideos])

    try {
      const uploadPromises = files.map(async (file, index) => {
        const videoId = placeholderVideos[index].id
        console.log("[v0] Uploading file:", file.name)

        setUploadedVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, progress: 10 } : v)))

        const urlResponse = await fetch("/api/vex-landing-get-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        })

        if (!urlResponse.ok) {
          throw new Error("Failed to get upload URL")
        }

        const { uploadUrl, publicUrl } = await urlResponse.json()

        setUploadedVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, progress: 30 } : v)))

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload to R2")
        }

        console.log("[v0] File uploaded to R2:", publicUrl)

        setUploadedVideos((prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, url: publicUrl, progress: 60, status: "transcribing" } : v)),
        )

        let transcript = ""
        if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
          console.log("[v0] Transcribing file...")
          try {
            const transcribeResponse = await fetch("/api/vex-landing-transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: publicUrl }),
            })

            if (transcribeResponse.ok) {
              const transcribeData = await transcribeResponse.json()
              transcript = transcribeData.transcript || ""
              console.log("[v0] Transcription status:", transcript ? "success" : "undefined")
              console.log("[v0] Transcription complete:", transcript.length, "characters")
            } else {
              console.error("[v0] Transcription failed:", transcribeResponse.status, transcribeResponse.statusText)
            }
          } catch (error) {
            console.error("[v0] Transcription error:", error)
          }
        }

        setUploadedVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  transcript,
                  status: "complete",
                  progress: 100,
                }
              : v,
          ),
        )

        return {
          id: videoId,
          name: file.name,
          transcript,
        }
      })

      const completedFiles = await Promise.all(uploadPromises)

      console.log("[v0] All files uploaded, analyzing...")

      const uploadMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `Uploaded: ${completedFiles.map((f) => f.name).join(", ")}`,
      }
      setMessages((prev) => [...prev, uploadMessage])

      await analyzeUploads(completedFiles)

      toast.success(`Uploaded ${completedFiles.length} file(s)`)
    } catch (error) {
      console.error("[v0] Upload error:", error)
      setUploadedVideos((prev) =>
        prev.map((v) =>
          placeholderVideos.some((p) => p.id === v.id) && v.status !== "complete"
            ? { ...v, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
            : v,
        ),
      )
      toast.error(error instanceof Error ? error.message : "Failed to upload files")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const analyzeUploads = async (files: { id: string; name: string; transcript?: string }[]) => {
    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/vex-landing-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Analyze these files",
          files: files.map((f) => ({
            name: f.name,
            transcript: f.transcript,
          })),
          conversationHistory: messages,
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.analysis || "I can help with that! Sign up to take action.",
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Analysis error:", error)
      toast.error("Failed to analyze files")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/vex-landing-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          files: uploadedVideos
            .filter((v) => v.status === "complete")
            .map((v) => ({
              name: v.name,
              transcript: v.transcript,
            })),
          conversationHistory: messages,
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.analysis || "I can help with that! Sign up to take action.",
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Message error:", error)
      toast.error("Failed to send message")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRemoveVideo = (id: string) => {
    setUploadedVideos((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16 relative">
        {messages.length === 0 ? (
          <div className="max-w-4xl w-full space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-5xl lg:text-7xl font-medium text-white tracking-tight">Have content to sell?</h1>
              <p className="text-lg lg:text-xl text-white/60 font-light max-w-3xl mx-auto">
                Upload your content to Vex, and watch it organize and bundle your content in seconds.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 backdrop-blur-sm">
              <div className="flex gap-3 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || uploadedVideos.length >= 5}
                  className="shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Ask Vex to organize..."
                  className="flex-1 min-h-[40px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base placeholder:text-zinc-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isAnalyzing}
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-zinc-500 text-center">
              Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
            </p>
          </div>
        ) : (
          <div className="max-w-4xl w-full flex flex-col h-[calc(100vh-160px)]">
            <div className="flex-1 overflow-y-auto space-y-6 pb-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white"
                        : "bg-zinc-900/50 border border-zinc-800 text-white"
                    }`}
                  >
                    {message.role === "assistant" && <div className="text-xs text-zinc-400 mb-1">VEX AI</div>}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3">
                    <div className="text-xs text-zinc-400 mb-1">VEX AI</div>
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {uploadedVideos.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {uploadedVideos.map((video, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-cyan-400/20 border border-teal-500/30 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-white truncate max-w-[150px]">{video.name}</span>
                    <button
                      onClick={() => setUploadedVideos((prev) => prev.filter((_, i) => i !== index))}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 backdrop-blur-sm">
              <div className="flex gap-3 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || uploadedVideos.length >= 5}
                  className="shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Message Vex"
                  className="flex-1 min-h-[40px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base placeholder:text-zinc-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isAnalyzing}
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center mt-2">
              Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
            </p>
          </div>
        )}
      </div>

      <LandingVideoSidebar videos={uploadedVideos} onRemoveVideo={handleRemoveVideo} />
    </div>
  )
}
