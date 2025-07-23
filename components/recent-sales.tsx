"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  created: number
  customer: string | null
  description: string | null
  status: string
}

interface RecentSalesProps {
  transactions: Transaction[]
  loading?: boolean
}

export function RecentSales({ transactions, loading }: RecentSalesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Sales
          </CardTitle>
          <CardDescription>Latest transaction activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Sales
          </CardTitle>
          <CardDescription>Latest transaction activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No recent sales to display</p>
            <p className="text-sm text-gray-400 mt-1">Sales will appear here once you start making money</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100)
    } catch (error) {
      return `$${(amount / 100).toFixed(2)}`
    }
  }

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Invalid date"
    }
  }

  const getCustomerName = (customer: string | null, description: string | null) => {
    if (customer && typeof customer === "string" && customer.length > 0) {
      // Safely get first character
      const firstChar = customer.charAt ? customer.charAt(0).toUpperCase() : customer[0]?.toUpperCase() || "?"
      return {
        name: customer,
        initials: firstChar,
      }
    }

    if (description && typeof description === "string" && description.length > 0) {
      const firstChar = description.charAt ? description.charAt(0).toUpperCase() : description[0]?.toUpperCase() || "?"
      return {
        name: description,
        initials: firstChar,
      }
    }

    return {
      name: "Anonymous Customer",
      initials: "A",
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Recent Sales
        </CardTitle>
        <CardDescription>Latest transaction activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((transaction) => {
            const customer = getCustomerName(transaction.customer, transaction.description)

            return (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{customer.initials}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{customer.name}</p>
                    <p className="text-xs text-gray-500">{formatDate(transaction.created)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(transaction.amount, transaction.currency)}</p>
                  <p className="text-xs text-gray-500 capitalize">{transaction.status}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
