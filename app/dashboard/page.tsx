"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-semibold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome to your dashboard!</p>

      <Button
        onClick={() => router.push("/dashboard/upload")}
        className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload New Clip
      </Button>
    </div>
  )
}
