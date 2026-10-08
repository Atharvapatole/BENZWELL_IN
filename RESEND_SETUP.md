# BENZWELL — RESEND TRANSACTIONAL EMAIL SETUP

BenzWell uses **Resend** for transactional email delivery. All customer communications are standardized to use **BenzWell `info@benzwell.in`**.

---

## 1. Creating a Resend Account & API Key
1. Sign up at [https://resend.com](https://resend.com).
2. Navigate to **API Keys** → Click **Create API Key**.
3. Name it `BenzWell Production` and grant Full Access permissions.
4. Copy the API key (`re_...`).

---

## 2. Domain Verification in Resend
1. In Resend Dashboard, go to **Domains** → Click **Add Domain**.
2. Enter `benzwell.in`.
3. Add the generated DNS records into **Hostinger DNS Zone**:

| Record Type | Name / Host | Value / Destination | Priority |
| :--- | :--- | :--- | :--- |
| **MX** | `send` | `feedback-smtp.resend.com` | `10` |
| **TXT** | `send` | `v=spf1 include:resend.com ~all` | — |
| **TXT** | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQU...` | — |

4. Click **Verify Domain** in Resend. Once verified, emails sent from `info@benzwell.in` will pass SPF, DKIM, and DMARC checks.

---

## 3. Configuring Resend in BenzWell

### Method A: Admin Settings Panel (Recommended)
1. Go to `https://benzwell.in/admin/settings`.
2. Select the **Email** tab.
3. Enter your **Resend API Key**.
4. Confirm:
   - **From Name:** `BenzWell`
   - **From Email:** `info@benzwell.in`
   - **Reply-To:** `info@benzwell.in`
5. Click **Save Email Credentials**.
6. Use the **Test Email Dispatch** tool to send a test message to your personal inbox.

### Method B: Environment Variables
Add to your Hostinger environment:
```ini
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=info@benzwell.in
RESEND_FROM_NAME=BenzWell
RESEND_REPLY_TO=info@benzwell.in
```

---

## 4. Email Notification Routing

- **Customer Receipts & Welcome:** Sent from `BenzWell <info@benzwell.in>` to customer.
- **OTP Verification & Password Resets:** Sent from `BenzWell <info@benzwell.in>` to customer.
- **Product Gift Delivery:** Sent from `BenzWell <info@benzwell.in>` to customer.
- **Customer Contact Us Inquiries:** Notification forwarded to `ceo.office.atharva@gmail.com`.
- **Admin Inquiries Reply:** Dispatched directly to customer from `BenzWell <info@benzwell.in>` with `Reply-To: info@benzwell.in`.
