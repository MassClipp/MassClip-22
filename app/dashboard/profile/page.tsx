"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  const { displayName, features, isActive, status, cancelAtPeriodEnd, currentPeriodEnd, loading } = useUserPlan()

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <div className="space-y-8">
        {/* Membership Section */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Membership & Billing</h2>
            <Badge variant={isActive ? "default" : "secondary"}>{displayName}</Badge>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Current Plan</h3>
            {isActive ? (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 font-medium">Active Subscription</p>
                {currentPeriodEnd && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Your subscription will automatically renew on {new Date(currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : cancelAtPeriodEnd ? (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <p className="text-orange-800 dark:text-orange-200 font-medium">Subscription Canceled</p>
                {currentPeriodEnd && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    Your {displayName} access continues until {new Date(currentPeriodEnd).toLocaleDateString()}. After
                    this date, you will lose access to selling features and your storefront will be automatically
                    disabled.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4">
                <p className="text-muted-foreground">No active subscription</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-4">Plan Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>{features.maxFolders === null ? "Unlimited" : features.maxFolders} folders with subfolders</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>
                  {features.maxBundles === null ? "Unlimited" : features.maxBundles} bundles max on storefront
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>
                  {features.maxVideosPerBundle === null ? "Unlimited" : features.maxVideosPerBundle} videos per bundle
                  limit
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>
                  {features.canAnalyzeTranscripts
                    ? "Full Vex AI - bundle creation & transcript analysis"
                    : "Basic Vex AI - file metadata & folder organization"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Only {features.platformFeePercentage}% Platform Fee on sales</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button variant="outline">Refresh Status</Button>
            {cancelAtPeriodEnd && <Button>Reactivate Subscription</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}
