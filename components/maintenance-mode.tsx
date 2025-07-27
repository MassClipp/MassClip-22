import { Wrench } from "lucide-react"

export function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20">
            <Wrench className="w-12 h-12 text-red-400" />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">Under Maintenance</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly.
          </p>
        </div>

        {/* Status */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 text-sm">Maintenance in progress...</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-gray-500 text-sm">
          <p>Thank you for your patience</p>
          <p className="mt-1">— The MassClip Team</p>
        </div>
      </div>
    </div>
  )
}
