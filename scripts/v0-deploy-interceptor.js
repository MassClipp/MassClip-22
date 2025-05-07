// This script will be injected into your app to intercept v0.dev deployments
;(() => {
  // Store the original fetch function
  const originalFetch = window.fetch

  // Override fetch to intercept v0.dev deployment requests
  window.fetch = async (url, options) => {
    // Check if this is a v0.dev deployment request
    if (typeof url === "string" && url.includes("v0.dev/api/deploy") && options?.method === "POST") {
      try {
        // Let the original request go through
        const response = await originalFetch(url, options)

        // Clone the response so we can read the body
        const clonedResponse = response.clone()
        const responseData = await clonedResponse.json()

        // Extract the deployment data
        const requestBody = JSON.parse(options.body)

        // Send the deployment data to our interceptor
        fetch("/api/v0-deploy-interceptor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: requestBody.files,
            projectName: requestBody.name,
          }),
        }).catch((err) => console.error("Failed to send to interceptor:", err))

        return response
      } catch (error) {
        console.error("Error in v0.dev deployment interceptor:", error)
        // Fall back to original fetch if our interception fails
        return originalFetch(url, options)
      }
    }

    // For all other requests, use the original fetch
    return originalFetch(url, options)
  }

  console.log("v0.dev deployment interceptor initialized")
})()
