import { supabase } from '../lib/supabase';

import {
  calculateOfferPrice,
  isOfferCurrentlyActive,
  ProductOffer,
} from './offerService';


// ======================================================
// TYPES
// ======================================================

export type CartProduct = {
  id: string;
  sku: string | null;
  name: string;
  slug: string;
  brand: string | null;
  base_price: number;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
};


export type CartVariant = {
  id: string;
  product_id: string;
  variant_name: string;
  variant_value: string;
  price: number;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean;
};


export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;

  products: CartProduct | null;

  product_variants: CartVariant | null;

  active_offer: ProductOffer | null;
};


// ======================================================
// GET LOGGED-IN USER
// ======================================================

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      'getCurrentUserId error:',
      error
    );

    throw error;
  }

  if (!user) {
    throw new Error(
      'You must be logged in to use the cart.'
    );
  }

  return user.id;
}


// ======================================================
// FORMAT PRODUCT
// ======================================================

function formatProduct(
  product: any
): CartProduct | null {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    sku: product.sku ?? null,
    name: product.name,
    slug: product.slug,
    brand: product.brand ?? null,

    base_price: Number(
      product.base_price ?? 0
    ),

    image_url:
      product.image_url ?? null,

    stock_quantity: Number(
      product.stock_quantity ?? 0
    ),

    is_active:
      Boolean(product.is_active),
  };
}


// ======================================================
// FORMAT VARIANT
// ======================================================

function formatVariant(
  variant: any
): CartVariant | null {
  if (!variant) {
    return null;
  }

  return {
    id: variant.id,

    product_id:
      variant.product_id,

    variant_name:
      variant.variant_name,

    variant_value:
      variant.variant_value,

    price: Number(
      variant.price ?? 0
    ),

    stock_quantity: Number(
      variant.stock_quantity ?? 0
    ),

    sku:
      variant.sku ?? null,

    is_active:
      Boolean(variant.is_active),
  };
}


// ======================================================
// FORMAT OFFER
// ======================================================

function formatOffer(
  offer: any
): ProductOffer | null {
  if (!offer) {
    return null;
  }

  const formattedOffer: ProductOffer = {
    id:
      String(offer.id),

    product_id:
      String(offer.product_id),

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

    product:
      null,
  };

  if (
    !isOfferCurrentlyActive(
      formattedOffer
    )
  ) {
    return null;
  }

  return formattedOffer;
}


// ======================================================
// FORMAT CART ITEM
// ======================================================

function formatCartItem(
  row: any
): CartItem {
  return {
    id: row.id,

    user_id:
      row.user_id,

    product_id:
      row.product_id,

    variant_id:
      row.variant_id ?? null,

    quantity: Number(
      row.quantity ?? 1
    ),

    products:
      formatProduct(
        Array.isArray(row.products)
          ? row.products[0]
          : row.products
      ),

    product_variants:
      formatVariant(
        Array.isArray(
          row.product_variants
        )
          ? row.product_variants[0]
          : row.product_variants
      ),

    active_offer:
      null,
  };
}


// ======================================================
// GET CART ITEMS
// ======================================================

export async function getCartItems(): Promise<
  CartItem[]
> {
  const userId =
    await getCurrentUserId();

  const { data, error } =
    await supabase
      .from('cart_items')
      .select(`
        id,
        user_id,
        product_id,
        variant_id,
        quantity,

        products (
          id,
          sku,
          name,
          slug,
          brand,
          base_price,
          image_url,
          stock_quantity,
          is_active
        ),

        product_variants (
          id,
          product_id,
          variant_name,
          variant_value,
          price,
          stock_quantity,
          sku,
          is_active
        )
      `)
      .eq(
        'user_id',
        userId
      )
      .order(
        'id',
        {
          ascending: false,
        }
      );

  if (error) {
    console.error(
      'getCartItems error:',
      error
    );

    throw error;
  }

  const items =
    (data ?? []).map(
      formatCartItem
    );

  if (items.length === 0) {
    return items;
  }

  // ====================================================
  // LOAD CURRENT ACTIVE OFFERS FOR CART PRODUCTS
  // ====================================================

  const productIds =
    Array.from(
      new Set(
        items.map(
          item =>
            item.product_id
        )
      )
    );

  const now =
    new Date().toISOString();

  const {
    data: offerData,
    error: offerError,
  } =
    await supabase
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
      .in(
        'product_id',
        productIds
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
      );

  if (offerError) {
    console.error(
      'getCartItems offers error:',
      offerError
    );

    throw offerError;
  }

  const offerMap =
    new Map<
      string,
      ProductOffer
    >();

  for (
    const rawOffer
    of offerData ?? []
  ) {
    const formattedOffer =
      formatOffer(
        rawOffer
      );

    if (
      formattedOffer &&
      !offerMap.has(
        formattedOffer.product_id
      )
    ) {
      offerMap.set(
        formattedOffer.product_id,
        formattedOffer
      );
    }
  }

  const itemsWithOffers =
    items.map(
      item => ({
        ...item,

        active_offer:
          offerMap.get(
            item.product_id
          ) ??
          null,
      })
    );

  console.log(
    'Cart items with offers:',
    itemsWithOffers.map(
      item => ({
        product:
          item.products?.name,

        variant:
          item.product_variants
            ?.variant_value ??
          null,

        normalPrice:
          getCartItemNormalPrice(
            item
          ),

        finalPrice:
          getCartItemPrice(
            item
          ),

        offer:
          item.active_offer
            ?.title ??
          null,
      })
    )
  );

  return itemsWithOffers;
}


// ======================================================
// ADD PRODUCT TO CART
// ======================================================

export async function addToCart(
  productId: string,
  quantity: number = 1,
  variantId: string | null = null
): Promise<void> {

  const userId =
    await getCurrentUserId();


  const safeQuantity =
    Math.max(
      1,
      Math.floor(quantity)
    );


  // ====================================================
  // CHECK IF ITEM ALREADY EXISTS
  // ====================================================

  let existingQuery =
    supabase
      .from('cart_items')
      .select(`
        id,
        quantity
      `)
      .eq(
        'user_id',
        userId
      )
      .eq(
        'product_id',
        productId
      );


  if (variantId) {
    existingQuery =
      existingQuery.eq(
        'variant_id',
        variantId
      );
  } else {
    existingQuery =
      existingQuery.is(
        'variant_id',
        null
      );
  }


  const {
    data: existingItem,
    error: existingError,
  } =
    await existingQuery
      .maybeSingle();


  if (existingError) {
    console.error(
      'addToCart existing item error:',
      existingError
    );

    throw existingError;
  }


  // ====================================================
  // IF ALREADY IN CART → INCREASE QUANTITY
  // ====================================================

  if (existingItem) {

    const newQuantity =
      Number(
        existingItem.quantity ?? 0
      ) + safeQuantity;


    const {
      error: updateError,
    } =
      await supabase
        .from('cart_items')
        .update({
          quantity:
            newQuantity,
        })
        .eq(
          'id',
          existingItem.id
        )
        .eq(
          'user_id',
          userId
        );


    if (updateError) {
      console.error(
        'addToCart update error:',
        updateError
      );

      throw updateError;
    }


    return;
  }


  // ====================================================
  // NEW CART ITEM
  // ====================================================

  const {
    error: insertError,
  } =
    await supabase
      .from('cart_items')
      .insert({
        user_id:
          userId,

        product_id:
          productId,

        variant_id:
          variantId,

        quantity:
          safeQuantity,
      });


  if (insertError) {
    console.error(
      'addToCart insert error:',
      insertError
    );

    throw insertError;
  }
}


// ======================================================
// UPDATE CART QUANTITY
// ======================================================

export async function updateCartQuantity(
  cartItemId: string,
  quantity: number
): Promise<void> {

  const userId =
    await getCurrentUserId();


  const safeQuantity =
    Math.floor(quantity);


  // If quantity becomes 0,
  // remove the item completely.

  if (safeQuantity <= 0) {

    await removeCartItem(
      cartItemId
    );

    return;
  }


  const { error } =
    await supabase
      .from('cart_items')
      .update({
        quantity:
          safeQuantity,
      })
      .eq(
        'id',
        cartItemId
      )
      .eq(
        'user_id',
        userId
      );


  if (error) {
    console.error(
      'updateCartQuantity error:',
      error
    );

    throw error;
  }
}


// ======================================================
// REMOVE ONE CART ITEM
// ======================================================

export async function removeCartItem(
  cartItemId: string
): Promise<void> {

  const userId =
    await getCurrentUserId();


  const { error } =
    await supabase
      .from('cart_items')
      .delete()
      .eq(
        'id',
        cartItemId
      )
      .eq(
        'user_id',
        userId
      );


  if (error) {
    console.error(
      'removeCartItem error:',
      error
    );

    throw error;
  }
}


// ======================================================
// CLEAR ENTIRE CART
// ======================================================

export async function clearCart(): Promise<void> {

  const userId =
    await getCurrentUserId();


  const { error } =
    await supabase
      .from('cart_items')
      .delete()
      .eq(
        'user_id',
        userId
      );


  if (error) {
    console.error(
      'clearCart error:',
      error
    );

    throw error;
  }
}


// ======================================================
// GET NORMAL CART ITEM PRICE
// ======================================================

export function getCartItemNormalPrice(
  item: CartItem
): number {

  if (
    item.product_variants &&
    item.product_variants.price > 0
  ) {
    return Number(
      item.product_variants.price
    );
  }


  return Number(
    item.products?.base_price ??
      0
  );
}


// ======================================================
// GET FINAL CART ITEM PRICE
// Includes current active offer
// ======================================================

export function getCartItemPrice(
  item: CartItem
): number {

  const normalPrice =
    getCartItemNormalPrice(
      item
    );

  if (
    item.active_offer &&
    isOfferCurrentlyActive(
      item.active_offer
    )
  ) {
    return calculateOfferPrice(
      normalPrice,
      item.active_offer
    );
  }

  return normalPrice;
}


// ======================================================
// CHECK IF CART ITEM HAS ACTIVE OFFER
// ======================================================

export function hasCartItemOffer(
  item: CartItem
): boolean {

  const normalPrice =
    getCartItemNormalPrice(
      item
    );

  const finalPrice =
    getCartItemPrice(
      item
    );

  return (
    Boolean(
      item.active_offer
    ) &&
    finalPrice <
      normalPrice
  );
}


// ======================================================
// GET CART ITEM SAVING PER UNIT
// ======================================================

export function getCartItemSaving(
  item: CartItem
): number {

  const normalPrice =
    getCartItemNormalPrice(
      item
    );

  const finalPrice =
    getCartItemPrice(
      item
    );

  return Math.max(
    0,
    normalPrice -
      finalPrice
  );
}


// ======================================================
// GET CART SUBTOTAL
// ======================================================

export function getCartSubtotal(
  items: CartItem[]
): number {

  return items.reduce(
    (
      total,
      item
    ) => {

      const price =
        getCartItemPrice(
          item
        );


      return (
        total +
        price *
          item.quantity
      );
    },
    0
  );
}


// ======================================================
// GET TOTAL CART QUANTITY
// ======================================================

export function getCartQuantity(
  items: CartItem[]
): number {

  return items.reduce(
    (
      total,
      item
    ) =>
      total +
      item.quantity,
    0
  );
}
