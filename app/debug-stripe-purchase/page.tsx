export const metadata = {
  title: "Stripe Purchase Debug (DEV ONLY)",
}

import StripePurchaseDebugClientPage from "./stripe-debug-client-page"

export default function StripePurchaseDebugPage() {
  // Restrict to development / preview builds
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Stripe Purchase Debug Disabled</h1>
        <p className="max-w-md text-muted-foreground">
          This page is only available in development environments to prevent accidental exposure in production.
        </p>
      </div>
    )
  }

  return <StripePurchaseDebugClientPage />
}
