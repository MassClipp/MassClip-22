"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react"
import { getCurrentEnvVars, expectedEnvVars } from "@/lib/env-sync"

export default function EnvSync() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({})
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState("firebase")

  useEffect(() => {
    // Get current environment variables on mount
    setEnvVars(getCurrentEnvVars())
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      // In a real app, this would call an API endpoint to sync env vars
      // For this demo, we'll simulate a sync
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update local state with current env vars
      setEnvVars(getCurrentEnvVars())

      setSyncResult({
        success: true,
        message: "Environment variables synced successfully",
      })
    } catch (error) {
      setSyncResult({
        success: false,
        message: "Failed to sync environment variables",
      })
    } finally {
      setSyncing(false)
    }
  }

  // Check if a specific category of env vars is complete
  const checkCategoryStatus = (category: "firebase" | "stripe" | "vimeo") => {
    const vars = expectedEnvVars[category]
    const missing = vars.filter((v) => !envVars[v])
    return {
      complete: missing.length === 0,
      missing,
      total: vars.length,
      set: vars.length - missing.length,
    }
  }

  const firebaseStatus = checkCategoryStatus("firebase")
  const stripeStatus = checkCategoryStatus("stripe")
  const vimeoStatus = checkCategoryStatus("vimeo")

  // Overall status
  const allComplete = firebaseStatus.complete && stripeStatus.complete && vimeoStatus.complete

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              Environment Variables
              {allComplete ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription className="text-gray-400">Manage and sync your environment variables</CardDescription>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="bg-crimson hover:bg-crimson-dark text-white">
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Variables
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {syncResult && (
          <Alert variant={syncResult.success ? "default" : "destructive"} className="mb-4">
            <AlertTitle>{syncResult.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{syncResult.message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="firebase" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-900 border-b border-gray-800 w-full justify-start rounded-none mb-4">
            <TabsTrigger value="firebase" className="text-white data-[state=active]:bg-gray-800">
              Firebase
              {firebaseStatus.complete ? (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="ml-2 h-4 w-4 text-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="stripe" className="text-white data-[state=active]:bg-gray-800">
              Stripe
              {stripeStatus.complete ? (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="ml-2 h-4 w-4 text-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="vimeo" className="text-white data-[state=active]:bg-gray-800">
              Vimeo
              {vimeoStatus.complete ? (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="ml-2 h-4 w-4 text-red-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="firebase">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Firebase Configuration</h3>
                <div className="text-sm text-gray-400">
                  {firebaseStatus.set}/{firebaseStatus.total} variables set
                </div>
              </div>

              <div className="grid gap-2">
                {expectedEnvVars.firebase.map((varName) => (
                  <div key={varName} className="flex justify-between items-center p-2 rounded-md bg-gray-900">
                    <div className="text-sm font-mono text-gray-300">{varName}</div>
                    <div className="flex items-center">
                      {envVars[varName] ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!firebaseStatus.complete && (
                <Alert variant="destructive">
                  <AlertTitle>Missing Firebase Variables</AlertTitle>
                  <AlertDescription>
                    Some Firebase environment variables are missing. Firebase authentication and database features may
                    not work correctly.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stripe">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Stripe Configuration</h3>
                <div className="text-sm text-gray-400">
                  {stripeStatus.set}/{stripeStatus.total} variables set
                </div>
              </div>

              <div className="grid gap-2">
                {expectedEnvVars.stripe.map((varName) => (
                  <div key={varName} className="flex justify-between items-center p-2 rounded-md bg-gray-900">
                    <div className="text-sm font-mono text-gray-300">{varName}</div>
                    <div className="flex items-center">
                      {envVars[varName] ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!stripeStatus.complete && (
                <Alert variant="destructive">
                  <AlertTitle>Missing Stripe Variables</AlertTitle>
                  <AlertDescription>
                    Some Stripe environment variables are missing. Payment and subscription features may not work
                    correctly.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vimeo">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Vimeo Configuration</h3>
                <div className="text-sm text-gray-400">
                  {vimeoStatus.set}/{vimeoStatus.total} variables set
                </div>
              </div>

              <div className="grid gap-2">
                {expectedEnvVars.vimeo.map((varName) => (
                  <div key={varName} className="flex justify-between items-center p-2 rounded-md bg-gray-900">
                    <div className="text-sm font-mono text-gray-300">{varName}</div>
                    <div className="flex items-center">
                      {envVars[varName] ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!vimeoStatus.complete && (
                <Alert variant="destructive">
                  <AlertTitle>Missing Vimeo Variables</AlertTitle>
                  <AlertDescription>
                    Some Vimeo environment variables are missing. Video content may not load correctly.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-gray-800 pt-4">
        <div className="text-sm text-gray-400">Last synced: {new Date().toLocaleString()}</div>
        <Button
          variant="outline"
          className="border-gray-700 text-white hover:bg-gray-800"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </CardFooter>
    </Card>
  )
}
