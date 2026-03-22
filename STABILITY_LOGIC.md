# 🛡️ Backend Stability & Email Logic (Hostinger Pattern)

This document records the architectural logic implemented to solve stability issues, database crashes, and email delivery failures on shared hosting environments like Hostinger.

## 1. Hybrid Architecture (PHP + MySQL + Node.js)
### The Problem
Node.js on shared hosting often hits memory limits or connection timeouts when handling frequent MySQL queries, leading to "ECONNREFUSED" or process crashes.

### The Solution: PHP as Primary Engine
- **PHP for DB:** Moved all primary API routes (`/products`, `/sales`, `/spool`) to `api/index.php`. PHP is native to Hostinger and handles MySQL connections more robustly.
- **Node.js as Secondary:** Keep `server.cjs` for specialized tasks or as a fallback, but decouple it from the main UI flow.
- **MySQL as Primary / JSON as Fallback:** 
    - The PHP API always tries to connect to MySQL first.
    - If MySQL fails, it automatically reads/writes to `db.json` so the app never "breaks" for the user.

## 2. Multi-Page PDF & Email Delivery
### Challenges
1. **Large Attachments:** High-resolution PDFs (scale 4.0+) are too large for email servers to handle.
2. **Spam Filters:** Hostinger blocks emails sent with a "From" address that doesn't match the server domain.
3. **Encoding:** Large Base64 strings in PHP `mail()` need special handling.

### Implementation Logic
- **Resolution Scaling:** Set `html2canvas` scale to `2.0`. This keeps the print sharp but reduces file size by ~70%.
- **Base64 Chunking:** Use `chunk_split()` on the Base64 attachment in PHP. This is critical for meeting MIME standards for large files.
- **Safe Headers:** 
    - Use a local sender (e.g., `no-reply@domain.com`).
    - Add `X-Mailer` and `MIME-Version` headers to verify the email's legitimacy.
- **Rendering Delay:** Added a `1500ms` delay between page captures in the frontend to ensure React has fully rendered the next set of 20 tickets before `html2canvas` captures it.

## 3. Continuous Deployment Workflow
To ensure updates are consistent across local and server:
1. **Build:** `npm run build`
2. **Package:** `tar -czf deploy.tar.gz dist server.cjs .htaccess api package.json database.sql public`
3. **Upload:** Use `scp` with SSH keys.
4. **Restart:** SSH into server, extract, and restart the Node.js process (if used).

---
**Saved on:** 2026-03-15
**Logic Purpose:** Ensure 100% uptime and reliable ticket delivery.
