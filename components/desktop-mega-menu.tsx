"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  Flame,
  Clock,
  Bookmark,
  Upload,
  User,
  History,
  Laugh,
  Dumbbell,
  Tv,
  Menu,
  HelpCircle,
} from "lucide-react"

export default function DesktopMegaMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Niche categories with icons - updated to match the specified niches
  const niches = [
    { name: "Motivation", icon: <Flame className="w-4 h-4 text-crimson" />, path: "/category/motivation" },
    { name: "Memes", icon: <Laugh className="w-4 h-4 text-crimson" />, path: "/category/memes" },
    { name: "Sports", icon: <Dumbbell className="w-4 h-4 text-crimson" />, path: "/category/sports" },
    { name: "Streamer Clips", icon: <Tv className="w-4 h-4 text-crimson" />, path: "/category/streamer-clips" },
    { name: "Funny", icon: <Laugh className="w-4 h-4 text-crimson" />, path: "/category/funny" },
    { name: "Other", icon: <HelpCircle className="w-4 h-4 text-crimson" />, path: "/category/other" },
  ]

  // User features
  const userFeatures = [
    { name: "Recently Added", icon: <Clock className="w-4 h-4 text-zinc-400" />, path: "/category/recently-added" },
    { name: "My Favorites", icon: <Bookmark className="w-4 h-4 text-zinc-400" />, path: "/dashboard/favorites" },
    { name: "My Uploads", icon: <Upload className="w-4 h-4 text-zinc-400" />, path: "/dashboard/uploads" },
    { name: "History", icon: <History className="w-4 h-4 text-zinc-400" />, path: "/dashboard/history" },
    { name: "Your Account", icon: <User className="w-4 h-4 text-zinc-400" />, path: "/dashboard/user" },
  ]

  return (
    <div className="relative hidden md:block" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors py-2 px-3 rounded-md hover:bg-white/5"
      >
        <Menu className="w-4 h-4" />
        <span className="text-sm font-medium">Browse</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Mega Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[550px] bg-zinc-900 border border-zinc-800 shadow-xl rounded-md overflow-hidden z-50">
          <div className="grid grid-cols-2 gap-0">
            {/* Niches Column */}
            <div className="p-4 border-r border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">Niches</h3>
              <div className="space-y-1">
                {niches.map((niche) => (
                  <Link
                    key={niche.name}
                    href={niche.path}
                    className="flex items-center gap-3 p-2 text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {niche.icon}
                    <span className="text-sm">{niche.name}</span>
                  </Link>
                ))}
                <Link
                  href="/dashboard/categories"
                  className="flex items-center justify-between gap-3 p-2 mt-2 text-crimson hover:text-crimson/90 hover:bg-white/5 rounded-md transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-sm font-medium">View All Categories</span>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </Link>
              </div>
            </div>

            {/* User Features Column */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">Your Content</h3>
              <div className="space-y-1">
                {userFeatures.map((feature) => (
                  <Link
                    key={feature.name}
                    href={feature.path}
                    className="flex items-center gap-3 p-2 text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {feature.icon}
                    <span className="text-sm">{feature.name}</span>
                  </Link>
                ))}
              </div>

              {/* Upload Button */}
              <div className="mt-6 px-2">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push("/dashboard/upload")
                  }}
                  className="w-full py-2.5 bg-crimson hover:bg-crimson-dark text-white text-sm font-medium rounded-md transition-colors"
                >
                  Upload New Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
