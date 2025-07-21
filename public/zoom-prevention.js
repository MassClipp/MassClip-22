// Zoom prevention script for mobile devices
;(() => {
  // Prevent zoom on double tap
  let lastTouchEnd = 0
  document.addEventListener(
    "touchend",
    (event) => {
      const now = new Date().getTime()
      if (now - lastTouchEnd <= 300) {
        event.preventDefault()
      }
      lastTouchEnd = now
    },
    false,
  )

  // Prevent zoom on pinch
  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.scale !== 1) {
        event.preventDefault()
      }
    },
    { passive: false },
  )

  // Prevent zoom with keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.which === 61 ||
        event.which === 107 ||
        event.which === 173 ||
        event.which === 109 ||
        event.which === 187 ||
        event.which === 189)
    ) {
      event.preventDefault()
    }
  })

  // Prevent zoom with mouse wheel
  document.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        event.preventDefault()
      }
    },
    { passive: false },
  )

  console.log("Zoom prevention script loaded")
})()
