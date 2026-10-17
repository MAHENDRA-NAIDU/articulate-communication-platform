/**
 * Diagnostic tool: Test real email delivery via Resend
 *
 * Usage:
 *   node server/scripts/testEmailDelivery.js your-email@example.com
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { isEmailConfigured, sendTestEmail, maskEmail } = require('../services/emailService');

async function main() {
  const targetEmail = process.argv[2];

  console.log('\n======================================================');
  console.log('   ARTICULATE — RESEND EMAIL DELIVERY TEST');
  console.log('======================================================\n');

  if (!isEmailConfigured) {
    console.error('❌ RESEND_API_KEY is not configured in server/.env');
    console.error('👉 Please add: RESEND_API_KEY=re_your_api_key_here');
    console.error('   And optionally: MAIL_FROM="Articulate <onboarding@resend.dev>"\n');
    process.exit(1);
  }

  if (!targetEmail || !targetEmail.includes('@')) {
    console.error('❌ Please specify a recipient email address:');
    console.error('   node server/scripts/testEmailDelivery.js recipient@example.com\n');
    process.exit(1);
  }

  console.log(`📡 Sending test email to ${maskEmail(targetEmail)}...`);

  try {
    const result = await sendTestEmail(targetEmail);
    console.log('\n✅ SUCCESS: Email dispatched successfully via Resend!');
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
