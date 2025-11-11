import { test, expect } from "@playwright/test"
import { signUp } from "../setup/auth-helpers"

test.describe("Trial Permissions", () => {
  test("should grant Creator Pro permissions during free trial", async ({ page }) => {
    // Create a new user to get fresh trial
    const testEmail = `trial-test-${Date.now()}@massclip.pro`
    const testPassword = "TestPassword123!"

    const redirectUrl = await signUp(page, testEmail, testPassword)

    // Should redirect to trial page
    expect(redirectUrl).toContain("/welcome/free-trial")

    // Activate trial
    const activateButton = page.locator('button:has-text("Activate"), button:has-text("Start")')
    if ((await activateButton.count()) > 0) {
      await activateButton.click()

      // Wait for activation to complete
      await page.waitForTimeout(2000)
    }

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

    // Check trial status
    const trialResponse = await page.request.get("/api/user/trial-status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    expect(trialResponse.ok()).toBeTruthy()
    const trialData = await trialResponse.json()

    // Verify trial is active
    expect(trialData.isOnTrial).toBeTruthy()
    expect(trialData.daysRemaining).toBeGreaterThan(0)

    // Verify Creator Pro permissions granted
    const bundleLimitsResponse = await page.request.get("/api/user/check-bundle-limits?type=create", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const bundleLimits = await bundleLimitsResponse.json()

    // Should have unlimited bundles during trial
    expect(bundleLimits.maxAllowed).toBeNull()
  })

  test("should revoke permissions after trial expires", async ({ page }) => {
    // This test requires manual setup or API call to expire a trial
    // You would need to create a test user, activate trial, then expire it

    test.skip() // Skip by default - run manually when testing trial expiration
  })
})
