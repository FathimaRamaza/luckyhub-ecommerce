import { publicSupabase } from '../lib/publicSupabase';

import {
    Product,
} from './productService';


// ======================================================
// TYPES
// ======================================================

export type OfferDiscountType =
  | 'percentage'
  | 'fixed';


export type ProductOffer = {
  id: string;

  product_id: string;

  title: string;

  discount_type:
    OfferDiscountType;

  discount_value: number;

  start_at: string;

  end_at: string;

  is_active: boolean;

  created_at?: string;

  updated_at?: string;

  product?: Product | null;
};


// ======================================================
// NORMALIZE PRODUCT
// ======================================================

function normalizeProduct(
  product: any
): Product {

  return {
    ...product,

    base_price:
      Number(
        product?.base_price ??
          0
      ),

    compare_at_price:
      product?.compare_at_price ===
        null ||
      product?.compare_at_price ===
        undefined
        ? null
        : Number(
            product.compare_at_price
          ),

    stock_quantity:
      Number(
        product?.stock_quantity ??
          0
      ),

    is_active:
      Boolean(
        product?.is_active
      ),

    is_featured:
      Boolean(
        product?.is_featured
      ),

    is_trending:
      Boolean(
        product?.is_trending
      ),

    is_new_arrival:
      Boolean(
        product?.is_new_arrival
      ),
  };
}


// ======================================================
// NORMALIZE OFFER
// ======================================================

function normalizeOffer(
  offer: any
): ProductOffer {

  let product:
    Product | null = null;


  if (offer?.products) {

    if (
      Array.isArray(
        offer.products
      )
    ) {

      if (
        offer.products.length >
        0
      ) {
        product =
          normalizeProduct(
            offer.products[0]
          );
      }

    } else {

      product =
        normalizeProduct(
          offer.products
        );
    }
  }


  return {
    id:
      String(
        offer.id
      ),

    product_id:
      String(
        offer.product_id
      ),

    title:
      String(
        offer.title ??
          'Flash Deal'
      ),

    discount_type:
      offer.discount_type ===
        'fixed'
        ? 'fixed'
        : 'percentage',

    discount_value:
      Number(
        offer.discount_value ??
          0
      ),

    start_at:
      String(
        offer.start_at
      ),

    end_at:
      String(
        offer.end_at
      ),

    is_active:
      Boolean(
        offer.is_active
      ),

    created_at:
      offer.created_at,

    updated_at:
      offer.updated_at,

    product,
  };
}


// ======================================================
// CALCULATE OFFER PRICE
// ======================================================

export function calculateOfferPrice(
  normalPrice: number,
  offer:
    ProductOffer | null | undefined
): number {

  const price =
    Number(
      normalPrice ?? 0
    );


  if (
    !offer ||
    price <= 0
  ) {
    return price;
  }


  const discount =
    Number(
      offer.discount_value ??
        0
    );


  let offerPrice =
    price;


  if (
    offer.discount_type ===
    'percentage'
  ) {

    offerPrice =
      price -
      (
        price *
        discount
      ) /
        100;

  } else {

    offerPrice =
      price -
      discount;
  }


  offerPrice =
    Math.max(
      0,
      offerPrice
    );


  return Number(
    offerPrice.toFixed(2)
  );
}


// ======================================================
// DISCOUNT PERCENTAGE
// Used for display badge
// ======================================================

export function getOfferPercentage(
  normalPrice: number,
  offer:
    ProductOffer | null | undefined
): number {

  if (!offer) {
    return 0;
  }


  if (
    offer.discount_type ===
    'percentage'
  ) {

    return Math.round(
      Number(
        offer.discount_value
      )
    );
  }


  const price =
    Number(
      normalPrice ?? 0
    );


  if (
    price <= 0
  ) {
    return 0;
  }


  return Math.round(
    (
      Number(
        offer.discount_value
      ) /
      price
    ) *
      100
  );
}


// ======================================================
// CHECK WHETHER OFFER IS CURRENTLY VALID
// ======================================================

export function isOfferCurrentlyActive(
  offer:
    ProductOffer | null | undefined
): boolean {

  if (
    !offer ||
    !offer.is_active
  ) {
    return false;
  }


  const now =
    new Date().getTime();


  const start =
    new Date(
      offer.start_at
    ).getTime();


  const end =
    new Date(
      offer.end_at
    ).getTime();


  return (
    now >= start &&
    now <= end
  );
}


// ======================================================
// GET ALL ACTIVE OFFERS
// ======================================================

export async function getActiveOffers():
Promise<ProductOffer[]> {

  const now =
    new Date().toISOString();


  const {
    data,
    error,
  } =
    await publicSupabase
      .from(
        'product_offers'
      )
      .select(`
        id,
        product_id,
        title,
        discount_type,
        discount_value,
        start_at,
        end_at,
        is_active,
        created_at,
        updated_at,
        products (
          *
        )
      `)
      .eq(
        'is_active',
        true
      )
      .lte(
        'start_at',
        now
      )
      .gte(
        'end_at',
        now
      )
      .order(
        'end_at',
        {
          ascending: true,
        }
      );


  if (error) {

    console.error(
      'getActiveOffers error:',
      error
    );

    throw error;
  }


  const offers =
    (data ?? [])
      .map(
        normalizeOffer
      )
      .filter(
        offer =>
          offer.product &&
          offer.product.is_active &&
          isOfferCurrentlyActive(
            offer
          )
      );


  console.log(
    'Active offers loaded:',
    offers.map(
      offer => ({
        product:
          offer.product?.name,

        normalPrice:
          offer.product?.base_price,

        offerPrice:
          calculateOfferPrice(
            Number(
              offer.product?.base_price ??
                0
            ),
            offer
          ),

        discount:
          `${getOfferPercentage(
            Number(
              offer.product?.base_price ??
                0
            ),
            offer
          )}%`,
      })
    )
  );


  return offers;
}


// ======================================================
// GET ACTIVE OFFER FOR ONE PRODUCT
// ======================================================

export async function getActiveOfferByProductId(
  productId: string
): Promise<ProductOffer | null> {

  const cleanProductId =
    String(
      productId ?? ''
    ).trim();


  if (!cleanProductId) {
    return null;
  }


  const now =
    new Date().toISOString();


  const {
    data,
    error,
  } =
    await publicSupabase
      .from(
        'product_offers'
      )
      .select(`
        id,
        product_id,
        title,
        discount_type,
        discount_value,
        start_at,
        end_at,
        is_active,
        created_at,
        updated_at
      `)
      .eq(
        'product_id',
        cleanProductId
      )
      .eq(
        'is_active',
        true
      )
      .lte(
        'start_at',
        now
      )
      .gte(
        'end_at',
        now
      )
      .order(
        'end_at',
        {
          ascending: true,
        }
      )
      .limit(1)
      .maybeSingle();


  if (error) {

    console.error(
      'getActiveOfferByProductId error:',
      error
    );

    throw error;
  }


  if (!data) {
    return null;
  }


  const offer =
    normalizeOffer(
      data
    );


  if (
    !isOfferCurrentlyActive(
      offer
    )
  ) {
    return null;
  }


  return offer;
}