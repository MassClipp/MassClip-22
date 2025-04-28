"use client"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { SubscribeButton } from "@/components/subscribe-button"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

export default function MembershipPlansPage() {
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const router = useRouter()

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Membership Plans</h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Unlock premium features to accelerate your content creation workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div
              className={`bg-black rounded-lg shadow-lg overflow-hidden border ${!isProUser ? "border-crimson" : "border-gray-800"} relative`}
            >
              {!isProUser && !loading && (
                <div className="absolute top-0 right-0 bg-crimson text-white text-xs font-bold px-3 py-1">
                  CURRENT PLAN
                </div>
              )}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Free</h2>
                <p className="text-gray-400 mb-6">Get started with basic features</p>
                <p className="text-4xl font-bold text-white mb-6">
                  $0<span className="text-xl text-gray-400">/month</span>
                </p>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>5 downloads per month</strong>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Access to free clips</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Standard video quality</span>
                  </li>
                </ul>

                {isProUser ? (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full py-2 px-4 border border-gray-700 rounded-md text-white hover:bg-gray-800 transition-colors"
                  >
                    Return to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full py-2 px-4 border border-crimson rounded-md text-white bg-black hover:bg-gray-900 transition-colors"
                  >
                    Current Plan
                  </button>
                )}
              </div>
            </div>

            {/* Pro Plan */}
            <div
              className={`bg-black rounded-lg shadow-lg overflow-hidden border ${isProUser ? "border-crimson" : "border-red-900"} relative`}
            >
              {!loading && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1">
                  {isProUser ? "CURRENT PLAN" : "RECOMMENDED"}
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">Pro</h2>
                </div>
                <p className="text-gray-400 mb-6">Everything you need to create amazing content</p>
                <p className="text-4xl font-bold text-white mb-6">
                  $19<span className="text-xl text-gray-400">/month</span>
                </p>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Unlimited downloads</strong>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Access to all clips</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>High video quality</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>

                {isProUser ? (
                  <button
                    onClick={() => router.push("/dashboard/user")}
                    className="w-full py-2 px-4 border border-crimson rounded-md text-white bg-black hover:bg-gray-900 transition-colors"
                  >
                    Manage Subscription
                  </button>
                ) : (
                  <SubscribeButton>Upgrade to Pro</SubscribeButton>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16 text-center max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h3>

            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-medium text-white mb-2">Can I cancel my subscription?</h4>
                <p className="text-gray-400">
                  Yes, you can cancel your subscription anytime. You'll continue to have access until the end of your
                  billing period.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-white mb-2">What payment methods do you accept?</h4>
                <p className="text-gray-400">
                  We accept all major credit cards, including Visa, Mastercard, and American Express.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
