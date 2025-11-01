import StripeOnboardingTest from "@/components/stripe-onboarding-test"
import StripeStatus from "@/components/stripe-status"

export default function TestOnboardingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stripe Onboarding Test</h1>

      <div className="grid gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Component (Simplified)</h2>
          <StripeOnboardingTest />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Full Stripe Status Component</h2>
          <StripeStatus />
        </div>
      </div>
    </div>
  )
}
