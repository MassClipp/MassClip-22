"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Plus, MessageSquare, Trash2, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  bundleJobId?: string // Add job tracking to messages
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
  const [bundleJobs, setBundleJobs] = useState<{ [jobId: string]: any }>({})
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isLoadingCurrentChat, setIsLoadingCurrentChat] = useState(false)
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
      if (!user) {
        setIsLoadingChats(false)
        return
      }

      console.log("[v0] Loading chat sessions for user:", user.uid)
      setIsLoadingChats(true)

      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/vex/chats", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Loaded", data.chats.length, "chat sessions")
          setChatSessions(data.chats)

          const lastChatId = localStorage.getItem("vex-last-chat-id")
          if (lastChatId && data.chats.some((chat: ChatSession) => chat.id === lastChatId)) {
            console.log("[v0] Restoring last active chat:", lastChatId)
            await loadChat(lastChatId)
          }
        } else {
          console.error("[v0] Failed to load chats:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error loading chat sessions:", error)
      } finally {
        setIsLoadingChats(false)
      }
    }

    loadChatSessions()
  }, [user])

  // Load specific chat
  const loadChat = async (chatId: string) => {
    if (!user) return

    console.log("[v0] Loading chat:", chatId)
    setIsLoadingCurrentChat(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/vex/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const chat = await response.json()
        console.log("[v0] Loaded chat with", chat.messages?.length || 0, "messages")
        setMessages(chat.messages || [])
        setCurrentChatId(chatId)
        localStorage.setItem("vex-last-chat-id", chatId)
      } else {
        console.error("[v0] Failed to load chat:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error loading chat:", error)
    } finally {
      setIsLoadingCurrentChat(false)
    }
  }

  const createNewChat = async () => {
    if (!user) {
      console.error("User not authenticated")
      return
    }

    try {
      const token = await user.getIdToken()
      console.log("[v0] Creating new chat with token")

      const response = await fetch("/api/vex/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "New Chat",
          messages: [],
        }),
      })

      console.log("[v0] New chat response status:", response.status)

      if (response.ok) {
        const newChat = await response.json()
        console.log("[v0] New chat created:", newChat.id)
        setChatSessions((prev) => [newChat, ...prev])
        setMessages([])
        setCurrentChatId(newChat.id)
        localStorage.setItem("vex-last-chat-id", newChat.id)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Failed to create new chat:", response.status, errorData)
        throw new Error(`Failed to create chat: ${response.status}`)
      }
    } catch (error) {
      console.error("Error creating new chat:", error)
      alert("Failed to create new chat. Please try again.")
    }
  }

  const saveCurrentChat = async (newMessages: Message[]) => {
    if (!user || !currentChatId) return

    try {
      const token = await user.getIdToken()
      const currentChat = chatSessions.find((c) => c.id === currentChatId)
      let title = currentChat?.title || "New Chat"

      // Generate AI title if it's still "New Chat" and we have messages
      if (title === "New Chat" && newMessages.length >= 2) {
        try {
          const titleResponse = await fetch("/api/vex/generate-title", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ messages: newMessages }),
          })

          if (titleResponse.ok) {
            const titleData = await titleResponse.json()
            title = titleData.title || title
            console.log("[v0] Generated AI title:", title)
          }
        } catch (titleError) {
          console.log("[v0] Title generation failed, using fallback:", titleError)
          // Fallback to first user message
          const firstUserMessage = newMessages.find((m) => m.role === "user")
          if (firstUserMessage) {
            title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
          }
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
          localStorage.removeItem("vex-last-chat-id")
        }
        console.log("[v0] Deleted chat:", chatId)
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

  useEffect(() => {
    const pollBundleJobs = async () => {
      if (!user) return

      const activeJobs = Object.keys(bundleJobs).filter((jobId) => {
        const job = bundleJobs[jobId]
        return job && !["completed", "failed"].includes(job.status)
      })

      if (activeJobs.length === 0) return

      try {
        const token = await user.getIdToken()

        for (const jobId of activeJobs) {
          const response = await fetch(`/api/vex/bundle-jobs?jobId=${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (response.ok) {
            const data = await response.json()
            setBundleJobs((prev) => ({
              ...prev,
              [jobId]: data.job,
            }))

            // Update message content with progress
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.bundleJobId === jobId) {
                  const job = data.job
                  let updatedContent = msg.content

                  if (job.status === "processing" || job.status === "retrying") {
                    updatedContent = `🔄 **Creating your bundle...** 

**Progress:** ${job.progress}%
**Current Step:** ${job.currentStep}

${job.retryCount > 0 ? `*Retry ${job.retryCount}/${job.maxRetries}*` : ""}`
                  } else if (job.status === "completed" && job.bundleId) {
                    updatedContent = `🎉 **Your bundle is ready!** 

I've successfully created your bundle and it's now live in your storefront. You can view it in your dashboard or start sharing it with your audience!

**Bundle ID:** ${job.bundleId}`
                  } else if (job.status === "failed") {
                    updatedContent = `❌ **Bundle creation failed** 

${job.error || "An unexpected error occurred"}

${job.retryCount >= job.maxRetries ? "Maximum retries reached. " : ""}You can try again or create the bundle manually in your dashboard.`
                  }

                  return { ...msg, content: updatedContent }
                }
                return msg
              }),
            )
          }
        }
      } catch (error) {
        console.error("Error polling bundle jobs:", error)
      }
    }

    // Poll every 2 seconds for active jobs
    const interval = setInterval(pollBundleJobs, 2000)
    return () => clearInterval(interval)
  }, [user, bundleJobs])

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
        if (!token) {
          throw new Error("User not authenticated")
        }

        // Generate AI title for the new chat
        let chatTitle = "New Chat"
        try {
          const titleResponse = await fetch("/api/vex/generate-title", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ messages: [userMessage] }),
          })

          if (titleResponse.ok) {
            const titleData = await titleResponse.json()
            chatTitle = titleData.title || chatTitle
          }
        } catch (titleError) {
          console.log("[v0] Title generation failed, using fallback")
          chatTitle = input.slice(0, 50) + (input.length > 50 ? "..." : "")
        }

        const response = await fetch("/api/vex/chats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: chatTitle,
            messages: newMessages,
          }),
        })

        console.log("[v0] New chat response status:", response.status)

        if (response.ok) {
          const newChat = await response.json()
          console.log("[v0] New chat created:", newChat.id)
          setChatSessions((prev) => [newChat, ...prev])
          setCurrentChatId(newChat.id)
          localStorage.setItem("vex-last-chat-id", newChat.id)
        } else {
          throw new Error(`Failed to create chat: ${response.status}`)
        }
      } catch (error) {
        console.error("Error creating chat:", error)
        // Continue with the message even if chat creation fails
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
        bundleJobId: data.bundleJobId || undefined,
      }

      if (data.bundleJobId) {
        setBundleJobs((prev) => ({
          ...prev,
          [data.bundleJobId]: {
            id: data.bundleJobId,
            status: "queued",
            progress: 0,
            currentStep: "Initializing...",
          },
        }))
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
      const finalMessages = [...messages, errorMessage]
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
      <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col z-40">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Vex</h2>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-3 bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 h-10"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 px-4 pb-4">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {isLoadingChats ? (
                <div className="text-center py-8 text-zinc-500">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Loading chat history...</p>
                </div>
              ) : chatSessions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chat history yet</p>
                  <p className="text-xs mt-1">Start a conversation to see your chats here</p>
                </div>
              ) : (
                chatSessions.map((chat) => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => loadChat(chat.id)}
                      disabled={isLoadingCurrentChat}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 flex flex-col gap-1 ${
                        currentChatId === chat.id
                          ? "bg-zinc-800 text-white border border-zinc-700"
                          : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
                      } ${isLoadingCurrentChat ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-3 pr-8">
                        <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="flex-1 font-medium leading-tight text-balance break-words">{chat.title}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 ml-7">
                        <span>
                          {chat.messages?.length || 0} message{(chat.messages?.length || 0) !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {new Date(chat.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            ...(new Date(chat.updatedAt).getFullYear() !== new Date().getFullYear() && {
                              year: "numeric",
                            }),
                          })}
                        </span>
                      </div>
                    </button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Are you sure you want to delete this chat?")) {
                          deleteChat(chat.id)
                        }
                      }}
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 rounded-md"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 ml-64">
        <div className="flex-1 flex flex-col min-h-0">
          {isLoadingCurrentChat && (
            <div className="flex items-center justify-center py-4 border-b border-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading chat...</span>
            </div>
          )}

          <ScrollArea className="flex-1 px-6">
            <div className="max-w-3xl mx-auto py-6 min-h-full flex flex-col">
              {messages.length === 0 && (
                <div className="text-center py-12 flex-1 flex flex-col justify-center">
                  <h2 className="text-2xl font-semibold mb-3">Hi! I'm Vex</h2>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                    I'll help you create profitable bundles, set optimal pricing, and build compelling storefront
                    content.
                  </p>

                  {contentAnalysis && (
                    <div className="mb-8 p-4 rounded-lg bg-transparent max-w-md mx-auto border border-zinc-700/50">
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
                        className="text-left p-4 rounded-lg bg-transparent border border-zinc-700/50 hover:bg-zinc-800/30 hover:border-zinc-600/50 transition-all duration-200 text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div className="space-y-6 flex-1">
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
              )}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message Vex"
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
