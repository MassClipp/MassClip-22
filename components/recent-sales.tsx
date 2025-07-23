"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Calendar, User, CreditCard } from "lucide-react"

interface Sale {
  id: string
  amount: number
  currency: string
  created: number
  description?: string
  customer?: {
    name?: string
    email?: string
  }
}

interface RecentSalesProps {
  sales: Sale[]
  isLoading?: boolean
}

function getDisplayName(sale: Sale): string {
  if (sale.customer?.name) {
    return sale.customer.name
  }
  if (sale.customer?.email) {
    return sale.customer.email
  }
  return "Anonymous Customer"
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch (error) {
    return "Unknown date"
  }
}

function formatCurrency(amount: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100) // Stripe amounts are in cents
  } catch (error) {
    return `$${(amount / 100).toFixed(2)}`
  }
}

export function RecentSales({ sales, isLoading = false }: RecentSalesProps) {
  if (isLoading) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800/50 rounded-lg">
              <DollarSign className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Recent Sales</CardTitle>
              <CardDescription className="text-zinc-400">Latest transaction activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-zinc-700" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-zinc-700" />
                  <Skeleton className="h-3 w-24 bg-zinc-700" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 bg-zinc-700" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Recent Sales</CardTitle>
            <CardDescription className="text-zinc-400">Latest transaction activity</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="h-12 w-12 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No recent sales to display</h3>
            <p className="text-zinc-400 text-sm mb-6">Sales will appear here once you start making money</p>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
              Start selling to see activity
            </Badge>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.slice(0, 10).map((sale) => {
              const displayName = getDisplayName(sale)
              const initials = displayName.charAt(0).toUpperCase()

              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{initials}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm">{displayName}</p>
                        {sale.customer?.email && (
                          <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 text-xs">
                            <User className="h-3 w-3 mr-1" />
                            Customer
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(sale.created)}
                        </div>
                        {sale.description && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            <span className="truncate max-w-32">{sale.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400 text-lg">{formatCurrency(sale.amount, sale.currency)}</p>
                    <p className="text-xs text-zinc-500">{sale.currency.toUpperCase()}</p>
                  </div>
                </div>
              )
            })}

            {sales.length > 10 && (
              <div className="text-center pt-4">
                <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                  +{sales.length - 10} more transactions
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
