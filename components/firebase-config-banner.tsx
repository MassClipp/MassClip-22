"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { isFirebaseConfigured, firebaseError } from "@/lib/firebase-safe"

export function FirebaseConfigBanner() {
  if (isFirebaseConfigured) {
    return null
  }

  return (
    <Alert variant="warning" className="mb-4 bg-yellow-900/20 border-yellow-900/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Firebase Configuration Notice</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{firebaseError}</p>
        <p className="text-sm">You can still explore the app, but authentication features will be limited.</p>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://console.firebase.google.com/", "_blank")}
            className="mt-2"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Setup Firebase
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
