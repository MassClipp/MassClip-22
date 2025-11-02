"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"

interface Sale {
  id: string
  productBoxTitle: string
  buyerEmail: string
  amount: number
  currency: string
  createdAt: Date
  buyerName?: string
  buyerAvatar?: string
}

interface RecentSalesProps {
  sales: Sale[]
  isLoading?: boolean
}

export function RecentSales({ sales, isLoading }: RecentSalesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!sales || sales.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No recent sales</p>
            <p className="text-sm">Sales will appear here once you start selling</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="flex items-center space-x-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={sale.buyerAvatar || "/placeholder.svg"} alt={sale.buyerName || sale.buyerEmail} />
                <AvatarFallback>{(sale.buyerName || sale.buyerEmail).charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">{sale.buyerName || sale.buyerEmail}</p>
                <p className="text-xs text-muted-foreground truncate">{sale.productBoxTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(sale.createdAt, { addSuffix: true })}
                </p>
              </div>
              <div className="text-sm font-medium">${(sale.amount / 100).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
