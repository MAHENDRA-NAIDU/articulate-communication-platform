const { Resend } = require('resend');

// Verify configuration on load
const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);
const resend = isEmailConfigured ? new Resend(process.env.RESEND_API_KEY) : null;

// Sender address configuration
const DEFAULT_SENDER = 'Articulate <onboarding@resend.dev>';
const getSender = () => process.env.MAIL_FROM || DEFAULT_SENDER;

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
 * Sends a password recovery email via Resend
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient name
 * @param {string} options.resetUrl - Full password reset URL
 * @returns {Promise<{ success: boolean, id?: string, error?: string, skipped?: boolean }>}
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (process.env.NODE_ENV === 'test') {
    return { success: true, skipped: true, id: 'test_mock_id' };
  }

  if (!isEmailConfigured) {
    const errorMsg = 'Email delivery service is not configured (RESEND_API_KEY missing).';
    console.warn(`[Email Service Notice] Delivery skipped for ${maskEmail(to)}: ${errorMsg}`);

    // In production, fail safely
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
  const from = getSender();

  const textContent = [
    `Hello ${recipientName},`,
    '',
    'We received a request to reset the password for your Articulate account.',
    '',
    `Please use the following secure link to reset your password:`,
    `${resetUrl}`,
    '',
    'This recovery link is valid for 15 minutes and can only be used once.',
    'If you did not request this password reset, please ignore this email. Your account remains secure.',
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
            <td style="font-size: 15px; line-height: 1.6; color: #5C554E; padding-bottom: 24px;">
              <p style="margin: 0 0 16px 0;">Hello <strong>${recipientName}</strong>,</p>
              <p style="margin: 0 0 16px 0;">We received a request to reset the password associated with your Articulate account. Click the button below to choose a new, secure password.</p>
            </td>
          </tr>
          <!-- Action Button -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #E05D38; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(224, 93, 56, 0.25);">
                Reset Password
              </a>
            </td>
          </tr>
          <!-- Expiration Notice -->
          <tr>
            <td style="background-color: #FAF7F2; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.5; color: #736B63; margin-bottom: 24px;">
              <strong style="color: #191716;">Security Note:</strong> This link expires in <strong>15 minutes</strong> and can only be used once. If you did not make this request, you can safely disregard this email—your password will remain unchanged.
            </td>
          </tr>
          <!-- Direct Link Fallback -->
          <tr>
            <td style="font-size: 12px; line-height: 1.5; color: #8C827A; padding-top: 24px; border-top: 1px solid #F0EAE1;">
              <p style="margin: 0 0 8px 0;">If the button above does not work, copy and paste this URL into your browser:</p>
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

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'Reset your Articulate account password',
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error(`[Email Service Error] Failed to send reset email to ${maskEmail(to)}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service] Password recovery email dispatched successfully to ${maskEmail(to)} (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error(`[Email Service Exception] Error sending to ${maskEmail(to)}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Sends a 6-digit email verification OTP via Resend
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient name
 * @param {string} options.otp - 6-digit plain OTP
 * @returns {Promise<{ success: boolean, id?: string, error?: string, skipped?: boolean }>}
 */
const sendVerificationOTPEmail = async ({ to, name, otp }) => {
  if (process.env.NODE_ENV === 'test') {
    if (to && to.includes('provider-reject')) {
      return {
        success: false,
        error: 'Simulated provider rejection: recipient address rejected by email provider.',
        code: 'validation_error',
      };
    }
    return { success: true, skipped: true, id: 'test_mock_id' };
  }

  if (!isEmailConfigured) {
    const errorMsg = 'Email delivery service is not configured (RESEND_API_KEY missing).';
    console.warn(`[Email Service Notice] Delivery skipped for ${maskEmail(to)}: ${errorMsg}`);

    // In production, fail safely
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
  const from = getSender();
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

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Your Articulate verification code: ${otp}`,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error(`[Email Service Error] Failed to send verification OTP to ${maskEmail(to)}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service] Verification OTP email dispatched successfully to ${maskEmail(to)} (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error(`[Email Service Exception] Error sending to ${maskEmail(to)}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Diagnostic test email delivery function
 */
const sendTestEmail = async (toEmail) => {
  if (!isEmailConfigured) {
    throw new Error('Cannot send test email: RESEND_API_KEY is not configured in environment variables.');
  }

  const from = getSender();
  const { data, error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: 'Articulate — Email Delivery Verification Test',
    text: 'Congratulations! Real email delivery via Resend is working smoothly on your Articulate platform.',
    html: '<h3>Articulate Email Service Connected</h3><p>Real email delivery via Resend has been verified successfully.</p>',
  });

  if (error) {
    throw new Error(`Resend API Error: ${error.message}`);
  }

  return { success: true, id: data?.id };
};

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendVerificationOTPEmail,
  sendTestEmail,
  maskEmail,
};
