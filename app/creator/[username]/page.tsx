import type { Metadata } from "next"

// For debugging, let's create a simple version first
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  return {
    title: `${username} | MassClip`,
    description: `Check out ${username}'s content on MassClip`,
  }
}

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    console.log(`[DEBUG] Starting creator profile page for: ${username}`)

    // Let's start with a simple test to see if the page renders at all
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Creator Profile Debug</h1>
          <p className="text-lg mb-2">Username: {username}</p>
          <p className="text-sm text-gray-400">If you see this, the page is rendering successfully.</p>

          <div className="mt-8 p-4 bg-gray-900 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Debug Info:</h2>
            <ul className="space-y-1 text-sm">
              <li>✅ Page component loaded</li>
              <li>✅ Params received: {JSON.stringify(params)}</li>
              <li>✅ Basic rendering working</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-blue-900 rounded-lg">
            <h3 className="font-semibold">Next Steps:</h3>
            <p className="text-sm">
              Now we can gradually add back the Firebase logic and components to see where it breaks.
            </p>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error(`[DEBUG] Error in creator profile page:`, error)

    return (
      <div className="min-h-screen bg-red-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Error Debug</h1>
          <p className="text-lg mb-2">Username: {username}</p>
          <p className="text-sm mb-4">An error occurred in the page component:</p>
          <pre className="bg-black p-4 rounded text-xs overflow-auto">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </div>
    )
  }
}
