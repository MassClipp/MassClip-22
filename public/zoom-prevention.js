// Zoom prevention script - Updated to not interfere with popups
;(() => {
  // Only apply zoom prevention to the main window, not popups
  if (window.opener) {
    console.log("Zoom prevention: Skipping popup window")
    return
  }

  // Prevent zoom on mobile devices
  document.addEventListener("gesturestart", (e) => {
    e.preventDefault()
  })

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
  let lastTouchEnd = 0
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    },
    false,
  )

  // Prevent keyboard zoom
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "0")) {
      e.preventDefault()
    }
  })

  // Prevent mouse wheel zoom
  document.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    },
    { passive: false },
  )
})()
