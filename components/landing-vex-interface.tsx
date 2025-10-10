"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Send, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  transcript?: string
}

export function LandingVexInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (uploadedFiles.length + files.length > 5) {
      toast.error("Maximum 5 files without signup")
      return
    }

    setIsUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/vex-landing-transcribe", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || "Failed to transcribe file")
        }
        const data = await response.json()

        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          transcript: data.transcript || "",
        }
      })

      const newFiles = await Promise.all(uploadPromises)
      setUploadedFiles((prev) => [...prev, ...newFiles])

      const uploadMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `Uploaded: ${newFiles.map((f) => f.name).join(", ")}`,
      }
      setMessages((prev) => [...prev, uploadMessage])

      await analyzeUploads(newFiles)

      toast.success(`Uploaded ${newFiles.length} file(s)`)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload files")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const analyzeUploads = async (files: UploadedFile[]) => {
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
          files: uploadedFiles.map((f) => ({
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
      console.error("Message error:", error)
      toast.error("Failed to send message")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
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
                disabled={isUploading || uploadedFiles.length >= 5}
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

          {uploadedFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-cyan-400/20 border border-teal-500/30 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-white truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
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
                disabled={isUploading || uploadedFiles.length >= 5}
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
  )
}
