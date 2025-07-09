import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function PurchaseSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Processing Purchase...</h2>
          <p className="text-gray-600">Setting up your access to the content.</p>
        </CardContent>
      </Card>
    </div>
  )
}
