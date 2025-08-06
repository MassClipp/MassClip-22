"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, AlertCircle, CheckCircle, CreditCard, Globe, Shield, Zap } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error parameters in URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    if (errorParam && messageParam) {
      setError(decodeURIComponent(messageParam))
      
      // Show toast notification for the error
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(messageParam),
        variant: "destructive",
      })
    }
  }, [searchParams, toast])

  const handleConnectStripe = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Stripe account.",
        variant: "destructive",
      })
      return
    }

    try {
      setConnecting(true)
      setError(null)

      // Call API to generate OAuth URL
      const response = await fetch('/api/stripe/connect/generate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          userId: user.uid,
          returnUrl: '/dashboard/earnings?onboarding=success'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate connection URL')
      }

      const { url } = await response.json()
      
      console.log('🔗 Redirecting to Stripe Connect OAuth')

      // Redirect to Stripe OAuth
      window.location.href = url

    } catch (error: any) {
      console.error('Error generating Stripe Connect URL:', error)
      setError(error.message || 'Failed to generate connection URL')
      toast({
        title: "Connection Error",
        description: error.message || "Failed to generate connection URL",
        variant: "destructive",
      })
      setConnecting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
          <p className="text-lg font-medium text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-white">Authentication Required</CardTitle>
            <CardDescription className="text-zinc-400">
              Please log in to connect your Stripe account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="p-4 bg-blue-600/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Connect Your Stripe Account</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Start accepting payments and receiving payouts by connecting your Stripe account.
            Choose to create a new account or connect an existing one.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-600 bg-red-600/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-green-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Process payments from customers worldwide</h3>
              <p className="text-sm text-zinc-400">Accept payments in multiple currencies</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-blue-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Supported in 40+ countries</h3>
              <p className="text-sm text-zinc-400">Global payment processing</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-purple-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Bank-level security and encryption</h3>
              <p className="text-sm text-zinc-400">Your data is protected</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-orange-600/10 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Automatic daily payouts to your bank</h3>
              <p className="text-sm text-zinc-400">Fast and reliable transfers</p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Account */}
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="text-center pb-4">
              <div className="p-3 bg-blue-600/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-xl text-white">Set up a new Stripe account with guided onboarding</CardTitle>
              <CardDescription className="text-zinc-400">
                Perfect for new users who don't have a Stripe account yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">Guided setup process</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">Automatic account configuration</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">Optimized for MassClip</span>
                </div>
              </div>
              
              <Button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create New Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="text-center pb-4">
              <div className="p-3 bg-green-600/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-xl text-white">Securely link your existing Stripe account via OAuth</CardTitle>
              <CardDescription className="text-zinc-400">
                Already have a Stripe account? Connect it securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">Keep existing settings</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">Secure OAuth connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">No data migration needed</span>
                </div>
              </div>
              
              <Button
                onClick={handleConnectStripe}
                disabled={connecting}
                variant="outline"
                className="w-full border-green-700 hover:bg-green-900/20 text-green-400 hover:text-green-300"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Existing Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                  Step 1
                </Badge>
                <h4 className="font-semibold text-white">Connect Account</h4>
                <p className="text-sm text-zinc-400">
                  You'll be redirected to Stripe to create or connect your account
                </p>
              </div>
              
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-600/30">
                  Step 2
                </Badge>
                <h4 className="font-semibold text-white">Complete Setup</h4>
                <p className="text-sm text-zinc-400">
                  Provide required business information and verify your identity
                </p>
              </div>
              
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-600/30">
                  Step 3
                </Badge>
                <h4 className="font-semibold text-white">Start Earning</h4>
                <p className="text-sm text-zinc-400">
                  Begin accepting payments and track your earnings in the dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
