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
                accept="video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 hover:bg-zinc-800"
                disabled={uploadedFiles.length >= 5}
              >
                <Upload className="h-5 w-5" />
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
        <div className="w-full max-w-4xl flex flex-col min-h-[600px]">
          <ScrollArea className="flex-1 px-4">
            <div className="py-8 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${message.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white"
                        : "bg-zinc-900/50 text-white border border-zinc-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
                      <div
                        className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 backdrop-blur-sm">
              <div className="flex gap-3 items-end">
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
                  size="icon"
                  className="h-10 w-10 shrink-0 hover:bg-zinc-800"
                  disabled={uploadedFiles.length >= 5}
                >
                  <Upload className="h-5 w-5" />
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
            <p className="text-sm text-zinc-500 text-center mt-3">
              Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
            </p>
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
