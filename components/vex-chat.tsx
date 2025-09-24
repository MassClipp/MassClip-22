"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, User } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function VexChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const suggestions = [
    "Analyze market demand for photography bundle pricing strategies",
    "Generate optimal pricing matrix for video editing software packages",
    "Build comprehensive social media template bundle architecture",
    "Design lead magnet funnel with conversion optimization metrics",
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/vex/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message.content,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <div className="flex flex-col h-screen bg-black text-green-400 font-mono">
      {/* Technical Header */}
      <div className="border-b border-green-800/50 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-bold tracking-wider">VEX_AI_SYSTEM</span>
            </div>
            <div className="text-green-600 text-sm">[BUNDLE_OPTIMIZATION_MODULE_v2.1.3]</div>
          </div>
          <div className="text-green-600 text-sm font-mono">STATUS: ONLINE | LATENCY: 12ms | UPTIME: 99.97%</div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-black via-gray-950 to-black">
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6 max-w-6xl mx-auto">
            {messages.length === 0 && (
              <div className="py-12">
                {/* Technical Welcome Interface */}
                <div className="border border-green-800/30 bg-green-950/10 rounded-lg p-8 mb-8">
                  <div className="text-center mb-6">
                    <div className="text-green-400 text-2xl font-bold tracking-wider mb-2">
                      VEX AI BUNDLE STRATEGIST
                    </div>
                    <div className="text-green-600 text-sm font-mono">
                      ADVANCED REVENUE OPTIMIZATION & CONTENT STRATEGY ENGINE
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-center text-sm">
                    <div className="border border-green-800/30 rounded p-3">
                      <div className="text-green-400 font-bold">PRICING ANALYSIS</div>
                      <div className="text-green-600 mt-1">Market-driven optimization</div>
                    </div>
                    <div className="border border-green-800/30 rounded p-3">
                      <div className="text-green-400 font-bold">BUNDLE ARCHITECTURE</div>
                      <div className="text-green-600 mt-1">Strategic content grouping</div>
                    </div>
                    <div className="border border-green-800/30 rounded p-3">
                      <div className="text-green-400 font-bold">CONVERSION METRICS</div>
                      <div className="text-green-600 mt-1">Performance tracking</div>
                    </div>
                  </div>
                </div>

                {/* Command Suggestions */}
                <div className="space-y-3">
                  <div className="text-green-400 text-sm font-bold tracking-wider mb-4">AVAILABLE COMMANDS:</div>
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full text-left justify-start h-auto p-4 border-green-800/50 hover:border-green-400/50 hover:bg-green-950/20 bg-transparent text-green-300 hover:text-green-200 font-mono text-sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="text-green-600 mr-3">#{String(index + 1).padStart(2, "0")}</span>
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-10 w-10 bg-green-900 border border-green-700">
                    <AvatarFallback className="bg-transparent text-green-400 text-xs font-bold font-mono">
                      VEX
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[70%] rounded-lg p-4 font-mono text-sm ${
                    message.role === "user"
                      ? "bg-green-900/30 border border-green-700/50 text-green-200"
                      : "bg-gray-900/50 border border-green-800/30 text-green-300"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="text-green-600 text-xs mb-2 font-bold">
                      [VEX_RESPONSE] {new Date().toLocaleTimeString()}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                </div>

                {message.role === "user" && (
                  <Avatar className="h-10 w-10 bg-gray-800 border border-green-700">
                    <AvatarFallback className="bg-transparent text-green-400">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start">
                <Avatar className="h-10 w-10 bg-green-900 border border-green-700">
                  <AvatarFallback className="bg-transparent text-green-400 text-xs font-bold font-mono">
                    VEX
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-900/50 border border-green-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div
                        className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                    <span className="text-green-400 text-sm font-mono">PROCESSING_REQUEST...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Command Input */}
        <div className="border-t border-green-800/50 bg-black/90 backdrop-blur-sm p-6">
          <div className="max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-mono text-sm">
                  $
                </span>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter command or query..."
                  className="pl-8 bg-gray-900/50 border-green-800/50 focus:border-green-400 text-green-300 font-mono placeholder:text-green-700"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-green-900 hover:bg-green-800 border border-green-700 text-green-200 font-mono px-6"
              >
                <Send className="h-4 w-4 mr-2" />
                EXECUTE
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
