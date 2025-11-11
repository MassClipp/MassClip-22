import { NextResponse } from "next/server"

export async function GET() {
  const testSuites = [
    {
      id: "auth",
      name: "Authentication Flow",
      description: "Tests user signup, login, and logout flows",
      file: "tests/flows/01-authentication.spec.ts",
      category: "flows",
    },
    {
      id: "upload",
      name: "Content Upload",
      description: "Tests video and image upload functionality",
      file: "tests/flows/02-content-upload.spec.ts",
      category: "flows",
    },
    {
      id: "storefront",
      name: "Storefront Display",
      description: "Tests creator profile and content display",
      file: "tests/flows/03-storefront.spec.ts",
      category: "flows",
    },
    {
      id: "purchases",
      name: "Purchase Flow",
      description: "Tests content purchase and access",
      file: "tests/flows/04-purchases.spec.ts",
      category: "flows",
    },
    {
      id: "plan-permissions",
      name: "Plan Permissions",
      description: "Verifies Free, Starter, Pro, and Prenuer plan limits",
      file: "tests/permissions/01-plan-permissions.spec.ts",
      category: "permissions",
    },
    {
      id: "trial-permissions",
      name: "Trial Permissions",
      description: "Tests trial period access and expiration",
      file: "tests/permissions/02-trial-permissions.spec.ts",
      category: "permissions",
    },
    {
      id: "subscription-permissions",
      name: "Subscription Permissions",
      description: "Verifies paid subscription features and limits",
      file: "tests/permissions/03-subscription-permissions.spec.ts",
      category: "permissions",
    },
    {
      id: "mobile",
      name: "Mobile Responsiveness",
      description: "Tests mobile UI and touch interactions",
      file: "tests/mobile/01-mobile-flows.spec.ts",
      category: "mobile",
    },
  ]

  return NextResponse.json({ testSuites })
}
