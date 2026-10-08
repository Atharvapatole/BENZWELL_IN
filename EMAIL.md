# BENZWELL — Transactional Email & Resend Integration

## 1. Overview
All transactional emails are sent via [Resend](https://resend.com) from the verified domain `info@benzwell.in`.

---

## 2. Integrated Templates

1. **Verification OTP (`verification`):** Dispatches the 6-digit code for account verification.
2. **Order Confirmation (`order_confirmation`):** Dispatches purchased item summaries, payment totals, and direct download links.
3. **Welcome Email (`welcome`):** Dispatches community introduction and catalog overview.
4. **Password Reset (`password_reset`):** Dispatches secure account recovery links.

---

## 3. Dynamic Template Customization
Admins can customize email subject lines and template copy from the database `email_templates` table or Admin Settings without editing application code. Placeholders like `{{customer_name}}`, `{{otp_code}}`, and `{{order_number}}` are safely interpolated at runtime.
