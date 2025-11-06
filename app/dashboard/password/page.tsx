"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import ChangePassword from "@/components/change-password"

export default function PasswordPage() {
  const router = useRouter()

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
            <h1 className="text-3xl font-bold">Change Password</h1>
          </div>

          <div className="max-w-md mx-auto">
            <ChangePassword />
          </div>
        </div>
      </main>
    </div>
  )
}
