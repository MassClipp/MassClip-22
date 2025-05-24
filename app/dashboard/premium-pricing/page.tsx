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
  const [oneTimePrice, setOneTimePrice] = useState("4.99")
  const [subscriptionPrice, setSubscriptionPrice] = useState("9.99")
  const [enablePremiumContent, setEnablePremiumContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productData, setProductData] = useState<{
    productId: string | null
    priceId: string | null
  }>({
    productId: null,
    priceId: null,
  })

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)
          setEnablePremiumContent(userData.premiumEnabled || false)

          // Set pricing model
          if (userData.paymentMode) {
            setPricingModel(userData.paymentMode === "subscription" ? "subscription" : "one-time")
          }

          // Set prices
          if (userData.premiumPrice) {
            if (userData.paymentMode === "subscription") {
              setSubscriptionPrice(userData.premiumPrice.toString())
            } else {
              setOneTimePrice(userData.premiumPrice.toString())
            }
          }

          // Set product data
          setProductData({
            productId: userData.stripeProductId || null,
            priceId: userData.stripePriceId || null,
          })
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

    setError(null)
    setSaving(true)

    try {
      // Validate prices
      const priceValue =
        pricingModel === "one-time" ? Number.parseFloat(oneTimePrice) : Number.parseFloat(subscriptionPrice)

      if (isNaN(priceValue) || priceValue < 0.99 || priceValue > 99.99) {
        setError("Price must be between $0.99 and $99.99")
        setSaving(false)
        return
      }

      // Get ID token for authentication
      const idToken = await user.getIdToken()

      // Create request data
      const requestData = {
        creatorId: user.uid,
        displayName: user.displayName || "Creator",
        priceInDollars: priceValue,
        mode: pricingModel,
        enablePremium: enablePremiumContent,
      }

      // Call the API to create or update Stripe product
      const response = await fetch("/api/create-stripe-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save premium pricing settings")
      }

      const data = await response.json()

      // Update product data state
      if (data.productId && data.priceId) {
        setProductData({
          productId: data.productId,
          priceId: data.priceId,
        })
      }

      // Show success message
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      toast({
        title: enablePremiumContent ? "Premium content enabled" : "Premium content disabled",
        description: enablePremiumContent
          ? "Your premium content settings have been saved."
          : "Premium content has been disabled.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving pricing settings:", error)
      setError(error instanceof Error ? error.message : "Failed to save settings. Please try again.")
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

          {productData.productId && productData.priceId && enablePremiumContent && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-400">Stripe Product Active</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your premium content is ready to be purchased by your audience.
                  </p>
                </div>
              </div>
            </div>
          )}
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
          <Tabs
            defaultValue={pricingModel}
            onValueChange={(value) => setPricingModel(value as "one-time" | "subscription")}
          >
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
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </span>
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
