import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// All automated emails disabled
export async function sendDomainVerificationSuccessEmail(
  email: string,
  domain: string,
  displayName?: string,
): Promise<boolean> {
  console.log(`⏸️ Automated emails disabled - skipping domain verification success email to ${email}`)
  return true
  try {
    await resend.emails.send({
      from: "MassClip <noreply@massclip.pro>",
      to: email,
      subject: `Your Custom Domain ${domain} is Live! 🎉`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Custom Domain Verified</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <p>Hey ${displayName || "there"}! 👋</p>
            
            <p>Exciting news! Your custom domain <strong>${domain}</strong> has been successfully verified and is now live.</p>
            
            <p>Your storefront is now accessible at:</p>
            <p><a href="https://${domain}" style="color: #3b82f6; font-weight: 600; font-size: 18px;">https://${domain}</a></p>
            
            <p><strong>What's next?</strong></p>
            <ul style="line-height: 1.8;">
              <li>SSL certificates may take up to 24 hours to fully provision</li>
              <li>Share your custom domain with your audience</li>
              <li>Update your social media links to use your new domain</li>
            </ul>
            
            <p>Your professional storefront is ready to impress! 🚀</p>
            
            <p>Best,<br>The MassClip Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              MassClip - Professional Creator Platform
            </p>
          </body>
        </html>
      `,
    })

    console.log(`[v0] Verification success email sent to ${email} for domain ${domain}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to send verification success email:`, error)
    return false
  }
}

export async function sendDomainVerificationFailedEmail(
  email: string,
  domain: string,
  reason: string,
  displayName?: string,
): Promise<boolean> {
  console.log(`⏸️ Automated emails disabled - skipping domain verification failed email to ${email}`)
  return true
  try {
    await resend.emails.send({
      from: "MassClip <noreply@massclip.pro>",
      to: email,
      subject: `Action Required: Domain Verification Issue for ${domain}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Domain Verification Issue</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <p>Hey ${displayName || "there"},</p>
            
            <p>We encountered an issue while verifying your custom domain <strong>${domain}</strong>.</p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 15px; color: #92400e;">
                <strong>Issue:</strong> ${reason}
              </p>
            </div>
            
            <p><strong>What to do next:</strong></p>
            <ol style="line-height: 1.8;">
              <li>Double-check your DNS records match our instructions exactly</li>
              <li>Wait 10-15 minutes for DNS propagation</li>
              <li>Try verifying again from your dashboard</li>
            </ol>
            
            <p><a href="https://www.massclip.pro/dashboard/custom-domain" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Go to Dashboard</a></p>
            
            <p>Need help? Just reply to this email and we'll assist you.</p>
            
            <p>Best,<br>The MassClip Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              MassClip - Professional Creator Platform
            </p>
          </body>
        </html>
      `,
    })

    console.log(`[v0] Verification failed email sent to ${email} for domain ${domain}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to send verification failed email:`, error)
    return false
  }
}

export async function sendSSLProvisionedEmail(email: string, domain: string, displayName?: string): Promise<boolean> {
  console.log(`⏸️ Automated emails disabled - skipping SSL provisioned email to ${email}`)
  return true
  try {
    await resend.emails.send({
      from: "MassClip <noreply@massclip.pro>",
      to: email,
      subject: `SSL Certificate Active for ${domain} 🔒`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>SSL Certificate Active</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <p>Hey ${displayName || "there"}! 👋</p>
            
            <p>Great news! Your SSL certificate for <strong>${domain}</strong> has been successfully provisioned and is now active.</p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 15px; color: #065f46;">
                <strong>🔒 Your site is now fully secure with HTTPS!</strong>
              </p>
            </div>
            
            <p>What this means for you:</p>
            <ul style="line-height: 1.8;">
              <li>All connections to your storefront are encrypted</li>
              <li>Browsers show the secure padlock icon</li>
              <li>Your audience can trust your site is safe</li>
              <li>Better SEO rankings from search engines</li>
            </ul>
            
            <p><a href="https://${domain}" style="color: #3b82f6; font-weight: 600;">Visit your secure storefront →</a></p>
            
            <p>Best,<br>The MassClip Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              MassClip - Professional Creator Platform
            </p>
          </body>
        </html>
      `,
    })

    console.log(`[v0] SSL provisioned email sent to ${email} for domain ${domain}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to send SSL provisioned email:`, error)
    return false
  }
}

export async function sendDomainHealthAlertEmail(
  email: string,
  domain: string,
  issue: string,
  displayName?: string,
): Promise<boolean> {
  console.log(`⏸️ Automated emails disabled - skipping domain health alert email to ${email}`)
  return true
  try {
    await resend.emails.send({
      from: "MassClip <noreply@massclip.pro>",
      to: email,
      subject: `⚠️ Domain Health Alert: ${domain}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Domain Health Alert</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
            <p>Hey ${displayName || "there"},</p>
            
            <p>We detected an issue with your custom domain <strong>${domain}</strong> that requires your attention.</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 15px; color: #991b1b;">
                <strong>⚠️ Issue Detected:</strong> ${issue}
              </p>
            </div>
            
            <p><strong>Action required:</strong></p>
            <ol style="line-height: 1.8;">
              <li>Check your DNS records are still configured correctly</li>
              <li>Verify your domain hasn't expired</li>
              <li>Contact your domain registrar if needed</li>
            </ol>
            
            <p><a href="https://www.massclip.pro/dashboard/custom-domain" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Check Domain Settings</a></p>
            
            <p>Your storefront may be inaccessible until this is resolved. Need help? Just reply to this email.</p>
            
            <p>Best,<br>The MassClip Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              MassClip - Professional Creator Platform
            </p>
          </body>
        </html>
      `,
    })

    console.log(`[v0] Domain health alert email sent to ${email} for domain ${domain}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to send domain health alert email:`, error)
    return false
  }
}
