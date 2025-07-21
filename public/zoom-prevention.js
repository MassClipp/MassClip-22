// Prevent zoom on mobile devices
;(() => {
  // Prevent pinch zoom
  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault()
      }
    },
    { passive: false },
  )

  // Prevent double-tap zoom
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

  // Prevent zoom via keyboard
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "-" || event.key === "0")) {
      event.preventDefault()
    }
  })

  // Prevent zoom via mouse wheel
  document.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
      }
    },
    { passive: false },
  )
})()
