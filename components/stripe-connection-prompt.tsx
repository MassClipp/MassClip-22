'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, Globe, Shield, ExternalLink, CreditCard } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StripeConnectionPromptProps {
  onConnect?: () => void
}

export function StripeConnectionPrompt({ onConnect }: StripeConnectionPromptProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create onboarding link')
      }

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No onboarding URL received')
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error)
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to Stripe. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const benefits = [
    {
      icon: DollarSign,
      title: 'Accept Payments',
      description: 'Process payments from customers worldwide',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Supported in 40+ countries',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Bank-level security and encryption',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Connect Your Stripe Account</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          Start accepting payments and earning money from your premium content by connecting your Stripe account.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {benefits.map((benefit, index) => (
          <Card key={index} className="text-center p-4 sm:p-6">
            <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <benefit.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base sm:text-lg">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Options */}
      <div className="space-y-4 sm:space-y-6">
        <Card className="p-4 sm:p-6">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Connect Your Stripe Account</CardTitle>
            <CardDescription className="text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Securely connect your Stripe account through Stripe Connect. If you don't have an account, Stripe will help you create one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {isConnecting ? (
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-4 h-4 rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Connect with Stripe</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              )}
            </Button>
            
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="text-xs">
                Powered by Stripe Connect
              </Badge>
              <p className="text-xs text-muted-foreground">
                Your financial information is handled securely by Stripe
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Need help? Contact our support team for assistance with Stripe setup.
        </p>
      </div>
    </div>
  )
}
