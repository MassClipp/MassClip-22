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
              <p className="text-lg lg:text-xl text-white/70 font-light max-w-3xl mx-auto">
                Upload your content to Vex, and watch it organize and bundle your content in seconds.
              </p>
            </div>

            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 via-cyan-400/30 to-teal-500/30 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Main input container with premium glassmorphism */}
              <div className="relative bg-white/[0.08] backdrop-blur-3xl border border-white/20 rounded-3xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300">
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
                    className="shrink-0 hover:bg-white/10 transition-all duration-200"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                    ) : (
                      <Upload className="h-5 w-5 text-white/70" />
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
                    className="flex-1 min-h-[48px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base placeholder:text-white/50 text-white"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isAnalyzing}
                    size="icon"
                    className="h-12 w-12 shrink-0 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 shadow-[0_8px_24px_0_rgba(20,184,166,0.4)] hover:shadow-[0_12px_32px_0_rgba(20,184,166,0.6)] transition-all duration-300"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-white/50 text-center">
              Upload up to 5 files without signup &bull; Sign up for unlimited uploads and to take action
            </p>
        ) : (
          <div className="max-w-4xl w-full flex flex-col h-[calc(100vh-160px)]">
            {/* Chat messages container with custom scrollbar */}
            <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white shadow-[0_8px_24px_0_rgba(20,184,166,0.35)]"
                        : "relative bg-white/[0.08] backdrop-blur-3xl border border-white/20 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <>
                        {/* Subtle glow for AI messages */}
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/20 via-cyan-400/20 to-teal-500/20 rounded-2xl blur-sm -z-10" />
                        <div className="text-xs text-white/60 mb-2 font-medium tracking-wide">VEX AI</div>
                      </>
                    )}
                    <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{message.content}</div>
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="relative bg-white/[0.08] backdrop-blur-3xl border border-white/20 rounded-2xl px-5 py-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/20 via-cyan-400/20 to-teal-500/20 rounded-2xl blur-sm -z-10" />
                    <div className="text-xs text-white/60 mb-2 font-medium tracking-wide">VEX AI</div>
                    <div className="flex gap-1.5">
                      <div
                        className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Uploaded video chips */}
            {uploadedVideos.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {uploadedVideos.map((video, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-cyan-400/20 backdrop-blur-xl border border-teal-500/40 rounded-xl px-3 py-2 text-sm shadow-lg hover:shadow-xl transition-shadow duration-200"
                  >
                    <span className="text-white truncate max-w-[150px]">{video.name}</span>
                    <button
                      onClick={() => setUploadedVideos((prev) => prev.filter((_, i) => i !== index))}
                      className="text-white/60 hover:text-white transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input container with premium glassmorphism */}
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 via-cyan-400/30 to-teal-500/30 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Main input container */}
              <div className="relative bg-white/[0.08] backdrop-blur-3xl border border-white/20 rounded-3xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300">
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
                    className="shrink-0 hover:bg-white/10 transition-all duration-200"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                    ) : (
                      <Upload className="h-5 w-5 text-white/70" />
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
                    className="flex-1 min-h-[48px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base placeholder:text-white/50 text-white"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isAnalyzing}
                    size="icon"
                    className="h-12 w-12 shrink-0 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 shadow-[0_8px_24px_0_rgba(20,184,166,0.4)] hover:shadow-[0_12px_32px_0_rgba(20,184,166,0.6)] transition-all duration-300"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/50 text-center mt-3">
              Upload up to 5 files without signup &bull; Sign up for unlimited uploads and to take action
            </p>
          </div>
        )}
      </div>\
      <LandingVideoSidebar videos={uploadedVideos} onRemoveVideo={handleRemoveVideo} />
    </div>
  )\
}
