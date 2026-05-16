import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendVerificationEmail(to: string, code: string) {
  if (!resend) {
    console.log(`[EMAIL FALLBACK] To: ${to}, Code: ${code}`)
    return { success: true, fallback: true }
  }

  try {
    await resend.emails.send({
      from: 'BUPT Buddy <noreply@bupt-buddy.app>',
      to,
      subject: '你的北邮搭伙平台验证码',
      html: `<p>你的验证码是：<strong>${code}</strong></p><p>10分钟内有效。</p>`,
    })
    return { success: true, fallback: false }
  } catch (err) {
    console.error('Resend error:', err)
    console.log(`[EMAIL FALLBACK] To: ${to}, Code: ${code}`)
    return { success: true, fallback: true }
  }
}
