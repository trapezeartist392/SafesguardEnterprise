#!/usr/bin/env node
/**
 * SafeguardsIQ Enterprise — License Generator
 * 
 * THIS TOOL STAYS WITH SYYAIM. Never ship it to the customer.
 * It signs a license JSON with Syyaim's private key. The customer
 * gets the .lic file; SafeguardsIQ verifies it with the embedded
 * public key.
 *
 * Usage:
 *   node generate-license.js \
 *     --customer "Tata Steel Jamshedpur" \
 *     --max-devices 12 \
 *     --max-cameras 120 \
 *     --expires "2027-06-30" \
 *     --features "form18,whatsapp,edge"
 *
 * Output: creates a .lic file named after the customer.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    opts[key] = args[i + 1];
  }
  return opts;
}

const opts = parseArgs();

if (!opts.customer || !opts['max-devices'] || !opts['max-cameras'] || !opts.expires) {
  console.error('Usage: node generate-license.js --customer "Name" --max-devices N --max-cameras N --expires YYYY-MM-DD [--features "f1,f2"]');
  process.exit(1);
}

const payload = {
  license_id: crypto.randomUUID(),
  customer: opts.customer,
  product: 'safeguardsiq-enterprise',
  version: 'v1',
  max_devices: parseInt(opts['max-devices'], 10),
  max_cameras: parseInt(opts['max-cameras'], 10),
  expires_at: new Date(opts.expires).toISOString(),
  features: (opts.features || 'form18,whatsapp,edge').split(',').map(f => f.trim()),
  issued_at: new Date().toISOString(),
};

const payloadJson = JSON.stringify(payload);

const privateKeyPath = path.join(__dirname, 'syyaim_private.pem');
if (!fs.existsSync(privateKeyPath)) {
  console.error('ERROR: syyaim_private.pem not found. Generate a keypair first.');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const signature = crypto.sign('sha256', Buffer.from(payloadJson), privateKey).toString('base64');

const licenseFile = {
  payload,
  signature,
};

const safeName = opts.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const filename = `safeguardsiq-${safeName}.lic`;
fs.writeFileSync(filename, JSON.stringify(licenseFile, null, 2));

console.log(`License generated: ${filename}`);
console.log(`  Customer:     ${payload.customer}`);
console.log(`  License ID:   ${payload.license_id}`);
console.log(`  Max devices:  ${payload.max_devices}`);
console.log(`  Max cameras:  ${payload.max_cameras}`);
console.log(`  Expires:      ${payload.expires_at}`);
console.log(`  Features:     ${payload.features.join(', ')}`);
console.log(`\nDeliver the .lic file to the customer. NEVER send the private key.`);
