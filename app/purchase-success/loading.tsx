import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">🎉 Purchase Complete!</h2>
          <p className="text-gray-600 mb-4">Verifying your authentication...</p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-1">What's happening:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Payment completed successfully</li>
              <li>🔐 Checking your login status</li>
              <li>🚀 Preparing immediate access</li>
              <li>📝 Setting up your purchase</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
