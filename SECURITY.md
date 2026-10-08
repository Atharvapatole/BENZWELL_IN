# BENZWELL — Security Architecture & Hardening

Security is treated as a first-class requirement across every layer of the BenzWell architecture.

---

## 1. Zero-Trust Client Pricing & Payments

* **Authoritative Prices:** The browser client transmits only product IDs and requested quantities. The server retrieves true prices from the database `products` table and computes the subtotal, coupon discounts, and total amount.
* **Payment Signature Verification:** Upon checkout completion, the cryptographic signature is verified using HMAC SHA-256 (`crypto.timingSafeEqual`) on the server before marking any order as paid.
* **Webhook Idempotency:** The `/api/webhooks/razorpay` endpoint verifies raw request payload signatures and records event IDs in `razorpay_webhook_events`. Duplicate webhook deliveries are ignored safely to prevent duplicate fulfillment.

---

## 2. Protected Digital Storage & Anti-Piracy

* **Private Storage:** Digital files are stored exclusively in the private Supabase bucket (`products-private`). No public URLs are ever exposed.
* **Entitlement Verification:** Download endpoints (`getSecureDownloadUrl`) check that:
  1. The user is actively authenticated.
  2. The customer has a valid, active purchase record in `customer_entitlements`.
  3. The download count has not exceeded `download_limit`.
  4. The purchase access period has not expired (`expires_at`).
* **Short-Lived Signed URLs:** If authorized, a temporary signed URL valid for only 60 seconds is generated and logged to the `downloads` audit table.

---

## 3. Cryptographic OTP Verification

* **Hashed Code Storage:** Plaintext 6-digit verification codes are never stored in the database. Instead, an HMAC SHA-256 hash salted with server secret and normalized email is stored.
* **Brute-Force & Timing Attack Protection:** Verification uses `crypto.timingSafeEqual`. Max 5 attempts are permitted per OTP before invalidation. A 60-second cooldown is enforced between code requests.

---

## 4. Server-Side Authorization & Middleware

* **Role Verification:** Admin routes (`/admin/*`) are protected server-side via Next.js Middleware and verified in server actions by checking `profiles.role === 'admin'`. Frontend `display:none` is never relied on for access control.
* **Row Level Security (RLS):** Enabled on all Supabase tables. Customers can only read and update their own profiles, orders, and entitlements.

---

## 5. Sanitized Content Rendering

* The Visual Block Builder and rich-text CMS strictly sanitize custom HTML input using `sanitizeHtml` to eliminate XSS vectors, inline event handlers, and malicious `<script>` injection.
