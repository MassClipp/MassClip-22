export interface ErrorDiagnostic {
  errorCode: string
  severity: "critical" | "high" | "medium" | "low"
  category: "authentication" | "network" | "validation" | "stripe" | "database" | "unknown"
  message: string
  context: string
  possibleCauses: string[]
  diagnosticSteps: string[]
  resolutionSteps: string[]
  codeLocations?: string[]
}

export class ProductBoxErrorAnalyzer {
  static analyzeError(error: any, context: string): ErrorDiagnostic {
    // Network Protocol Errors
    if (error.message?.includes("ERR_QUIC_PROTOCOL_ERROR") || error.code === "ERR_QUIC_PROTOCOL_ERROR") {
      return {
        errorCode: "NETWORK_QUIC_ERROR",
        severity: "high",
        category: "network",
        message: "QUIC protocol error preventing API communication",
        context,
        possibleCauses: [
          "Network connectivity issues",
          "Firewall blocking QUIC protocol",
          "Browser/server QUIC configuration mismatch",
          "Proxy or VPN interference",
          "DNS resolution problems",
        ],
        diagnosticSteps: [
          "Check network connectivity: ping google.com",
          "Test API endpoint directly: curl -I https://your-domain.com/api/health",
          "Disable VPN/proxy temporarily",
          "Try different browser or incognito mode",
          "Check browser network tab for failed requests",
        ],
        resolutionSteps: [
          "Implement HTTP/2 fallback in Next.js config",
          "Add network retry logic with exponential backoff",
          "Configure proper CORS headers",
          "Add health check endpoint",
          "Implement offline detection and queuing",
        ],
        codeLocations: ["next.config.js", "middleware.ts", "api/health/route.ts"],
      }
    }

    // Authentication Errors (401)
    if (error.status === 401 || error.message?.includes("Authentication required")) {
      return {
        errorCode: "AUTH_SESSION_INVALID",
        severity: "critical",
        category: "authentication",
        message: "User session is invalid or expired",
        context,
        possibleCauses: [
          "Session token expired",
          "Invalid session cookie",
          "Firebase Auth token refresh failed",
          "Middleware authentication logic error",
          "Session storage corruption",
        ],
        diagnosticSteps: [
          "Check localStorage/sessionStorage for auth tokens",
          "Verify Firebase Auth currentUser state",
          "Check session cookie in browser dev tools",
          "Test session validation endpoint directly",
          "Check server logs for authentication failures",
        ],
        resolutionSteps: [
          "Implement automatic token refresh",
          "Add session validation before API calls",
          "Improve error handling in auth middleware",
          "Add session recovery mechanisms",
          "Implement proper logout on auth failures",
        ],
        codeLocations: ["middleware.ts", "lib/server-session.ts", "contexts/auth-context.tsx"],
      }
    }

    // Validation Errors (400)
    if (error.status === 400) {
      return {
        errorCode: "VALIDATION_ERROR",
        severity: "medium",
        category: "validation",
        message: "Request data validation failed",
        context,
        possibleCauses: [
          "Missing required fields",
          "Invalid data format",
          "Price validation failure",
          "Stripe account validation error",
          "Business logic validation failure",
        ],
        diagnosticSteps: [
          "Check request payload in network tab",
          "Validate form data against API schema",
          "Test with minimal valid payload",
          "Check server validation logs",
          "Verify Stripe account status",
        ],
        resolutionSteps: [
          "Add client-side validation",
          "Improve error message specificity",
          "Add request payload logging",
          "Implement schema validation",
          "Add field-level validation feedback",
        ],
        codeLocations: ["app/api/creator/product-boxes/route.ts", "components/product-box-creation-form.tsx"],
      }
    }

    // Generic API Errors
    return {
      errorCode: "UNKNOWN_API_ERROR",
      severity: "high",
      category: "unknown",
      message: "Unhandled API error occurred",
      context,
      possibleCauses: [
        "Server internal error",
        "Database connection failure",
        "Third-party service unavailable",
        "Resource exhaustion",
        "Unhandled exception",
      ],
      diagnosticSteps: [
        "Check server logs for stack traces",
        "Verify database connectivity",
        "Test individual API components",
        "Check system resource usage",
        "Review recent code changes",
      ],
      resolutionSteps: [
        "Add comprehensive error logging",
        "Implement circuit breaker pattern",
        "Add health monitoring",
        "Improve error boundaries",
        "Add fallback mechanisms",
      ],
      codeLocations: ["app/api/**/*.ts", "lib/error-logger.ts"],
    }
  }

  static generateErrorReport(errors: ErrorDiagnostic[]): string {
    const report = `
# Product Box Creation Error Analysis Report
Generated: ${new Date().toISOString()}

## Summary
- Total Errors: ${errors.length}
- Critical: ${errors.filter((e) => e.severity === "critical").length}
- High: ${errors.filter((e) => e.severity === "high").length}
- Medium: ${errors.filter((e) => e.severity === "medium").length}

## Error Breakdown
${errors
  .map(
    (error, index) => `
### ${index + 1}. ${error.errorCode} (${error.severity.toUpperCase()})
**Category:** ${error.category}
**Message:** ${error.message}
**Context:** ${error.context}

**Possible Causes:**
${error.possibleCauses.map((cause) => `- ${cause}`).join("\n")}

**Diagnostic Steps:**
${error.diagnosticSteps.map((step) => `1. ${step}`).join("\n")}

**Resolution Steps:**
${error.resolutionSteps.map((step) => `1. ${step}`).join("\n")}

${
  error.codeLocations
    ? `**Code Locations:**
${error.codeLocations.map((loc) => `- ${loc}`).join("\n")}`
    : ""
}
`,
  )
  .join("\n")}

## Recommended Action Plan
1. **Immediate:** Fix critical authentication issues
2. **Short-term:** Resolve network connectivity problems
3. **Medium-term:** Improve validation and error handling
4. **Long-term:** Implement comprehensive monitoring and resilience
    `
    return report
  }
}
