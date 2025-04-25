"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function StripeSettingsPage() {
  const [priceId, setPriceId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState("")
  const { user } = useAuth()
  const router = useRouter()

  // Redirect if not logged in
  if (!user) {
    router.push("/login?redirect=/dashboard/settings/stripe")
    return null
  }

  const handleUpdatePriceId = async () => {
    if (!priceId.startsWith("price_")) {
      setMessage("Invalid price ID format. It should start with 'price_'")
      return
    }

    try {
      setIsUpdating(true)
      setMessage("")

      const response = await fetch("/api/update-env", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "STRIPE_PRICE_ID",
          value: priceId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Price ID updated successfully! Please restart the server for changes to take effect.")
        setPriceId("")
      } else {
        setMessage(`Error: ${data.error || "Failed to update price ID"}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Stripe Settings</CardTitle>
          <CardDescription>
            Update your Stripe configuration for testing purposes. Only use this in development environments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="priceId" className="text-sm font-medium">
              Test Price ID
            </label>
            <Input
              id="priceId"
              placeholder="price_xxxxxxxxxxxxxxxx"
              value={priceId}
              onChange={(e) => setPriceId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Enter the price ID from your Stripe test mode dashboard</p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md ${message.includes("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
            >
              {message}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpdatePriceId} disabled={isUpdating || !priceId} className="w-full">
            {isUpdating ? "Updating..." : "Update Price ID"}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8 max-w-md mx-auto">
        <h3 className="text-lg font-medium mb-2">How to get a test price ID:</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Log into your{" "}
            <a
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Stripe Dashboard
            </a>
          </li>
          <li>
            Make sure you're in <strong>Test Mode</strong> (toggle in upper right)
          </li>
          <li>Go to Products &gt; + Add Product</li>
          <li>Create a product with a price</li>
          <li>Copy the price ID (starts with "price_")</li>
          <li>Paste it above and click Update</li>
        </ol>
      </div>
    </div>
  )
}
