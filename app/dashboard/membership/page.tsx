"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Crown, Check, Loader2, Star } from 'lucide-react'

interface SubscriptionData {
  isActive: boolean
  plan: "free" | "creator_pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: string
  subscriptionCanceledAt?: string
  subscriptionEndDate?: string
}

export default function MembershipPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const response = await fetch("/api/verify-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.uid }),
        })

        if (response.ok) {
          const data = await response.json()
          setSubscriptionData(data)
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error)
        toast({
          title: "Error",
          description: "Failed to load subscription data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptionData()
  }, [user, toast])

  const handleUpgrade = () => {
    window.open("https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04", "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  const isProUser = subscriptionData?.plan === "creator_pro" && subscriptionData?.isActive

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Membership Plans</h1>
        <p className="text-zinc-400 mt-1">Choose the plan that works best for you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Free Plan */}
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Free</CardTitle>
              {!isProUser && <Badge variant="secondary">Current Plan</Badge>}
            </div>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="text-3xl font-bold text-white">$0<span className="text-lg text-zinc-400">/month</span></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">15 downloads per month</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Maximum 2 bundles on storefront</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Limited organization features</span>
              </div>
            </div>
            {!isProUser && (
              <Button disabled className="w-full" variant="outline">
                Current Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Creator Pro Plan */}
        <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-500/50 backdrop-blur-sm relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-red-600 hover:bg-red-700 text-white">
              <Star className="h-3 w-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Creator Pro
              </CardTitle>
              {isProUser && <Badge className="bg-green-600">Current Plan</Badge>}
            </div>
            <CardDescription>For serious content creators</CardDescription>
            <div className="text-3xl font-bold text-white">$15<span className="text-lg text-zinc-400">/month</span></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Unlimited downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Unlimited bundles on storefront</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Access to all clips</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Priority support</span>
              </div>
            </div>
            {!isProUser ? (
              <Button onClick={handleUpgrade} className="w-full bg-red-600 hover:bg-red-700">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Creator Pro
              </Button>
            ) : (
              <Button disabled className="w-full" variant="outline">
                <Crown className="mr-2 h-4 w-4" />
                Current Plan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Subscription Status */}
      {subscriptionData && (
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm max-w-4xl">
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current membership details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-400">Current Plan</p>
                <p className="font-medium text-white">
                  {subscriptionData.plan === "creator_pro" ? "Creator Pro" : "Free"}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Status</p>
                <p className="font-medium text-white">
                  {subscriptionData.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              {subscriptionData.currentPeriodEnd && (
                <div>
                  <p className="text-sm text-zinc-400">Next Billing Date</p>
                  <p className="font-medium text-white">
                    {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
              {subscriptionData.subscriptionCanceledAt && (
                <div>
                  <p className="text-sm text-zinc-400">Cancellation Date</p>
                  <p className="font-medium text-yellow-400">
                    {new Date(subscriptionData.subscriptionCanceledAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            {subscriptionData.subscriptionCanceledAt && subscriptionData.subscriptionEndDate && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Your subscription is canceled and will end on{" "}
                  {new Date(subscriptionData.subscriptionEndDate).toLocaleDateString()}.
                  You'll continue to have access until then.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
