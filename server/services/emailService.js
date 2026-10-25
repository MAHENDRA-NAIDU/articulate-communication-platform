const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Provider configuration detectors
const isBrevoConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim());
const isSmtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY);
const getIsEmailConfigured = () => isBrevoConfigured() || isSmtpConfigured() || isResendConfigured();

const getActiveProvider = () => {
  // Resend is preferred when configured: better Gmail deliverability than new Brevo relay domains.
  if (isResendConfigured()) return 'resend';
  if (isBrevoConfigured()) return 'brevo';
  if (isSmtpConfigured()) return 'smtp';
  return 'none';
};

// Transporter caching
let cachedTransporter = null;
let lastSmtpConfigKey = '';

const setTransporterForTesting = (mockTransporter) => {
  cachedTransporter = mockTransporter;
  lastSmtpConfigKey = 'testing_mock';
};

const resetTransporter = () => {
  cachedTransporter = null;
  lastSmtpConfigKey = '';
};

// Mock client for unit testing Brevo HTTP API
let mockBrevoClient = null;

const setBrevoClientForTesting = (mockFn) => {
  mockBrevoClient = mockFn;
};

const resetBrevoClient = () => {
  mockBrevoClient = null;
};

/**
 * Returns a configured Nodemailer SMTP transporter (e.g. Gmail SMTP)
 */
const getTransporter = () => {
  if (!isSmtpConfigured()) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure =
    process.env.SMTP_SECURE === 'false'
      ? false
      : process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '';

  const currentConfigKey = `${host}:${port}:${secure}:${user}:${pass}`;
  if (cachedTransporter && (lastSmtpConfigKey === currentConfigKey || lastSmtpConfigKey === 'testing_mock')) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  lastSmtpConfigKey = currentConfigKey;
  return cachedTransporter;
};

// Sender address configuration
const DEFAULT_SENDER = 'Articulate <onboarding@resend.dev>';

const getSender = () => {
  if (isSmtpConfigured()) {
    const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
    const mailFrom = process.env.MAIL_FROM ? process.env.MAIL_FROM.trim() : '';
    // For Gmail SMTP, envelope sender must align with SMTP_USER (or an explicit non-resend MAIL_FROM)
    const effectiveEmail = mailFrom && !mailFrom.includes('resend.dev') ? mailFrom : smtpUser;
    if (effectiveEmail.includes('@') && !effectiveEmail.includes('<')) {
      return `Articulate <${effectiveEmail}>`;
    }
    return effectiveEmail || `Articulate <${smtpUser}>`;
  }

  if (process.env.MAIL_FROM && process.env.MAIL_FROM.trim()) {
    const from = process.env.MAIL_FROM.trim();
    if (from.includes('@') && !from.includes('<')) {
      return `Articulate <${from}>`;
    }
    return from;
  }
  if (process.env.SMTP_USER && process.env.SMTP_USER.trim()) {
    return `Articulate <${process.env.SMTP_USER.trim()}>`;
  }
  return DEFAULT_SENDER;
};

/**
 * Returns a Resend-API-compatible sender address.
 * Resend requires the sender domain to be verified on their platform,
 * or use the sandbox address onboarding@resend.dev.
 * Gmail addresses are NOT valid Resend senders (domain not verified).
 */
const getResendSender = () => {
  const mailFrom = process.env.MAIL_FROM ? process.env.MAIL_FROM.trim() : '';
  // Strip display name to get raw email for domain check
  const rawEmail = mailFrom.replace(/.*<(.+)>.*/, '$1').trim();
  // If MAIL_FROM is a custom verified domain (not Gmail, not Resend sandbox), use it
  if (rawEmail && rawEmail.includes('@') && !rawEmail.endsWith('gmail.com') && !rawEmail.endsWith('resend.dev')) {
    if (mailFrom.includes('<')) return mailFrom; // Already has display name
    return `Articulate <${rawEmail}>`;
  }
  // Default to Resend sandbox sender
  return DEFAULT_SENDER;
};

/**
 * Returns sender information formatted for Brevo API ({ name, email }).
 * Uses BREVO_SENDER_EMAIL & BREVO_SENDER_NAME if provided,
 * otherwise parses MAIL_FROM, SMTP_USER, or falls back to a clean default.
 */
const getBrevoSender = () => {
  const customEmail = process.env.BREVO_SENDER_EMAIL ? process.env.BREVO_SENDER_EMAIL.trim() : '';
  const customName = process.env.BREVO_SENDER_NAME ? process.env.BREVO_SENDER_NAME.trim() : 'Articulate';

  if (customEmail) {
    return { name: customName, email: customEmail };
  }

  const mailFrom = process.env.MAIL_FROM ? process.env.MAIL_FROM.trim() : '';
  if (mailFrom) {
    const match = mailFrom.match(/^(.*?)\s*<(.+)>$/);
    if (match) {
      return {
        name: match[1].replace(/["']/g, '').trim() || 'Articulate',
        email: match[2].trim(),
      };
    }
    if (mailFrom.includes('@')) {
      return { name: 'Articulate', email: mailFrom };
    }
  }

  if (process.env.SMTP_USER && process.env.SMTP_USER.trim()) {
    return { name: customName, email: process.env.SMTP_USER.trim() };
  }

  // Fallback to user's verified Brevo relay domain which has 100% compliant SPF and DKIM
  return { name: customName, email: 'mahendranaidumeesala@12570071.brevosend.com' };
};

/**
 * Sends transactional email via Brevo HTTPS API (v3)
 * Endpoint: https://api.brevo.com/v3/smtp/email
 */
const sendBrevoEmail = async ({ to, name, subject, text, html }) => {
  const maskedTo = maskEmail(to);
  const sender = getBrevoSender();

  const recipient = name ? { email: to, name } : { email: to };

  const replyToEmail =
    process.env.BREVO_REPLY_TO ||
    process.env.SMTP_USER ||
    'mahendranaidumeesala@gmail.com';

  const payload = {
    sender,
    to: [recipient],
    replyTo: { email: replyToEmail.trim(), name: sender.name },
    subject,
    htmlContent: html,
    textContent: text,
  };

  if (mockBrevoClient) {
    try {
      const mockResult = await mockBrevoClient(payload);
      return mockResult;
    } catch (mockErr) {
      console.error(`[Email Service Error] Brevo delivery failed for ${maskedTo}:`, mockErr.message);
      return { success: false, error: mockErr.message, provider: 'brevo' };
    }
  }

  const apiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '';
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY is not configured', provider: 'brevo' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const messageId = data.messageId || `brevo_${Date.now()}`;
      console.log(`[Email Service] Dispatched email via Brevo HTTPS API to ${maskedTo} (Message ID: ${messageId})`);
      return { success: true, id: messageId, provider: 'brevo' };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Brevo API HTTP ${response.status}: ${response.statusText}`;
    console.error(`[Email Service Error] Brevo delivery failed for ${maskedTo}: ${errorMessage}`);
    return { success: false, error: errorMessage, provider: 'brevo' };
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err.name === 'AbortError' ? 'Brevo API request timed out' : err.message;
    console.error(`[Email Service Exception] Brevo error for ${maskedTo}:`, errorMsg);
    return { success: false, error: errorMsg, provider: 'brevo' };
  }
};

/**
 * Mask email address for safe logging (e.g. j***@example.com)
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return 'unknown';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
};

/**
 * Detect network-level errors that indicate the hosting platform blocks SMTP ports.
 * Distinguished from authentication or TLS configuration errors.
 */
const isNetworkError = (err) => {
  const code = (err.code || '').toUpperCase();
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'ESOCKET' ||
    code === 'ECONNECTION' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    msg.includes('connection timeout') ||
    msg.includes('connect etimedout') ||
    msg.includes('connect econnrefused')
  );
};

/**
 * Core unified email dispatcher: sends via Nodemailer SMTP or Resend.
 *
 * Behaviour:
 * - Primary: SMTP (Gmail) when SMTP_USER + SMTP_PASS are set.
 * - If SMTP fails with a **network error** (timeout, refused — common on cloud
 *   platforms that block outbound SMTP ports) AND Resend is also configured,
 *   the dispatcher automatically falls back to the Resend HTTP API.
 * - If SMTP fails with an **auth/config error**, it is reported directly
 *   without fallback so the operator can fix their credentials.
 * - Secondary: Resend API when SMTP is not configured.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<{ success: boolean, id?: string, error?: string, provider?: string, skipped?: boolean }>}
 */
const dispatchEmail = async ({ to, name, subject, text, html }) => {
  const maskedTo = maskEmail(to);

  // 1. Primary: Resend HTTP API
  // Resend has excellent Gmail deliverability via its shared sending infrastructure.
  // Preferred over Brevo when both are configured.
  if (isResendConfigured()) {
    const from = getResendSender();
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        text,
        html,
      });

      if (error) {
        console.error(`[Email Service Error] Resend delivery failed for ${maskedTo}:`, error.message);
        // Fall through to Brevo as backup
        console.warn(`[Email Service] Resend failed, attempting Brevo fallback for ${maskedTo}.`);
      } else {
        console.log(`[Email Service] Dispatched email via Resend to ${maskedTo} (ID: ${data?.id})`);
        return { success: true, id: data?.id, provider: 'resend' };
      }
    } catch (err) {
      console.error(`[Email Service Exception] Resend error for ${maskedTo}:`, err.message);
      console.warn(`[Email Service] Resend exception, attempting Brevo fallback for ${maskedTo}.`);
    }
  }

  // 2. Brevo HTTPS API (fallback when Resend fails, or primary when only Brevo is configured)
  // Operates over HTTPS (port 443), never blocked by cloud hosting platforms.
  if (isBrevoConfigured()) {
    return sendBrevoEmail({ to, name, subject, text, html });
  }

  // 3. SMTP via Nodemailer (Gmail SMTP) - last resort
  if (isSmtpConfigured()) {
    const from = getSender();
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`[Email Service] Dispatched email via SMTP to ${maskedTo} (Message ID: ${info.messageId})`);
      return { success: true, id: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error(`[Email Service Error] SMTP delivery failed for ${maskedTo}:`, err.message);
      return { success: false, error: err.message, provider: 'smtp' };
    }
  }

  // 4. No delivery mechanism configured
  const errorMsg = 'Email delivery service is not configured (Neither RESEND_API_KEY, BREVO_API_KEY, SMTP_USER/SMTP_PASS provided).';
  console.warn(`[Email Service Notice] Delivery skipped for ${maskedTo}: ${errorMsg}`);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Email delivery is currently unavailable. Please contact an administrator.');
  }

  return {
    success: false,
    skipped: true,
    reason: errorMsg,
  };
};

/**
 * Sends a password recovery email containing a 6-digit recovery code and direct reset link
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient name
 * @param {string} options.resetUrl - Full password reset URL
 * @param {string} [options.resetCode] - 6-digit plaintext recovery code
 * @param {boolean} [options.forceRealSend] - Bypass test-mode mock in unit tests
 * @returns {Promise<{ success: boolean, id?: string, error?: string, skipped?: boolean }>}
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl, resetCode, forceRealSend = false }) => {
  if (process.env.NODE_ENV === 'test' && !forceRealSend) {
    if (to && to.includes('provider-reject')) {
      return {
        success: false,
        error: 'Simulated provider rejection: recipient address rejected by email provider.',
        code: 'validation_error',
      };
    }
    if (to && to.includes('smtp-fail')) {
      return {
        success: false,
        error: 'Invalid login: 535-5.7.8 Username and Password not accepted',
      };
    }
    if (to && to.includes('brevo-fail')) {
      return {
        success: false,
        error: 'Key not found: Unauthorized',
        provider: 'brevo',
      };
    }
    return { success: true, skipped: true, id: 'test_mock_id' };
  }

  if (!getIsEmailConfigured()) {
    const errorMsg = 'Email delivery service is not configured (Neither BREVO_API_KEY, SMTP, nor RESEND_API_KEY provided).';
    console.warn(`[Email Service Notice] Delivery skipped for ${maskEmail(to)}: ${errorMsg}`);

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery is currently unavailable. Please contact an administrator.');
    }

    return {
      success: false,
      skipped: true,
      reason: errorMsg,
    };
  }

  const recipientName = name ? name.split(' ')[0] : 'Learner';
  const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES, 10) || 15;

  const textContent = [
    `Hello ${recipientName},`,
    '',
    'We received a request to reset the password for your Articulate account.',
    '',
    resetCode ? `Your 6-digit recovery code is: ${resetCode}` : '',
    resetCode
      ? 'Enter this 6-digit code on the reset page, or use the direct link below:'
      : 'Please use the following secure link to reset your password:',
    `${resetUrl}`,
    '',
    `This recovery link and code expire in ${expiryMinutes} minutes and can only be used once.`,
    'If you did not request this password reset, please ignore this email. Your account remains secure.',
    '',
    'Best regards,',
    'The Articulate Team',
  ].filter(Boolean).join('\n');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — Articulate</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #191716;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F6F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EADBCE; padding: 40px 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #E05D38; color: #FFFFFF; padding: 8px 16px; border-radius: 9999px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">
                ARTICULATE
              </div>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #191716; line-height: 1.3;">
                Password Reset Request
              </h1>
            </td>
          </tr>
          <!-- Body Text -->
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #5C554E; padding-bottom: 20px; text-align: center;">
              <p style="margin: 0 0 12px 0;">Hello <strong>${recipientName}</strong>,</p>
              <p style="margin: 0 0 16px 0;">We received a request to reset the password associated with your Articulate account. You can reset your password using your 6-digit recovery code or by clicking the button below.</p>
            </td>
          </tr>
          ${
            resetCode
              ? `
          <!-- 6-Digit Recovery Code Display -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8C827A;">
                6-Digit Recovery Code
              </p>
              <div style="display: inline-block; background-color: #FAF7F2; border: 2px dashed #E05D38; border-radius: 12px; padding: 14px 32px;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #E05D38; font-family: monospace;">
                  ${resetCode}
                </span>
              </div>
            </td>
          </tr>
          `
              : ''
          }
          <!-- Action Button -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #E05D38; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(224, 93, 56, 0.25);">
                Reset Password Directly
              </a>
            </td>
          </tr>
          <!-- Expiration Notice -->
          <tr>
            <td style="background-color: #FAF7F2; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.5; color: #736B63; margin-bottom: 20px;">
              <strong style="color: #191716;">Security Note:</strong> This recovery request expires in <strong>${expiryMinutes} minutes</strong> and can only be used once. If you did not make this request, you can safely disregard this email—your account remains completely secure.
            </td>
          </tr>
          <!-- Direct Link Fallback -->
          <tr>
            <td style="font-size: 12px; line-height: 1.5; color: #8C827A; padding-top: 20px; border-top: 1px solid #F0EAE1;">
              <p style="margin: 0 0 8px 0;">If the button above does not work, copy and paste this link into your browser:</p>
              <p style="margin: 0; word-break: break-all; color: #E05D38;">${resetUrl}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const emailSubject = resetCode
    ? `Your Articulate password reset code: ${resetCode}`
    : 'Reset your Articulate account password';

  return dispatchEmail({
    to,
    name: recipientName,
    subject: emailSubject,
    text: textContent,
    html: htmlContent,
  });
};

/**
 * Sends a 6-digit email verification OTP
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient name
 * @param {string} options.otp - 6-digit plain OTP
 * @param {boolean} [options.forceRealSend] - Bypass test-mode mock in unit tests
 * @returns {Promise<{ success: boolean, id?: string, error?: string, skipped?: boolean }>}
 */
const sendVerificationOTPEmail = async ({ to, name, otp, forceRealSend = false }) => {
  if (process.env.NODE_ENV === 'test' && !forceRealSend) {
    if (to && to.includes('provider-reject')) {
      return {
        success: false,
        error: 'Simulated provider rejection: recipient address rejected by email provider.',
        code: 'validation_error',
      };
    }
    if (to && to.includes('smtp-fail')) {
      return {
        success: false,
        error: 'Invalid login: 535-5.7.8 Username and Password not accepted',
      };
    }
    if (to && to.includes('brevo-fail')) {
      return {
        success: false,
        error: 'Key not found: Unauthorized',
        provider: 'brevo',
      };
    }
    return { success: true, skipped: true, id: 'test_mock_id' };
  }

  if (!getIsEmailConfigured()) {
    const errorMsg = 'Email delivery service is not configured (Neither BREVO_API_KEY, SMTP, nor RESEND_API_KEY provided).';
    console.warn(`[Email Service Notice] Delivery skipped for ${maskEmail(to)}: ${errorMsg}`);

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery is currently unavailable. Please contact an administrator.');
    }

    return {
      success: false,
      skipped: true,
      reason: errorMsg,
    };
  }

  const recipientName = name ? name.split(' ')[0] : 'Learner';
  const expiryMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10;

  const textContent = [
    `Hello ${recipientName},`,
    '',
    'Welcome to Articulate! Please verify your email address to complete your registration.',
    '',
    `Your 6-digit verification code is: ${otp}`,
    '',
    `This verification code expires in ${expiryMinutes} minutes and can only be used once.`,
    'Never share this code with anyone. Articulate staff will never ask for your code.',
    '',
    'If you did not create an account on Articulate, please ignore this email.',
    '',
    'Best regards,',
    'The Articulate Team',
  ].join('\n');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email — Articulate</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #191716;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F6F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EADBCE; padding: 40px 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #E05D38; color: #FFFFFF; padding: 8px 16px; border-radius: 9999px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">
                ARTICULATE
              </div>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #191716; line-height: 1.3;">
                Verify Your Email Address
              </h1>
            </td>
          </tr>
          <!-- Body Text -->
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #5C554E; padding-bottom: 24px; text-align: center;">
              <p style="margin: 0 0 16px 0;">Hello <strong>${recipientName}</strong>,</p>
              <p style="margin: 0 0 16px 0;">Welcome to Articulate! Enter the 6-digit verification code below to verify your email address and activate your account:</p>
            </td>
          </tr>
          <!-- OTP Code Display -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <div style="display: inline-block; background-color: #FAF7F2; border: 2px dashed #E05D38; border-radius: 12px; padding: 16px 36px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #E05D38; font-family: monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>
          <!-- Expiration Notice -->
          <tr>
            <td style="background-color: #FAF7F2; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.5; color: #736B63; margin-bottom: 24px;">
              <strong style="color: #191716;">Security Notice:</strong> This code is valid for <strong>${expiryMinutes} minutes</strong> and can only be used once. For your security, never share this code with anyone. If you did not create an account with Articulate, you can safely ignore this message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return dispatchEmail({
    to,
    name: recipientName,
    subject: `Your Articulate verification code: ${otp}`,
    text: textContent,
    html: htmlContent,
  });
};

/**
 * Diagnostic test email delivery function
 */
const sendTestEmail = async (toEmail) => {
  if (!getIsEmailConfigured()) {
    throw new Error('Cannot send test email: Neither BREVO_API_KEY, SMTP (SMTP_USER/SMTP_PASS), nor RESEND_API_KEY is configured.');
  }

  const provider = getActiveProvider();
  const result = await dispatchEmail({
    to: toEmail,
    subject: 'Articulate — Email Delivery Verification Test',
    text: `Congratulations! Real email delivery is working smoothly on your Articulate platform (Provider: ${provider.toUpperCase()}).`,
    html: `<h3>Articulate Email Service Connected</h3><p>Real email delivery via <strong>${provider.toUpperCase()}</strong> has been verified successfully.</p>`,
  });

  if (!result.success) {
    throw new Error(`Email Delivery Error (${result.provider || 'unknown'}): ${result.error || result.reason}`);
  }

  return result;
};

module.exports = {
  get isEmailConfigured() {
    return getIsEmailConfigured();
  },
  isBrevoConfigured,
  isSmtpConfigured,
  isResendConfigured,
  getActiveProvider,
  getTransporter,
  getSender,
  getResendSender,
  getBrevoSender,
  sendBrevoEmail,
  isNetworkError,
  sendPasswordResetEmail,
  sendVerificationOTPEmail,
  sendTestEmail,
  maskEmail,
  dispatchEmail,
  setTransporterForTesting,
  resetTransporter,
  setBrevoClientForTesting,
  resetBrevoClient,
};
