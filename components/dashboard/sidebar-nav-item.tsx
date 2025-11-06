"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href?: string
  icon: LucideIcon
  children?: NavItem[]
}

interface SidebarNavItemProps {
  item: NavItem
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  // If item has no children, render as a simple link
  if (!item.children) {
    const isActive = pathname === item.href
    const Icon = item.icon

    return (
      <Link
        href={item.href || "#"}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
          isActive ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    )
  }

  // If item has children, render as collapsible section
  const Icon = item.icon

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-zinc-400 hover:text-white hover:bg-zinc-800/50"
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{item.title}</span>
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="ml-4 space-y-1 border-l border-zinc-800 pl-3">
          {item.children.map((child, index) => {
            const isActive = pathname === child.href
            const ChildIcon = child.icon

            return (
              <Link
                key={index}
                href={child.href || "#"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                )}
              >
                <ChildIcon className="h-4 w-4" />
                <span>{child.title}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
