import { publicSupabase } from '../lib/publicSupabase';


// ======================================================
// TYPES
// ======================================================

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};


export type Product = {
  id: string;

  sku: string | null;

  name: string;

  slug: string;

  brand: string | null;

  description: string | null;

  base_price: number;

  compare_at_price: number | null;

  stock_quantity: number;

  image_url: string | null;

  is_active: boolean;

  is_featured: boolean;

  is_trending: boolean;

  is_new_arrival: boolean;

  category_id: string | null;

  subcategory?: string | null;

  categories?:
    | ProductCategory
    | ProductCategory[]
    | null;
};


export type ProductVariant = {
  id: string;

  product_id: string;

  variant_name: string;

  variant_value: string;

  price: number;

  stock_quantity: number;

  sku: string | null;

  is_active: boolean;
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
        product.base_price ?? 0
      ),

    compare_at_price:
      product.compare_at_price ===
        null ||
      product.compare_at_price ===
        undefined
        ? null
        : Number(
            product.compare_at_price
          ),

    stock_quantity:
      Number(
        product.stock_quantity ?? 0
      ),

    is_active:
      Boolean(
        product.is_active
      ),

    is_featured:
      Boolean(
        product.is_featured
      ),

    is_trending:
      Boolean(
        product.is_trending
      ),

    is_new_arrival:
      Boolean(
        product.is_new_arrival
      ),
  };
}


// ======================================================
// GET ALL ACTIVE PRODUCTS
// ======================================================

export async function getActiveProducts(): Promise<
  Product[]
> {

  const {
    data,
    error,
  } =
    await publicSupabase
      .from('products')
      .select('*')
      .eq(
        'is_active',
        true
      )
      .order(
        'name',
        {
          ascending: true,
        }
      );


  if (error) {

    console.error(
      'getActiveProducts error:',
      error
    );

    throw error;
  }


  const products =
    (data ?? []).map(
      normalizeProduct
    );


  console.log(
    'Active products loaded:',
    products.length
  );


  return products;
}


// ======================================================
// GET PRODUCTS BY CATEGORY
// ======================================================

export async function getProductsByCategory(
  categoryId: string
): Promise<Product[]> {

  const cleanCategoryId =
    String(
      categoryId ?? ''
    ).trim();


  console.log(
    'Loading category ID:',
    cleanCategoryId
  );


  if (!cleanCategoryId) {

    console.log(
      'Category ID is empty.'
    );

    return [];
  }


  // ----------------------------------------------------
  // FIRST TRY:
  // Normal direct Supabase category query
  // ----------------------------------------------------

  const {
    data,
    error,
  } =
    await publicSupabase
      .from('products')
      .select('*')
      .eq(
        'is_active',
        true
      )
      .eq(
        'category_id',
        cleanCategoryId
      )
      .order(
        'name',
        {
          ascending: true,
        }
      );


  if (error) {

    console.error(
      'Direct category query error:',
      error
    );

  } else {

    const directProducts =
      (data ?? []).map(
        normalizeProduct
      );


    console.log(
      'Direct category products:',
      directProducts.length
    );


    if (
      directProducts.length >
      0
    ) {

      console.log(
        'Category products:',
        directProducts.map(
          (product) => ({
            id:
              product.id,

            name:
              product.name,

            category_id:
              product.category_id,

            active:
              product.is_active,
          })
        )
      );


      return directProducts;
    }
  }


  // ----------------------------------------------------
  // FALLBACK:
  // Load active products and filter locally.
  //
  // This avoids the problem where the category-specific
  // PostgREST filter returns zero even though the product
  // exists and is active.
  // ----------------------------------------------------

  console.log(
    'Direct query returned 0. Using fallback.'
  );


  const allProducts =
    await getActiveProducts();


  const filtered =
    allProducts.filter(
      (product) => {

        const productCategoryId =
          product.category_id
            ? String(
                product.category_id
              ).trim()
            : '';


        return (
          productCategoryId ===
          cleanCategoryId
        );
      }
    );


  console.log(
    'Fallback category products:',
    filtered.length
  );


  console.log(
    'Fallback matched:',
    filtered.map(
      (product) => ({
        id:
          product.id,

        name:
          product.name,

        category_id:
          product.category_id,
      })
    )
  );


  return filtered;
}


// ======================================================
// GET PRODUCT BY ID
// ======================================================

export async function getProductById(
  productId: string
): Promise<Product | null> {

  const cleanProductId =
    String(
      productId ?? ''
    ).trim();


  if (!cleanProductId) {
    return null;
  }


  const {
    data,
    error,
  } =
    await publicSupabase
      .from('products')
      .select('*')
      .eq(
        'id',
        cleanProductId
      )
      .eq(
        'is_active',
        true
      )
      .maybeSingle();


  if (error) {

    console.error(
      'getProductById error:',
      error
    );

    throw error;
  }


  if (!data) {
    return null;
  }


  return normalizeProduct(
    data
  );
}


// ======================================================
// GET PRODUCT VARIANTS
// ======================================================

export async function getProductVariants(
  productId: string
): Promise<ProductVariant[]> {

  const cleanProductId =
    String(
      productId ?? ''
    ).trim();


  if (!cleanProductId) {
    return [];
  }


  const {
    data,
    error,
  } =
    await publicSupabase
      .from(
        'product_variants'
      )
      .select(`
        id,
        product_id,
        variant_name,
        variant_value,
        price,
        stock_quantity,
        sku,
        is_active
      `)
      .eq(
        'product_id',
        cleanProductId
      )
      .eq(
        'is_active',
        true
      )
      .order(
        'variant_value',
        {
          ascending: true,
        }
      );


  if (error) {

    console.error(
      'getProductVariants error:',
      error
    );

    throw error;
  }


  const variants: ProductVariant[] =
    (data ?? []).map(
      (variant: any) => ({
        id:
          variant.id,

        product_id:
          variant.product_id,

        variant_name:
          variant.variant_name,

        variant_value:
          variant.variant_value,

        price:
          Number(
            variant.price ?? 0
          ),

        stock_quantity:
          Number(
            variant.stock_quantity ??
              0
          ),

        sku:
          variant.sku ?? null,

        is_active:
          Boolean(
            variant.is_active
          ),
      })
    );


  console.log(
    'Loaded product variants:',
    variants
  );


  return variants;
}


// ======================================================
// SEARCH PRODUCTS
// ======================================================

export async function searchProducts(
  searchText: string
): Promise<Product[]> {

  const query =
    String(
      searchText ?? ''
    )
      .trim()
      .toLowerCase();


  const products =
    await getActiveProducts();


  if (!query) {
    return products;
  }


  return products.filter(
    (product) => {

      const name =
        product.name
          ?.toLowerCase() ??
        '';

      const sku =
        product.sku
          ?.toLowerCase() ??
        '';

      const brand =
        product.brand
          ?.toLowerCase() ??
        '';

      const description =
        product.description
          ?.toLowerCase() ??
        '';

      return (
        name.includes(
          query
        ) ||
        sku.includes(
          query
        ) ||
        brand.includes(
          query
        ) ||
        description.includes(
          query
        )
      );
    }
  );
}