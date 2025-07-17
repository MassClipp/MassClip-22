"use client"

import { useEffect, useState } from "react"

interface MaintenanceCoverProps {
  /** Allow overriding via prop for tests; defaults to env var */
  isEnabled?: boolean
}

export function MaintenanceCover({ isEnabled }: MaintenanceCoverProps) {
  // Read env var on the client (NEXT_PUBLIC_ vars are bundled)
  const enabled = isEnabled ?? process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true"

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    if (enabled) {
      // lock scroll
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [enabled])

  if (!mounted || !enabled) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center px-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4">Under&nbsp;Maintenance</h1>
        <p className="text-lg sm:text-xl text-white/70">Thank you for your patience.</p>
      </div>
    </div>
  )
}
