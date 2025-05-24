"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import {
  Home,
  Film,
  Lock,
  Upload,
  DollarSign,
  Settings,
  User,
  Menu,
  ChevronRight,
  Compass,
  BarChart3,
  Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function NavDropdown() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [username, setUsername] = useState<string | null>(null)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

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

  const handleNavigation = (href: string, external = false) => {
    setIsOpen(false)
    if (external && href.startsWith("/creator/")) {
      window.open(href, "_blank")
    } else {
      router.push(href)
    }
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-4 w-4 mr-2" />,
      description: "Your creator overview",
    },
    {
      name: "Explore Content",
      href: "/dashboard/explore",
      icon: <Compass className="h-4 w-4 mr-2" />,
      description: "Discover videos from creators",
    },
    {
      name: "Content Management",
      icon: <Film className="h-4 w-4 mr-2" />,
      submenu: [
        {
          name: "Free Content",
          href: username ? `/creator/${username}?tab=free` : "/dashboard",
          icon: <Film className="h-4 w-4 mr-2" />,
          external: true,
        },
        {
          name: "Premium Content",
          href: username ? `/creator/${username}?tab=premium` : "/dashboard",
          icon: <Lock className="h-4 w-4 mr-2" />,
          external: true,
        },
        {
          name: "Upload New Content",
          href: "/dashboard/upload",
          icon: <Upload className="h-4 w-4 mr-2" />,
        },
      ],
    },
    {
      name: "Business",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
      submenu: [
        {
          name: "Earnings & Analytics",
          href: "/dashboard/earnings",
          icon: <DollarSign className="h-4 w-4 mr-2" />,
          alert: !stripeConnected,
        },
        {
          name: "Growth Strategies",
          href: "/dashboard/growth",
          icon: <Rocket className="h-4 w-4 mr-2" />,
        },
      ],
    },
    {
      name: "Settings",
      icon: <Settings className="h-4 w-4 mr-2" />,
      submenu: [
        {
          name: "Profile Settings",
          href: "/dashboard/profile",
          icon: <User className="h-4 w-4 mr-2" />,
        },
        {
          name: "Account Settings",
          href: "/dashboard/settings",
          icon: <Settings className="h-4 w-4 mr-2" />,
        },
      ],
    },
  ]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
        >
          <Menu className="h-4 w-4 text-zinc-400" />
          <span className="sr-only">Navigation Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-72 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl rounded-xl p-2"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-zinc-500">NAVIGATION</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuGroup>
          {navItems.map((item) => {
            if (item.submenu) {
              return (
                <DropdownMenuSub key={item.name}>
                  <DropdownMenuSubTrigger
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-sm cursor-pointer flex items-center justify-between",
                      "hover:bg-zinc-800 focus:bg-zinc-800 data-[state=open]:bg-zinc-800",
                    )}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-2 text-zinc-500" />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent
                      className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl rounded-xl p-2 min-w-[180px]"
                      sideOffset={8}
                    >
                      {item.submenu.map((subItem) => {
                        const isActive = pathname === subItem.href
                        return (
                          <DropdownMenuItem
                            key={subItem.name}
                            className={cn(
                              "px-2 py-1.5 rounded-lg text-sm cursor-pointer flex items-center justify-between",
                              isActive ? "bg-red-600/10 text-red-500" : "hover:bg-zinc-800 focus:bg-zinc-800",
                            )}
                            onClick={() => handleNavigation(subItem.href, subItem.external)}
                          >
                            <div className="flex items-center">
                              {subItem.icon}
                              <span>{subItem.name}</span>
                            </div>
                            {subItem.alert && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                            {subItem.external && <span className="text-xs text-zinc-600">↗</span>}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )
            }

            const isActive = pathname === item.href
            return (
              <DropdownMenuItem
                key={item.name}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-sm cursor-pointer",
                  isActive ? "bg-red-600/10 text-red-500" : "hover:bg-zinc-800 focus:bg-zinc-800",
                )}
                onClick={() => handleNavigation(item.href)}
              >
                <div className="flex items-center">
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-zinc-800 my-2" />
        <div className="px-3 py-2 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg border border-zinc-700/50">
          <p className="text-xs text-zinc-400 italic">
            "Success is not final, failure is not fatal: It is the courage to continue that counts."
          </p>
          <p className="text-xs text-zinc-500 mt-1">— Winston Churchill</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
