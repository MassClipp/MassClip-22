import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertTriangle, Info, Server } from "lucide-react"
import { ClientEnvChecker } from "./client-env-checker"
import { FirebaseConfigChecker } from "./firebase-config-checker"

// Server-side environment variable checker
function ServerEnvChecker() {
  const envVars = {
    // Firebase Admin (Server-side only)
    firebase: {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? "[REDACTED - Present]" : undefined,
    },
    // Firebase Client (Public)
    firebaseClient: {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },
    // Stripe
    stripe: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "[REDACTED - Present]" : undefined,
      STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "[REDACTED - Present]" : undefined,
    },
    // Other APIs
    apis: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "[REDACTED - Present]" : undefined,
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "[REDACTED - Present]" : undefined,
      VIMEO_ACCESS_TOKEN: process.env.VIMEO_ACCESS_TOKEN ? "[REDACTED - Present]" : undefined,
    },
    // Google OAuth
    google: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "[REDACTED - Present]" : undefined,
    },
    // Cloudflare R2
    cloudflare: {
      CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT,
      CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? "[REDACTED - Present]" : undefined,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? "[REDACTED - Present]" : undefined,
      CLOUDFLARE_R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    },
    // Site URLs
    urls: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
      NEXT_PUBLIC_SITE_URL_2: process.env.NEXT_PUBLIC_SITE_URL_2,
    },
  }

  const getStatusIcon = (value: string | undefined) => {
    if (value === undefined) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (value.includes("[REDACTED")) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getStatusBadge = (value: string | undefined, isPublic = false) => {
    if (value === undefined) {
      return <Badge variant="destructive">Missing</Badge>
    }
    if (value.includes("[REDACTED")) {
      return <Badge variant="default">Present (Hidden)</Badge>
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Present {isPublic && "(Public)"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Server className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Server-Side Environment Variables</h2>
      </div>

      {Object.entries(envVars).map(([category, vars]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="capitalize">{category.replace(/([A-Z])/g, " $1").trim()}</CardTitle>
            <CardDescription>
              {category === "firebaseClient" && "These should be accessible on both client and server"}
              {category === "firebase" && "Server-side only Firebase Admin configuration"}
              {category === "stripe" && "Stripe payment processing configuration"}
              {category === "apis" && "Third-party API keys and tokens"}
              {category === "google" && "Google OAuth configuration"}
              {category === "cloudflare" && "Cloudflare R2 storage configuration"}
              {category === "urls" && "Application URLs and endpoints"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(vars).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(value)}
                    <div>
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{key}</code>
                      {key.startsWith("NEXT_PUBLIC_") && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(value, key.startsWith("NEXT_PUBLIC_"))}
                    {value && !value.includes("[REDACTED") && (
                      <code className="text-xs text-gray-600 max-w-xs truncate">{value}</code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Instructions component
function SetupInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Environment Variable Setup Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Local Development (.env.local)</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              Create a <code>.env.local</code> file in your project root:
            </p>
            <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              {`# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Other APIs
OPENAI_API_KEY=sk-xxxxx
RESEND_API_KEY=re_xxxxx
VIMEO_ACCESS_TOKEN=xxxxx

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx`}
            </pre>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">Vercel Deployment</h3>
          <div className="space-y-2 text-sm">
            <p>1. Go to your Vercel dashboard</p>
            <p>2. Select your project</p>
            <p>3. Go to Settings → Environment Variables</p>
            <p>4. Add each variable with the appropriate environment (Production, Preview, Development)</p>
            <p>5. Redeploy your application after adding variables</p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Notes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                Variables starting with <code>NEXT_PUBLIC_</code> are exposed to the browser
              </li>
              <li>
                Never put sensitive data in <code>NEXT_PUBLIC_</code> variables
              </li>
              <li>Server-side variables are only accessible in API routes and server components</li>
              <li>Restart your development server after changing environment variables</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

export default function DebugEnvPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Environment Variables Debug</h1>
        <p className="text-gray-600">Comprehensive environment variable configuration checker</p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          This page is for debugging purposes only. Sensitive values are hidden in production. Do not share screenshots
          of this page as they may contain sensitive information.
        </AlertDescription>
      </Alert>

      {/* Firebase Configuration Checker */}
      <Suspense fallback={<div>Loading Firebase configuration...</div>}>
        <FirebaseConfigChecker />
      </Suspense>

      {/* Client-side Environment Checker */}
      <Suspense fallback={<div>Loading client environment...</div>}>
        <ClientEnvChecker />
      </Suspense>

      {/* Server-side Environment Checker */}
      <ServerEnvChecker />

      {/* Setup Instructions */}
      <SetupInstructions />
    </div>
  )
}
