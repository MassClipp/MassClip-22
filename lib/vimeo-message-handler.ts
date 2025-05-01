/**
 * Utility to intercept and handle postMessage communications with Vimeo iframes
 * This prevents fullscreen requests from being processed
 */

export const setupVimeoMessageHandler = () => {
  // Store the original postMessage function
  const originalPostMessage = window.postMessage

  // Intercept postMessage calls
  const messageHandler = (event: MessageEvent) => {
    // Only process messages that might be from Vimeo
    if (typeof event.data === "string" && event.data.includes("vimeo")) {
      try {
        const data = JSON.parse(event.data)

        // Block fullscreen-related messages
        if (
          data &&
          (data.method === "requestFullscreen" ||
            data.method === "setFullscreen" ||
            (data.value && data.value.fullscreen === true))
        ) {
          console.log("Blocked Vimeo fullscreen request:", data)
          event.stopImmediatePropagation()
          return false
        }
      } catch (e) {
        // Not JSON or other error, ignore
      }
    }
  }

  // Add the event listener
  window.addEventListener("message", messageHandler, true)

  // Return a cleanup function
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
