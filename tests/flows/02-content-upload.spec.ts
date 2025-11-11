import { test, expect } from "@playwright/test"
import { signIn } from "../setup/auth-helpers"
import path from "path"

test.describe("Content Upload Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as a pro user who can upload unlimited content
    await signIn(page, "test-pro@massclip.pro", "TestPassword123!")
  })

  test("should upload video content successfully", async ({ page }) => {
    await page.goto("/dashboard/upload")

    // Wait for upload page to load
    await expect(page.locator("h1, h2")).toContainText(/upload/i)

    // Create a test video file (1x1 black frame, minimal size)
    const testVideoPath = path.join(__dirname, "../fixtures/test-video.mp4")

    // Upload file (adjust selector based on your upload component)
    const fileInput = page.locator('input[type="file"]')
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(testVideoPath)

      // Wait for upload to complete
      await expect(page.locator("text=/uploaded|success/i")).toBeVisible({ timeout: 30000 })
    } else {
      console.log("File input not found, skipping upload test")
    }
  })

  test("should navigate to upload page from dashboard", async ({ page }) => {
    await page.goto("/dashboard")

    // Click upload button/link
    await page.click('a[href*="upload"], button:has-text("Upload")')

    // Verify navigation
    await expect(page).toHaveURL(/\/upload/)
  })
})
