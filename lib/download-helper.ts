/**
 * Helper function to download files directly without opening a new tab
 */
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  try {
    // For direct file URLs, we can use the download attribute
    const link = document.createElement("a")
    link.style.display = "none"
    document.body.appendChild(link)

    try {
      // Try the fetch + blob approach first (better for cross-origin files)
      const response = await fetch(url)
      if (!response.ok) throw new Error("Network response was not ok")

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      link.href = objectUrl
      link.download = filename
      link.click()

      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }, 100)

      return true
    } catch (error) {
      console.error("Blob download failed, trying direct approach:", error)

      // Fallback to direct approach
      link.href = url
      link.download = filename
      link.click()

      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }, 100)

      return true
    }
  } catch (error) {
    console.error("Download failed:", error)
    return false
  }
}
