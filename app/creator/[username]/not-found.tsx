import Link from "next/link"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto p-6 bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Creator Not Found</h1>
        <p className="text-zinc-400 mb-6">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors">
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-crimson hover:bg-crimson/90 text-white rounded-md transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
