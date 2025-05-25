"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { checkStripeEnvVars, getStripeEnvInstructions } from "@/lib/env-checker"

export default function EnvChecker() {
  const [showDetails, setShowDetails] = useState(false)
  const [envStatus, setEnvStatus] = useState<ReturnType<typeof checkStripeEnvVars> | null>(null)

  useEffect(() => {
    // Only run on the client side
    setEnvStatus(checkStripeEnvVars())
  }, [])

  if (!envStatus) return null

  if (envStatus.valid) return null

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTitle>Environment Configuration Issue</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Some required environment variables for Stripe checkout are missing or invalid.</p>

        <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)} className="mb-2">
          {showDetails ? "Hide Details" : "Show Details"}
        </Button>

        {showDetails && (
          <div className="mt-2 p-3 bg-black/20 rounded-md text-sm">
            <h4 className="font-medium mb-2">Missing or Invalid Variables:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {[...envStatus.missing, ...envStatus.invalid].map((varName) => (
                <li key={varName}>
                  <strong>{varName}:</strong> {getStripeEnvInstructions(varName)}
                </li>
              ))}
            </ul>

            <div className="mt-4 p-2 bg-black/20 rounded border border-red-900/30">
              <p className="text-xs">
                Add these variables to your <code>.env.local</code> file in the project root.
              </p>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
