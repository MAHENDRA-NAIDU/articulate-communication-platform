/**
 * Diagnostic tool: Test real email delivery via Resend
 *
 * Usage:
 *   node server/scripts/testEmailDelivery.js your-email@example.com
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { isEmailConfigured, getActiveProvider, sendTestEmail, maskEmail } = require('../services/emailService');

async function main() {
  const targetEmail = process.argv[2];
  const provider = getActiveProvider();

  console.log('\n======================================================');
  console.log('   ARTICULATE — EMAIL DELIVERY VERIFICATION TEST');
  console.log('======================================================\n');

  if (!isEmailConfigured) {
    console.error('❌ No email delivery credentials configured in server/.env');
    console.error('👉 For Gmail SMTP (Recommended), configure:');
    console.error('   SMTP_HOST=smtp.gmail.com');
    console.error('   SMTP_PORT=465');
    console.error('   SMTP_SECURE=true');
    console.error('   SMTP_USER=your_dedicated_account@gmail.com');
    console.error('   SMTP_PASS=your_16_character_app_password');
    console.error('   MAIL_FROM=your_dedicated_account@gmail.com\n');
    console.error('👉 Or for Resend API:');
    console.error('   RESEND_API_KEY=re_your_api_key_here\n');
    process.exit(1);
  }

  if (!targetEmail || !targetEmail.includes('@')) {
    console.error('❌ Please specify a recipient email address:');
    console.error('   node server/scripts/testEmailDelivery.js recipient@example.com\n');
    process.exit(1);
  }

  console.log(`Active Provider: ${provider.toUpperCase()}`);
  console.log(`📡 Sending test email to ${maskEmail(targetEmail)}...`);

  try {
    const result = await sendTestEmail(targetEmail);
    console.log(`\n✅ SUCCESS: Email dispatched successfully via ${provider.toUpperCase()}!`);
    console.log(`   Message ID: ${result.id}`);
    console.log(`   Check the inbox of ${targetEmail} for the test message.\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Email delivery failed:');
    console.error(`   ${err.message}\n`);
    process.exit(1);
  }
}

main();
