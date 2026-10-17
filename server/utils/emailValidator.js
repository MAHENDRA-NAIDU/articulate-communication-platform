const dns = require('dns').promises;
const validator = require('validator');

// Configure reliable fallback DNS servers for environments with missing local UDP resolvers
const configureDns = () => {
  try {
    const dnsSync = require('dns');
    const servers = dnsSync.getServers();
    if (!servers || servers.length === 0 || servers[0] === '127.0.0.1') {
      dnsSync.setServers(['8.8.8.8', '1.1.1.1']);
    }
  } catch (e) {
    // Ignore DNS server configuration failure
  }
};
configureDns();

/**
 * Validates email syntax strictly according to RFC standards.
 *
 * @param {string} email
 * @returns {{ valid: boolean, reason?: string, cleanEmail?: string }}
 */
const validateEmailSyntax = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Please provide an email address.' };
  }

  const clean = email.trim().toLowerCase();

  // RFC 5321 length limits
  if (clean.length > 254) {
    return { valid: false, reason: 'Email address exceeds maximum length of 254 characters.' };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Please provide a valid email address with a single @ symbol.' };
  }

  const [localPart, domain] = parts;

  // Local-part limit: max 64 characters (RFC 5321)
  if (!localPart || localPart.length > 64) {
    return { valid: false, reason: 'Email username cannot be empty or exceed 64 characters.' };
  }

  // Domain length: max 255 characters
  if (!domain || domain.length > 255) {
    return { valid: false, reason: 'Email domain cannot be empty or exceed 255 characters.' };
  }

  // Domain must contain dot and valid TLD
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return { valid: false, reason: 'Email domain must contain a valid top-level domain.' };
  }

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || !/^[a-z0-9-]+$/.test(tld) || /^\d+$/.test(tld)) {
    return { valid: false, reason: 'Email contains an invalid top-level domain extension.' };
  }

  // Use validator library for standard RFC checks
  if (!validator.isEmail(clean, { allow_utf8_local_part: false })) {
    return { valid: false, reason: 'Please provide a valid email address format.' };
  }

  return { valid: true, cleanEmail: clean };
};

/**
 * Validates that an email domain has active Mail Exchange (MX) records.
 * Falls back to A record resolution (RFC 5321 fallback) if no explicit MX exists.
 * Fails open on transient DNS timeouts or network errors so valid users are never locked out.
 *
 * NOTE: Successful MX validation only proves mail servers exist for the domain;
 * it DOES NOT prove that the specific mailbox/recipient account exists on that domain.
 *
 * @param {string} domain
 * @param {number} [timeoutMs=3500]
 * @returns {Promise<{ valid: boolean, reason?: string, mxFound?: boolean, warning?: string }>}
 */
const validateDomainMX = async (domain, timeoutMs = 3500) => {
  // Allow test and local domains in test/development environments
  const isTestOrLocal =
    domain.endsWith('.local') ||
    domain.endsWith('.test') ||
    domain === 'localhost' ||
    domain.includes('articulate-test');

  if (isTestOrLocal) {
    return { valid: true, mxFound: true, isTestDomain: true };
  }

  try {
    const lookupPromise = (async () => {
      try {
        const mxRecords = await dns.resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
          // RFC 7505 Null MX: exchange: '' priority: 0 explicitly declares domain does not accept email
          const isNullMx = mxRecords.some((r) => r.exchange === '' || r.exchange === '.');
          if (isNullMx && mxRecords.length === 1) {
            return {
              valid: false,
              reason: `The email domain "${domain}" explicitly rejects incoming email (Null MX).`,
            };
          }
          return { valid: true, mxFound: true };
        }
      } catch (mxErr) {
        // If domain has no MX record (ENODATA), RFC 5321 Section 5.1 allows fallback to A/AAAA record
        if (mxErr.code === 'ENODATA' || mxErr.code === 'ENOTFOUND') {
          try {
            const aRecords = await dns.resolve4(domain);
            if (aRecords && aRecords.length > 0) {
              return { valid: true, mxFound: false, fallbackA: true };
            }
          } catch (aErr) {
            // Neither MX nor A record exists: domain definitely does not exist
            return {
              valid: false,
              reason: `The email domain "${domain}" does not exist or has no active mail servers.`,
            };
          }
        }

        // Nonexistent domain error from DNS resolver
        if (mxErr.code === 'ENOTFOUND' || mxErr.code === 'NXDOMAIN') {
          return {
            valid: false,
            reason: `The email domain "${domain}" does not exist.`,
          };
        }

        throw mxErr;
      }

      return {
        valid: false,
        reason: `The email domain "${domain}" has no mail exchange (MX) servers configured.`,
      };
    })();

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          valid: true,
          warning: `DNS lookup timed out after ${timeoutMs}ms. Failing open gracefully.`,
        });
      }, timeoutMs);
    });

    return await Promise.race([lookupPromise, timeoutPromise]);
  } catch (err) {
    // Graceful degradation: fail open on network/DNS infrastructure errors
    console.warn(`[Email Validation Notice] DNS MX lookup failed for domain "${domain}": ${err.message}. Proceeding gracefully.`);
    return {
      valid: true,
      warning: `DNS validation skipped due to lookup error: ${err.message}`,
    };
  }
};

/**
 * Combined email validation: performs syntax check followed by MX record verification.
 *
 * @param {string} email
 * @returns {Promise<{ valid: boolean, cleanEmail?: string, reason?: string }>}
 */
const validateEmail = async (email) => {
  const syntax = validateEmailSyntax(email);
  if (!syntax.valid) {
    return syntax;
  }

  const domain = syntax.cleanEmail.split('@')[1];
  const mx = await validateDomainMX(domain);
  if (!mx.valid) {
    return { valid: false, reason: mx.reason };
  }

  return { valid: true, cleanEmail: syntax.cleanEmail };
};

module.exports = {
  validateEmailSyntax,
  validateDomainMX,
  validateEmail,
};
