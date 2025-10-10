"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Upload, Sparkles, Loader2, X, FileVideo, ArrowRight } from "lucide-react"
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
          files: files.map((f) => ({ name: f.name, size: f.size })),
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
          files: uploadedFiles.map((f) => ({ name: f.name, size: f.size })),
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

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-8 relative">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl lg:text-6xl font-thin text-white mb-4 leading-tight">Let VEX Analyze Your Content</h1>
        <p className="text-lg text-white/70 font-light max-w-2xl mx-auto">
          Upload your videos and get AI-powered organization strategies and bundle ideas - no signup required
        </p>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="text-center flex flex-col justify-center items-center min-h-[50vh]">
                <h2 className="text-2xl font-semibold mb-2 text-white">Hi! I'm Vex</h2>
                <p className="text-white/60 mb-6 max-w-md mx-auto leading-relaxed">
                  I'll help you create profitable bundles, set optimal pricing, and build compelling storefront content.
                </p>
                <p className="text-xs text-white/40 max-w-md mx-auto text-center">
                  The more specific and detailed your requests are, the better I can help you organize and monetize your
                  content
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-light text-white/60">VEX AI</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap font-light leading-relaxed text-sm">{message.content}</div>
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span className="text-sm font-light text-white/60">VEX is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileVideo className="w-4 h-4 text-white/60" />
              <span className="text-sm font-light text-white/60">Uploaded Files ({uploadedFiles.length}/5)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 text-sm">
                  <span className="text-white/80 font-light truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-2">
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
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={uploadedFiles.length >= 5}
            >
              <Upload className="w-4 h-4" />
            </Button>
            {uploadedFiles.length > 0 && (
              <Button
                onClick={() => analyzeContent()}
                variant="outline"
                className="border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            )}
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask VEX anything about your content..."
              className="flex-1 min-h-[44px] max-h-[120px] bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isAnalyzing}
              className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-white/40 font-light mt-2 text-center">
            Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
          </p>
        </div>
      </div>

      {showSignupButton && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button
            onClick={() => router.push("/signup")}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500 font-light rounded-full shadow-2xl shadow-teal-500/50 px-8 py-6 text-base"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Sign Up to Take Action
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
