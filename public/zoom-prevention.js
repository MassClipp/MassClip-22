// Zoom prevention script
;(() => {
  // Prevent zoom on mobile devices
  function preventZoom() {
    // Set viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      viewport = document.createElement("meta")
      viewport.name = "viewport"
      document.head.appendChild(viewport)
    }
    viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"

    // Prevent pinch zoom
    document.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    // Prevent double-tap zoom
    let lastTouchEnd = 0
    document.addEventListener(
      "touchend",
      (e) => {
        const now = Date.now()
        if (now - lastTouchEnd < 300) {
          e.preventDefault()
        }
        lastTouchEnd = now
      },
      { passive: false },
    )

    // Prevent wheel zoom
    document.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) {
          e.preventDefault()
        }
      },
      { passive: false },
    )
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preventZoom)
  } else {
    preventZoom()
  }
})()
