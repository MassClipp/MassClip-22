"use client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Upload Content</h1>
          <p className="text-zinc-400 mb-8 md:mb-12">
            User uploads are currently disabled. Content is managed through Vimeo showcases.
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8">
          <h3 className="text-lg font-medium mb-6">Content Management</h3>
          <p className="text-zinc-400 mb-4">
            Currently, all content is managed through Vimeo showcases. User-generated content uploads are not available
            at this time.
          </p>
          <p className="text-zinc-400">Please contact an administrator to add content to the platform.</p>
        </div>
      </main>
    </div>
  )
}
