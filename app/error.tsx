"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldAlert, RefreshCw, Home } from "lucide-react"
import { isVercelSecurityError, clearSecurityCookies } from "@/lib/security-utils"
import { SecurityBypassButton } from "@/components/security-bypass-button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isSecurityError, setIsSecurityError] = useState(false)

  useEffect(() => {
    // Check if this is likely a Vercel security error
    const errorCode = error.message.match(/code\s*(\d+)/i)?.[1]
    setIsSecurityError(isVercelSecurityError(errorCode))

    // Log the error for debugging
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSecurityError ? (
              <>
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Security Verification Failed
              </>
            ) : (
              "Something went wrong"
            )}
          </CardTitle>
          <CardDescription>
            {isSecurityError
              ? "Vercel's security system couldn't verify your browser"
              : "An unexpected error occurred while loading the page"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              {isSecurityError ? (
                <>
                  This error typically occurs due to browser privacy settings, extensions, or using incognito mode. You
                  can try bypassing the security check or switching browsers.
                </>
              ) : (
                error.message || "Unknown error occurred"
              )}
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          {isSecurityError ? (
            <>
              <SecurityBypassButton className="w-full" />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  clearSecurityCookies()
                  reset()
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear Cookies & Retry
              </Button>
            </>
          ) : (
            <>
              <Button onClick={reset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </>
          )}

          <Button variant="ghost" className="w-full" onClick={() => (window.location.href = "/")}>
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
