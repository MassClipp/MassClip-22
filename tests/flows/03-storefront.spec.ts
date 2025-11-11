import { test, expect } from "@playwright/test"
import { signIn } from "../setup/auth-helpers"

test.describe("Storefront Flow", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "test-pro@massclip.pro", "TestPassword123!")
  })

  test("should view internal storefront", async ({ page }) => {
    await page.goto("/dashboard/view-storefront")

    // Verify storefront loads
    await expect(page.locator("h1, h2, .text-2xl")).toBeVisible()

    // Check for profile information
    await expect(page.locator("text=@")).toBeVisible() // Username with @
  })

  test("should access external storefront", async ({ page }) => {
    // Get creator username from dashboard
    await page.goto("/dashboard/profile")
    const username = await page.locator('input[value*="@"]').inputValue()
    const cleanUsername = username.replace("@", "")

    // Visit external storefront
    await page.goto(`/creator/${cleanUsername}`)

    // Verify external storefront loads
    await expect(page.locator(".text-2xl, h1, h2")).toBeVisible()
  })

  test("should toggle storefront status", async ({ page }) => {
    await page.goto("/dashboard/view-storefront")

    // Find the storefront status toggle
    const toggle = page.locator('[role="switch"]').first()

    if ((await toggle.count()) > 0) {
      const initialState = await toggle.getAttribute("data-state")

      // Toggle it
      await toggle.click()
      await page.waitForTimeout(1000) // Wait for state to update

      const newState = await toggle.getAttribute("data-state")

      // Verify state changed
      expect(newState).not.toBe(initialState)
    }
  })

  test("should display social links on external storefront", async ({ page }) => {
    await page.goto("/creator/stack") // Use your test account username

    // Check for social links section
    await expect(page.locator("text=/links|social/i")).toBeVisible()
  })

  test.describe("Mobile Storefront", () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test("should display correctly on mobile", async ({ page }) => {
      await page.goto("/dashboard/view-storefront")

      // Check that elements are visible and not overflowing
      const body = page.locator("body")
      const bodyWidth = await body.evaluate((el) => el.scrollWidth)
      const viewportWidth = page.viewportSize()?.width || 375

      // Allow for some scroll (like 10px), but major overflow is a problem
      expect(bodyWidth).toBeLessThan(viewportWidth + 20)
    })
  })
})
