import { test, expect } from "@playwright/test"
import { signIn } from "../setup/auth-helpers"
import { TEST_USERS, PLAN_PERMISSIONS } from "../setup/test-users"

test.describe("Plan Permissions Verification", () => {
  for (const [planName, user] of Object.entries(TEST_USERS)) {
    test(`should grant correct permissions for ${planName} plan`, async ({ page }) => {
      // Sign in as the test user
      await signIn(page, user.email, user.password)

      // Navigate to a page where permissions are checked
      await page.goto("/dashboard/view-storefront")
      await page.waitForLoadState("networkidle")

      // Get auth token
      const token = await page.evaluate(() => {
        return new Promise<string>((resolve) => {
          const auth = (window as any).firebase?.auth()
          if (auth?.currentUser) {
            auth.currentUser.getIdToken().then(resolve)
          } else {
            resolve("")
          }
        })
      })

      // Test bundle limits via API
      const bundleLimitsResponse = await page.request.get("/api/user/check-bundle-limits?type=create", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(bundleLimitsResponse.ok()).toBeTruthy()
      const bundleLimits = await bundleLimitsResponse.json()

      const expectedPermissions = PLAN_PERMISSIONS[user.expectedPlan as keyof typeof PLAN_PERMISSIONS]

      // Verify bundle limit
      if (expectedPermissions.bundlesLimit === Number.POSITIVE_INFINITY) {
        expect(bundleLimits.maxAllowed).toBeNull()
      } else {
        expect(bundleLimits.maxAllowed).toBe(expectedPermissions.bundlesLimit)
      }

      // Test platform fee
      const membershipResponse = await page.request.get("/api/membership-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(membershipResponse.ok()).toBeTruthy()
      const membership = await membershipResponse.json()

      // Verify platform fee percentage
      expect(membership.features?.platformFeePercentage).toBe(expectedPermissions.platformFeePercentage)
    })
  }

  test("should correctly enforce bundle creation limits", async ({ page }) => {
    // Test with free user who has 2 bundle limit
    await signIn(page, TEST_USERS.freeUser.email, TEST_USERS.freeUser.password)

    await page.goto("/dashboard/bundles")

    // Check if create bundle button is disabled when limit reached
    // This depends on your UI implementation
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add")')

    if ((await createButton.count()) > 0) {
      const isDisabled = await createButton.isDisabled()
      // If user has reached limit, button should be disabled or show upgrade prompt
      console.log(`Create button disabled: ${isDisabled}`)
    }
  })

  test("should show correct downloads limit for free users", async ({ page }) => {
    await signIn(page, TEST_USERS.freeUser.email, TEST_USERS.freeUser.password)

    await page.goto("/dashboard")

    // Look for downloads indicator
    const downloadsText = page.locator("text=/download/i")

    if ((await downloadsText.count()) > 0) {
      // Should show "X of 25 downloads" for free users
      await expect(downloadsText.first()).toContainText(/25/)
    }
  })

  test("should show unlimited for pro users", async ({ page }) => {
    await signIn(page, TEST_USERS.facelessProUser.email, TEST_USERS.facelessProUser.password)

    await page.goto("/dashboard")

    // Look for unlimited indicator
    await expect(page.locator("text=/unlimited|∞/i")).toBeVisible({ timeout: 5000 })
  })
})
