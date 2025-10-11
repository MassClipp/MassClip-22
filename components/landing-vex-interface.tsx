"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Send, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { LandingVideoSidebar, type UploadedVideo } from "@/components/landing-video-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const React = window.React // Assuming React is available globally
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isAnalyzing])

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
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  url: publicUrl,
                  progress: 60,
                  status: "transcribing",
                }
              : v,
          ),
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
    <div className="flex h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Fixed noise overlay */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light pointer-events-none z-0"></div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative z-10">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
            <div className="max-w-4xl w-full space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl lg:text-7xl font-medium text-white tracking-tight">Have content to sell?</h1>
                <p className="text-lg lg:text-xl text-white/60 font-light max-w-3xl mx-auto">
                  Upload your content to Vex, and watch it organize and bundle your content in seconds.
                </p>
              </div>

              <div className="relative">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
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
                      className="shrink-0 h-11 w-11 hover:bg-white/10 border border-white/20 rounded-full transition-all"
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                      ) : (
                        <Upload className="h-5 w-5 text-white/60" />
                      )}
                    </Button>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Ask anything"
                      className="flex-1 h-11 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-white/50 text-white font-light"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isAnalyzing}
                      size="icon"
                      className="h-11 w-11 shrink-0 bg-black hover:bg-black/80 text-white rounded-full transition-all shadow-lg"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-sm text-white/40 text-center font-light">
                Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
              </p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="max-w-4xl mx-auto py-4 min-h-full flex flex-col">
                <div className="space-y-4 flex-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-slide-up ${message.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.role === "user" ? "chat-message-user ml-auto" : "chat-message-assistant"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  ))}

                  {isAnalyzing && (
                    <div className="flex justify-start chat-slide-up">
                      <div className="chat-message-assistant rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
              <div className="h-32" />
            </ScrollArea>

            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent pt-4 pb-3 px-4 z-40">
              <div className="max-w-4xl mx-auto">
                {uploadedVideos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {uploadedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-full px-4 py-2 text-sm"
                      >
                        <span className="text-white/90 truncate max-w-[150px]">{video.name}</span>
                        <button
                          onClick={() => handleRemoveVideo(video.id)}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex gap-2"
                >
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message Vex"
                      className="chat-input-container border-0 bg-transparent text-sm py-2 px-3 pr-10 resize-none focus:ring-1 focus:ring-ring"
                      disabled={isAnalyzing}
                      style={{ fontSize: "16px" }}
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || uploadedVideos.length >= 5}
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-transparent hover:bg-zinc-800"
                    >
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,audio/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="submit"
                      disabled={isAnalyzing || !input.trim()}
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-foreground text-background hover:bg-foreground/90"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-zinc-500 text-center mt-2">Vex can make mistakes</p>
              </div>
            </div>
          </>
        )}
      </div>

      <LandingVideoSidebar videos={uploadedVideos} onRemoveVideo={handleRemoveVideo} />
    </div>
  )
}
