export function validateUsername(username: string): { isValid: boolean; message: string } {
  // Check if username is empty
  if (!username) {
    return { isValid: false, message: "Username is required" }
  }

  // Check length (3-20 characters)
  if (username.length < 3 || username.length > 20) {
    return { isValid: false, message: "Username must be between 3 and 20 characters" }
  }

  // Check format (lowercase letters, numbers, underscores only)
  const usernameRegex = /^[a-z0-9_]+$/
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      message: "Username can only contain lowercase letters, numbers, and underscores",
    }
  }

  return { isValid: true, message: "Username is valid" }
}
