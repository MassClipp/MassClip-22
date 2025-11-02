"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Loader2 } from "lucide-react"
import { clearSecurityCookies } from "@/lib/security-utils"

interface SecurityBypassButtonProps {
  redirectTo?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function SecurityBypassButton({
  redirectTo = "/",
  variant = "default",
  size = "default",
  className = "",
}: SecurityBypassButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleBypass = () => {
    setIsLoading(true)

    // Clear security cookies
    clearSecurityCookies()

    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = redirectTo
    }, 1000)
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleBypass} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Bypassing...
        </>
      ) : (
        <>
          <ShieldCheck className="mr-2 h-4 w-4" />
          Bypass Security Check
        </>
      )}
    </Button>
  )
}
