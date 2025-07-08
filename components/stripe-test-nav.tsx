"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TestTube, ExternalLink } from "lucide-react"
import Link from "next/link"

export function StripeTestNav() {
  const [isTestMode, setIsTestMode] = useState(false)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    // Check if we're in development mode
    setIsDev(process.env.NODE_ENV === "development")

    // Check Stripe test mode (this would need to be passed from server or API)
    fetch("/api/debug/stripe-config")
      .then((res) => res.json())
      .then((data) => setIsTestMode(data.isTestMode))
      .catch(() => setIsTestMode(false))
  }, [])

  // Only show in development or test environments
  if (!isDev && process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link href="/stripe-test-connect">
        <Button variant="outline" size="sm" className="shadow-lg bg-transparent">
          <TestTube className="h-4 w-4 mr-2" />
          Stripe Test Connect
          <ExternalLink className="h-4 w-4 ml-2" />
          {isTestMode && (
            <Badge variant="secondary" className="ml-2">
              Test
            </Badge>
          )}
        </Button>
      </Link>
    </div>
  )
}
