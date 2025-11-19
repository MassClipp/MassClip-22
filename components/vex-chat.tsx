"use client"

import type React from "react"
import { useState, useEffect, useRef, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  MessageSquare,
  Trash2,
  Loader2,
  Upload,
  Package,
  DollarSign,
  Heart,
  User,
  Settings,
  Gift,
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ArrowDown,
  Target,
  BookOpen,
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
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { TopHeader } from "@/components/top-header"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { OnboardingChecklist } from "@/components/onboarding-checklist"

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
  const [isRefreshingAnalysis, setIsRefreshingAnalysis] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [bundleJobs, setBundleJobs] = useState<{ [jobId: string]: any }>({})
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isLoadingCurrentChat, setIsLoadingCurrentChat] = useState(false)
  const { user, signOut } = useAuth()
  const isMobile = useIsMobile()
  const router = useRouter()
  const pathname = usePathname() // Added pathname to detect current route
  const [username, setUsername] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [trialStatus, setTrialStatus] = useState<{
    isOnTrial: boolean
    daysRemaining: number
    trialEndDate: string | null
    hasUsedFreeTrial?: boolean
    hasActiveCreatorVIP?: boolean // Added this field
  } | null>(null)
  const [membershipStatus, setMembershipStatus] = useState<{
    plan: string
    isActive: boolean
  } | null>(null)
  const [isLoadingTrialStatus, setIsLoadingTrialStatus] = useState(true)
  const [isLoadingMembershipStatus, setIsLoadingMembershipStatus] = useState(true)
  const [trialEligibility, setTrialEligibility] = useState<{
    shouldShowTrial: boolean
  } | null>(null)

  // State for suggestions
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)

  const isVexChatPage = pathname === "/dashboard/vex"
  const isUploadPage = pathname === "/dashboard/upload"

  const navigationItems = [
    { icon: Upload, label: "Upload", href: "/dashboard/upload" },
    { icon: Heart, label: "Favorites", href: "/dashboard/favorites" },
    { icon: Package, label: "My Purchases", href: "/dashboard/purchases" },
    { icon: Gift, label: "Free Content", href: "/dashboard/free-content" },
  ]

  const businessManagementItems = [
    { icon: Target, label: "Sales Objectives", href: "/dashboard", gradient: true },
    { icon: Package, label: "Bundles", href: "/dashboard/bundles" },
    { icon: BookOpen, label: "eBooks", href: "/dashboard/ebooks" }, // Added eBooks navigation item
    { icon: DollarSign, label: "Earnings", href: "/dashboard/earnings" },
    { icon: User, label: "View Storefront", href: "/dashboard/view-storefront" },
  ]

  // Suggestions list (moved here to fix undeclared variable error)
  const allSuggestions = [
    "Help me create a beginner photography bundle",
    "What should I price my video editing pack?",
    "Build a bundle for social media templates",
    "Create a free lead magnet bundle",
    "Suggest ideas for a digital art bundle",
    "How can I bundle my services effectively?",
    "What elements should be in a 'starter pack' bundle?",
    "Generate a bundle for productivity tools",
  ]

  useEffect(() => {
    const getRandomSuggestions = () => {
      const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, 4)
    }

    setCurrentSuggestions(getRandomSuggestions())
  }, []) // Remove the interval, only set on mount

  const suggestions = [
    "Help me create a beginner photography bundle",
    "What should I price my video editing pack?",
    "Build a bundle for social media templates",
    "Create a free lead magnet bundle",
  ]

  useEffect(() => {
    if (!isUserScrolling && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, isUserScrolling])

  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

      setShowScrollButton(!isNearBottom)

      // If user scrolls up, mark as user scrolling
      if (!isNearBottom) {
        setIsUserScrolling(true)
      } else {
        setIsUserScrolling(false)
      }
    }

    scrollArea.addEventListener("scroll", handleScroll)
    return () => scrollArea.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToBottom = () => {
    setIsUserScrolling(false)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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

      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log("[v0] Starting auto-analysis of user content...")

      try {
        const token = await user.getIdToken(true) // true forces refresh
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

  const refreshContentAnalysis = async () => {
    if (!user || isRefreshingAnalysis) return

    console.log("[v0] Manually refreshing content analysis...")
    setIsRefreshingAnalysis(true)

    try {
      const token = await user.getIdToken(true) // true forces refresh
      const response = await fetch("/api/vex/analyze-uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Content analysis refreshed successfully:", data.analysis)
        setContentAnalysis(data.analysis)

        // Add a system message to confirm refresh
        const refreshMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "✅ **Content analysis refreshed!** I've updated my understanding of your library. I can now see all your latest uploads and folder organization.",
        }
        setMessages((prev) => [...prev, refreshMessage])

        // Save the refresh confirmation to current chat
        if (currentChatId) {
          await saveCurrentChat([...messages, refreshMessage])
        }
      } else {
        console.error("[v0] Failed to refresh analysis:", response.status)
        throw new Error("Failed to refresh analysis")
      }
    } catch (error) {
      console.error("[v0] Error refreshing content analysis:", error)

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ I encountered an error while refreshing your content analysis. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsRefreshingAnalysis(false)
    }
  }

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

  const handleSubmit = async (e: FormEvent) => {
    // Changed to FormEvent for type safety
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
      await signOut()
    } catch (error) {
      console.error("Logout error:", error)
      // Force redirect even on error
      window.location.href = "/login"
    }
  }

  // Fetch username for profile link
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const data = userDoc.data()
          setUsername(data.username || null)
        }
      } catch (error) {
        console.error("Error fetching username:", error)
      }
    }

    fetchUsername()
  }, [user])

  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!user) {
        setIsLoadingTrialStatus(false) // Ensure loading state is false if no user
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      setIsLoadingTrialStatus(true)
      try {
        const token = await user.getIdToken()

        const eligibilityRes = await fetch("/api/stripe/checkout/pricing", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (eligibilityRes.ok) {
          const eligibilityData = await eligibilityRes.json()
          console.log("[v0] Trial eligibility from pricing API:", eligibilityData)
          setTrialEligibility({ shouldShowTrial: eligibilityData.shouldShowTrial })
        }

        const response = await fetch("/api/user/trial-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Trial status loaded:", data)
          setTrialStatus(data)
        }
      } catch (error) {
        console.error("Error fetching trial status:", error)
      } finally {
        setIsLoadingTrialStatus(false)
      }
    }

    if (user) {
      fetchTrialStatus()
    }
  }, [user])

  useEffect(() => {
    const fetchMembershipStatus = async () => {
      if (!user) {
        setIsLoadingMembershipStatus(false) // Ensure loading state is false if no user
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 800))

      setIsLoadingMembershipStatus(true)
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/membership-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Membership status loaded:", data)
          setMembershipStatus({
            plan: data.plan || "free",
            isActive: data.isActive || false,
          })
        }
      } catch (error) {
        console.error("Error fetching membership status:", error)
      } finally {
        setIsLoadingMembershipStatus(false)
      }
    }

    if (user) {
      fetchMembershipStatus()
    }
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

  const shouldShowTrialButton =
    !isLoadingTrialStatus &&
    !isLoadingMembershipStatus &&
    trialEligibility?.shouldShowTrial &&
    !trialStatus?.isOnTrial &&
    (membershipStatus?.plan === "free" || (membershipStatus?.plan === "faceless_pro" && !membershipStatus?.isActive)) // Show if Faceless Pro subscription ended

  useEffect(() => {
    if (!isLoadingTrialStatus && !isLoadingMembershipStatus) {
      console.log("[v0] Trial Button Visibility Check:", {
        shouldShowTrialButton,
        trialStatus,
        membershipStatus,
        isLoadingTrialStatus,
        isLoadingMembershipStatus,
        trialEligibility, // Log trialEligibility as well
      })
    }
  }, [
    shouldShowTrialButton,
    trialStatus,
    membershipStatus,
    isLoadingTrialStatus,
    isLoadingMembershipStatus,
    trialEligibility,
  ])

  return (
    <div className="flex min-h-screen relative bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Fixed noise overlay */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light pointer-events-none z-0"></div>

      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TopHeader />
      </div>

      {/* Mobile menu button - Remove X button, only show arrow when sidebar is closed */}
      {isMobile && !isSidebarOpen && (
        <Button
          id="mobile-menu-button"
          onClick={() => setIsSidebarOpen(true)}
          variant="ghost"
          size="sm"
          className="fixed top-16 left-2 z-50 h-9 w-9 p-0 bg-zinc-900/80 backdrop-blur-xl border border-white/10 hover:bg-zinc-800/80 hover:border-white/20 rounded-lg shadow-lg transition-all duration-200"
        >
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </Button>
      )}

      {!isMobile && !(isUploadPage && isSidebarCollapsed) && (
        <div
          className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ${
            isSidebarCollapsed ? "w-16" : "w-64"
          } bg-zinc-950/60 backdrop-blur-xl border-r border-white/10`}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-white/5">
                <Button
                  onClick={() => setIsSidebarCollapsed(false)}
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 p-0 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                  title="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                {/* Upgrade at top */}
                <Button
                  onClick={() => handleNavigation("/dashboard/upgrade")}
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 p-0 rounded-lg transition-all duration-200 bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border border-blue-500/20 shadow-lg shadow-blue-500/20"
                  title="Upgrade"
                >
                  <CreditCard className="h-4 w-4" />
                </Button>

                {/* Vex AI */}
                <Button
                  onClick={() => {
                    createNewChat()
                    router.push("/dashboard/vex")
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 p-0 rounded-lg transition-all duration-200 text-zinc-400 hover:text-white hover:bg-white/5"
                  title="Vex AI"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>

                {/* Divider */}
                <div className="h-px bg-white/5 my-2" />

                {/* Business Management Items */}
                {businessManagementItems.map((item) => (
                  <Button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    variant="ghost"
                    size="sm"
                    className={`w-full h-10 p-0 rounded-lg transition-all duration-200 ${
                      item.gradient
                        ? "bg-gradient-to-r from-purple-500 via-blue-500/30 to-pink-500/30 text-white hover:from-purple-500/40 hover:via-blue-500/40 hover:to-pink-500/40"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                ))}

                {/* Divider */}
                <div className="h-px bg-white/5 my-2" />

                {/* Navigation Items */}
                {navigationItems.map((item) => (
                  <Button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 p-0 rounded-lg transition-all duration-200 text-zinc-400 hover:text-white hover:bg-white/5"
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>

              <div className="p-2 border-t border-white/5">
                <Button
                  onClick={() => handleNavigation("/dashboard/profile")}
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 p-0 rounded-lg transition-all duration-200 text-zinc-400 hover:text-white hover:bg-white/5"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-white tracking-tight">MassClip</span>
                  </div>
                </div>
                <Button
                  onClick={() => setIsSidebarCollapsed(true)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="flex flex-col h-full">
                  <div className="px-3 py-4 border-b border-white/5">
                    <button
                      onClick={() => handleNavigation("/dashboard/upgrade")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 bg-white hover:bg-gray-100 text-black shadow-lg hover:shadow-xl font-medium"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">Upgrade</span>
                    </button>
                  </div>

                  <div className="px-3 py-4 border-b border-white/5">
                    <button
                      onClick={() => {
                        createNewChat()
                        router.push("/dashboard/vex")
                      }}
                      className="flex items-center gap-3 mb-3 w-full text-left hover:bg-white/5 px-3 py-2.5 rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-400/20 group-hover:from-blue-600 group-hover:to-cyan-600 transition-all duration-200 shadow-md shadow-blue-500/20">
                        <MessageSquare className="h-4 w-4 text-black" />
                      </div>
                      <span className="text-sm font-medium text-white">Vex AI</span>
                    </button>

                    <div className="max-h-40 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="space-y-1">
                          {isLoadingChats ? (
                            <div className="text-center py-4 text-zinc-500">
                              <Loader2 className="h-4 w-4 mx-auto mb-2 animate-spin" />
                              <p className="text-xs">Loading chats...</p>
                            </div>
                          ) : chatSessions.length === 0 ? (
                            <div className="text-center py-4 text-zinc-500">
                              <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-50" />
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
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 flex items-center gap-2 overflow-hidden ${
                                    currentChatId === chat.id
                                      ? "bg-blue-500/10 text-blue-300 border border-blue-500/20 shadow-sm"
                                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                  } ${isLoadingCurrentChat ? "opacity-50" : ""}`}
                                >
                                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                                  <span className="font-medium line-clamp-2 max-w-[calc(100%-3rem)] leading-tight">
                                    {chat.title}
                                  </span>
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
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md z-30 border border-transparent hover:border-red-500/20"
                                  title="Delete chat"
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

                  <div className="flex-1 px-3 py-4">
                    {/* Removed duplicate onboarding checklist */}
                    <div className="mb-6">
                      <div className="mb-3 px-3">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                          Business Management
                        </span>
                      </div>
                      <nav className="space-y-1">
                        {businessManagementItems.map((item) => (
                          <button
                            key={item.href}
                            onClick={() => handleNavigation(item.href)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group ${
                              item.gradient
                                ? "bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white hover:from-purple-600 hover:via-blue-600 hover:to-pink-600 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 font-medium"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <item.icon
                              className={`h-4 w-4 ${item.gradient ? "" : "group-hover:scale-110 transition-transform duration-200"}`}
                            />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        ))}
                      </nav>
                    </div>

                    <div className="mb-3 px-3">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Navigation
                      </span>
                    </div>
                    <nav className="space-y-1">
                      {navigationItems.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group text-zinc-400 hover:text-white hover:bg-white/5"
                        >
                          <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="px-3 py-4 border-t border-white/5 space-y-3">
                    {!isLoadingTrialStatus && !isLoadingMembershipStatus && (
                      <>
                        {trialStatus?.isOnTrial && trialStatus.daysRemaining > 0 ? (
                          <div>
                            <Badge
                              className={`w-full justify-center ${
                                trialStatus.daysRemaining <= 1
                                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                                  : "bg-gradient-to-r from-cyan-500 to-blue-500"
                              } text-white border-0 px-3 py-2 shadow-lg`}
                            >
                              <Clock className="h-3 w-3 mr-1.5" />
                              Free Trial: {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"}
                              left
                            </Badge>
                          </div>
                        ) : shouldShowTrialButton ? (
                          <div>
                            <Button
                              onClick={async () => {
                                try {
                                  const idToken = await user?.getIdToken?.()
                                  const res = await fetch("/api/stripe/checkout/pricing", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      idToken,
                                      plan: "facelessprenuer",
                                    }),
                                  })

                                  if (res.ok) {
                                    const data = (await res.json()) as { url?: string }
                                    if (data?.url) {
                                      window.location.href = data.url
                                    }
                                  }
                                } catch (err) {
                                  console.error("[Sidebar] Error starting checkout:", err)
                                }
                              }}
                              size="sm"
                              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-medium text-xs h-9 shadow-lg shadow-cyan-500/20"
                            >
                              <Gift className="h-3 w-3 mr-1.5" />
                              Start Free Trial
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <Avatar className="h-9 w-9 ring-2 ring-white/10">
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-800 text-white text-xs font-medium">
                          {user?.displayName || username?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {user?.displayName || username || "User"}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-white/10 hover:bg-white/5 hover:border-white/20 text-xs bg-transparent h-9 text-zinc-400 hover:text-white transition-all duration-200"
                          >
                            <Settings className="h-3 w-3 mr-2" />
                            Settings
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-zinc-900/95 backdrop-blur-xl border-white/10"
                        >
                          <DropdownMenuItem
                            onClick={() => handleNavigation("/dashboard/profile")}
                            className="hover:bg-white/5"
                          >
                            <User className="h-4 w-4 mr-2" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleNavigation("/dashboard/security")}
                            className="hover:bg-white/5"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Security
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-red-400 focus:text-red-300 hover:bg-red-500/10"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        onClick={() => {
                          if (username) {
                            window.open(`/creator/${username}`, "_blank")
                          } else {
                            router.push("/dashboard/profile")
                          }
                        }}
                        size="sm"
                        className="w-full bg-white text-black hover:bg-zinc-100 font-semibold text-xs h-9 shadow-lg transition-all duration-200"
                      >
                        <User className="h-3 w-3 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <>
          {/* Mobile backdrop */}
          {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setIsSidebarOpen(false)} />
          )}

          <div
            id="vex-sidebar"
            className={`
              fixed left-0 top-16 h-[calc(100vh-4rem)] w-80
              bg-zinc-950/60 backdrop-blur-xl border-r border-white/10 flex flex-col z-40
              ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
              transition-all duration-300 ease-in-out overflow-hidden shadow-2xl
            `}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-white tracking-tight">MassClip</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col h-full">
                <div className="px-3 py-4 border-b border-white/5">
                  <button
                    onClick={() => handleNavigation("/dashboard/upgrade")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 bg-white hover:bg-gray-100 text-black shadow-lg hover:shadow-xl font-medium mb-3"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Upgrade</span>
                  </button>

                  <button
                    onClick={() => {
                      createNewChat()
                      router.push("/dashboard/vex")
                    }}
                    className="flex items-center gap-3 mb-3 w-full text-left hover:bg-white/5 px-3 py-2.5 rounded-lg transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-400/20 group-hover:from-blue-600 group-hover:to-cyan-600 transition-all duration-200 shadow-md shadow-blue-500/20">
                      <MessageSquare className="h-4 w-4 text-black" />
                    </div>
                    <span className="text-sm font-medium text-white">Vex AI</span>
                  </button>

                  {/* Chat History - Same styling as desktop */}
                  <div className="max-h-40 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-1">
                        {isLoadingChats ? (
                          <div className="text-center py-4 text-zinc-500">
                            <Loader2 className="h-4 w-4 mx-auto mb-2 animate-spin" />
                            <p className="text-xs">Loading chats...</p>
                          </div>
                        ) : chatSessions.length === 0 ? (
                          <div className="text-center py-4 text-zinc-500">
                            <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-50" />
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
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 flex items-center gap-2 overflow-hidden ${
                                  currentChatId === chat.id
                                    ? "bg-blue-500/10 text-blue-300 border border-blue-500/20 shadow-sm"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                } ${isLoadingCurrentChat ? "opacity-50" : ""}`}
                              >
                                <MessageSquare className="h-3 w-3 flex-shrink-0" />
                                <span className="font-medium line-clamp-2 max-w-[calc(100%-3rem)] leading-tight">
                                  {chat.title}
                                </span>
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
                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md z-30 border border-transparent hover:border-red-500/20"
                                title="Delete chat"
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

                <div className="flex-1 px-3 py-4">
                  <div className="mb-4 md:hidden">
                    <OnboardingChecklist />
                  </div>

                  <div className="mb-6">
                    <div className="mb-3 px-3">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Business Management
                      </span>
                    </div>
                    <nav className="space-y-1">
                      {businessManagementItems.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group ${
                            item.gradient
                              ? "bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white hover:from-purple-600 hover:via-blue-600 hover:to-pink-600 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 font-medium"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${item.gradient ? "" : "group-hover:scale-110 transition-transform duration-200"}`}
                          />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="mb-3 px-3">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Navigation</span>
                  </div>
                  <nav className="space-y-1">
                    {navigationItems.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => handleNavigation(item.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group text-zinc-400 hover:text-white hover:bg-white/5"
                      >
                        <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Profile Section */}
                <div className="px-3 py-4 border-t border-white/5 space-y-3">
                  {!isLoadingTrialStatus && !isLoadingMembershipStatus && (
                    <>
                      {trialStatus?.isOnTrial && trialStatus.daysRemaining > 0 ? (
                        <div>
                          <Badge
                            className={`w-full justify-center ${
                              trialStatus.daysRemaining <= 1
                                ? "bg-gradient-to-r from-orange-500 to-red-500"
                                : "bg-gradient-to-r from-cyan-500 to-blue-500"
                            } text-white border-0 px-3 py-2 shadow-lg`}
                          >
                            <Clock className="h-3 w-3 mr-1.5" />
                            Free Trial: {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"}{" "}
                            {/* Added space */} left
                          </Badge>
                        </div>
                      ) : shouldShowTrialButton ? (
                        <div>
                          <Button
                            onClick={async () => {
                              try {
                                const idToken = await user?.getIdToken?.()
                                const res = await fetch("/api/stripe/checkout/pricing", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    idToken,
                                    plan: "facelessprenuer",
                                  }),
                                })

                                if (res.ok) {
                                  const data = (await res.json()) as { url?: string }
                                  if (data?.url) {
                                    window.location.href = data.url
                                  }
                                }
                              } catch (err) {
                                console.error("[Sidebar] Error starting checkout:", err)
                              }
                            }}
                            size="sm"
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-medium text-xs h-9 shadow-lg shadow-cyan-500/20"
                          >
                            <Gift className="h-3 w-3 mr-1.5" />
                            Start Free Trial
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Profile Section */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                    <Avatar className="h-9 w-9 ring-2 ring-white/10">
                      <AvatarImage src={user?.photoURL || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-800 text-white text-xs font-medium">
                        {user?.displayName || username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.displayName || username || "User"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-white/10 hover:bg-white/5 hover:border-white/20 text-xs bg-transparent h-9 text-zinc-400 hover:text-white transition-all duration-200"
                        >
                          <Settings className="h-3 w-3 mr-2" />
                          Settings
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-zinc-900/95 backdrop-blur-xl border-white/10">
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/dashboard/profile")}
                          className="hover:bg-white/5"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/dashboard/security")}
                          className="hover:bg-white/5"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Security
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="text-red-400 focus:text-red-300 hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      onClick={() => {
                        if (username) {
                          window.open(`/creator/${username}`, "_blank")
                        } else {
                          router.push("/dashboard/profile")
                        }
                      }}
                      size="sm"
                      className="w-full bg-white text-black hover:bg-zinc-100 font-semibold text-xs h-9 shadow-lg transition-all duration-200"
                    >
                      <User className="h-3 w-3 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {isVexChatPage ? (
        /* Main Chat Area - Only show on /dashboard/vex */
        <div
          className={`flex-col flex-1 min-h-screen pt-16 ${isMobile ? "ml-0" : isSidebarCollapsed ? "ml-16" : "ml-64"} ${isMobile && isSidebarOpen ? "blur-sm pointer-events-none" : ""} transition-all duration-300 relative z-10`}
        >
          {isLoadingCurrentChat && (
            <div className="flex items-center justify-center py-4 border-b border-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading chat...</span>
            </div>
          )}

          <ScrollArea className={`flex-1 ${isMobile ? "px-3" : "px-4"}`} ref={scrollAreaRef}>
            <div className={`${isMobile ? "max-w-full" : "max-w-4xl mx-auto"} py-4 min-h-full flex flex-col`}>
              {messages.length === 0 && (
                <div className="text-center flex-1 flex flex-col justify-center items-center min-h-[60vh] px-2">
                  <h2 className={`${isMobile ? "text-xl" : "text-2xl"} font-semibold mb-2`}>Hi! I'm Vex</h2>
                  <p
                    className={`text-muted-foreground mb-6 ${isMobile ? "max-w-sm text-sm" : "max-w-md"} mx-auto leading-relaxed`}
                  >
                    I'll help you create profitable bundles, set optimal pricing, and build compelling storefront
                    content.
                  </p>

                  {contentAnalysis && (
                    <div
                      className={`mb-6 p-3 rounded-lg bg-transparent ${isMobile ? "max-w-sm" : "max-w-md"} mx-auto border border-zinc-700/50`}
                    >
                      <p className="text-sm text-muted-foreground mb-1">
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

                  <p className="text-xs text-zinc-500 max-w-md mx-auto text-center">
                    The more specific and detailed your requests are, the better I can help you organize and monetize
                    your content
                  </p>
                </div>
              )}

              {messages.length > 0 && (
                <div className="space-y-4 flex-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-slide-up ${message.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                    >
                      <div
                        className={`${isMobile ? "max-w-[90%]" : "max-w-[80%]"} rounded-lg px-3 py-2 ${
                          message.role === "user" ? "chat-message-user ml-auto" : "chat-message-assistant"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start chat-slide-up">
                      <div className="chat-message-assistant rounded-lg px-3 py-2">
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

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <div className="h-32" />
          </ScrollArea>

          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="sm"
              className="fixed bottom-24 right-8 h-10 w-10 p-0 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 shadow-lg z-50 transition-all duration-200"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}

          <div
            className={`fixed bottom-0 ${isMobile ? "left-0 right-0" : isSidebarCollapsed ? "left-16 right-0" : "left-64 right-0"} bg-gradient-to-t from-black via-black to-transparent pt-4 pb-3 ${isMobile ? "px-3" : "px-4"} z-40 transition-all duration-300`}
          >
            <div className={`${isMobile ? "max-w-full" : "max-w-4xl mx-auto"}`}>
              {messages.length > 0 && (
                <div className="flex justify-center mb-2">
                  <Button
                    onClick={refreshContentAnalysis}
                    disabled={isRefreshingAnalysis}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  >
                    {isRefreshingAnalysis ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Refresh Content Analysis
                      </>
                    )}
                  </Button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message Vex"
                    className="chat-input-container border-0 bg-transparent text-sm py-2 px-3 pr-10 resize-none focus:ring-1 focus:ring-ring"
                    disabled={isLoading}
                    style={{ fontSize: "16px" }} // Set font size to 16px to prevent iOS Safari zoom
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </form>
              <p className="text-xs text-zinc-500 text-center mt-2">Vex can make mistakes</p>
            </div>
          </div>
        </div>
      ) : (
        /* Page Content Area - Show for all other dashboard pages */
        <div
          className={`flex-1 min-h-screen pt-16 ${
            isMobile
              ? "ml-0"
              : isUploadPage && isSidebarCollapsed
                ? "ml-0" // Upload page gets full width when sidebar collapsed
                : isSidebarCollapsed
                  ? "ml-16"
                  : "ml-64"
          } ${isMobile && isSidebarOpen ? "blur-sm pointer-events-none" : ""} transition-all duration-300 relative z-10`}
        >
          {isUploadPage ? (
            <div
              className={`h-full ${isSidebarCollapsed ? "px-2 sm:px-3 lg:px-4" : "max-w-7xl mx-auto px-3 sm:px-4 lg:px-6"} py-4`}
            >
              {children}
            </div>
          ) : (
            // All other pages use standard layout
            <div
              className={`h-full ${isSidebarCollapsed ? "px-3 sm:px-4 lg:px-6" : "max-w-6xl mx-auto px-3 sm:px-4 lg:px-6"} py-4`}
            >
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VexChat
export { VexChat }
