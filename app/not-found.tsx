import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-light mb-4">404</h1>
        <h2 className="text-2xl font-light mb-6">Page Not Found</h2>
        <p className="text-gray-400 mb-8">The page you are looking for doesn't exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-crimson hover:bg-crimson-dark text-white transition-colors rounded-md"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
