# BENZWELL — Authentication & Account Architecture

## 1. Authentication Flows

### A. Email Registration & OTP Verification
1. User enters Full Name, Email, Phone, and Password at `/register`.
2. Supabase Auth creates the user and triggers our server action `registerCustomer`.
3. A 6-digit cryptographically random OTP is generated, hashed with HMAC SHA-256, and stored in `otp_verifications` with a 10-minute expiry.
4. Resend dispatches the verification code to the customer's email.
5. Customer enters the 6-digit code at `/verify-email`. Once verified, `profiles.is_verified` is updated to `true` and the user proceeds to checkout or dashboard.

### B. Google Sign-In
1. Customer clicks **Continue with Google** at `/login` or `/register`.
2. Supabase handles OAuth delegation with Google.
3. Upon return, the route handler `/api/auth/callback/google` exchanges the authorization code for a session, creates/updates `profiles`, and automatically marks the account as verified (as Google has already verified the email).

### C. Administrator Authentication
1. Admin logs in at `/admin/login`.
2. The server verifies credentials against Supabase Auth and checks that `profiles.role === 'admin'`.
3. An audit log entry is recorded in `audit_logs` with action `ADMIN_LOGIN_SUCCESS`.
4. Middleware protects all `/admin/*` routes from unauthorized users.
