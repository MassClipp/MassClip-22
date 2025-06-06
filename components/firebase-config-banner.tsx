"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { isFirebaseConfigured, firebaseError } from "@/lib/firebase-safe"

export function FirebaseConfigBanner() {
  if (isFirebaseConfigured) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Firebase not configured: {firebaseError}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("https://console.firebase.google.com/", "_blank")}
          className="ml-4"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Setup Firebase
        </Button>
      </AlertDescription>
    </Alert>
  )
}
