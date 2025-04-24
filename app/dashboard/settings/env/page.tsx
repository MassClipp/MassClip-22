"use client"

import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import EnvSync from "@/components/env-sync"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function EnvironmentSettingsPage() {
  const { user } = useAuth()

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-6">
            <Link href="/dashboard/user" className="text-gray-400 hover:text-white flex items-center mr-4">
              <ChevronLeft className="h-5 w-5" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Environment Settings</h1>
          </div>

          <div className="max-w-4xl mx-auto">
            <EnvSync />

            <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <h2 className="text-lg font-medium text-white mb-2">About Environment Variables</h2>
              <p className="text-gray-400 mb-4">
                Environment variables are used to configure your application without hardcoding sensitive information.
                They are essential for services like Firebase, Stripe, and Vimeo to function correctly.
              </p>
              <p className="text-gray-400">
                If you're missing any variables, you'll need to add them to your .env.local file or your hosting
                platform's environment settings.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
