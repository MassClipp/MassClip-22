"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export default function SubscriptionSuccessPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("Processing your subscription...")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Get the session ID from the URL
  const sessionId = searchParams?.get("session_id")

  useEffect(() => {
    // If no session ID, redirect to dashboard
    if (!sessionId) {
      router.push("/dashboard")
      return
    }

    // If user is not logged in, wait for auth to initialize
    if (!user) {
      return
    }

    // Check the subscription status
    const checkSubscription = async () => {
      try {
        // Call an API to verify the subscription status
        const response = await fetch(`/api/verify-subscription?sessionId=${sessionId}`)

        if (response.ok) {
          setMessage("Your subscription has been activated successfully!")
        } else {
          setMessage("There was an issue activating your subscription. Please contact support.")
        }
      } catch (error) {
        console.error("Error checking subscription:", error)
        setMessage("There was an error processing your subscription. Please contact support.")
      } finally {
        setIsLoading(false)
      }
    }

    checkSubscription()
  }, [sessionId, user, router])

  return (
    <div className="container mx-auto py-20 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Subscription Successful</CardTitle>
          <CardDescription>Thank you for your subscription!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            {isLoading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p>{message}</p>
              </div>
            ) : (
              <p className="text-lg">{message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/dashboard")} disabled={isLoading}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
