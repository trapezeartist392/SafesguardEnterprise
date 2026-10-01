# License Tool — INTERNAL TO SYYAIM

This folder stays with Syyaim. Never ship it or the private key to a customer.

## Generate a keypair (one-time)
The keypair files (`syyaim_private.pem`, `syyaim_public.pem`) are already
generated. If you ever need to regenerate:
```
node -e "const c=require('crypto');const{publicKey,privateKey}=c.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});require('fs').writeFileSync('syyaim_private.pem',privateKey);require('fs').writeFileSync('syyaim_public.pem',publicKey)"
```
**If you regenerate, you must also copy the new `syyaim_public.pem` into
the enterprise product at `src/config/syyaim_public.pem`** — otherwise
the backend can't verify licenses signed with the new key.

## Issue a license
```
node generate-license.js \
  --customer "Tata Steel Jamshedpur" \
  --max-devices 12 \
  --max-cameras 120 \
  --expires "2027-06-30" \
  --features "form18,whatsapp,edge"
```

Delivers a `.lic` file. Send it to the customer via email / USB / whatever.
They place it at `/data/license/safeguardsiq.lic` on their server (or
mount it into Docker — see the deployment guide).
