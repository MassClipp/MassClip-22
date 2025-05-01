"use client"

// This script runs on the client side to prevent fullscreen mode
export function preventFullscreen() {
  if (typeof window !== "undefined") {
    // Function to exit fullscreen
    const exitFullscreen = () => {
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          ;(document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          ;(document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          ;(document as any).msExitFullscreen()
        }
      }
    }

    // Add event listeners for fullscreen changes
    document.addEventListener("fullscreenchange", exitFullscreen)
    document.addEventListener("webkitfullscreenchange", exitFullscreen)
    document.addEventListener("mozfullscreenchange", exitFullscreen)
    document.addEventListener("MSFullscreenChange", exitFullscreen)

    // Override the requestFullscreen methods
    const elements = [HTMLElement.prototype, Document.prototype, Element.prototype]

    elements.forEach((element) => {
      // Store original methods
      const originalRequestFullscreen = element.requestFullscreen
      const originalWebkitRequestFullscreen = (element as any).webkitRequestFullscreen
      const originalMozRequestFullScreen = (element as any).mozRequestFullScreen
      const originalMsRequestFullscreen = (element as any).msRequestFullscreen

      // Override requestFullscreen
      if (originalRequestFullscreen) {
        element.requestFullscreen = () => {
          console.log("Fullscreen request blocked")
          return new Promise((resolve, reject) => {
            reject(new Error("Fullscreen is disabled"))
          })
        }
      }

      // Override webkit version
      if (originalWebkitRequestFullscreen) {
        ;(element as any).webkitRequestFullscreen = () => {
          console.log("Webkit fullscreen request blocked")
        }
      }

      // Override moz version
      if (originalMozRequestFullScreen) {
        ;(element as any).mozRequestFullScreen = () => {
          console.log("Moz fullscreen request blocked")
        }
      }

      // Override ms version
      if (originalMsRequestFullscreen) {
        ;(element as any).msRequestFullscreen = () => {
          console.log("MS fullscreen request blocked")
        }
      }
    })

    // Also try to intercept the Vimeo player API if it's loaded
    const checkForVimeoPlayer = () => {
      if (window.Vimeo && window.Vimeo.Player) {
        const originalPlayer = window.Vimeo.Player

        // Override the Player constructor
        window.Vimeo.Player = function (this: any, ...args: any[]) {
          const player = new originalPlayer(...args)

          // Override the requestFullscreen method
          const originalRequestFullscreen = player.requestFullscreen
          player.requestFullscreen = () => {
            console.log("Vimeo fullscreen request blocked")
            return Promise.reject(new Error("Fullscreen is disabled"))
          }

          return player
        } as any

        // Copy prototype and properties
        window.Vimeo.Player.prototype = originalPlayer.prototype
        Object.setPrototypeOf(window.Vimeo.Player, originalPlayer)
      } else {
        // If not loaded yet, try again in a moment
        setTimeout(checkForVimeoPlayer, 500)
      }
    }

    checkForVimeoPlayer()

    // Return cleanup function
    return () => {
      document.removeEventListener("fullscreenchange", exitFullscreen)
      document.removeEventListener("webkitfullscreenchange", exitFullscreen)
      document.removeEventListener("mozfullscreenchange", exitFullscreen)
      document.removeEventListener("MSFullscreenChange", exitFullscreen)
    }
  }

  // No cleanup needed for SSR
  return () => {}
}

// Add type definition for Vimeo
declare global {
  interface Window {
    Vimeo?: {
      Player: any
    }
  }
}
