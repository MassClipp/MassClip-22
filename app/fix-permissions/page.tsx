import { DirectSubcollectionFix } from "@/components/direct-subcollection-fix"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FixPermissionsPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-gray-900"></div>

      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse-slow"></div>

      <header className="relative z-10 border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white flex items-center">
            <span className="text-red-500">Mass</span>Clip
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Fix Permissions</h1>
            <p className="text-gray-400">
              This page will fix permission issues with your favorites and history collections.
            </p>
          </div>

          <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6 shadow-xl">
            <DirectSubcollectionFix />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 mb-4">
              After fixing permissions, you can return to your favorites or history pages.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/dashboard/favorites">
                <Button variant="outline" className="border-gray-700 hover:border-red-500">
                  Go to Favorites
                </Button>
              </Link>
              <Link href="/dashboard/history">
                <Button variant="outline" className="border-gray-700 hover:border-red-500">
                  Go to History
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
