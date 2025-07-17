"use client"

import { useEffect, useState } from "react"

export function MaintenanceCover() {
  const [mounted, setMounted] = useState(false)
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isMaintenanceMode) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMaintenanceMode])

  // Don't render on server to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  if (!isMaintenanceMode) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543.826 3.31 2.37 2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        {/* Main message */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-6 leading-tight">Under Maintenance</h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-white/70 mb-8 font-light leading-relaxed">Thank you for your patience.</p>

        {/* Additional info */}
        <div className="text-sm sm:text-base text-white/50 space-y-2">
          <p>We're working hard to improve your experience.</p>
          <p>Please check back soon.</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center items-center mt-12 space-x-1">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}

export default MaintenanceCover
