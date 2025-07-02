"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Compass,
  ShoppingBag,
  Heart,
  Crown,
  Film,
  Upload,
  Package,
  DollarSign,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface RawNavSectionItem {
  title: string
  url: string
  icon?: React.ReactNode
  external?: boolean
  alert?: boolean
}

interface RawNavSection {
  title: string
  url: string | "#"
  items: RawNavSectionItem[]
}

/* -------------------------------------------------------------------------- */
/*                              NAV DATA (static)                             */
/* -------------------------------------------------------------------------- */

const NAV: RawNavSection[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Explore",
    url: "#",
    items: [
      {
        title: "Discover Content",
        url: "/dashboard/explore",
        icon: <Compass className="h-4 w-4 mr-2" />,
      },
      {
        title: "My Purchases",
        url: "/dashboard/purchases",
        icon: <ShoppingBag className="h-4 w-4 mr-2" />,
      },
      {
        title: "Favorites",
        url: "/dashboard/favorites",
        icon: <Heart className="h-4 w-4 mr-2" />,
      },
      {
        title: "Memberships",
        url: "/dashboard/membership",
        icon: <Crown className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Content Management",
    url: "#",
    items: [
      {
        title: "Free Content",
        url: "/dashboard/free-content",
        icon: <Film className="h-4 w-4 mr-2" />,
      },
      {
        title: "Upload Content",
        url: "/dashboard/upload",
        icon: <Upload className="h-4 w-4 mr-2" />,
      },
      {
        title: "Product Boxes",
        url: "/dashboard/product-boxes",
        icon: <Package className="h-4 w-4 mr-2" />,
      },
      {
        title: "Bundles",
        url: "/dashboard/bundles",
        icon: <Package className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Business",
    url: "#",
    items: [
      {
        title: "Earnings",
        url: "/dashboard/earnings",
        icon: <DollarSign className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Settings",
    url: "#",
    items: [
      {
        title: "Profile Settings",
        url: "/dashboard/profile",
        icon: <User className="h-4 w-4 mr-2" />,
      },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

function NavDropdown() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const go = (href: string, external = false) => {
    setOpen(false)
    if (external) {
      window.open(href, "_blank")
    } else {
      router.push(href)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
        >
          <Menu className="h-4 w-4 text-zinc-400" />
          <span className="sr-only">Navigation</span>
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
          {NAV.map((section) => {
            const firstIcon = section.items[0]?.icon
            const hasSubmenu = section.url === "#"
            if (hasSubmenu) {
              return (
                <DropdownMenuSub key={section.title}>
                  <DropdownMenuSubTrigger
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-sm cursor-pointer flex items-center justify-between",
                      "hover:bg-zinc-800 data-[state=open]:bg-zinc-800",
                    )}
                  >
                    <span className="flex items-center">
                      {firstIcon}
                      {section.title}
                    </span>
                    {open ? (
                      <ChevronDown className="h-4 w-4 ml-1 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-1 text-zinc-500" />
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent
                      className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl rounded-xl p-2 min-w-[180px]"
                      sideOffset={8}
                    >
                      {section.items.map((item) => {
                        const active = pathname === item.url
                        return (
                          <DropdownMenuItem
                            key={item.title}
                            onClick={() => go(item.url, item.external)}
                            className={cn(
                              "px-2 py-1.5 rounded-lg text-sm cursor-pointer flex items-center justify-between",
                              active ? "bg-red-600/10 text-red-500" : "hover:bg-zinc-800 focus:bg-zinc-800",
                            )}
                          >
                            <div className="flex items-center">
                              {item.icon}
                              <span>{item.title}</span>
                            </div>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )
            }

            // no submenu
            const active = pathname === section.url
            return (
              <DropdownMenuItem
                key={section.title}
                onClick={() => go(section.url)}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-sm cursor-pointer flex items-center",
                  active ? "bg-red-600/10 text-red-500" : "hover:bg-zinc-800 focus:bg-zinc-800",
                )}
              >
                {firstIcon}
                <span>{section.title}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavDropdown
