'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface BatchRefreshResults {
  processed: number
  updated: number
  errors: number
  incompleteAccountsCount: number
  incompleteAccounts: string[]
}

export default function StripeAccountsManagerPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [results, setResults] = useState<BatchRefreshResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBatchRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/stripe/batch-refresh-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh accounts')
      }

      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Stripe Accounts Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage and refresh all connected Stripe accounts
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Batch Refresh All Accounts
            </CardTitle>
            <CardDescription>
              Refresh the status of all connected Stripe accounts from the Stripe API.
              This will update charges_enabled, payouts_enabled, and details_submitted fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleBatchRefresh} 
              disabled={isRefreshing}
              className="w-full sm:w-auto"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh All Accounts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Batch Refresh Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.processed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{results.incompleteAccountsCount}</div>
                  <div className="text-sm text-muted-foreground">Incomplete</div>
                </div>
              </div>

              {results.incompleteAccounts.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Incomplete Accounts ({results.incompleteAccountsCount})
                    </h3>
                    <div className="space-y-2">
                      {results.incompleteAccounts.map((userId) => (
                        <div key={userId} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <span className="font-mono text-sm">{userId}</span>
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Needs Attention
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              About Connected Stripe Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold">Collection Structure</h4>
              <p className="text-sm text-muted-foreground">
                All connected Stripe accounts are stored in the <code>connectedStripeAccounts</code> collection,
                with each document named after the user's UID.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Automatic Updates</h4>
              <p className="text-sm text-muted-foreground">
                Accounts are automatically updated when users complete onboarding, when we check their status,
                and when Stripe sends <code>account.updated</code> webhooks.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Batch Refresh</h4>
              <p className="text-sm text-muted-foreground">
                Run the batch refresh manually or schedule it daily to keep all account statuses up to date.
                Incomplete accounts will be flagged for review.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
