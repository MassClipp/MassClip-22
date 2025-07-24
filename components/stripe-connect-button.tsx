'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-firebase-auth'
import { toast } from '@/hooks/use-toast'

interface StripeConnectButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function StripeConnectButton({ onSuccess, onError }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to connect your Stripe account.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // Get ID token for authentication
      const idToken = await user.getIdToken()

      // Create Stripe connection URL
      const response = await fetch('/api/stripe/connect-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Stripe connection')
      }

      if (data.success && data.connectUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.connectUrl
      } else {
        throw new Error('No connection URL received from server')
      }
    } catch (error) {
      console.error('Stripe connection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Stripe account'
      
      toast({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive',
      })

      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading || !user}
      className="w-full"
      size="lg"
    >
      {loading ? 'Connecting...' : 'Connect with Stripe'}
    </Button>
  )
}
