const FirebaseDebugPage = () => {
  const firebaseEnvVars = [
    { name: "NEXT_PUBLIC_FIREBASE_API_KEY", value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY },
    { name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", value: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN },
    { name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
    { name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", value: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET },
    { name: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", value: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID },
    { name: "NEXT_PUBLIC_FIREBASE_APP_ID", value: process.env.NEXT_PUBLIC_FIREBASE_APP_ID },
    { name: "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", value: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID },
  ]

  const hasAnyVars = firebaseEnvVars.some((envVar) => envVar.value)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Firebase Debug</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
        {hasAnyVars ? (
          <div className="space-y-2">
            {firebaseEnvVars.map((envVar) => (
              <div key={envVar.name} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                <span className="font-mono text-sm">{envVar.name}</span>
                <span className={`text-sm ${envVar.value ? "text-green-400" : "text-red-400"}`}>
                  {envVar.value ? "✓ Set" : "✗ Missing"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-red-400">No Firebase environment variables found!</p>
        )}
      </section>
    </div>
  )
}

export default FirebaseDebugPage
