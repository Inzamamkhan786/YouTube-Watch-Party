import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../utils/logger'

interface EmailPayload {
  email: string
  username: string
  verificationUrl?: string
  resetUrl?: string
}

const allowedPalette = {
  primary: '#ff2e4c',
  white: '#fefefe',
  black: '#0f0f0f',
  soft: '#dfe1e3',
  blush: '#ffa3b3',
  blue: '#065fd4',
}

function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD)
}

function createTransport() {
  if (!isSmtpConfigured()) {
    return null
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  })
}

function buildEmailHtml({ title, intro, ctaText, ctaUrl, expiryText, note }: {
  title: string
  intro: string
  ctaText: string
  ctaUrl: string
  expiryText: string
  note: string
}): string {
  return `
    <div style="font-family: Arial, sans-serif; background-color:${allowedPalette.white}; color:${allowedPalette.black}; margin:0; padding:32px;">
      <div style="max-width:600px; margin:0 auto; background-color:${allowedPalette.white}; border:1px solid ${allowedPalette.soft}; border-radius:12px; overflow:hidden;">
        <div style="background-color:${allowedPalette.primary}; padding:24px 32px;">
          <h1 style="margin:0; font-size:28px; color:${allowedPalette.white}; letter-spacing:0.04em;">SyncTube</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 16px; font-size:24px; color:${allowedPalette.black};">${title}</h2>
          <p style="margin:0 0 14px; font-size:16px; line-height:1.6; color:${allowedPalette.black};">${intro}</p>
          <div style="text-align:center; margin:24px 0;">
            <a href="${ctaUrl}" style="display:inline-block; background-color:${allowedPalette.primary}; color:${allowedPalette.white}; text-decoration:none; border-radius:999px; padding:14px 28px; font-size:16px; font-weight:bold;">${ctaText}</a>
          </div>
          <p style="margin:0 0 12px; font-size:14px; color:${allowedPalette.black};">${expiryText}</p>
          <p style="margin:0 0 12px; font-size:14px; color:${allowedPalette.black};">If the button does not work, use this link:</p>
          <p style="margin:0 0 18px; word-break:break-all; font-size:12px; color:${allowedPalette.blue};">${ctaUrl}</p>
          <p style="margin:0; padding-top:16px; border-top:1px solid ${allowedPalette.soft}; font-size:12px; color:${allowedPalette.black}; opacity:0.75;">${note}</p>
        </div>
      </div>
    </div>
  `
}

async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const transport = createTransport()
  if (!transport) {
    logger.warn('[Email] SMTP is not configured. Skipping email send to %s.', to)
    return false
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  })

  return true
}

export const emailService = {
  async sendVerificationEmail({ email, username, verificationUrl }: EmailPayload): Promise<boolean> {
    if (!verificationUrl) {
      return false
    }

    const html = buildEmailHtml({
      title: 'Verify your SyncTube email',
      intro: `Hi ${username}, thanks for creating your SyncTube account. Please verify your email address to finish setting up your account.`,
      ctaText: 'Verify Email',
      ctaUrl: verificationUrl,
      expiryText: 'This verification link expires in 30 minutes.',
      note: 'For your security, never share this link with anyone else.',
    })

    return sendEmail({
      to: email,
      subject: 'Verify your SyncTube email',
      html,
      text: `Hi ${username}, verify your SyncTube email here: ${verificationUrl}. This link expires in 30 minutes.`,
    })
  },

  async sendPasswordResetEmail({ email, username, resetUrl }: EmailPayload): Promise<boolean> {
    if (!resetUrl) {
      return false
    }

    const html = buildEmailHtml({
      title: 'Reset your SyncTube password',
      intro: `Hi ${username}, we received a request to reset your SyncTube password. Use the button below to choose a new one.`,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
      expiryText: 'This reset link expires in 30 minutes.',
      note: 'If you did not request this reset, you can ignore this email and your password will remain unchanged.',
    })

    return sendEmail({
      to: email,
      subject: 'Reset your SyncTube password',
      html,
      text: `Hi ${username}, reset your SyncTube password here: ${resetUrl}. This link expires in 30 minutes.`,
    })
  },
}
