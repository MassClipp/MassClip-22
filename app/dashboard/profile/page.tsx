"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { User, Camera, ExternalLink, CreditCard, Crown, Calendar, DollarSign, CheckCircle, XCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'

interface UserProfile {
  displayName: string
  username: string
  bio: string
  profilePicture?: string
  stripeCustomerId?: string
  plan?: string
  subscriptionStatus?: string
  subscriptionEndDate?: string
  nextBillingDate?: string
}

interface SubscriptionData {
  id: string
  status: string
  current_period_end: number
  cancel_at_period_end: boolean
  plan: {
    id: string
    nickname: string
    amount: number
    currency: string
    interval: string
  }
}

export default function ProfilePage() {
  const [user, loading, error] = useAuthState(auth)
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    username: '',
    bio: '',
  })
  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    displayName: '',
    username: '',
    bio: '',
  })
  const [saving, setSaving] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [canceling, setCanceling] = useState(false)

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) return

      try {
        setLoadingProfile(true)
        const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid))
        
        if (profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile
          setProfile(data)
          setOriginalProfile(data)
        } else {
          // Set defaults from Firebase Auth
          const defaultProfile = {
            displayName: user.displayName || '',
            username: user.email?.split('@')[0] || '',
            bio: '',
          }
          setProfile(defaultProfile)
          setOriginalProfile(defaultProfile)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoadingProfile(false)
      }
    }

    if (user) {
      loadProfile()
    }
  }, [user])

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.uid) return

      try {
        setLoadingSubscription(true)
        const idToken = await user.getIdToken()
        const response = await fetch('/api/verify-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ userId: user.uid }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.subscription) {
            setSubscription(data.subscription)
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error)
      } finally {
        setLoadingSubscription(false)
      }
    }

    if (user) {
      loadSubscription()
    }
  }, [user])

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setSaving(true)
      await updateDoc(doc(db, 'userProfiles', user.uid), profile)
      setOriginalProfile(profile)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setProfile(originalProfile)
  }

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile)

  const handleCancelSubscription = async () => {
    if (!user?.uid || !subscription) return

    try {
      setCanceling(true)
      const idToken = await user.getIdToken()
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          userId: user.uid,
          subscriptionId: subscription.id 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Subscription canceled successfully')
        // Update subscription state
        setSubscription({
          ...subscription,
          cancel_at_period_end: true
        })
      } else {
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Failed to cancel subscription')
    } finally {
      setCanceling(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentPlan = subscription?.status === 'active' ? 'Creator Pro' : 'Free'
  const isProUser = subscription?.status === 'active'

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-gray-400">Manage your creator profile and settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="membership" className="data-[state=active]:bg-gray-700">
            <CreditCard className="h-4 w-4 mr-2" />
            Membership
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Information</CardTitle>
                <CardDescription>Update your profile details and social links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.profilePicture || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-700 text-white text-2xl">
                      {profile.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-700">
                    <Camera className="h-4 w-4 mr-2" />
                    Click to change profile picture
                  </Button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Your display name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="username" className="text-gray-300">Username</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Your username"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      This will be your profile URL: massclip.pro/creator/{profile.username}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                      placeholder="Tell viewers about yourself"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {hasChanges && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="border-gray-600 text-gray-400 hover:bg-gray-700">
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Preview */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Preview</CardTitle>
                <CardDescription>How others will see your profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarImage src={profile.profilePicture || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-700 text-white text-xl">
                      {profile.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {profile.displayName || 'Your Name'}
                  </h3>
                  <p className="text-gray-400 mb-4">@{profile.username || 'username'}</p>
                  {profile.bio && (
                    <p className="text-gray-300 text-sm">{profile.bio}</p>
                  )}
                </div>

                <Separator className="bg-gray-700" />

                <Button variant="outline" className="w-full border-gray-600 text-gray-400 hover:bg-gray-700">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="membership" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Subscription */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Current Plan
                </CardTitle>
                <CardDescription>Your subscription status and details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSubscription ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Plan</span>
                      <Badge 
                        variant={isProUser ? "default" : "secondary"}
                        className={isProUser ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/50" : "bg-gray-600/20 text-gray-400 border-gray-600/50"}
                      >
                        {currentPlan}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <div className="flex items-center gap-2">
                        {subscription?.status === 'active' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-400">Active</span>
                          </>
                        ) : subscription?.cancel_at_period_end ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            <span className="text-yellow-400">Canceled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400">Inactive</span>
                          </>
                        )}
                      </div>
                    </div>

                    {subscription && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Price</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(subscription.plan.amount, subscription.plan.currency)} / {subscription.plan.interval}
                          </span>
                        </div>

                        {subscription.cancel_at_period_end ? (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Access ends</span>
                            <span className="text-yellow-400">
                              {formatDate(subscription.current_period_end)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Next billing</span>
                            <span className="text-white">
                              {formatDate(subscription.current_period_end)}
                            </span>
                          </div>
                        )}

                        {profile.stripeCustomerId && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Customer ID</span>
                            <span className="text-gray-500 text-sm font-mono">
                              {profile.stripeCustomerId}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <Separator className="bg-gray-700" />

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {subscription?.status === 'active' && !subscription.cancel_at_period_end ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Subscription
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-800 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Cancel Subscription</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to cancel your Creator Pro subscription? You'll continue to have access until {formatDate(subscription.current_period_end)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                                Keep Subscription
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleCancelSubscription}
                                disabled={canceling}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {canceling ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Canceling...
                                  </>
                                ) : (
                                  'Cancel Subscription'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : !isProUser ? (
                        <Button 
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
                          onClick={() => window.open('https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04', '_blank')}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade to Creator Pro
                        </Button>
                      ) : subscription?.cancel_at_period_end ? (
                        <div className="text-center p-4 bg-yellow-600/10 border border-yellow-600/20 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                          <p className="text-yellow-400 text-sm">
                            Your subscription is canceled and will end on {formatDate(subscription.current_period_end)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Plan Features */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Plan Features</CardTitle>
                <CardDescription>What's included in your current plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-gray-300">Upload and share content</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-gray-300">Basic analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-gray-300">Community access</span>
                  </div>
                  
                  {isProUser ? (
                    <>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-yellow-400" />
                        <span className="text-white font-medium">Accept payments</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-yellow-400" />
                        <span className="text-white font-medium">Advanced analytics</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-yellow-400" />
                        <span className="text-white font-medium">Priority support</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-yellow-400" />
                        <span className="text-white font-medium">Custom branding</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-500">Accept payments</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-500">Advanced analytics</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-500">Priority support</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-500">Custom branding</span>
                      </div>
                    </>
                  )}
                </div>

                {!isProUser && (
                  <>
                    <Separator className="bg-gray-700" />
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-3">
                        Upgrade to Creator Pro for $15/month
                      </p>
                      <Button 
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
                        onClick={() => window.open('https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04', '_blank')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
