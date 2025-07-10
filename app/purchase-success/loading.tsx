export default function PurchaseSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            {/* Animated spinner */}
            <div className="h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>

            <h2 className="text-xl font-semibold mb-2">🎉 Processing Your Purchase</h2>
            <p className="text-gray-600 mb-4">Setting up your instant access...</p>

            {/* Loading steps */}
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Payment completed</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Verifying purchase...</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Granting access</span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                This should only take a moment. Your content will be ready instantly!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
