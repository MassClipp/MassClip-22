import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Clock } from "lucide-react"

interface Sale {
  id: string
  amount: number
  description: string
  created: Date
  status: string
  currency: string
}

interface RecentSalesProps {
  sales: Sale[]
  isLoading?: boolean
}

export function RecentSales({ sales = [], isLoading = false }: RecentSalesProps) {
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
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
      <CardContent className="space-y-4">
        {sales.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 bg-zinc-800/50 rounded-xl w-fit mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="text-zinc-400 text-sm">No recent sales to display</p>
            <p className="text-zinc-500 text-xs mt-1">Sales will appear here once you start making money</p>
          </div>
        ) : (
          sales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="flex items-center gap-4 p-3 bg-zinc-800/30 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-zinc-700 text-zinc-300">${sale.amount.toFixed(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{sale.description || "Payment received"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  <p className="text-xs text-zinc-400">{sale.created.toLocaleDateString()}</p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      sale.status === "succeeded"
                        ? "bg-green-900/50 text-green-300 border-green-700/50"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    {sale.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">+${sale.amount.toFixed(2)}</p>
                <p className="text-xs text-zinc-400 uppercase">{sale.currency}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
