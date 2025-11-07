// ... existing code ...

// <CHANGE> Updated canAnalyzeTranscripts to only return true for facelessprenuer, creator_pro, and pro
export function canAnalyzeTranscripts(plan: string): boolean {
  return plan === "facelessprenuer" || plan === "creator_pro" || plan === "pro"
}
// </CHANGE>

// <CHANGE> Updated canUserCreateBundles to clarify: faceless_pro can create bundles manually, but NOT via Vex AI
// This function is for general bundle creation ability (manual in dashboard)
export function canUserCreateBundles(plan: string): boolean {
  return plan === "faceless_pro" || plan === "facelessprenuer" || plan === "creator_pro" || plan === "pro"
}
// </CHANGE>

// ... existing code ...
