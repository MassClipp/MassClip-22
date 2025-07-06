import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-64 mx-auto bg-gray-700" />
          <Skeleton className="h-4 w-96 mx-auto bg-gray-700" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                <Skeleton className="h-6 w-48 bg-gray-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full bg-gray-600" />
              <Skeleton className="h-10 w-full bg-gray-600" />
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                <Skeleton className="h-6 w-48 bg-gray-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full bg-gray-600" />
              <Skeleton className="h-10 w-full bg-gray-600" />
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              <Skeleton className="h-6 w-48 bg-gray-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full bg-gray-600" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
