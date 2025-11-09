export default function DomainNotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Domain Not Configured</h1>

        <p className="text-muted-foreground mb-6">
          This custom domain is not verified or doesn't exist. If you're the owner, please verify your DNS settings in
          your dashboard.
        </p>

        <div className="space-y-3">
          <a
            href="https://massclip.com"
            className="inline-block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Go to MassClip
          </a>

          <p className="text-sm text-muted-foreground">
            Need help? Contact{" "}
            <a href="mailto:support@massclip.com" className="text-primary hover:underline">
              support@massclip.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
