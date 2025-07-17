"use client"

/**
 * Full-screen maintenance overlay.
 * Rendered only when NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
 */

import { useEffect } from "react"

export function MaintenanceCover() {
  // Prevent body scroll while the cover is shown
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  /** Util to read the public env var _once_ during render */
  const maintenanceEnabled =
    typeof process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== "undefined" &&
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE?.toLowerCase() === "true"

  if (!maintenanceEnabled) return null

  return (
    <div
      className={
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center " + "bg-neutral-100 dark:bg-neutral-900"
      }
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 text-center">
        {"Under Maintenance"}
      </h1>
      <p className="mt-4 text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 text-center">
        {"Thank you for your patience."}
      </p>
    </div>
  )
}

export default MaintenanceCover
