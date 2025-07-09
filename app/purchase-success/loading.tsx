import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function PurchaseSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Processing Your Purchase</h2>
          <p className="text-gray-600 mb-4">Setting up your access to the content...</p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-1">Please wait:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Confirming your purchase completion</li>
              <li>• Setting up instant content access</li>
              <li>• Recording your purchase history</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
