"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"

export default function EnvChecker() {
  const [missingVars, setMissingVars] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only run in the browser
    const checkEnvVars = () => {
      const requiredVars = [
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        "NEXT_PUBLIC_SITE_URL",
      ]

      const missing = requiredVars.filter((varName) => !process.env[varName])

      setMissingVars(missing)
      setIsLoading(false)
    }

    checkEnvVars()
  }, [])

  if (isLoading) return null

  if (missingVars.length === 0) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>Missing Environment Variables</AlertTitle>
      <AlertDescription>
        <p>The following environment variables are missing:</p>
        <ul className="list-disc pl-5 mt-2">
          {missingVars.map((varName) => (
            <li key={varName}>{varName}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
