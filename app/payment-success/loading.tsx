import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Loading Payment Verification</h2>
          <p className="text-gray-600 mb-4">Please wait while we prepare your payment verification page...</p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">We're setting up the verification process for your purchase.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
