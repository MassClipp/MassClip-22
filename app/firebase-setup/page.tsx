"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, Copy, ExternalLink } from "lucide-react"

export default function FirebaseSetupPage() {
  const [formData, setFormData] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
  })

  const [copied, setCopied] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const generateEnvFile = () => {
    return `# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${formData.apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${formData.authDomain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${formData.projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${formData.storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${formData.messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${formData.appId}
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${formData.measurementId}

# Firebase Admin Configuration (for server-side)
FIREBASE_PROJECT_ID=${formData.projectId}
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@${formData.projectId}.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nXXXXX\\n-----END PRIVATE KEY-----\\n"

# Other Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEnvFile())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSetupComplete = () => {
    setSetupComplete(true)
    setTimeout(() => {
      window.location.href = "/"
    }, 3000)
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Firebase Setup Assistant</h1>

      <Tabs defaultValue="instructions" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Get Firebase Configuration</CardTitle>
              <CardDescription>Follow these steps to get your Firebase configuration values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Your current Firebase API key is invalid. You need to get a valid API key from the Firebase console.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 1: Create or Select a Firebase Project</h3>
                  <p className="text-sm text-gray-600">
                    Go to the{" "}
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center"
                    >
                      Firebase Console <ExternalLink className="h-3 w-3 ml-1" />
                    </a>{" "}
                    and create a new project or select an existing one.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 2: Add a Web App to Your Project</h3>
                  <p className="text-sm text-gray-600">
                    Click the web icon ({"</>"}) to add a web app to your project. Give it a nickname (e.g.,
                    "MassClip").
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 3: Copy the Firebase Configuration</h3>
                  <p className="text-sm text-gray-600">
                    After adding the app, you'll see the Firebase configuration object. It looks like this:
                  </p>
                  <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto">
                    {`const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 4: Enable Authentication</h3>
                  <p className="text-sm text-gray-600">
                    Go to Authentication in the Firebase console and enable the authentication methods you want to use
                    (Email/Password, Google, etc.).
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => document.querySelector('[data-value="configuration"]')?.click()}>
                Next: Enter Configuration
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Your Firebase Configuration</CardTitle>
              <CardDescription>
                Enter the values from your Firebase configuration object to generate your .env.local file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleChange}
                    placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authDomain">Auth Domain</Label>
                  <Input
                    id="authDomain"
                    name="authDomain"
                    value={formData.authDomain}
                    onChange={handleChange}
                    placeholder="your-project-id.firebaseapp.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleChange}
                    placeholder="your-project-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storageBucket">Storage Bucket</Label>
                  <Input
                    id="storageBucket"
                    name="storageBucket"
                    value={formData.storageBucket}
                    onChange={handleChange}
                    placeholder="your-project-id.appspot.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messagingSenderId">Messaging Sender ID</Label>
                  <Input
                    id="messagingSenderId"
                    name="messagingSenderId"
                    value={formData.messagingSenderId}
                    onChange={handleChange}
                    placeholder="123456789012"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    name="appId"
                    value={formData.appId}
                    onChange={handleChange}
                    placeholder="1:123456789012:web:abcdef1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="measurementId">Measurement ID (optional)</Label>
                  <Input
                    id="measurementId"
                    name="measurementId"
                    value={formData.measurementId}
                    onChange={handleChange}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Generated .env.local File</h3>
                <div className="relative">
                  <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto h-64">{generateEnvFile()}</pre>
                  <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={copyToClipboard}>
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => document.querySelector('[data-value="instructions"]')?.click()}>
                Back to Instructions
              </Button>
              <Button onClick={() => document.querySelector('[data-value="verification"]')?.click()}>
                Next: Verification
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Setup</CardTitle>
              <CardDescription>Follow these steps to apply your configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 1: Create or Update .env.local File</h3>
                  <p className="text-sm text-gray-600">
                    Create a file named <code>.env.local</code> in the root of your project and paste the configuration
                    you copied from the previous step.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 2: Restart Your Development Server</h3>
                  <p className="text-sm text-gray-600">
                    Stop your development server (Ctrl+C in the terminal) and restart it with <code>npm run dev</code>{" "}
                    or <code>yarn dev</code>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 3: Update Vercel Environment Variables</h3>
                  <p className="text-sm text-gray-600">
                    If you're deploying to Vercel, go to your project settings, then to the Environment Variables
                    section, and add all the variables from your .env.local file.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Step 4: Redeploy Your Application</h3>
                  <p className="text-sm text-gray-600">
                    After adding the environment variables, trigger a new deployment of your application.
                  </p>
                </div>

                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Never commit your .env.local file to version control. It contains sensitive information that should
                    be kept private.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => document.querySelector('[data-value="configuration"]')?.click()}>
                Back to Configuration
              </Button>
              <Button onClick={handleSetupComplete}>I've Completed Setup</Button>
            </CardFooter>
          </Card>

          {setupComplete && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Setup Complete!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your Firebase configuration has been set up. Redirecting to the home page...
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
