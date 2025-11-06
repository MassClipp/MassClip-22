"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LocationTester() {
  const [locationInfo, setLocationInfo] = useState<string>("Not checked yet")
  const [isLoading, setIsLoading] = useState(false)

  const checkLocation = () => {
    setIsLoading(true)

    try {
      // Safe to use location here because this is a client component
      const info = {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        host: window.location.host,
      }

      setLocationInfo(JSON.stringify(info, null, 2))
    } catch (error) {
      setLocationInfo(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Only run in browser
  useEffect(() => {
    // This is safe because useEffect only runs in the browser
    checkLocation()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">{locationInfo}</pre>
        <Button onClick={checkLocation} disabled={isLoading} className="mt-4">
          {isLoading ? "Checking..." : "Check Location"}
        </Button>
      </CardContent>
    </Card>
  )
}
