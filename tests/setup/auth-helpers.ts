import type { Page } from "@playwright/test"

export async function signUp(page: Page, email: string, password: string, username?: string) {
  await page.goto("/signup")

  // Wait for page to load
  await page.waitForLoadState("networkidle")

  // Fill in signup form
  if (username) {
    await page.fill('input[type="text"][placeholder*="username"]', username)
  }
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"][placeholder*="••••"]', password)
  await page.fill('input[type="password"][placeholder*="Confirm"]', password)

  // Submit form
  await page.click('button[type="submit"]:has-text("Create Account")')

  // Wait for redirect (either to trial page or dashboard)
  await page.waitForURL(/\/(welcome\/free-trial|dashboard)/, { timeout: 15000 })

  return page.url()
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")

  // Wait for page to load
  await page.waitForLoadState("networkidle")

  // Fill in login form
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // Submit form
  await page.click('button[type="submit"]:has-text("Sign in")')

  // Wait for redirect to dashboard
  await page.waitForURL("/dashboard", { timeout: 15000 })
}

export async function signOut(page: Page) {
  // Navigate to profile or settings
  await page.goto("/dashboard/profile")
  await page.waitForLoadState("networkidle")

  // Click sign out button (adjust selector based on your UI)
  await page.click('button:has-text("Sign Out"), button:has-text("Logout")')

  // Wait for redirect to home or login page
  await page.waitForURL(/\/(|login)$/, { timeout: 10000 })
}

export async function getAuthToken(page: Page): Promise<string> {
  // Get Firebase auth token from the page context
  const token = await page.evaluate(() => {
    return new Promise<string>((resolve) => {
      // Access Firebase auth from window
      const auth = (window as any).firebase?.auth()
      if (auth?.currentUser) {
        auth.currentUser.getIdToken().then(resolve)
      } else {
        resolve("")
      }
    })
  })
  return token
}
