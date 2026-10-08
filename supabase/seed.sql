-- =============================================================================
-- BENZWELL PRODUCTION INITIAL SEED DATA
-- Site Settings, Email Templates & Admin Configuration
-- Categories are 100% manually managed by Admin from Admin Panel
-- =============================================================================

-- 1. INITIAL SITE SETTINGS
INSERT INTO public.site_settings (key, value, category)
VALUES
    ('general', '{
        "site_name": "BENZWELL",
        "tagline": "Digital Products Built for Better Work, Learning & Growth",
        "support_email": "info@benzwell.in",
        "support_phone": "+91 98765 43210",
        "copyright_text": "© 2026 BENZWELL. All rights reserved."
    }'::jsonb, 'general'),

    ('branding', '{
        "primary_color": "#09090b",
        "accent_color": "#0ea5e9",
        "logo_text": "BENZWELL",
        "show_badge": true
    }'::jsonb, 'branding'),

    ('seo', '{
        "meta_title": "BENZWELL — Premium Digital Products, Guides & Templates",
        "meta_description": "Discover world-class digital products, ebooks, templates, and courses designed to accelerate your work, learning, and business growth.",
        "og_image": "https://benzwell.in/og-image.png",
        "twitter_handle": "@benzwell_in"
    }'::jsonb, 'seo'),

    ('social', '{
        "instagram": "https://instagram.com/benzwell",
        "twitter": "https://twitter.com/benzwell_in",
        "youtube": "https://youtube.com/@benzwell",
        "linkedin": "https://linkedin.com/company/benzwell"
    }'::jsonb, 'social'),

    ('payments', '{
        "razorpay_enabled": true,
        "test_mode": true,
        "currency": "INR"
    }'::jsonb, 'payments'),

    ('authentication', '{
        "require_email_verification": true,
        "google_login_enabled": true,
        "otp_expiry_minutes": 10,
        "max_otp_attempts": 5,
        "resend_cooldown_seconds": 60
    }'::jsonb, 'authentication')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. INITIAL EMAIL TEMPLATES
INSERT INTO public.email_templates (slug, name, subject, html_content, variables)
VALUES
    ('verification', 'Email Verification OTP', 'Your BenzWell Verification Code: {{otp_code}}', 
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 16px;">
        <h2 style="color: #09090b; font-size: 24px; margin-bottom: 16px;">Verify your BenzWell account</h2>
        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">Hi {{customer_name}},</p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">Please use the 6-digit verification code below to complete your registration or verify your email:</p>
        <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #09090b;">{{otp_code}}</span>
        </div>
        <p style="color: #71717a; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">© 2026 BenzWell. All rights reserved. benzwell.in</p>
    </div>',
    '["customer_name", "otp_code"]'::jsonb),

    ('order_confirmation', 'Order Confirmation & Download Access', 'Order Confirmed: #{{order_number}} — Access your BenzWell Products', 
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 16px;">
        <h2 style="color: #09090b; font-size: 24px; margin-bottom: 16px;">Thank you for your purchase!</h2>
        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">Hi {{customer_name}},</p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">Your payment for order <strong>#{{order_number}}</strong> of <strong>₹{{total_amount}}</strong> was successful.</p>
        <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h4 style="margin-top: 0; color: #09090b;">Your Purchased Products:</h4>
            <div style="color: #3f3f46; font-size: 15px;">{{products_list}}</div>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{{download_dashboard_url}}" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Access Downloads in My Account</a>
        </div>
        <p style="color: #71717a; font-size: 14px;">You can access and re-download your files anytime by logging in to your BenzWell account dashboard.</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">© 2026 BenzWell. All rights reserved. benzwell.in</p>
    </div>',
    '["customer_name", "order_number", "total_amount", "products_list", "download_dashboard_url"]'::jsonb),

    ('welcome', 'Welcome to BenzWell', 'Welcome to BenzWell — Premium Digital Products', 
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 16px;">
        <h2 style="color: #09090b; font-size: 24px; margin-bottom: 16px;">Welcome to BenzWell, {{customer_name}}!</h2>
        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">We are thrilled to have you join our community of creators, builders, and continuous learners.</p>
        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">Explore our curated collection of digital tools, blueprints, ebooks, and video courses designed to elevate your craft.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://benzwell.in/shop" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Explore the Shop</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">© 2026 BenzWell. All rights reserved. benzwell.in</p>
    </div>',
    '["customer_name"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET 
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content;
