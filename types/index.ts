export type UserRole = 'customer' | 'admin' | 'editor' | 'support';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_verified: boolean;
  is_disabled: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'digital' | 'ebook' | 'course' | 'template' | 'bundle' | 'guide';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  sku: string | null;
  category_id: string | null;
  category?: ProductCategory | null;
  product_type: ProductType;
  featured: boolean;
  status: ProductStatus;
  main_image: string | null;
  gallery: string[];
  tags: string[];
  what_is_included: string[];
  who_is_it_for: string[];
  file_info: {
    format?: string;
    size?: string;
    pages_or_duration?: string;
    version?: string;
  };
  download_limit: number;
  download_expiry_days: number;
  delivery_type?: 'upload' | 'external_url';
  external_download_url?: string | null;
  rating: number;
  review_count: number;
  sales_count: number;
  seo_title: string | null;
  seo_description: string | null;
  files?: ProductFile[];
  created_at: string;
  updated_at: string;
}

export interface ProductFile {
  id: string;
  product_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string | null;
  file_version: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'payment_processing' | 'paid' | 'fulfilled' | 'failed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  product?: Product | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature?: string | null;
  coupon_id: string | null;
  coupon?: Coupon | null;
  items?: OrderItem[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_gateway: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  raw_response: Record<string, any>;
  created_at: string;
}

export interface CustomerEntitlement {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  product?: Product;
  order?: Order;
  download_limit: number;
  downloads_used: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DownloadLog {
  id: string;
  entitlement_id: string;
  user_id: string;
  product_id: string;
  ip_address: string | null;
  user_agent: string | null;
  downloaded_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_user_limit: number;
  times_used: number;
  valid_from: string;
  expires_at: string | null;
  is_active: boolean;
  applicable_category_ids: string[];
  applicable_product_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user?: UserProfile;
  product?: Product;
  rating: number;
  title: string | null;
  comment: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  category?: BlogCategory | null;
  author_name: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// VISUAL BLOCK PAGE BUILDER TYPES (Elementor-Inspired Architecture)
// -----------------------------------------------------------------------------

export type BlockType =
  | 'section'
  | 'container'
  | 'hero'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'product_grid'
  | 'category_grid'
  | 'testimonials'
  | 'faq'
  | 'blog_grid'
  | 'spacer'
  | 'divider'
  | 'rich_text'
  | 'custom_html';

export interface BlockStyles {
  align?: 'left' | 'center' | 'right' | 'justify';
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  marginTop?: string;
  marginBottom?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  fontSize?: string;
  fontWeight?: string;
  maxWidth?: string;
  glassEffect?: boolean;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  props: Record<string, any>;
  styles?: BlockStyles;
  children?: PageBlock[];
}

export interface PageContentJSON {
  sections: PageBlock[];
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content_json: PageContentJSON;
  status: 'draft' | 'published' | 'archived';
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  alt_text: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SiteSettings {
  general: {
    site_name: string;
    tagline: string;
    support_email: string;
    support_phone: string;
    copyright_text: string;
    logo_url?: string;
    favicon_url?: string;
  };
  branding: {
    primary_color: string;
    accent_color: string;
    logo_text: string;
    show_badge: boolean;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    og_image: string;
    twitter_handle: string;
    google_verification_id?: string;
  };
  social: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    facebook?: string;
    pinterest?: string;
  };
  payments: {
    razorpay_enabled: boolean;
    test_mode: boolean;
    currency: string;
    key_id_configured?: boolean;
    secret_configured?: boolean;
    webhook_secret_configured?: boolean;
  };
  authentication: {
    require_email_verification: boolean;
    google_login_enabled: boolean;
    otp_expiry_minutes: number;
    max_otp_attempts: number;
    resend_cooldown_seconds: number;
    google_configured?: boolean;
  };
  marketing: {
    meta_pixel_id?: string;
    ga_id?: string;
    gtm_id?: string;
  };
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
