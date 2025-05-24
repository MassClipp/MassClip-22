"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, DollarSign, CreditCard, CalendarClock, Save, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

export default function PremiumPricingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [pricingModel, setPricingModel] = useState<"one-time" | "subscription">("one-time")
  const [oneTimePrice, setOneTimePrice] = useState("")
  const [subscriptionPrice, setSubscriptionPrice] = useState("")
  const [enablePremiumContent, setEnablePremiumContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)
          setDisplayName(userData.displayName || "")

          // Set pricing data
          setEnablePremiumContent(userData.premiumEnabled || false)
          setPricingModel(userData.paymentMode || "one-time")

          if (userData.premiumPrice) {
            if (userData.paymentMode === "subscription") {
              setSubscriptionPrice(userData.premiumPrice.toString())
              setOneTimePrice("4.99") // Default value
            } else {
              setOneTimePrice(userData.premiumPrice.toString())
              setSubscriptionPrice("9.99") // Default value
            }
          } else {
            setOneTimePrice("4.99")
            setSubscriptionPrice("9.99")
          }
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setError(null)

    try {
      // Validate prices
      const priceToUse = pricingModel === "one-time" ? oneTimePrice : subscriptionPrice
      const priceNum = Number.parseFloat(priceToUse)

      if (isNaN(priceNum) || priceNum < 0.99 || priceNum > 99.99) {
        setError(`Price must be between $0.99 and $99.99`)
        setSaving(false)
        return
      }

      // Get the user's ID token for authentication
      const idToken = await user.getIdToken()

      // Call the API to create or update the Stripe product and price
      const response = await fetch("/api/create-stripe-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          creatorId: user.uid,
          displayName: displayName,
          priceInDollars: priceNum,
          mode: pricingModel,
          enablePremium: enablePremiumContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save premium pricing settings")
      }

      const data = await response.json()

      if (data.success) {
        setSaveSuccess(true)
        toast({
          title: enablePremiumContent ? "Premium content enabled" : "Settings updated",
          description: enablePremiumContent
            ? "Your content is now monetized. Fans can purchase access to your premium content."
            : "Premium content has been disabled.",
          variant: "default",
        })
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error: any) {
      console.error("Error saving pricing settings:", error)
      setError(error.message || "Failed to save settings. Please try again.")
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-6">Premium Content Pricing</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stripeConnected) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-6">Premium Content Pricing</h1>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Stripe Account Required</AlertTitle>
          <AlertDescription>
            You need to connect your Stripe account before you can set up premium content pricing. Please go to the
            Earnings section to complete your Stripe onboarding.
          </AlertDescription>
        </Alert>
        <Button onClick={() => (window.location.href = "/dashboard/earnings")}>Go to Earnings</Button>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">Premium Content Pricing</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enable Premium Content</CardTitle>
          <CardDescription>
            Toggle this option to enable or disable premium content features for your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch id="enable-premium" checked={enablePremiumContent} onCheckedChange={setEnablePremiumContent} />
            <Label htmlFor="enable-premium">
              {enablePremiumContent ? "Premium content enabled" : "Premium content disabled"}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Premium Content Pricing</CardTitle>
          <CardDescription>
            Set your pricing model and rates for premium content. You can offer one-time purchases or monthly
            subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={pricingModel} onValueChange={(value) => setPricingModel(value as "one-time" | "subscription")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="one-time" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>One-Time Payment</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                <span>Monthly Subscription</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="one-time">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="one-time-price">One-Time Payment Price ($)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="one-time-price"
                      type="number"
                      min="0.99"
                      step="0.01"
                      placeholder="9.99"
                      className="pl-9"
                      value={oneTimePrice}
                      onChange={(e) => setOneTimePrice(e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    This is the amount customers will pay once to access your premium content.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="subscription">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subscription-price">Monthly Subscription Price ($)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="subscription-price"
                      type="number"
                      min="0.99"
                      step="0.01"
                      placeholder="4.99"
                      className="pl-9"
                      value={subscriptionPrice}
                      onChange={(e) => setSubscriptionPrice(e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    This is the amount customers will pay monthly to access your premium content.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-gray-500">Platform fee: 10% of each transaction</p>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
