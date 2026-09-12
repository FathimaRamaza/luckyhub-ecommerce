import { supabase } from '../lib/supabase';

import {
    getProductById,
    Product,
} from './productService';


// ======================================================
// GET CURRENT USER
// ======================================================

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      'Please login to use your wishlist.'
    );
  }

  return user;
}


// ======================================================
// CHECK PRODUCT
// ======================================================

export async function isProductInWishlist(
  productId: string
) {
  const user =
    await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from('wishlist')
    .select('id')
    .eq(
      'user_id',
      user.id
    )
    .eq(
      'product_id',
      productId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}


// ======================================================
// ADD TO WISHLIST
// ======================================================

export async function addToWishlist(
  productId: string
) {
  const user =
    await getCurrentUser();

  const {
    data: existing,
    error:
      existingError,
  } = await supabase
    .from('wishlist')
    .select('id')
    .eq(
      'user_id',
      user.id
    )
    .eq(
      'product_id',
      productId
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('wishlist')
    .insert({
      user_id:
        user.id,

      product_id:
        productId,
    });

  if (error) {
    throw error;
  }
}


// ======================================================
// REMOVE FROM WISHLIST
// ======================================================

export async function removeFromWishlist(
  productId: string
) {
  const user =
    await getCurrentUser();

  const {
    error,
  } = await supabase
    .from('wishlist')
    .delete()
    .eq(
      'user_id',
      user.id
    )
    .eq(
      'product_id',
      productId
    );

  if (error) {
    throw error;
  }
}


// ======================================================
// TOGGLE
// ======================================================

export async function toggleWishlist(
  productId: string
) {
  const exists =
    await isProductInWishlist(
      productId
    );

  if (exists) {
    await removeFromWishlist(
      productId
    );

    return false;
  }

  await addToWishlist(
    productId
  );

  return true;
}


// ======================================================
// GET WISHLIST PRODUCTS
// ======================================================

export async function getWishlistProducts():
  Promise<Product[]> {

  const user =
    await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from('wishlist')
    .select(`
      product_id,
      created_at
    `)
    .eq(
      'user_id',
      user.id
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    );

  if (error) {
    throw error;
  }

  const rows =
    data ?? [];

  if (
    rows.length ===
    0
  ) {
    return [];
  }

  const products =
    await Promise.all(
      rows.map(
        async row => {
          try {
            return await getProductById(
              row.product_id
            );
          } catch {
            return null;
          }
        }
      )
    );

  return products.filter(
    (
      product
    ): product is Product =>
      product !==
      null
  );
}


// ======================================================
// GET WISHLIST COUNT
// ======================================================

export async function getWishlistCount() {
  const user =
    await getCurrentUser();

  const {
    count,
    error,
  } = await supabase
    .from('wishlist')
    .select(
      'id',
      {
        count:
          'exact',
        head: true,
      }
    )
    .eq(
      'user_id',
      user.id
    );

  if (error) {
    throw error;
  }

  return count ?? 0;
}