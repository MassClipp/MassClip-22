"use client"

import { usePathname } from "next/navigation"

const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith("/dashboard/")) {
    const page = pathname.split("/dashboard/")[1]?.split("/")[0]

    switch (page) {
      case "explore":
        return "Explore"
      case "upload":
        return "Upload"
      case "bundles":
        return "Bundles"
      case "earnings":
        return "Earnings"
      case "favorites":
        return "Favorites"
      case "upgrade":
        return "Upgrade"
      case "purchases":
        return "My Purchases"
      case "profile":
        return "Profile"
      case "vex":
        return "Vex"
      case "uploads":
        return "My Uploads"
      case "categories":
        return "Categories"
      case "ai-bundler":
        return "AI Bundler"
      case "history":
        return "History"
      case "thumbnails":
        return "Thumbnails"
      case "user":
        return "User"
      case "diagnostics":
        return "Diagnostics"
      default:
        return "Dashboard"
    }
  }

  return "Dashboard"
}

export function TopHeader() {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <div className="w-full bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-4 z-50">
      <div className="flex items-center">
        <h1 className="text-lg font-medium text-white">{pageTitle}</h1>
      </div>
    </div>
  )
}
