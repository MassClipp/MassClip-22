/**
 * Direct Download Test Script
 *
 * This script tests different download methods to identify which one works best
 * for your specific browser and environment.
 */

interface DownloadMethod {
  name: string
  description: string
  execute: (url: string, filename: string) => Promise<boolean>
}

export async function testDownloadMethods(url: string, filename = "test-video.mp4") {
  console.log(`🧪 Testing download methods for URL: ${url}`)

  const methods: DownloadMethod[] = [
    {
      name: "Standard Anchor Download",
      description: "Uses a hidden anchor element with the download attribute",
      execute: async (url, filename) => {
        try {
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          return true
        } catch (error) {
          console.error("Standard anchor download failed:", error)
          return false
        }
      },
    },
    {
      name: "Window Open Method",
      description: "Opens the download in a new tab/window",
      execute: async (url, filename) => {
        try {
          const newWindow = window.open(url, "_blank")
          if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
            console.warn("Popup was blocked")
            return false
          }
          return true
        } catch (error) {
          console.error("Window open method failed:", error)
          return false
        }
      },
    },
    {
      name: "Fetch and Blob Method",
      description: "Fetches the file as a blob and creates an object URL",
      execute: async (url, filename) => {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)

          const a = document.createElement("a")
          a.href = blobUrl
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)

          // Clean up the blob URL
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
          return true
        } catch (error) {
          console.error("Fetch and blob method failed:", error)
          return false
        }
      },
    },
    {
      name: "iframe Download Method",
      description: "Uses a hidden iframe to trigger the download",
      execute: async (url, filename) => {
        try {
          const iframe = document.createElement("iframe")
          iframe.style.display = "none"
          document.body.appendChild(iframe)

          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (!iframeDoc) {
            console.error("Could not access iframe document")
            document.body.removeChild(iframe)
            return false
          }

          const iframeA = iframeDoc.createElement("a")
          iframeA.href = url
          iframeA.download = filename
          iframeA.click()

          // Clean up
          setTimeout(() => document.body.removeChild(iframe), 100)
          return true
        } catch (error) {
          console.error("iframe download method failed:", error)
          return false
        }
      },
    },
    {
      name: "Server-Side Proxy Method",
      description: "Uses a server-side proxy to force download headers",
      execute: async (url, filename) => {
        try {
          const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`

          const a = document.createElement("a")
          a.href = proxyUrl
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          return true
        } catch (error) {
          console.error("Server-side proxy method failed:", error)
          return false
        }
      },
    },
  ]

  const results = []

  for (const method of methods) {
    console.log(`Testing method: ${method.name}`)
    try {
      const success = await method.execute(url, filename)
      results.push({
        method: method.name,
        success,
        error: null,
      })
      console.log(`Method ${method.name}: ${success ? "SUCCESS" : "FAILED"}`)
    } catch (error) {
      results.push({
        method: method.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`Method ${method.name} threw an error:`, error)
    }
  }

  return results
}
