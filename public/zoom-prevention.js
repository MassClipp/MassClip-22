// This script runs immediately when loaded
;(() => {
  try {
    // Set viewport meta tag
    var meta = document.querySelector('meta[name="viewport"]')
    if (!meta) {
      meta = document.createElement("meta")
      meta.setAttribute("name", "viewport")
      document.head.appendChild(meta)
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
    )

    // Add CSS to prevent zoom
    var style = document.createElement("style")
    style.textContent = `
      html, body {
        touch-action: pan-x pan-y !important;
        -ms-touch-action: pan-x pan-y !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        overscroll-behavior: none !important;
        -ms-content-zooming: none !important;
        -webkit-text-size-adjust: 100% !important;
        -moz-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }
    `
    document.head.appendChild(style)

    // Prevent pinch zoom
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    // Prevent double-tap zoom
    var lastTouchEnd = 0
    document.addEventListener(
      "touchend",
      (e) => {
        var now = Date.now()
        if (now - lastTouchEnd < 300) {
          e.preventDefault()
        }
        lastTouchEnd = now
      },
      { passive: false },
    )

    // Prevent wheel zoom (for trackpads)
    document.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    console.log("Zoom prevention initialized")
  } catch (e) {
    console.error("Error in zoom prevention script:", e)
  }
})()
