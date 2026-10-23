import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'notificaciones@colmetgasingenieria.com'

export async function sendEmail(opts: {
  to: string
  subject: string
  body: string
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  })

  if (error) {
    throw new Error(error.message)
  }
}
