import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface ContentPackEmailData {
  email: string
  name: string
  googleDriveLink: string
  purchaseAmount: number
}

export async function sendContentPackEmail(data: ContentPackEmailData) {
  const { email, name, googleDriveLink, purchaseAmount } = data

  console.log(`📧 [Content Pack Email] Sending email to ${email}`)

  try {
    const result = await resend.emails.send({
      from: "MassClip <noreply@massclip.pro>",
      to: email,
      subject: "Your Content Pack is Ready! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Content Pack</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; background-color: #000000; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 48px 48px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; line-height: 1.2;">
                          Welcome to Your Content Pack! 🎉
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 48px;">
                        <p style="margin: 0 0 24px; color: rgba(255, 255, 255, 0.9); font-size: 18px; line-height: 1.6;">
                          Hi ${name || "there"},
                        </p>
                        
                        <p style="margin: 0 0 24px; color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6;">
                          Thank you for your purchase! Your 150+ High Quality Motivational Clips are ready to download.
                        </p>
                        
                        <p style="margin: 0 0 32px; color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6;">
                          Click the button below to access your content:
                        </p>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%;">
                          <tr>
                            <td align="center" style="padding: 0 0 32px;">
                              <a href="${googleDriveLink}" 
                                 style="display: inline-block; padding: 16px 48px; background-color: #ffffff; color: #000000; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 50px; box-shadow: 0 10px 40px rgba(255, 255, 255, 0.1);">
                                Access Now
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Direct Link -->
                        <p style="margin: 0 0 32px; color: rgba(255, 255, 255, 0.5); font-size: 14px; line-height: 1.6; text-align: center;">
                          Or copy this link:<br/>
                          <a href="${googleDriveLink}" style="color: rgba(255, 255, 255, 0.7); word-break: break-all;">${googleDriveLink}</a>
                        </p>
                        
                        <!-- Purchase Details -->
                        <div style="margin: 32px 0 0; padding: 24px; background-color: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
                          <p style="margin: 0 0 12px; color: rgba(255, 255, 255, 0.5); font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Purchase Details
                          </p>
                          <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                            <strong>Product:</strong> 150+ High Quality Motivational Clips<br/>
                            <strong>Amount Paid:</strong> $${purchaseAmount.toFixed(2)} USD
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 48px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <p style="margin: 0 0 12px; color: rgba(255, 255, 255, 0.5); font-size: 14px;">
                          Questions? Reply to this email or visit <a href="https://massclip.pro" style="color: rgba(255, 255, 255, 0.7); text-decoration: none;">massclip.pro</a>
                        </p>
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                          © ${new Date().getFullYear()} MassClip. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    console.log(`✅ [Content Pack Email] Email sent successfully to ${email}`, result)
    return { success: true, data: result }
  } catch (error) {
    console.error(`❌ [Content Pack Email] Failed to send email to ${email}:`, error)
    return { success: false, error }
  }
}
