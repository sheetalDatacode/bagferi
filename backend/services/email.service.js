import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';
import util from 'util';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'noreply@dealingindia.com';
const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL || 'https://dealingindia.com/assets/logo.png';
const EMAIL_LOGO_PATH = process.env.EMAIL_LOGO_PATH || 'upload/dealing-india-logo.png';
const EMAIL_LOGO_CID = 'dealing-india-logo';
const EMAIL_BRAND_PRIMARY = process.env.EMAIL_BRAND_PRIMARY || '#7C3AED';
const EMAIL_BRAND_ACCENT = process.env.EMAIL_BRAND_ACCENT || '#F97316';
const EMAIL_BRAND_TEXT = process.env.EMAIL_BRAND_TEXT || '#111827';

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  process.env.VERCEL === 'true' ||
  !process.env.NODE_ENV;

// Singleton-like pattern for transporter
let transporter = null;
let isTransporterVerified = false;

/**
 * Robust Transporter Creation with Fallback Strategy
 */
const createRobustTransporter = async () => {
  const cleanEmailPass = EMAIL_PASS ? EMAIL_PASS.replace(/\s+/g, '') : '';

  if (!EMAIL_USER || !cleanEmailPass) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required');
  }

  const isGmail = EMAIL_HOST.toLowerCase().includes('gmail.com');

  const configSecure = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: cleanEmailPass },
    family: 4,
    timeout: 10000,
    tls: { rejectUnauthorized: false }
  };

  const configTLS = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: EMAIL_USER, pass: cleanEmailPass },
    family: 4,
    timeout: 10000,
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  };

  const tryConfig = async (config, name) => {
    console.log(`📧 Attempting SMTP Connection (${name})...`);
    const t = nodemailer.createTransport(config);
    try {
      await t.verify();
      console.log(`✅ SMTP Connection Successful (${name})`);
      return t;
    } catch (error) {
      console.warn(`⚠️ SMTP Connection Failed (${name}):`, error.message);
      return null;
    }
  };

  if (isGmail) {
    let t = await tryConfig(configSecure, 'Gmail SSL/465');
    if (t) return t;
    t = await tryConfig(configTLS, 'Gmail TLS/587');
    if (t) return t;
    throw new Error('All SMTP connection strategies failed.');
  } else {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: { user: EMAIL_USER, pass: cleanEmailPass },
      family: 4
    });
  }
};

/**
 * Get or create the nodemailer transporter
 */
const getTransporter = async () => {
  if (transporter && isTransporterVerified) return transporter;

  try {
    transporter = await createRobustTransporter();
    isTransporterVerified = true;
    return transporter;
  } catch (error) {
    console.error('❌ Could not initialize email transporter:', error.message);
    transporter = null;
    isTransporterVerified = false;
    return null;
  }
};

/**
 * Base Sending Function
 */
export const sendEmail = async (to, subject, html, text, attachments) => {
  const mailTransporter = await getTransporter();

  if (!mailTransporter) {
    console.log('⚠️ [DEV MODE/FAILURE] Email would have been sent to:', to);
    return { success: false, error: 'Transporter not configured or failed' };
  }

  const mailOptions = {
    from: `"Dealing India" <${EMAIL_FROM}>`,
    to,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    transporter = null;
    isTransporterVerified = false;
    throw error;
  }
};

/**
 * Helper to lead inline logo
 */
const getInlineLogoAttachment = () => {
  if (!EMAIL_LOGO_PATH) return null;
  try {
    const resolved = path.isAbsolute(EMAIL_LOGO_PATH)
      ? EMAIL_LOGO_PATH
      : path.resolve(process.cwd(), EMAIL_LOGO_PATH);
    if (!fs.existsSync(resolved)) return null;
    const content = fs.readFileSync(resolved);
    return {
      filename: path.basename(resolved),
      content,
      cid: EMAIL_LOGO_CID,
    };
  } catch (error) {
    console.warn('⚠️ Failed to load EMAIL_LOGO_PATH:', error.message);
    return null;
  }
};

/**
 * Format vendor block for emails
 */
const formatVendorBlock = (vendor) => {
  if (!vendor || (!vendor.name && !vendor.email && !vendor.phone)) return '';
  const name = vendor.name || 'N/A';
  const email = vendor.email || 'N/A';
  const phone = vendor.phone || 'N/A';
  return `
    <div style="margin:16px 0;padding:16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
      <h2 style="margin-top:0;font-size:16px;color:#111827;">Vendor Details</h2>
      <p style="margin:4px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin:4px 0;"><strong>Phone:</strong> ${phone}</p>
      ${vendor.gstNumber ? `<p style="margin:4px 0;"><strong>GST Number:</strong> ${vendor.gstNumber}</p>` : ''}
    </div>
  `;
};

/**
 * Send email verification OTP
 */
export const sendVerificationEmail = async (email, otp) => {
  const subject = 'Verify Your Email - Dealing India';
  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f3f4f6;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="Dealing India" style="max-width:160px;height:auto;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
        <h2 style="color: ${EMAIL_BRAND_PRIMARY}; margin-top: 0; font-size: 22px;">Email Verification</h2>
        <p style="text-align: left;">Hello,</p>
        <p style="text-align: left;">Thank you for registering with Dealing India. Please use the following code to verify your email address:</p>
        <div style="background-color: #f9fafb; border: 2px dashed ${EMAIL_BRAND_PRIMARY}; padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px;">
          <h1 style="color: ${EMAIL_BRAND_PRIMARY}; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        <p style="text-align: left; font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html, `Your OTP is: ${otp}`, logoAttachment ? [logoAttachment] : undefined);
};

/**
 * Send payment success email
 */
export const sendPaymentSuccessEmail = async ({
  to, amount, currency = 'INR', planName, title, paymentFor = 'subscription',
  paymentDate, transactionId, referenceId, paymentMethod, vendor, invoicePdfBuffer,
  invoiceFileName = 'invoice.pdf',
}) => {
  const dateStr = paymentDate ? new Date(paymentDate).toLocaleString() : new Date().toLocaleString();
  const labels = {
    subscription: 'Subscription',
    banner_booking: 'Banner Booking',
    addon_purchase: 'Add-on Purchase',
    wallet_recharge: 'Wallet Recharge'
  };
  const paymentLabel = labels[paymentFor] || 'Payment';
  const displayTitle = title || planName || paymentLabel;
  const subject = `Payment Successful - ${displayTitle} (${amount} ${currency})`;

  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;
  const vendorBlock = formatVendorBlock(vendor);

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; margin:0; padding:0; background:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#ffffff;border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;border:1px solid #e5e7eb;border-bottom:none;">
          <img src="${logoSrc}" alt="Dealing India" style="max-width:180px;height:auto;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
          <h1 style="color:${EMAIL_BRAND_PRIMARY};margin:0;font-size:24px;font-weight:bold;">Payment Successful</h1>
        </div>
        <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <p>Thank you for your payment. Your ${paymentLabel.toLowerCase()} has been recorded successfully.</p>
          <div style="margin:16px 0;padding:16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
            <h2 style="margin-top:0;font-size:16px;color:${EMAIL_BRAND_TEXT};">Payment Summary</h2>
            <p style="margin:4px 0;"><strong>Payment For:</strong> ${paymentLabel}</p>
            <p style="margin:4px 0;"><strong>Title/Plan:</strong> ${displayTitle}</p>
            <p style="margin:4px 0;"><strong>Amount:</strong> ${amount} ${currency}</p>
            <p style="margin:4px 0;"><strong>Date:</strong> ${dateStr}</p>
            ${transactionId ? `<p style="margin:4px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
            ${referenceId ? `<p style="margin:4px 0;"><strong>Reference ID:</strong> ${referenceId}</p>` : ''}
          </div>
          ${vendorBlock}
          <p style="margin-top:16px;">Your detailed invoice is attached to this email.</p>
          <p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;">
            © ${new Date().getFullYear()} Dealing India. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  if (logoAttachment) attachments.push(logoAttachment);
  if (invoicePdfBuffer && invoicePdfBuffer.length) {
    attachments.push({ filename: invoiceFileName, content: invoicePdfBuffer, contentType: 'application/pdf' });
  }

  return sendEmail(to, subject, html, undefined, attachments.length ? attachments : undefined);
};

/**
 * Send payment cancelled email
 */
export const sendPaymentCancelledEmail = async ({
  to, amount, currency = 'INR', planName, title, paymentFor = 'subscription',
  paymentDate, transactionId, referenceId, paymentMethod, vendor
}) => {
  const displayTitle = title || planName || (paymentFor === 'banner_booking' ? 'Banner Booking' : 'Subscription');
  const subject = `Payment Not Completed - ${displayTitle}`;

  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;
  const vendorBlock = formatVendorBlock(vendor);

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; margin:0; padding:0; background:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#ffffff;border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;border:1px solid #e5e7eb;border-bottom:none;">
          <img src="${logoSrc}" alt="Dealing India" style="max-width:180px;height:auto;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
          <h1 style="color:${EMAIL_BRAND_PRIMARY};margin:0;font-size:24px;font-weight:bold;">Payment Not Completed</h1>
        </div>
        <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <p>Your recent payment attempt for ${displayTitle} was not completed.</p>
          ${vendorBlock}
          <p style="margin-top:16px;">No money has been charged. You can try the payment again from your dashboard.</p>
          <p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;">
            © ${new Date().getFullYear()} Dealing India. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html, undefined, logoAttachment ? [logoAttachment] : undefined);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, otp) => {
  const subject = 'Password Reset Request - Dealing India';
  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f3f4f6;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="Dealing India" style="max-width:160px;height:auto;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
        <h2 style="color: #c0392b; margin-top: 0; font-size: 22px;">Password Reset</h2>
        <p style="text-align: left;">Hello,</p>
        <p style="text-align: left;">We received a request to reset your password. Use the code below to proceed:</p>
        <div style="background-color: #f9fafb; border: 2px dashed #c0392b; padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px;">
          <h1 style="color: #c0392b; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        <p style="text-align: left; font-size: 14px; color: #6b7280;">This code expires in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html, `Your reset code is: ${otp}`, logoAttachment ? [logoAttachment] : undefined);
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Dealing India!';
  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f3f4f6;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="Dealing India" style="max-width:160px;height:auto;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
        <h1 style="color:${EMAIL_BRAND_PRIMARY};">Welcome ${name}!</h1>
        <p>Thank you for joining Dealing India. Your account is now verified.</p>
        <p>You can now browse and shop in our B2B marketplace.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html, `Welcome to Dealing India, ${name}!`, logoAttachment ? [logoAttachment] : undefined);
};

/**
 * Send vendor approval email
 */
export const sendVendorApprovalEmail = async (email, name) => {
  const subject = 'Your Vendor Account is Approved! - Dealing India';
  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f3f4f6;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="Dealing India" style="max-width:160px;height:auto;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
        <h1 style="color:${EMAIL_BRAND_PRIMARY};">Account Approved!</h1>
        <p>Hello ${name},</p>
        <p>Congratulations! Your vendor profile has been approved by the admin.</p>
        <p>You can now log in to your vendor dashboard to start adding products, managing orders, and growing your business with Dealing India.</p>
        <div style="margin: 30px 0;">
          <a href="https://dealingindia.com/b2b-vendor/login" style="background-color: ${EMAIL_BRAND_PRIMARY}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html, `Congratulations! Your vendor account has been approved.`, logoAttachment ? [logoAttachment] : undefined);
};

/**
 * Send vendor rejection email
 */
export const sendVendorRejectionEmail = async (email, name, reason) => {
  const subject = 'Update on Your Vendor Application - Dealing India';
  const logoAttachment = getInlineLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;

  const reasonHtml = reason ? `<p style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; text-align: left; margin: 16px 0;"><strong>Reason:</strong> ${reason}</p>` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f3f4f6;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="Dealing India" style="max-width:160px;height:auto;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;" />
        <h1 style="color:#dc2626;">Application Update</h1>
        <p>Hello ${name},</p>
        <p>We have reviewed your vendor application for Dealing India.</p>
        <p>Unfortunately, your application was not approved at this time.</p>
        ${reasonHtml}
        <p>If you have any questions or would like to appeal this decision, please contact our support team.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html, `Your vendor application was not approved.`, logoAttachment ? [logoAttachment] : undefined);
};
