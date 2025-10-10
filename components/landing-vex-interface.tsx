"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Upload, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
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
}

export function LandingVexInterface() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [showSignupButton, setShowSignupButton] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (uploadedFiles.length + files.length > 5) {
      toast.error("Maximum 5 files without signup. Sign up for unlimited uploads!")
      return
    }

    const newFiles: UploadedFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    const fileNames = newFiles.map((f) => f.name).join(", ")
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Uploaded: ${fileNames}`,
    }
    setMessages((prev) => [...prev, userMessage])

    if (uploadedFiles.length === 0) {
      setTimeout(() => {
        analyzeContent(newFiles)
      }, 500)
    }
  }

  const analyzeContent = async (filesToAnalyze?: UploadedFile[]) => {
    const files = filesToAnalyze || uploadedFiles

    if (files.length === 0) {
      toast.error("Please upload some files first")
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/vex-landing-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Analyze these files and suggest organization and bundle ideas",
          files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        }),
      })

      const data = await response.json()

      const analysisMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.analysis || "I couldn't analyze that. Please try again.",
      }
      setMessages((prev) => [...prev, analysisMessage])
      setShowSignupButton(true)
    } catch (error) {
      console.error("Analysis error:", error)
      toast.error("Failed to analyze content")
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
          files: uploadedFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.analysis || "I can help with that! Sign up to take action.",
      }
      setMessages((prev) => [...prev, assistantMessage])
      setShowSignupButton(true)
    } catch (error) {
      console.error("Message error:", error)
      toast.error("Failed to send message")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-8 relative">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl lg:text-6xl font-thin text-white mb-4 leading-tight">Let VEX Analyze Your Content</h1>
        <p className="text-lg text-white/70 font-light max-w-2xl mx-auto">
          Upload your content, and let Vex see how it can bundle or organize your content.
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] px-4">
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-semibold text-white">Hi! I'm Vex</h2>
              <p className="text-muted-foreground leading-relaxed">
                I'll help you create profitable bundles, set optimal pricing, and build compelling storefront content.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2">
              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  disabled={uploadedFiles.length >= 5}
                >
                  <Upload className="h-4 w-4" />
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
                  className="flex-1 min-h-[36px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 resize-none text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isAnalyzing}
                  size="sm"
                  className="h-9 w-9 p-0 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center">
              Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden min-h-[600px]">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="max-w-4xl mx-auto py-4 min-h-full flex flex-col">
              <div className="space-y-4 flex-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${message.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white ml-auto"
                          : "bg-zinc-800/50 text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                    </div>
                  </div>
                ))}

                {isAnalyzing && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
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
              </div>
              <div className="h-32" />
            </div>
          </ScrollArea>

          <div className="bg-gradient-to-t from-black via-black to-transparent pt-4 pb-3 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 items-end bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  disabled={uploadedFiles.length >= 5}
                >
                  <Upload className="h-4 w-4" />
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
                  className="flex-1 min-h-[36px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 resize-none text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isAnalyzing}
                  size="sm"
                  className="h-9 w-9 p-0 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500 text-center mt-2">
                Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
              </p>
            </div>
          </div>
        </div>
      )}

      {showSignupButton && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button
            onClick={() => router.push("/signup")}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500 rounded-full shadow-2xl shadow-teal-500/50 px-8 py-6 text-base"
          >
            Sign Up to Take Action
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
