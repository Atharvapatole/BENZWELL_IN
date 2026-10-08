# BENZWELL — Database Schema & Data Dictionary

Database: **Supabase PostgreSQL**

---

## Tables & Purpose

1. `profiles`: Extends Supabase auth users with roles (`customer`, `admin`, `editor`, `support`), phone numbers, and verification status.
2. `product_categories`: Product taxonomy (e.g. AI & Prompts, Ebooks, Courses, Templates).
3. `product_tags`: Flexible tags for filtering.
4. `products`: Core digital products catalogue (pricing, sale pricing, type, metadata, download rules).
5. `product_files`: Private file records referencing assets in `products-private` bucket.
6. `orders`: Orders state machine (`pending`, `payment_processing`, `paid`, `fulfilled`, `failed`, `refunded`) and Razorpay references.
7. `order_items`: Snapshots of product titles and prices at moment of purchase.
8. `payments`: Captured transaction references and gateway payloads.
9. `razorpay_webhook_events`: Stores raw webhook event IDs for idempotency deduplication.
10. `customer_entitlements`: Verified digital ownership records linking customers to purchased products.
11. `downloads`: Audit log recording IP address and timestamp of every download.
12. `coupons` & `coupon_usage`: Discount codes, validation rules, and customer usage counters.
13. `reviews`: Customer reviews with verified purchaser badges and admin moderation.
14. `blogs` & `blog_categories`: Editorial articles and SEO content.
15. `pages`: Zod-validated block structures for the visual page builder.
16. `media`: Media library metadata for uploaded assets.
17. `site_settings`: Global settings for branding, SEO, Razorpay status, social links, and email.
18. `email_templates`: Dynamic templates with `{{variable}}` interpolation.
19. `otp_verifications`: HMAC SHA-256 hashed 6-digit codes with attempt limits and expiry.
20. `audit_logs`: Security audit trail for admin actions.
