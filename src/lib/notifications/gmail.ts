import nodemailer from 'nodemailer'

export async function sendEmail(opts: {
  to: string
  subject: string
  body: string
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS — upgraded after connect
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    replyTo: process.env.GMAIL_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  })
}
