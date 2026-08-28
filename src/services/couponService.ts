import {
    publicSupabase,
} from '../lib/publicSupabase';


// ======================================================
// TYPES
// ======================================================

export type CouponDiscountType =
  | 'percentage'
  | 'fixed'
  | 'free_delivery';


export type Coupon = {
  id: string;

  code: string;

  description:
    string | null;

  discount_type:
    CouponDiscountType;

  discount_value:
    number;

  minimum_order_amount:
    number;

  maximum_discount:
    number | null;

  usage_limit:
    number | null;

  starts_at:
    string | null;

  expires_at:
    string | null;

  is_active:
    boolean;

  created_at?:
    string;

  updated_at?:
    string;
};


export type CouponResult = {
  coupon: Coupon;

  discount: number;

  freeDelivery: boolean;

  message: string;
};


// ======================================================
// FORMAT COUPON
// ======================================================

function formatCoupon(
  row: any
): Coupon {

  return {
    id:
      String(
        row.id
      ),

    code:
      String(
        row.code ?? ''
      ).toUpperCase(),

    description:
      row.description ??
      null,

    discount_type:
      row.discount_type,

    discount_value:
      Number(
        row.discount_value ??
          0
      ),

    minimum_order_amount:
      Number(
        row.minimum_order_amount ??
          0
      ),

    maximum_discount:
      row.maximum_discount ===
        null ||
      row.maximum_discount ===
        undefined
        ? null
        : Number(
            row.maximum_discount
          ),

    usage_limit:
      row.usage_limit ===
        null ||
      row.usage_limit ===
        undefined
        ? null
        : Number(
            row.usage_limit
          ),

    starts_at:
      row.starts_at ??
      null,

    expires_at:
      row.expires_at ??
      null,

    is_active:
      Boolean(
        row.is_active
      ),

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}


// ======================================================
// CHECK DATE
// ======================================================

function isCouponDateValid(
  coupon: Coupon
): boolean {

  const now =
    Date.now();


  if (
    coupon.starts_at
  ) {

    const start =
      new Date(
        coupon.starts_at
      ).getTime();


    if (
      now < start
    ) {
      return false;
    }
  }


  if (
    coupon.expires_at
  ) {

    const expiry =
      new Date(
        coupon.expires_at
      ).getTime();


    if (
      now > expiry
    ) {
      return false;
    }
  }


  return true;
}


// ======================================================
// CALCULATE COUPON
// ======================================================

export function calculateCouponDiscount(
  coupon: Coupon,
  subtotal: number
): CouponResult {

  const safeSubtotal =
    Math.max(
      0,
      Number(
        subtotal ?? 0
      )
    );


  // ====================================================
  // MINIMUM ORDER
  // ====================================================

  if (
    safeSubtotal <
    coupon.minimum_order_amount
  ) {

    throw new Error(
      `Minimum order amount for ${coupon.code} is Rs. ${coupon.minimum_order_amount.toLocaleString()}.`
    );
  }


  // ====================================================
  // FREE DELIVERY
  // ====================================================

  if (
    coupon.discount_type ===
    'free_delivery'
  ) {

    return {
      coupon,

      discount:
        0,

      freeDelivery:
        true,

      message:
        'Free delivery coupon applied.',
    };
  }


  let discount =
    0;


  // ====================================================
  // PERCENTAGE
  // ====================================================

  if (
    coupon.discount_type ===
    'percentage'
  ) {

    discount =
      (
        safeSubtotal *
        coupon.discount_value
      ) /
      100;
  }


  // ====================================================
  // FIXED AMOUNT
  // ====================================================

  if (
    coupon.discount_type ===
    'fixed'
  ) {

    discount =
      coupon.discount_value;
  }


  // ====================================================
  // MAXIMUM DISCOUNT
  // ====================================================

  if (
    coupon.maximum_discount !==
    null
  ) {

    discount =
      Math.min(
        discount,
        coupon.maximum_discount
      );
  }


  // Cannot discount more than subtotal

  discount =
    Math.min(
      discount,
      safeSubtotal
    );


  discount =
    Math.max(
      0,
      discount
    );


  discount =
    Number(
      discount.toFixed(2)
    );


  return {
    coupon,

    discount,

    freeDelivery:
      false,

    message:
      `${coupon.code} applied successfully.`,
  };
}


// ======================================================
// GET COUPON BY CODE
// ======================================================

export async function getCouponByCode(
  code: string
): Promise<Coupon | null> {

  const cleanCode =
    String(
      code ?? ''
    )
      .trim()
      .toUpperCase();


  if (
    !cleanCode
  ) {
    return null;
  }


  const {
    data,
    error,
  } =
    await publicSupabase
      .from(
        'coupons'
      )
      .select(`
        id,
        code,
        description,
        discount_type,
        discount_value,
        minimum_order_amount,
        maximum_discount,
        usage_limit,
        starts_at,
        expires_at,
        is_active,
        created_at,
        updated_at
      `)
      .eq(
        'code',
        cleanCode
      )
      .maybeSingle();


  if (
    error
  ) {

    console.error(
      'getCouponByCode error:',
      error
    );

    throw error;
  }


  if (
    !data
  ) {
    return null;
  }


  const coupon =
    formatCoupon(
      data
    );


  if (
    !coupon.is_active
  ) {
    return null;
  }


  if (
    !isCouponDateValid(
      coupon
    )
  ) {
    return null;
  }


  return coupon;
}


// ======================================================
// VALIDATE AND APPLY COUPON
// ======================================================

export async function applyCoupon(
  code: string,
  subtotal: number
): Promise<CouponResult> {

  const cleanCode =
    String(
      code ?? ''
    )
      .trim()
      .toUpperCase();


  if (
    !cleanCode
  ) {

    throw new Error(
      'Please enter a coupon code.'
    );
  }


  const coupon =
    await getCouponByCode(
      cleanCode
    );


  if (
    !coupon
  ) {

    throw new Error(
      'Invalid or expired coupon code.'
    );
  }


  return calculateCouponDiscount(
    coupon,
    subtotal
  );
}