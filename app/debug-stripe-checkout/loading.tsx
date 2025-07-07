import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CreditCard, Settings, User, Package } from "lucide-react"

export default function DebugStripeCheckoutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-9 w-32 bg-gray-700" />
          <div>
            <Skeleton className="h-8 w-64 bg-gray-700 mb-2" />
            <Skeleton className="h-4 w-48 bg-gray-600" />
          </div>
        </div>

        {/* User Status */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Authentication Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full bg-gray-600" />
              <Skeleton className="h-4 w-48 bg-gray-600" />
            </div>
          </CardContent>
        </Card>

        {/* Debug Input */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Debug Stripe Checkout</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full bg-gray-700" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 bg-gray-700" />
              <Skeleton className="h-10 flex-1 bg-gray-700" />
            </div>
          </CardContent>
        </Card>

        {/* Loading Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-white">Loading Debug Results...</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-3/4 bg-gray-700" />
              <Skeleton className="h-20 w-full bg-gray-700" />
              <Skeleton className="h-4 w-1/2 bg-gray-600" />
              <Skeleton className="h-4 w-2/3 bg-gray-600" />
            </CardContent>
          </Card>

          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-400" />
                <CardTitle className="text-white">Bundle Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full bg-gray-700" />
              <Skeleton className="h-4 w-3/4 bg-gray-600" />
              <Skeleton className="h-4 w-1/2 bg-gray-600" />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 bg-gray-700" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
