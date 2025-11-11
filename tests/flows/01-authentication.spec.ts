import { test, expect } from "@playwright/test"
import { signUp, signIn, signOut } from "../setup/auth-helpers"

test.describe("Authentication Flow", () => {
  test("should sign up a new user and redirect to free trial", async ({ page }) => {
    const testEmail = `test-${Date.now()}@massclip.pro`
    const testPassword = "TestPassword123!"

    const redirectUrl = await signUp(page, testEmail, testPassword, "playwright-test")

    // Verify user was redirected to free trial page
    expect(redirectUrl).toContain("/welcome/free-trial")

    // Verify trial page loaded
    await expect(page.locator("h1, h2")).toContainText(/trial|welcome/i, { timeout: 5000 })
  })

  test("should sign in existing user", async ({ page }) => {
    // Use a pre-existing test account
    await signIn(page, "test-free@massclip.pro", "TestPassword123!")

    // Verify dashboard loaded
    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator("h1, h2")).toContainText(/dashboard/i)
  })

  test("should sign out user", async ({ page }) => {
    // Sign in first
    await signIn(page, "test-free@massclip.pro", "TestPassword123!")

    // Sign out
    await signOut(page)

    // Verify redirect to home or login
    expect(page.url()).toMatch(/\/(|login)$/)
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill('input[type="email"]', "invalid@test.com")
    await page.fill('input[type="password"]', "wrongpassword")
    await page.click('button[type="submit"]')

    // Wait for error message
    await expect(page.locator('[role="alert"], .text-red-500, .text-red-400')).toBeVisible({ timeout: 5000 })
  })

  test("should prevent access to protected routes when not authenticated", async ({ page }) => {
    await page.goto("/dashboard")

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })
})
