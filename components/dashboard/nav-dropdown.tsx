"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Home, Film, Upload, DollarSign, Settings, User, Search, Package, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function NavDropdown() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [stripeConnected, setStripeConnected] = useState(false)

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [user])

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-4 w-4" />,
      exact: true,
    },
    {
      name: "Explore",
      href: "/dashboard/explore",
      icon: <Search className="h-4 w-4" />,
    },
    {
      name: "Free Content",
      href: "/dashboard/free-content",
      icon: <Film className="h-4 w-4" />,
    },
    {
      name: "My Uploads",
      href: "/dashboard/uploads",
      icon: <Package className="h-4 w-4" />,
    },
    {
      name: "Upload Video",
      href: "/dashboard/upload",
      icon: <Upload className="h-4 w-4" />,
    },
    {
      name: "Create Bundle",
      href: "/dashboard/bundles",
      icon: <Package className="h-4 w-4" />,
    },
    {
      name: "Earnings",
      href: "/dashboard/earnings",
      icon: <DollarSign className="h-4 w-4" />,
      alert: !stripeConnected,
    },
    {
      name: "My Purchases",
      href: "/dashboard/purchases",
      icon: <Package className="h-4 w-4" />,
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-4 w-4" />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-zinc-400 hover:text-white">
          Navigation
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="start">
        <DropdownMenuLabel className="text-zinc-400">Navigation</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

          return (
            <DropdownMenuItem
              key={item.name}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive ? "bg-red-600/10 text-red-500" : "text-zinc-300 hover:text-white hover:bg-zinc-800",
              )}
              onClick={() => handleNavigation(item.href)}
            >
              {item.icon}
              <span>{item.name}</span>
              {item.alert && <span className="ml-auto flex h-2 w-2 rounded-full bg-red-500"></span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
