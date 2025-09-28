"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
  Menu,
  X,
  Home,
  Upload,
  Package,
  DollarSign,
  Heart,
  Search,
  User,
  Settings,
  Gift,
  CreditCard,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

interface VexChatProps {
  children?: React.ReactNode
}

function VexChat({ children }: VexChatProps) {
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
  const isMobile = useIsMobile()
  const router = useRouter()
  const pathname = usePathname() // Added pathname to detect current route
  const [username, setUsername] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const isVexChatPage = pathname === "/dashboard/vex"

  const suggestions = [
    "Help me create a beginner photography bundle",
    "What should I price my video editing pack?",
    "Build a bundle for social media templates",
    "Create a free lead magnet bundle",
  ]

  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Search, label: "Explore", href: "/dashboard/explore" },
    { icon: Upload, label: "Upload", href: "/dashboard/upload" },
    { icon: Package, label: "Bundles", href: "/dashboard/bundles" },
    { icon: DollarSign, label: "Earnings", href: "/dashboard/earnings" },
    { icon: Heart, label: "Favorites", href: "/dashboard/favorites" },
    { icon: CreditCard, label: "Upgrade", href: "/dashboard/upgrade" }, // Fixed upgrade URL
    { icon: Package, label: "My Purchases", href: "/dashboard/purchases" },
    { icon: Gift, label: "Free Content", href: "/dashboard/free-content" },
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

    // Close sidebar on mobile when selecting a chat
    if (isMobile) {
      setIsSidebarOpen(false)
    }

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

    if (isMobile) {
      setIsSidebarOpen(false)
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

  const handleNavigation = (href: string) => {
    router.push(href)
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Fetch username for profile link
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return

      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setUsername(data.user?.username || null)
        }
      } catch (error) {
        console.error("Error fetching username:", error)
      }
    }

    fetchUsername()
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isSidebarOpen) {
        const sidebar = document.getElementById("vex-sidebar")
        const menuButton = document.getElementById("mobile-menu-button")

        if (
          sidebar &&
          !sidebar.contains(event.target as Node) &&
          menuButton &&
          !menuButton.contains(event.target as Node)
        ) {
          setIsSidebarOpen(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobile, isSidebarOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isSidebarOpen])

  return (
    <div className="flex h-screen relative bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Fixed noise overlay */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light pointer-events-none z-0"></div>

      {/* Mobile menu button */}
      {isMobile && (
        <Button
          id="mobile-menu-button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 h-10 w-10 p-0 bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 hover:bg-zinc-800"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Mobile backdrop */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Enhanced Sidebar with Full Navigation */}
      <div
        id="vex-sidebar"
        className={`
          ${isMobile ? "fixed" : "fixed"} 
          left-0 top-0 h-full 
          ${isMobile ? "w-80" : "w-64"} 
          bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 flex flex-col z-40
          ${isMobile ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
          transition-transform duration-300 ease-in-out
        `}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-white">MassClip</span>
            </div>
          </div>
          {isMobile && (
            <Button
              onClick={() => setIsSidebarOpen(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col h-full">
            {/* Vex Chat Section */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Vex AI</span>
              </div>

              <Button
                onClick={createNewChat}
                className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700 text-white h-10 mb-3"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>

              {/* Chat History */}
              <div className="max-h-48 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1">
                    {isLoadingChats ? (
                      <div className="text-center py-4 text-zinc-500">
                        <Loader2 className="h-4 w-4 mx-auto mb-1 animate-spin" />
                        <p className="text-xs">Loading chats...</p>
                      </div>
                    ) : chatSessions.length === 0 ? (
                      <div className="text-center py-4 text-zinc-500">
                        <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">No chats yet</p>
                      </div>
                    ) : (
                      chatSessions.slice(0, 5).map((chat) => (
                        <div key={chat.id} className="group relative">
                          <button
                            onClick={() => {
                              loadChat(chat.id)
                              router.push("/dashboard/vex")
                            }}
                            disabled={isLoadingCurrentChat}
                            className={`w-full text-left p-2 rounded-md text-xs transition-all duration-200 flex items-center gap-2 ${
                              currentChatId === chat.id
                                ? "bg-blue-600/20 text-blue-300 border border-blue-600/30"
                                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                            } ${isLoadingCurrentChat ? "opacity-50" : ""}`}
                          >
                            <MessageSquare className="h-3 w-3 flex-shrink-0" />
                            <span className="flex-1 truncate font-medium">{chat.title}</span>
                          </button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm("Delete this chat?")) {
                                deleteChat(chat.id)
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 p-4">
              <div className="mb-3">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Navigation</span>
              </div>
              <nav className="space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-all duration-200"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Footer with Profile & Settings */}
            <div className="p-4 border-t border-zinc-800 space-y-3">
              {/* Profile Section */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-zinc-700 text-white text-xs">
                    {user?.displayName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.displayName || username || "User"}</p>
                  <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {username && (
                  <Button
                    onClick={() => window.open(`/creator/${username}`, "_blank")} // Fixed storefront URL to use creator profile
                    size="sm"
                    className="w-full bg-white text-black hover:bg-zinc-100 font-medium"
                  >
                    <User className="h-3 w-3 mr-1" />
                    View Storefront
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-zinc-700 hover:bg-zinc-800 text-xs bg-transparent"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Settings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-700">
                    <DropdownMenuItem onClick={() => handleNavigation("/dashboard/profile")}>
                      <User className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("/dashboard/earnings")}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("/dashboard/security")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Security
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {isVexChatPage ? (
        /* Main Chat Area - Only show on /dashboard/vex */
        <div
          className={`flex flex-col flex-1 min-h-0 ${isMobile ? "ml-0" : "ml-64"} ${isMobile && isSidebarOpen ? "blur-sm pointer-events-none" : ""} transition-all duration-300 relative z-10`}
        >
          {isLoadingCurrentChat && (
            <div className="flex items-center justify-center py-4 border-b border-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading chat...</span>
            </div>
          )}

          <ScrollArea className={`flex-1 ${isMobile ? "px-4" : "px-6"}`}>
            <div className={`${isMobile ? "max-w-full" : "max-w-3xl mx-auto"} py-6 min-h-full flex flex-col`}>
              {messages.length === 0 && (
                <div className="text-center py-12 flex-1 flex flex-col justify-center">
                  <h2 className={`${isMobile ? "text-xl" : "text-2xl"} font-semibold mb-3`}>Hi! I'm Vex</h2>
                  <p
                    className={`text-muted-foreground mb-8 ${isMobile ? "max-w-sm" : "max-w-md"} mx-auto leading-relaxed`}
                  >
                    I'll help you create profitable bundles, set optimal pricing, and build compelling storefront
                    content.
                  </p>

                  {contentAnalysis && (
                    <div
                      className={`mb-8 p-4 rounded-lg bg-transparent ${isMobile ? "max-w-sm" : "max-w-md"} mx-auto border border-zinc-700/50`}
                    >
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

                  <div
                    className={`grid ${isMobile ? "grid-cols-1 gap-2" : "grid-cols-1 md:grid-cols-2 gap-3"} ${isMobile ? "max-w-full" : "max-w-2xl"} mx-auto`}
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className={`text-left ${isMobile ? "p-3" : "p-4"} rounded-lg bg-transparent border border-zinc-700/50 hover:bg-zinc-800/30 hover:border-zinc-600/50 transition-all duration-200 text-sm`}
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
                        className={`${isMobile ? "max-w-[90%]" : "max-w-[80%]"} rounded-lg px-4 py-3 ${
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

          <div className={`flex-shrink-0 ${isMobile ? "px-4" : "px-6"} py-4`}>
            <div className={`${isMobile ? "max-w-full" : "max-w-3xl mx-auto"}`}>
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
      ) : (
        /* Page Content Area - Show for all other dashboard pages */
        <div
          className={`flex-1 min-h-0 ${isMobile ? "ml-0" : "ml-64"} ${isMobile && isSidebarOpen ? "blur-sm pointer-events-none" : ""} transition-all duration-300 relative z-10`}
        >
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
        </div>
      )}
    </div>
  )
}

export default VexChat
export { VexChat }
