"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Plus, MessageSquare, Trash2, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface ContentAnalysis {
  totalUploads: number
  categories: string[]
  recommendations: string[]
  summary: string
}

export function VexChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  const suggestions = [
    "Help me create a beginner photography bundle",
    "What should I price my video editing pack?",
    "Build a bundle for social media templates",
    "Create a free lead magnet bundle",
  ]

  // Load chat sessions
  useEffect(() => {
    const loadChatSessions = async () => {
      if (!user) return

      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/vex/chats", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setChatSessions(data.chats)
        }
      } catch (error) {
        console.error("Error loading chat sessions:", error)
      }
    }

    loadChatSessions()
  }, [user])

  // Load specific chat
  const loadChat = async (chatId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/vex/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const chat = await response.json()
        setMessages(chat.messages || [])
        setCurrentChatId(chatId)
        setSidebarOpen(false)
      }
    } catch (error) {
      console.error("Error loading chat:", error)
    }
  }

  // Create new chat
  const createNewChat = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/vex/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "New Chat", messages: [] }),
      })

      if (response.ok) {
        const newChat = await response.json()
        setChatSessions((prev) => [newChat, ...prev])
        setMessages([])
        setCurrentChatId(newChat.id)
        setSidebarOpen(false)
      }
    } catch (error) {
      console.error("Error creating new chat:", error)
    }
  }

  // Save current chat
  const saveCurrentChat = async (newMessages: Message[]) => {
    if (!user || !currentChatId) return

    try {
      const token = await user.getIdToken()

      // Generate title from first user message if no title exists
      const currentChat = chatSessions.find((c) => c.id === currentChatId)
      let title = currentChat?.title || "New Chat"

      if (title === "New Chat" && newMessages.length > 0) {
        const firstUserMessage = newMessages.find((m) => m.role === "user")
        if (firstUserMessage) {
          title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        }
      }

      await fetch(`/api/vex/chats/${currentChatId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, messages: newMessages }),
      })

      // Update local state
      setChatSessions((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, title, messages: newMessages, updatedAt: new Date().toISOString() }
            : chat,
        ),
      )
    } catch (error) {
      console.error("Error saving chat:", error)
    }
  }

  // Delete chat
  const deleteChat = async (chatId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/vex/chats/${chatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setChatSessions((prev) => prev.filter((chat) => chat.id !== chatId))
        if (currentChatId === chatId) {
          setMessages([])
          setCurrentChatId(null)
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
    }
  }

  useEffect(() => {
    const analyzeUserContent = async () => {
      if (!user || hasAnalyzed) return

      console.log("[v0] Starting auto-analysis of user content...")

      try {
        const token = await user.getIdToken(true)
        console.log("[v0] Got fresh ID token for analysis")

        const response = await fetch("/api/vex/analyze-uploads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        console.log("[v0] Analysis response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Content analysis completed:", data.analysis)
          setContentAnalysis(data.analysis)
          setHasAnalyzed(true)
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.log("[v0] Content analysis failed:", response.status, errorData)
        }
      } catch (error) {
        console.error("[v0] Error analyzing content:", error)
      }
    }

    analyzeUserContent()
  }, [user, hasAnalyzed])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    // Create new chat if none exists
    if (!currentChatId) {
      try {
        const token = user ? await user.getIdToken() : null
        const response = await fetch("/api/vex/chats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            title: input.slice(0, 50) + (input.length > 50 ? "..." : ""),
            messages: newMessages,
          }),
        })

        if (response.ok) {
          const newChat = await response.json()
          setChatSessions((prev) => [newChat, ...prev])
          setCurrentChatId(newChat.id)
        }
      } catch (error) {
        console.error("Error creating chat:", error)
      }
    }

    try {
      const token = user ? await user.getIdToken(true) : null
      console.log("[v0] Got token for chat:", !!token)

      const response = await fetch("/api/vex/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      })

      console.log("[v0] Chat response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Chat API error:", response.status, errorData)
        throw new Error(`Chat failed: ${response.status} - ${errorData.details || errorData.error || "Unknown error"}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message.content,
      }

      const finalMessages = [...newMessages, assistantMessage]
      setMessages(finalMessages)

      // Save to current chat
      if (currentChatId) {
        await saveCurrentChat(finalMessages)
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Please try again."}`,
      }
      const finalMessages = [...newMessages, errorMessage]
      setMessages(finalMessages)

      if (currentChatId) {
        await saveCurrentChat(finalMessages)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <div className="flex h-screen">
      <div
        className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-200 bg-muted/30 border-r overflow-hidden`}
      >
        <div className="p-4 space-y-4">
          <Button onClick={createNewChat} className="w-full justify-start gap-2 bg-transparent" variant="outline">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-2">
              {chatSessions.map((chat) => (
                <div key={chat.id} className="group flex items-center gap-2">
                  <button
                    onClick={() => loadChat(chat.id)}
                    className={`flex-1 text-left p-2 rounded text-sm hover:bg-muted/50 transition-colors ${
                      currentChatId === chat.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                  </button>
                  <Button
                    onClick={() => deleteChat(chat.id)}
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Button onClick={() => setSidebarOpen(!sidebarOpen)} size="sm" variant="ghost" className="h-8 w-8 p-0">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <h1 className="text-xl font-semibold chat-title">Vex</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-6">
            <div className="max-w-3xl mx-auto py-6">
              {messages.length === 0 && (
                <div className="text-center py-12 chat-fade-in">
                  <h2 className="text-2xl font-semibold mb-3 chat-title">Hi! I'm Vex</h2>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                    I'll help you create profitable bundles, set optimal pricing, and build compelling storefront
                    content.
                  </p>

                  {contentAnalysis && (
                    <div className="mb-8 p-4 rounded-lg bg-muted/50 max-w-md mx-auto">
                      <p className="text-sm text-muted-foreground mb-2">
                        Analyzed {contentAnalysis.totalUploads} uploads
                      </p>
                      {contentAnalysis.categories.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Found: {contentAnalysis.categories.slice(0, 3).join(", ")}
                          {contentAnalysis.categories.length > 3 && ` +${contentAnalysis.categories.length - 3} more`}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="chat-suggestion text-left p-4 rounded-lg transition-all duration-200 text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-slide-up ${message.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === "user" ? "chat-message-user ml-auto" : "chat-message-assistant"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start chat-slide-up">
                    <div className="chat-message-assistant rounded-lg px-4 py-3">
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
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message Vex..."
                    className="chat-input-container border-0 bg-transparent text-sm py-3 px-4 pr-12 resize-none focus:ring-1 focus:ring-ring"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
