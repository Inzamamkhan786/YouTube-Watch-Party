import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../utils/logger'

interface EmailPayload {
  email: string
  username: string
  otp?: string
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
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    return false
  }
  const host = String(env.SMTP_HOST).trim().toLowerCase()
  const user = String(env.SMTP_USER).trim().toLowerCase()
  // Guard against unconfigured placeholder strings often copied from .env.example
  if (
    host === 'your-smtp-host' ||
    host.includes('example.com') ||
    user === 'your-mailtrap-user' ||
    user === 'your-smtp-user'
  ) {
    return false
  }
  return true
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
    // Prevent hanging requests with reasonable socket timeouts
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  })
}

function buildEmailHtml({
  title,
  intro,
  otp,
  ctaText,
  ctaUrl,
  expiryText,
  note,
}: {
  title: string
  intro: string
  otp?: string
  ctaText?: string
  ctaUrl?: string
  expiryText: string
  note: string
}): string {
  const otpHtml = otp
    ? `
      <div style="text-align:center; margin:24px 0;">
        <p style="margin:0 0 8px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:${allowedPalette.black}; opacity:0.7;">
          Your 6-digit Verification OTP
        </p>
        <div style="display:inline-block; background-color:#fff0f2; border:2px dashed ${allowedPalette.primary}; border-radius:12px; padding:16px 36px; font-size:36px; font-weight:800; letter-spacing:8px; color:${allowedPalette.primary}; font-family:monospace;">
          ${otp}
        </div>
      </div>
    `
    : ''

  const ctaHtml =
    ctaUrl && ctaText
      ? `
      <div style="text-align:center; margin:24px 0;">
        <a href="${ctaUrl}" style="display:inline-block; background-color:${allowedPalette.primary}; color:${allowedPalette.white}; text-decoration:none; border-radius:999px; padding:14px 28px; font-size:16px; font-weight:bold;">${ctaText}</a>
      </div>
      <p style="margin:0 0 12px; font-size:14px; color:${allowedPalette.black};">If the button does not work, use this direct link:</p>
      <p style="margin:0 0 18px; word-break:break-all; font-size:12px; color:${allowedPalette.blue};">${ctaUrl}</p>
    `
      : ''

  return `
    <div style="font-family: Arial, sans-serif; background-color:${allowedPalette.white}; color:${allowedPalette.black}; margin:0; padding:32px;">
      <div style="max-width:600px; margin:0 auto; background-color:${allowedPalette.white}; border:1px solid ${allowedPalette.soft}; border-radius:12px; overflow:hidden;">
        <div style="background-color:${allowedPalette.primary}; padding:24px 32px;">
          <h1 style="margin:0; font-size:28px; color:${allowedPalette.white}; letter-spacing:0.04em;">SyncTube</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 16px; font-size:24px; color:${allowedPalette.black};">${title}</h2>
          <p style="margin:0 0 14px; font-size:16px; line-height:1.6; color:${allowedPalette.black};">${intro}</p>
          ${otpHtml}
          ${ctaHtml}
          <p style="margin:0 0 12px; font-size:14px; color:${allowedPalette.black};">${expiryText}</p>
          <p style="margin:0; padding-top:16px; border-top:1px solid ${allowedPalette.soft}; font-size:12px; color:${allowedPalette.black}; opacity:0.75;">${note}</p>
        </div>
      </div>
    </div>
  `
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<boolean> {
  const transport = createTransport()
  if (!transport) {
    logger.warn('[Email] SMTP is not configured or placeholder detected. Skipping email send to %s.', to)
    return false
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
      text,
    })
    logger.info('[Email] Successfully sent email to %s', to)
    return true
  } catch (error) {
    logger.error(`[Email] Failed to send email to ${to}: ${(error as Error).message}`)
    return false
  }
}

export const emailService = {
  async sendVerificationEmail({ email, username, otp, verificationUrl }: EmailPayload): Promise<boolean> {
    const textLines = [
      `Hi ${username}, thanks for joining SyncTube!`,
      otp ? `Your 6-digit verification code is: ${otp}` : '',
      verificationUrl ? `Or verify directly by clicking this link: ${verificationUrl}` : '',
      'This code expires in 15 minutes.',
      'For your security, never share this code with anyone else.',
    ].filter(Boolean)

    const html = buildEmailHtml({
      title: 'Verify your SyncTube email',
      intro: `Hi <strong>${username}</strong>, thanks for creating your SyncTube account. Enter the verification code below in SyncTube to verify your account:`,
      otp,
      ctaText: verificationUrl ? 'Verify Email Directly' : undefined,
      ctaUrl: verificationUrl,
      expiryText: 'This verification code expires in 15 minutes.',
      note: 'For your security, never share this code or link with anyone else.',
    })

    return sendEmail({
      to: email,
      subject: otp ? `${otp} is your SyncTube verification code` : 'Verify your SyncTube email',
      html,
      text: textLines.join('\n\n'),
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
