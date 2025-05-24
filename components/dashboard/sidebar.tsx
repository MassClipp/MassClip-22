"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Home, Film, Lock, Upload, DollarSign, Settings, User, LogOut, Menu, X, Search } from "lucide-react"
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

  const navItems = [
    {
      name: "Explore",
      href: "/dashboard/explore",
      icon: <Search className="h-5 w-5" />,
      description: "Discover content from other creators",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      exact: true,
    },
    {
      name: "Free Content",
      href: username ? `/creator/${username}?tab=free` : "/dashboard",
      icon: <Film className="h-5 w-5" />,
      external: true,
    },
    {
      name: "Premium Content",
      href: username ? `/creator/${username}?tab=premium` : "/dashboard",
      icon: <Lock className="h-5 w-5" />,
      external: true,
    },
    {
      name: "Upload",
      href: "/dashboard/upload",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      name: "Earnings",
      href: "/dashboard/earnings",
      icon: <DollarSign className="h-5 w-5" />,
      alert: !stripeConnected,
    },
    {
      name: "Profile Settings",
      href: "/dashboard/profile",
      icon: <User className="h-5 w-5" />,
    },
    {
      name: "Account Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  const handleNavigation = (href: string, external = false) => {
    setIsMobileOpen(false)
    if (external && href.startsWith("/creator/")) {
      window.open(href, "_blank")
    } else {
      router.push(href)
    }
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

      {/* Sidebar */}
      <aside
        className={cn(
          "w-full md:w-64 bg-zinc-900/80 backdrop-blur-sm border-r border-zinc-800/50 md:flex flex-col h-screen md:h-auto sticky top-0 z-40 transition-all duration-300 ease-in-out",
          isMobileOpen ? "fixed inset-0 flex" : "hidden md:flex",
        )}
      >
        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
          <Logo href="/dashboard" size="sm" />
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

              return (
                <li key={item.name}>
                  <button
                    onClick={() => handleNavigation(item.href, item.external)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-red-600/10 text-red-500" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                    {item.alert && <span className="ml-auto flex h-2 w-2 rounded-full bg-red-500"></span>}
                    {item.external && <span className="ml-auto text-xs text-zinc-600">↗</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
