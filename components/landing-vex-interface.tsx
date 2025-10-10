"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Send, X } from "lucide-react"

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
  url: string
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
      alert("You can only upload up to 5 files without signing up")
      return
    }

    setIsUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/vex-landing-upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const data = await response.json()
        return {
          id: data.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: data.publicUrl,
        }
      })

      const uploaded = await Promise.all(uploadPromises)
      setUploadedFiles((prev) => [...prev, ...uploaded])

      const fileNames = uploaded.map((f) => f.name).join(", ")
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: `Uploaded: ${fileNames}`,
        },
      ])
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload files. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return

    const userMessage = input.trim()
    setInput("")

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    }

    setMessages((prev) => [...prev, newUserMessage])
    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/vex-landing-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          uploadedFileIds: uploadedFiles.map((f) => f.id),
        }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
        },
      ])
    } catch (error) {
      console.error("Analysis error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center px-4">
      {messages.length === 0 ? (
        <div className="max-w-3xl w-full flex flex-col items-center justify-center space-y-8 py-20">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-medium text-white">Hi! I'm Vex</h2>
            <p className="text-zinc-400 text-lg">
              I'll help you create profitable bundles, set optimal pricing, and build compelling storefront content.
            </p>
          </div>

          <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 backdrop-blur-sm">
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
                onClick={() => fileInputRef.current?.click()}
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 hover:bg-zinc-800"
                disabled={isUploading}
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
                  className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-zinc-400 truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="text-zinc-500 hover:text-white"
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
                onClick={() => fileInputRef.current?.click()}
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 hover:bg-zinc-800"
                disabled={uploadedFiles.length >= 5 || isUploading}
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

          <p className="text-xs text-zinc-500 text-center mt-2">
            Upload up to 5 files without signup • Sign up for unlimited uploads and to take action
          </p>
        </div>
      )}
    </div>
  )
}
