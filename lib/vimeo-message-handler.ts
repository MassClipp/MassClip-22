/**
 * Utility to intercept fullscreen requests from Vimeo player
 * while still allowing normal video playback
 */

export const setupVimeoMessageHandler = () => {
  if (typeof window === "undefined") return () => {}

  // Only intercept fullscreen-related messages
  const messageHandler = (event: MessageEvent) => {
    // Skip non-Vimeo messages
    if (!event.origin.includes("vimeo.com")) return

    try {
      // Parse the message data
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data

      // Only block fullscreen requests, allow all other player functionality
      if (
        data &&
        (data.method === "requestFullscreen" ||
          (data.method === "setFullscreen" && data.value === true) ||
          (data.event === "fullscreenchange" && data.data && data.data.fullscreen === true))
      ) {
        console.log("Blocked Vimeo fullscreen request")

        // Stop propagation of this specific message
        event.stopImmediatePropagation()

        // If possible, send a message back to ensure player stays in windowed mode
        if (event.source && "postMessage" in event.source) {
          const source = event.source as Window
          source.postMessage(
            JSON.stringify({
              method: "setFullscreen",
              value: false,
            }),
            "*",
          )
        }

        return false
      }
    } catch (e) {
      // Not JSON or other error, ignore
    }
  }

  // Add the event listener with capture to intercept early
  window.addEventListener("message", messageHandler, true)

  // Return cleanup function
  return () => {
    window.removeEventListener("message", messageHandler, true)
  }
}

/**
 * Send a message to all Vimeo iframes to ensure they stay in windowed mode
 */
export const forceVimeoWindowed = () => {
  const vimeoIframes = document.querySelectorAll('iframe[src*="vimeo"]')

  vimeoIframes.forEach((iframe) => {
    try {
      const target = iframe.contentWindow
      if (target) {
        // Force windowed mode
        target.postMessage(
          JSON.stringify({
            method: "setFullscreen",
            value: false,
          }),
          "*",
        )
      }
    } catch (e) {
      console.error("Error sending message to Vimeo iframe:", e)
    }
  })
}
