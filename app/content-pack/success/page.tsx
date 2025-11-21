export default function ContentPackSuccess() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-white">Purchase Complete</h1>
          <p className="text-lg text-white/60">Your 150+ High Quality Motivational Clips are ready to download</p>
        </div>

        {/* Access Button */}
        <a
          href="https://drive.google.com/drive/folders/1Wj8nRzOzVcxd377N0_qYSdJDI6LsX72h"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full bg-white text-black font-semibold py-4 px-8 rounded-lg hover:bg-white/90 transition-colors"
        >
          Access Now
        </a>

        {/* Additional Info */}
        <p className="text-sm text-white/40">You can access your content anytime using the link above</p>
      </div>
    </div>
  )
}
