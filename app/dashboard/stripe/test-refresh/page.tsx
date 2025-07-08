"use client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft } from "lucide-react"

export default function TestStripeRefreshPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-orange-200 bg-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">Setup Needs Completion</CardTitle>
          <CardDescription className="text-orange-700">
            Your test Stripe Connect account setup was interrupted and needs to be completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-orange-700">
            Please return to the dashboard and complete the setup process.
          </div>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
