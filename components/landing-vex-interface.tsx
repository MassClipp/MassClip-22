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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi! I'm VEX, your AI content assistant. Upload your videos and I'll analyze them to suggest organization strategies and bundle ideas. No signup required to see what I can do!",
    },
  ])
  const [input, setInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
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

    // Add user message about upload
    const fileNames = newFiles.map((f) => f.name).join(", ")
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Uploaded: ${fileNames}`,
    }
    setMessages((prev) => [...prev, userMessage])

    // Auto-analyze if this is the first upload
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

    // Simulate AI analysis
    setTimeout(() => {
      const analysisMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: generateAnalysis(files),
      }
      setMessages((prev) => [...prev, analysisMessage])
      setIsAnalyzing(false)
      setShowSignupPrompt(true)
    }, 2000)
  }

  const generateAnalysis = (files: UploadedFile[]): string => {
    const fileCount = files.length
    const fileNames = files.map((f) => f.name).join(", ")

    return `🎯 **Content Analysis Complete**

I've analyzed your ${fileCount} video${fileCount > 1 ? "s" : ""}: ${fileNames}

**📊 What I Found:**
Based on the file names and metadata, your content appears to focus on motivational and personal development themes.

**📁 Recommended Organization:**
I suggest organizing your content into these folders:
• **Motivation & Mindset** - Core motivational content
• **Personal Growth** - Self-improvement focused videos
• **Success Strategies** - Actionable advice and tactics

**💰 Bundle Ideas:**
Here are some sellable bundles I can create for you:

1. **"Mindset Mastery Bundle"** - $29
   • All motivational content packaged together
   • Perfect for creators looking for inspiration clips

2. **"Personal Growth Collection"** - $39
   • Comprehensive self-improvement content
   • Great for coaches and educators

3. **"Success Starter Pack"** - $19
   • Entry-level bundle for new customers
   • Mix of your best performing content

**✨ Next Steps:**
Sign up to let me organize your content into these folders and create these bundles automatically. I'll handle the file organization, bundle creation, and even set up your storefront!

Ready to take action?`
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

    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateContextualResponse(input),
      }
      setMessages((prev) => [...prev, response])
      setIsAnalyzing(false)
    }, 1500)
  }

  const generateContextualResponse = (userInput: string): string => {
    const lower = userInput.toLowerCase()

    if (lower.includes("bundle") || lower.includes("create")) {
      return "I can definitely help you create bundles! To actually create and publish bundles, you'll need to sign up. Once you do, I'll automatically organize your content and create the bundles we discussed. Want me to show you what the bundles would look like first?"
    }

    if (lower.includes("organize") || lower.includes("folder")) {
      return "I'll organize your content into smart folders based on themes, topics, and content type. To save this organization and apply it to your account, you'll need to sign up. Should I proceed with the organization plan I suggested?"
    }

    if (lower.includes("price") || lower.includes("cost")) {
      return "Great question! VEX is free to start - you can upload content and I'll analyze it for free. To actually create bundles and sell them, you'll need a free account. There's no cost to sign up, and you only pay when you make sales (standard payment processing fees apply)."
    }

    return "I can help you with that! However, to take action on any of my recommendations (creating bundles, organizing content, setting up your storefront), you'll need to sign up. It's free and takes less than a minute. Want to get started?"
  }

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-8">
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

            {/* Signup Prompt */}
            {showSignupPrompt && (
              <div className="flex justify-center">
                <div className="bg-gradient-to-r from-teal-500/20 to-cyan-400/20 border border-teal-500/30 rounded-2xl p-6 max-w-md">
                  <div className="text-center space-y-4">
                    <Sparkles className="w-8 h-8 text-teal-400 mx-auto" />
                    <h3 className="text-xl font-light text-white">Ready to Take Action?</h3>
                    <p className="text-sm text-white/70 font-light">
                      Sign up now to let VEX organize your content and create these bundles automatically
                    </p>
                    <Button
                      onClick={() => router.push("/signup")}
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500 font-light rounded-full"
                    >
                      Sign Up Free <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
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
    </div>
  )
}
