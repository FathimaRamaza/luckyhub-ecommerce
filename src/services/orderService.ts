import { supabase } from '../lib/supabase';

import {
  getCartItemPrice,
  getCartItems,
} from './cartService';


import {
  applyCoupon,
  CouponResult,
} from './couponService';


// ======================================================
// TYPES
// ======================================================

export type CheckoutAddress = {
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
};


export type CreateOrderInput = {
  deliveryMethod:
    | 'Standard Delivery'
    | 'Store Pickup';

  paymentMethod:
    | 'Cash on Delivery';

  deliveryFee: number;

  discount: number;

  couponCode?:
    | string
    | null;

  address:
    | CheckoutAddress
    | null;
};


export type CreatedOrder = {
  orderId: string;

  orderNumber: string;

  subtotal: number;

  deliveryFee: number;

  discount: number;

  total: number;

  itemCount: number;

  couponCode:
    | string
    | null;
};


// ======================================================
// GET CURRENT USER
// ======================================================

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();


  if (error) {
    console.error(
      'getCurrentUser error:',
      error
    );

    throw error;
  }


  if (!user) {
    throw new Error(
      'Please login before placing an order.'
    );
  }


  return user;
}


// ======================================================
// GENERATE ORDER NUMBER
// ======================================================

function generateOrderNumber() {
  const now = new Date();


  const year = now
    .getFullYear()
    .toString()
    .slice(-2);


  const month = String(
    now.getMonth() + 1
  ).padStart(
    2,
    '0'
  );


  const day = String(
    now.getDate()
  ).padStart(
    2,
    '0'
  );


  const timePart = Date.now()
    .toString()
    .slice(-6);


  return `LH${year}${month}${day}${timePart}`;
}


// ======================================================
// CREATE ORDER
// ======================================================

export async function createOrder(
  input: CreateOrderInput
): Promise<CreatedOrder> {

  // ====================================================
  // USER
  // ====================================================

  const user =
    await getCurrentUser();


  // ====================================================
  // GET FRESH CART
  // ====================================================

  const cartItems =
    await getCartItems();


  if (
    cartItems.length === 0
  ) {
    throw new Error(
      'Your cart is empty.'
    );
  }


  // ====================================================
  // VALIDATE PRODUCTS AND STOCK
  // ====================================================

  for (
    const item
    of cartItems
  ) {

    const product =
      item.products;


    if (!product) {
      throw new Error(
        'One of the cart products is no longer available.'
      );
    }


    if (
      !product.is_active
    ) {
      throw new Error(
        `${product.name} is currently unavailable.`
      );
    }


    const availableStock =
      item.product_variants
        ? Number(
            item
              .product_variants
              .stock_quantity ??
              0
          )
        : Number(
            product
              .stock_quantity ??
              0
          );


    if (
      availableStock <= 0
    ) {
      throw new Error(
        `${product.name} is out of stock.`
      );
    }


    if (
      item.quantity >
      availableStock
    ) {
      throw new Error(
        `Only ${availableStock} item(s) of ${product.name} are available.`
      );
    }
  }


  // ====================================================
  // SUBTOTAL
  // ====================================================

  const subtotal =
    cartItems.reduce(
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


  // ====================================================
  // COUPON - REVALIDATE AGAIN BEFORE ORDER
  // ====================================================

  let couponResult:
    CouponResult | null =
    null;


  const cleanCouponCode =
    String(
      input.couponCode ??
        ''
    )
      .trim()
      .toUpperCase();


  if (
    cleanCouponCode
  ) {

    couponResult =
      await applyCoupon(
        cleanCouponCode,
        subtotal
      );
  }


  // ====================================================
  // DISCOUNT
  // ====================================================

  const discount =
    couponResult
      ? Math.max(
          0,
          Number(
            couponResult.discount
          )
        )
      : Math.max(
          0,
          Number(
            input.discount ??
              0
          )
        );


  // ====================================================
  // DELIVERY FEE
  // Free-delivery coupon overrides delivery fee.
  // ====================================================

  const deliveryFee =
    couponResult
      ?.freeDelivery
      ? 0
      : Math.max(
          0,
          Number(
            input.deliveryFee ??
              0
          )
        );


  // ====================================================
  // TOTAL
  // ====================================================

  const total =
    Math.max(
      0,
      subtotal +
        deliveryFee -
        discount
    );


  // ====================================================
  // ITEM COUNT
  // ====================================================

  const itemCount =
    cartItems.reduce(
      (
        count,
        item
      ) =>
        count +
        item.quantity,
      0
    );


  // ====================================================
  // CUSTOMER DETAILS
  // ====================================================

  let addressId:
    string | null =
    null;


  let customerName =
    input.address
      ?.fullName
      ?.trim() ||
    user.user_metadata
      ?.full_name ||
    'Customer';


  let customerPhone =
    input.address
      ?.mobile
      ?.trim() ||
    user.user_metadata
      ?.phone ||
    '';


  let deliveryAddress =
    'Store Pickup - Lucky Hub';


  // ====================================================
  // SAVE STANDARD DELIVERY ADDRESS
  //
  // REAL DB COLUMNS:
  // address_line_1
  // address_line_2
  // ====================================================

  if (
    input.deliveryMethod ===
    'Standard Delivery'
  ) {

    if (
      !input.address
    ) {
      throw new Error(
        'Delivery address is required.'
      );
    }


    const address =
      input.address;


    customerName =
      address.fullName.trim();


    customerPhone =
      address.mobile.trim();


    deliveryAddress =
      [
        address.addressLine1.trim(),

        address.addressLine2.trim(),

        address.city.trim(),

        address.postalCode.trim(),
      ]
        .filter(Boolean)
        .join(', ');


    const {
      data: savedAddress,
      error: addressError,
    } =
      await supabase
        .from('addresses')
        .insert({

          user_id:
            user.id,

          recipient_name:
            customerName,

          phone:
            customerPhone,

          address_line_1:
            address
              .addressLine1
              .trim(),

          address_line_2:
            address
              .addressLine2
              .trim() ||
            null,

          city:
            address
              .city
              .trim(),

          postal_code:
            address
              .postalCode
              .trim() ||
            null,

          is_default:
            false,

        })
        .select('id')
        .single();


    if (
      addressError
    ) {
      console.error(
        'Save address error:',
        addressError
      );

      throw addressError;
    }


    addressId =
      savedAddress.id;
  }


  // ====================================================
  // ORDER NUMBER
  // ====================================================

  const orderNumber =
    generateOrderNumber();


  // ====================================================
  // CREATE ORDER
  //
  // REAL DB COLUMN:
  // delivery_address
  // ====================================================

  const {
    data: order,
    error: orderError,
  } =
    await supabase
      .from('orders')
      .insert({

        user_id:
          user.id,

        address_id:
          addressId,

        order_number:
          orderNumber,

        status:
          'Processing',

        payment_method:
          input.paymentMethod,

        payment_status:
          'Pending',

        delivery_method:
          input.deliveryMethod,

        subtotal:
          subtotal,

        discount:
          discount,

        delivery_fee:
          deliveryFee,

        total:
          total,

        tracking_number:
          null,

        estimated_delivery:
          null,

        customer_name:
          customerName,

        customer_phone:
          customerPhone,

        delivery_address:
          deliveryAddress,

        notes:
          null,

      })
      .select(`
        id,
        order_number
      `)
      .single();


  if (
    orderError
  ) {
    console.error(
      'Create order error:',
      orderError
    );

    throw orderError;
  }


  // ====================================================
  // PREPARE ORDER ITEMS
  //
  // IMPORTANT:
  // REAL DB COLUMN IS:
  // quantity
  // ====================================================

  const orderItems =
    cartItems.map(
      (item) => {

        const product =
          item.products!;


        const variant =
          item.product_variants;


        const unitPrice =
          getCartItemPrice(
            item
          );


        return {

          order_id:
            order.id,

          product_id:
            product.id,

          variant_id:
            variant?.id ??
            null,

          product_name:
            product.name,

          variant_name:
            variant
              ? `${variant.variant_name}: ${variant.variant_value}`
              : null,

          unit_price:
            unitPrice,

          quantity:
            item.quantity,

          subtotal:
            unitPrice *
            item.quantity,

        };
      }
    );


  // ====================================================
  // INSERT ORDER ITEMS
  // ====================================================

  const {
    error: orderItemsError,
  } =
    await supabase
      .from('order_items')
      .insert(
        orderItems
      );


  // ====================================================
  // IF ORDER ITEMS FAIL,
  // REMOVE THE EMPTY ORDER WE JUST CREATED
  // ====================================================

  if (
    orderItemsError
  ) {

    console.error(
      'Create order items error:',
      orderItemsError
    );


    const {
      error: cleanupError,
    } =
      await supabase
        .from('orders')
        .delete()
        .eq(
          'id',
          order.id
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      cleanupError
    ) {
      console.error(
        'Failed order cleanup error:',
        cleanupError
      );
    }


    throw orderItemsError;
  }


  // ====================================================
  // SAVE COUPON REDEMPTION
  // ====================================================

  if (
    couponResult
  ) {

    const {
      error:
        redemptionError,
    } =
      await supabase
        .from(
          'coupon_redemptions'
        )
        .insert({

          coupon_id:
            couponResult
              .coupon
              .id,

          user_id:
            user.id,

          order_id:
            order.id,

          discount_amount:
            discount,

        });


    if (
      redemptionError
    ) {

      console.error(
        'Coupon redemption error:',
        redemptionError
      );


      // Keep data consistent:
      // if coupon redemption fails,
      // remove the order.
      // order_items will be removed by cascade.

      const {
        error:
          cleanupError,
      } =
        await supabase
          .from('orders')
          .delete()
          .eq(
            'id',
            order.id
          )
          .eq(
            'user_id',
            user.id
          );


      if (
        cleanupError
      ) {
        console.error(
          'Coupon order cleanup error:',
          cleanupError
        );
      }


      throw new Error(
        'Coupon could not be recorded. Please try placing the order again.'
      );
    }
  }


  // ====================================================
  // CLEAR CART AFTER SUCCESS
  // ====================================================

  const {
    error: clearCartError,
  } =
    await supabase
      .from('cart_items')
      .delete()
      .eq(
        'user_id',
        user.id
      );


  if (
    clearCartError
  ) {

    console.error(
      'Clear cart after order error:',
      clearCartError
    );

    // Do not fail the completed order.
  }


  // ====================================================
  // SUCCESS
  // ====================================================

  return {

    orderId:
      order.id,

    orderNumber:
      order.order_number,

    subtotal,

    deliveryFee,

    discount,

    total,

    itemCount,

  
    couponCode:
      couponResult
        ?.coupon
        .code ??
      null,

  };
}
