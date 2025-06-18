"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import {
  Home,
  Film,
  Upload,
  DollarSign,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Package,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Logo from "@/components/logo"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)
          setUsername(userData.username || null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [user])

  const navSections = [
    {
      id: "main",
      title: "Main",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: <Home className="h-5 w-5" />,
          exact: true,
        },
        {
          name: "Explore",
          href: "/dashboard/explore",
          icon: <Search className="h-5 w-5" />,
        },
      ],
    },
    {
      id: "content",
      title: "Content Management",
      items: [
        {
          name: "Free Content",
          href: "/dashboard/free-content",
          icon: <Film className="h-5 w-5" />,
        },
        {
          name: "My Uploads",
          href: "/dashboard/uploads",
          icon: <Package className="h-5 w-5" />,
        },
        {
          name: "Upload Video",
          href: "/dashboard/upload",
          icon: <Upload className="h-5 w-5" />,
        },
        {
          name: "Create Bundle",
          href: "/dashboard/bundles",
          icon: <Package className="h-5 w-5" />,
        },
      ],
    },
    {
      id: "business",
      title: "Business",
      items: [
        {
          name: "Earnings",
          href: "/dashboard/earnings",
          icon: <DollarSign className="h-5 w-5" />,
          alert: !stripeConnected,
        },
        {
          name: "My Purchases",
          href: "/dashboard/purchases",
          icon: <Package className="h-5 w-5" />,
        },
      ],
    },
    {
      id: "settings",
      title: "Settings",
      items: [
        {
          name: "Profile",
          href: "/dashboard/profile",
          icon: <User className="h-5 w-5" />,
        },
        {
          name: "Account",
          href: "/dashboard/settings",
          icon: <Settings className="h-5 w-5" />,
        },
      ],
    },
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  const handleNavigation = (href: string) => {
    setIsMobileOpen(false)
    router.push(href)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileOpen && event.target instanceof Element) {
        const sidebar = document.querySelector("[data-sidebar]")
        if (sidebar && !sidebar.contains(event.target)) {
          setIsMobileOpen(false)
        }
      }
    }

    if (isMobileOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isMobileOpen])

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Button
          onClick={toggleMobileSidebar}
          size="icon"
          className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        className={cn(
          "w-full md:w-64 bg-zinc-900/95 backdrop-blur-sm border-r border-zinc-800/50 md:flex flex-col h-full md:h-auto sticky top-0 z-40 max-h-screen overflow-y-auto transition-all duration-300 ease-in-out",
          isMobileOpen ? "fixed inset-y-0 left-0 flex w-80 max-w-[85vw] shadow-2xl" : "hidden md:flex",
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-800/50 flex items-center justify-between">
          <Logo href="/dashboard" size="sm" />
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable content */}
        <nav className="flex-1 min-h-0 py-4">
          <div className="h-full overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.id} className="mb-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <span className="hidden md:block">{section.title}</span>
                  <span className="md:hidden text-xs">{section.title}</span>
                  {expandedSections.includes(section.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {expandedSections.includes(section.id) && (
                  <ul className="space-y-1 px-2 pb-2">
                    {section.items.map((item) => {
                      const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

                      return (
                        <li key={item.name}>
                          <button
                            onClick={() => handleNavigation(item.href)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                              "md:text-sm text-xs",
                              isActive
                                ? "bg-red-600/10 text-red-500"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                            )}
                          >
                            <div className="flex-shrink-0">{item.icon}</div>
                            <span className="hidden md:block truncate text-left">{item.name}</span>
                            {item.alert && (
                              <span className="ml-auto flex h-2 w-2 rounded-full bg-red-500 flex-shrink-0"></span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-zinc-800/50">
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="hidden md:block">Sign Out</span>
          </Button>
        </div>
      </aside>
    </>
  )
}
