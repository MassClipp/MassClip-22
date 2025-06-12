"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Monitor } from "lucide-react"

export function ClientEnvChecker() {
  // Client-side can only access NEXT_PUBLIC_ variables
  const clientEnvVars = {
    // Firebase Client Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,

    // Site URLs
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_SITE_URL_2: process.env.NEXT_PUBLIC_SITE_URL_2,
  }

  // Test accessing a private variable (should be undefined)
  const privateVarTest = process.env.STRIPE_SECRET_KEY

  const getStatusIcon = (value: string | undefined) => {
    return value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (value: string | undefined) => {
    return value ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Accessible
      </Badge>
    ) : (
      <Badge variant="destructive">Not Accessible</Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Client-Side Environment Variables
        </CardTitle>
        <CardDescription>Variables accessible in the browser (NEXT_PUBLIC_ prefix required)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Object.entries(clientEnvVars).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(value)}
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{key}</code>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(value)}
                {value && <code className="text-xs text-gray-600 max-w-xs truncate">{value}</code>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Security Test</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm">Attempting to access private variable (STRIPE_SECRET_KEY):</span>
            <div className="flex items-center gap-2">
              {privateVarTest ? (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="destructive">SECURITY ISSUE</Badge>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Properly Protected
                  </Badge>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-yellow-700 mt-2">Private variables should NOT be accessible on the client-side</p>
        </div>
      </CardContent>
    </Card>
  )
}
