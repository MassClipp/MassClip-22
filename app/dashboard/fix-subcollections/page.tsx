"use client"

import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { SubcollectionInitializer } from "@/components/subcollection-initializer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FixSubcollectionsPage() {
  const { user } = useAuth()

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-gray-900"></div>

      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse-slow"></div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <div className="px-6 mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">Fix Subcollections</h1>
          <p className="text-gray-400 mt-2 text-lg">
            Use this page to fix permission issues with favorites and history subcollections.
          </p>
        </div>

        {/* Red accent line */}
        <div className="relative px-6 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent w-full"></div>
        </div>

        <div className="px-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle>Subcollection Diagnostics</CardTitle>
              <CardDescription>
                If you're experiencing permission errors with favorites or history, use the tools below to fix them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <SubcollectionInitializer />
              ) : (
                <p className="text-yellow-400">You must be logged in to use this tool.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
