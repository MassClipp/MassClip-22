import { test, expect } from "@playwright/test"
import { signIn } from "../setup/auth-helpers"
import { TEST_USERS } from "../setup/test-users"

test.describe("Subscription Permissions", () => {
  test("should maintain permissions with active subscription", async ({ page }) => {
    // Use a test account with active subscription
    await signIn(page, TEST_USERS.facelessProUser.email, TEST_USERS.facelessProUser.password)

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

    // Check membership status
    const membershipResponse = await page.request.post("/api/membership-status", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        userId: await page.evaluate(() => (window as any).firebase?.auth()?.currentUser?.uid),
      },
    })

    expect(membershipResponse.ok()).toBeTruthy()
    const membership = await membershipResponse.json()

    // Verify subscription is active
    expect(membership.isActive).toBeTruthy()
    expect(membership.plan).toBe("faceless_pro")

    // Verify permissions
    expect(membership.features?.platformFeePercentage).toBe(10)
  })
})
