export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
          <div>
            <div className="h-8 w-64 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
            <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
            <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
