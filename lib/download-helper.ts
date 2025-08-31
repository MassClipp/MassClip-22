/**
 * Helper function to download files directly without opening a new tab
 */
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  try {
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
      link.setAttribute("download", filename)
      link.target = "_blank"

      setTimeout(() => {
        link.click()
      }, 100)

      // Clean up after a longer delay to ensure download starts
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }, 1000) // Increased cleanup delay

      return true
    } catch (error) {
      console.error("Blob download failed, trying direct approach:", error)

      link.href = url
      link.download = filename
      link.setAttribute("download", filename)
      link.target = "_blank"

      try {
        link.click()
      } catch (clickError) {
        // Fallback: open in new window with download intent
        window.open(url, "_blank")
      }

      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }, 1000)

      return true
    }
  } catch (error) {
    console.error("Download failed:", error)
    return false
  }
}
