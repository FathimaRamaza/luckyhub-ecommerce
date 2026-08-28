import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
  CartItem,
  getCartItemNormalPrice,
  getCartItemPrice,
  getCartItems,
  getCartItemSaving,
  getCartSubtotal,
  hasCartItemOffer,
  removeCartItem,
  updateCartQuantity,
} from '../services/cartService';

import {
  getOfferPercentage,
} from '../services/offerService';


import {
  applyCoupon,
  calculateCouponDiscount,
  CouponResult,
} from '../services/couponService';


// ======================================================
// CART SCREEN
// ======================================================

export default function CartScreen() {
  const router = useRouter();

  const [items, setItems] =
    useState<CartItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');


  const [couponCode, setCouponCode] =
    useState('');

  const [couponResult, setCouponResult] =
    useState<CouponResult | null>(null);

  const [couponLoading, setCouponLoading] =
    useState(false);


  // ======================================================
  // LOAD CART
  // ======================================================

  const loadCart =
    useCallback(
      async () => {
        try {
          setError('');

          const data =
            await getCartItems();

          setItems(data);

        } catch (err: any) {
          console.error(
            'Load cart error:',
            err
          );

          setError(
            err?.message ||
              'Unable to load your cart.'
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  // ======================================================
  // RELOAD EVERY TIME CART TAB OPENS
  // ======================================================

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      loadCart();
    }, [loadCart])
  );


  // ======================================================
  // SUBTOTAL
  // ======================================================

  const subtotal =
    useMemo(
      () =>
        getCartSubtotal(
          items
        ),
      [items]
    );


  // ======================================================
  // COUPON DISCOUNT
  // ======================================================

  const couponDiscount =
    couponResult?.discount ??
    0;


  const freeDelivery =
    couponResult?.freeDelivery ??
    false;


  const cartTotalBeforeDelivery =
    Math.max(
      0,
      subtotal -
        couponDiscount
    );


  // ======================================================
  // TOTAL OFFER SAVINGS
  // ======================================================

  const totalSavings =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            getCartItemSaving(
              item
            ) *
              item.quantity,
          0
        ),
      [items]
    );


  // ======================================================
  // RECALCULATE APPLIED COUPON WHEN CART CHANGES
  // ======================================================

  useEffect(() => {
    if (!couponResult) {
      return;
    }

    try {
      const updatedResult =
        calculateCouponDiscount(
          couponResult.coupon,
          subtotal
        );

      setCouponResult(
        updatedResult
      );
    } catch {
      setCouponResult(null);
    }
  }, [subtotal]);


  // ======================================================
  // TOTAL QUANTITY
  // ======================================================

  const totalQuantity =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.quantity,
          0
        ),
      [items]
    );


  // ======================================================
  // REFRESH
  // ======================================================

  const handleRefresh =
    async () => {
      setRefreshing(true);

      await loadCart();
    };


  // ======================================================
  // GET AVAILABLE STOCK
  // ======================================================

  const getAvailableStock = (
    item: CartItem
  ) => {
    if (
      item.product_variants
    ) {
      return Number(
        item
          .product_variants
          .stock_quantity ??
          0
      );
    }

    return Number(
      item.products
        ?.stock_quantity ??
        0
    );
  };


  // ======================================================
  // INCREASE QUANTITY
  // ======================================================

  const increaseQuantity =
    async (
      item: CartItem
    ) => {
      const stock =
        getAvailableStock(
          item
        );

      if (
        item.quantity >=
        stock
      ) {
        Alert.alert(
          'Stock Limit',
          `Only ${stock} item(s) are available.`
        );

        return;
      }

      try {
        setUpdatingId(
          item.id
        );

        const newQuantity =
          item.quantity + 1;

        await updateCartQuantity(
          item.id,
          newQuantity
        );

        setItems(
          (
            currentItems
          ) =>
            currentItems.map(
              (
                current
              ) =>
                current.id ===
                item.id
                  ? {
                      ...current,

                      quantity:
                        newQuantity,
                    }
                  : current
            )
        );

      } catch (err: any) {
        console.error(
          'Increase quantity error:',
          err
        );

        Alert.alert(
          'Unable to Update',
          err?.message ||
            'Could not update cart quantity.'
        );

      } finally {
        setUpdatingId(
          null
        );
      }
    };


  // ======================================================
  // DECREASE QUANTITY
  // ======================================================

  const decreaseQuantity =
    async (
      item: CartItem
    ) => {
      if (
        item.quantity <= 1
      ) {
        confirmRemove(
          item
        );

        return;
      }

      try {
        setUpdatingId(
          item.id
        );

        const newQuantity =
          item.quantity - 1;

        await updateCartQuantity(
          item.id,
          newQuantity
        );

        setItems(
          (
            currentItems
          ) =>
            currentItems.map(
              (
                current
              ) =>
                current.id ===
                item.id
                  ? {
                      ...current,

                      quantity:
                        newQuantity,
                    }
                  : current
            )
        );

      } catch (err: any) {
        console.error(
          'Decrease quantity error:',
          err
        );

        Alert.alert(
          'Unable to Update',
          err?.message ||
            'Could not update cart quantity.'
        );

      } finally {
        setUpdatingId(
          null
        );
      }
    };


  // ======================================================
  // CONFIRM REMOVE
  // ======================================================

  const confirmRemove = (
    item: CartItem
  ) => {
    const productName =
      item.products?.name ||
      'this item';

    Alert.alert(
      'Remove Item',
      `Remove ${productName} from your cart?`,
      [
        {
          text:
            'Cancel',

          style:
            'cancel',
        },

        {
          text:
            'Remove',

          style:
            'destructive',

          onPress:
            () =>
              handleRemove(
                item
              ),
        },
      ]
    );
  };


  // ======================================================
  // REMOVE CART ITEM
  // ======================================================

  const handleRemove =
    async (
      item: CartItem
    ) => {
      try {
        setUpdatingId(
          item.id
        );

        await removeCartItem(
          item.id
        );

        setItems(
          (
            currentItems
          ) =>
            currentItems.filter(
              (
                current
              ) =>
                current.id !==
                item.id
            )
        );

      } catch (err: any) {
        console.error(
          'Remove cart error:',
          err
        );

        Alert.alert(
          'Unable to Remove',
          err?.message ||
            'Could not remove the item.'
        );

      } finally {
        setUpdatingId(
          null
        );
      }
    };


  // ======================================================
  // APPLY COUPON
  // ======================================================

  const handleApplyCoupon =
    async () => {
      const cleanCode =
        couponCode
          .trim()
          .toUpperCase();

      if (!cleanCode) {
        Alert.alert(
          'Coupon',
          'Please enter a coupon code.'
        );

        return;
      }

      try {
        setCouponLoading(true);

        const result =
          await applyCoupon(
            cleanCode,
            subtotal
          );

        setCouponResult(
          result
        );

        setCouponCode(
          result.coupon.code
        );

        Alert.alert(
          'Coupon Applied',
          result.message
        );

      } catch (err: any) {
        setCouponResult(null);

        Alert.alert(
          'Coupon Not Applied',
          err?.message ??
            'Unable to apply this coupon.'
        );

      } finally {
        setCouponLoading(false);
      }
    };


  // ======================================================
  // REMOVE COUPON
  // ======================================================

  const handleRemoveCoupon =
    () => {
      setCouponResult(null);
      setCouponCode('');
    };


  // ======================================================
  // OPEN PRODUCT
  // ======================================================

  const openProduct = (
    item: CartItem
  ) => {
    if (
      !item.products?.id
    ) {
      return;
    }

    router.push({
      pathname:
        '/product-details',

      params: {
        id:
          item.products.id,
      },
    });
  };


  // ======================================================
  // CHECKOUT
  // ======================================================

  const handleCheckout =
    () => {
      if (
        items.length === 0
      ) {
        return;
      }

      const hasUnavailableItem =
        items.some(
          (item) => {
            const stock =
              getAvailableStock(
                item
              );

            return (
              !item.products
                ?.is_active ||
              stock <= 0 ||
              item.quantity >
                stock
            );
          }
        );


      if (
        hasUnavailableItem
      ) {
        Alert.alert(
          'Check Your Cart',
          'One or more products are unavailable or exceed the current stock. Please update your cart before checkout.'
        );

        return;
      }


      router.push({
        pathname:
          '/checkout-address',

        params: {
          couponCode:
            couponResult
              ?.coupon
              .code ??
            '',

          couponDiscount:
            String(
              couponDiscount
            ),

          freeDelivery:
            freeDelivery
              ? 'true'
              : 'false',
        },
      });
    };


  // ======================================================
  // INITIAL LOADING
  // ======================================================

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={['top']}
      >

        <View
          style={
            styles.center
          }
        >

          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading your cart...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  // ======================================================
  // EMPTY CART
  // ======================================================

  if (
    !error &&
    items.length === 0
  ) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={['top']}
      >

        <View
          style={
            styles.header
          }
        >

          <Text
            style={
              styles.headerTitle
            }
          >
            My Cart
          </Text>

        </View>


        <View
          style={
            styles.emptyContainer
          }
        >

          <View
            style={
              styles.emptyIconBox
            }
          >

            <Ionicons
              name="cart-outline"
              size={65}
              color={
                COLORS.primary
              }
            />

          </View>


          <Text
            style={
              styles.emptyTitle
            }
          >
            Your cart is empty
          </Text>


          <Text
            style={
              styles.emptyText
            }
          >
            Add stationery and other Lucky Hub products to your cart.
          </Text>


          <Pressable
            style={
              styles.shopButton
            }
            onPress={() =>
              router.push(
                '/(tabs)/home'
              )
            }
          >

            <Ionicons
              name="storefront-outline"
              size={19}
              color={
                COLORS.white
              }
            />

            <Text
              style={
                styles.shopButtonText
              }
            >
              Start Shopping
            </Text>

          </Pressable>

        </View>

      </SafeAreaView>
    );
  }


  // ======================================================
  // CART
  // ======================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={['top']}
    >

      {/* ==================================================
          HEADER
      ================================================== */}

      <View
        style={
          styles.header
        }
      >

        <View>

          <Text
            style={
              styles.headerTitle
            }
          >
            My Cart
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            {totalQuantity}{' '}
            {totalQuantity === 1
              ? 'item'
              : 'items'}
          </Text>

        </View>


        <Pressable
          style={
            styles.searchButton
          }
          onPress={() =>
            router.push(
              '/search'
            )
          }
        >

          <Ionicons
            name="search-outline"
            size={22}
            color={
              COLORS.primary
            }
          />

        </Pressable>

      </View>


      {/* ==================================================
          ERROR
      ================================================== */}

      {error ? (

        <View
          style={
            styles.errorBox
          }
        >

          <Ionicons
            name="alert-circle-outline"
            size={24}
            color={
              COLORS.error
            }
          />

          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>


          <Pressable
            style={
              styles.retryButton
            }
            onPress={() => {
              setLoading(
                true
              );

              loadCart();
            }}
          >

            <Text
              style={
                styles.retryText
              }
            >
              Retry
            </Text>

          </Pressable>

        </View>

      ) : null}


      {/* ==================================================
          CART ITEMS
      ================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            colors={[
              COLORS.primary,
            ]}
          />
        }
      >

        {items.map(
          (item) => (
            <CartProductCard
              key={
                item.id
              }
              item={
                item
              }
              updating={
                updatingId ===
                item.id
              }
              onOpen={() =>
                openProduct(
                  item
                )
              }
              onIncrease={() =>
                increaseQuantity(
                  item
                )
              }
              onDecrease={() =>
                decreaseQuantity(
                  item
                )
              }
              onRemove={() =>
                confirmRemove(
                  item
                )
              }
            />
          )
        )}


        {/* ==================================================
            COUPON
        ================================================== */}

        <View
          style={
            styles.couponCard
          }
        >

          <View
            style={
              styles.couponHeader
            }
          >

            <View
              style={
                styles.couponTitleRow
              }
            >

              <Ionicons
                name="ticket-outline"
                size={20}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.couponTitle
                }
              >
                Coupon Code
              </Text>

            </View>


            {couponResult && (

              <Pressable
                onPress={
                  handleRemoveCoupon
                }
              >
                <Text
                  style={
                    styles.removeCouponText
                  }
                >
                  Remove
                </Text>
              </Pressable>

            )}

          </View>


          <View
            style={
              styles.couponInputRow
            }
          >

            <TextInput
              value={
                couponCode
              }
              onChangeText={
                value =>
                  setCouponCode(
                    value.toUpperCase()
                  )
              }
              editable={
                !couponLoading &&
                !couponResult
              }
              autoCapitalize="characters"
              autoCorrect={
                false
              }
              placeholder="Enter coupon code"
              placeholderTextColor={
                COLORS.textSecondary
              }
              style={[
                styles.couponInput,

                couponResult &&
                  styles.couponInputApplied,
              ]}
            />


            <Pressable
              style={[
                styles.applyCouponButton,

                (
                  couponLoading ||
                  Boolean(
                    couponResult
                  )
                ) &&
                  styles.applyCouponButtonDisabled,
              ]}
              disabled={
                couponLoading ||
                Boolean(
                  couponResult
                )
              }
              onPress={
                handleApplyCoupon
              }
            >

              {couponLoading ? (

                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.white
                  }
                />

              ) : (

                <Text
                  style={
                    styles.applyCouponText
                  }
                >
                  {couponResult
                    ? 'APPLIED'
                    : 'APPLY'}
                </Text>

              )}

            </Pressable>

          </View>


          {couponResult && (

            <View
              style={
                styles.appliedCouponBox
              }
            >

              <Ionicons
                name="checkmark-circle"
                size={18}
                color={
                  COLORS.success
                }
              />

              <View
                style={
                  styles.appliedCouponTextBox
                }
              >

                <Text
                  style={
                    styles.appliedCouponCode
                  }
                >
                  {
                    couponResult
                      .coupon
                      .code
                  }
                </Text>

                <Text
                  style={
                    styles.appliedCouponDescription
                  }
                >
                  {
                    couponResult
                      .coupon
                      .description ??
                    couponResult.message
                  }
                </Text>

              </View>

            </View>

          )}

        </View>


        {/* ==================================================
            ORDER SUMMARY
        ================================================== */}

        <View
          style={
            styles.summaryCard
          }
        >

          <Text
            style={
              styles.summaryTitle
            }
          >
            Order Summary
          </Text>


          <View
            style={
              styles.summaryRow
            }
          >

            <Text
              style={
                styles.summaryLabel
              }
            >
              Items
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              {totalQuantity}
            </Text>

          </View>


          <View
            style={
              styles.summaryRow
            }
          >

            <Text
              style={
                styles.summaryLabel
              }
            >
              Subtotal
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              Rs.{' '}
              {subtotal.toLocaleString()}
            </Text>

          </View>


          {totalSavings > 0 && (
            <View
              style={
                styles.summaryRow
              }
            >

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Offer Savings
              </Text>

              <Text
                style={
                  styles.savingsValue
                }
              >
                - Rs.{' '}
                {totalSavings.toLocaleString()}
              </Text>

            </View>
          )}


          {couponDiscount > 0 && (
            <View
              style={
                styles.summaryRow
              }
            >

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Coupon Discount
              </Text>

              <Text
                style={
                  styles.savingsValue
                }
              >
                - Rs.{' '}
                {couponDiscount.toLocaleString()}
              </Text>

            </View>
          )}


          {freeDelivery && (
            <View
              style={
                styles.summaryRow
              }
            >

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Coupon Benefit
              </Text>

              <Text
                style={
                  styles.freeDeliveryText
                }
              >
                FREE DELIVERY
              </Text>

            </View>
          )}


          <View
            style={
              styles.summaryRow
            }
          >

            <Text
              style={
                styles.summaryLabel
              }
            >
              Delivery
            </Text>

            <Text
              style={
                styles.deliveryText
              }
            >
              Calculated at checkout
            </Text>

          </View>


          <View
            style={
              styles.divider
            }
          />


          <View
            style={
              styles.totalRow
            }
          >

            <Text
              style={
                styles.totalLabel
              }
            >
              Total
            </Text>

            <Text
              style={
                styles.totalValue
              }
            >
              Rs.{' '}
              {cartTotalBeforeDelivery.toLocaleString()}
            </Text>

          </View>

        </View>


        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>


      {/* ==================================================
          CHECKOUT BAR
      ================================================== */}

      <View
        style={
          styles.checkoutBar
        }
      >

        <View
          style={
            styles.checkoutTotalBox
          }
        >

          <Text
            style={
              styles.checkoutTotalLabel
            }
          >
            Cart Total
          </Text>

          <Text
            style={
              styles.checkoutTotal
            }
          >
            Rs.{' '}
            {cartTotalBeforeDelivery.toLocaleString()}
          </Text>

        </View>


        <Pressable
          style={
            styles.checkoutButton
          }
          onPress={
            handleCheckout
          }
        >

          <Text
            style={
              styles.checkoutButtonText
            }
          >
            Checkout
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color={
              COLORS.white
            }
          />

        </Pressable>

      </View>

    </SafeAreaView>
  );
}


// ======================================================
// CART PRODUCT CARD
// ======================================================

function CartProductCard({
  item,
  updating,
  onOpen,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  updating: boolean;
  onOpen: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {

  const product =
    item.products;

  const variant =
    item.product_variants;


  if (!product) {
    return null;
  }


  const imageSource =
    product.image_url
      ? {
          uri:
            product.image_url,
        }
      : require('../assets/placeholders/product-placeholder.png');


  const price =
    getCartItemPrice(
      item
    );

  const normalPrice =
    getCartItemNormalPrice(
      item
    );


  const hasOffer =
    hasCartItemOffer(
      item
    );


  const savingPerUnit =
    getCartItemSaving(
      item
    );


  const offerPercentage =
    hasOffer &&
    item.active_offer
      ? getOfferPercentage(
          normalPrice,
          item.active_offer
        )
      : 0;


  const itemTotal =
    price *
    item.quantity;


  const availableStock =
    variant
      ? Number(
          variant.stock_quantity ??
            0
        )
      : Number(
          product.stock_quantity ??
            0
        );


  const stockProblem =
    availableStock <= 0 ||
    item.quantity >
      availableStock;


  return (
    <View
      style={
        styles.cartCard
      }
    >

      {/* IMAGE */}

      <Pressable
        style={
          styles.productImageBox
        }
        onPress={
          onOpen
        }
      >

        <Image
          source={
            imageSource
          }
          style={
            styles.productImage
          }
          resizeMode="contain"
        />

      </Pressable>


      {/* PRODUCT DETAILS */}

      <View
        style={
          styles.productInfo
        }
      >

        <View
          style={
            styles.productTopRow
          }
        >

          <Pressable
            style={
              styles.productTextArea
            }
            onPress={
              onOpen
            }
          >

            {product.brand ? (

              <Text
                style={
                  styles.brandText
                }
                numberOfLines={1}
              >
                {product.brand}
              </Text>

            ) : null}


            <Text
              style={
                styles.productName
              }
              numberOfLines={2}
            >
              {product.name}
            </Text>


            {variant ? (

              <Text
                style={
                  styles.variantText
                }
              >
                {variant.variant_name}:{' '}
                {variant.variant_value}
              </Text>

            ) : null}


            {product.sku ? (

              <Text
                style={
                  styles.skuText
                }
                numberOfLines={1}
              >
                SKU: {product.sku}
              </Text>

            ) : null}

          </Pressable>


          <Pressable
            style={
              styles.deleteButton
            }
            onPress={
              onRemove
            }
            disabled={
              updating
            }
          >

            <Ionicons
              name="trash-outline"
              size={19}
              color={
                COLORS.error
              }
            />

          </Pressable>

        </View>


        <View
          style={
            styles.priceLine
          }
        >

          <Text
            style={
              styles.productPrice
            }
          >
            Rs.{' '}
            {price.toLocaleString()}
          </Text>


          {hasOffer && (

            <Text
              style={
                styles.normalPrice
              }
            >
              Rs.{' '}
              {normalPrice.toLocaleString()}
            </Text>

          )}


          {hasOffer && (

            <View
              style={
                styles.offerBadge
              }
            >

              <Text
                style={
                  styles.offerBadgeText
                }
              >
                {offerPercentage}% OFF
              </Text>

            </View>

          )}

        </View>


        {hasOffer &&
          item.active_offer && (

          <View
            style={
              styles.offerInfoRow
            }
          >

            <Ionicons
              name="flash"
              size={13}
              color={
                COLORS.error
              }
            />

            <Text
              style={
                styles.offerInfoText
              }
              numberOfLines={
                1
              }
            >
              {
                item.active_offer
                  .title
              }
              {'  '}Save Rs.{' '}
              {savingPerUnit.toLocaleString()}
            </Text>

          </View>

        )}


        {stockProblem ? (

          <Text
            style={
              styles.stockProblemText
            }
          >
            {availableStock <= 0
              ? 'Out of stock'
              : `Only ${availableStock} available`}
          </Text>

        ) : (

          <Text
            style={
              styles.stockAvailableText
            }
          >
            {availableStock} in stock
          </Text>

        )}


        <View
          style={
            styles.productBottomRow
          }
        >

          {/* QUANTITY */}

          <View
            style={
              styles.quantityContainer
            }
          >

            <Pressable
              style={
                styles.quantityButton
              }
              onPress={
                onDecrease
              }
              disabled={
                updating
              }
            >

              <Ionicons
                name={
                  item.quantity <= 1
                    ? 'trash-outline'
                    : 'remove'
                }
                size={17}
                color={
                  item.quantity <= 1
                    ? COLORS.error
                    : COLORS.textPrimary
                }
              />

            </Pressable>


            <View
              style={
                styles.quantityValue
              }
            >

              {updating ? (

                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.primary
                  }
                />

              ) : (

                <Text
                  style={
                    styles.quantityText
                  }
                >
                  {item.quantity}
                </Text>

              )}

            </View>


            <Pressable
              style={
                styles.quantityButton
              }
              onPress={
                onIncrease
              }
              disabled={
                updating ||
                item.quantity >=
                  availableStock
              }
            >

              <Ionicons
                name="add"
                size={18}
                color={
                  item.quantity >=
                  availableStock
                    ? COLORS.border
                    : COLORS.textPrimary
                }
              />

            </Pressable>

          </View>


          {/* ITEM TOTAL */}

          <Text
            style={
              styles.itemTotal
            }
          >
            Rs.{' '}
            {itemTotal.toLocaleString()}
          </Text>

        </View>

      </View>

    </View>
  );
}


// ======================================================
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,

      backgroundColor:
        COLORS.backgroundSoft,
    },


    center: {
      flex: 1,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    loadingText: {
      marginTop: 10,

      fontSize: 13,

      color:
        COLORS.textSecondary,
    },


    // ======================================================
    // HEADER
    // ======================================================

    header: {
      minHeight: 64,

      paddingHorizontal: 16,

      paddingVertical: 9,

      backgroundColor:
        COLORS.white,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    headerTitle: {
      fontSize: 21,

      fontWeight: '900',

      color:
        COLORS.textPrimary,
    },


    headerSubtitle: {
      marginTop: 2,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },


    searchButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        COLORS.backgroundSoft,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    // ======================================================
    // SCROLL
    // ======================================================

    scrollContent: {
      padding: 12,

      paddingBottom: 130,
    },


    bottomSpace: {
      height: 15,
    },


    // ======================================================
    // CART CARD
    // ======================================================

    cartCard: {
      padding: 10,

      marginBottom: 11,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,

      flexDirection: 'row',
    },


    productImageBox: {
      width: 105,

      height: 115,

      borderRadius: 11,

      overflow: 'hidden',

      backgroundColor:
        COLORS.backgroundSoft,
    },


    productImage: {
      width: '100%',

      height: '100%',
    },


    productInfo: {
      flex: 1,

      marginLeft: 11,
    },


    productTopRow: {
      flexDirection: 'row',
    },


    productTextArea: {
      flex: 1,
    },


    brandText: {
      marginBottom: 2,

      fontSize: 10,

      fontWeight: '700',

      color:
        COLORS.primary,
    },


    productName: {
      fontSize: 14,

      lineHeight: 19,

      fontWeight: '700',

      color:
        COLORS.textPrimary,
    },


    variantText: {
      marginTop: 3,

      fontSize: 11,

      fontWeight: '600',

      color:
        COLORS.primary,
    },


    skuText: {
      marginTop: 3,

      fontSize: 9,

      color:
        COLORS.textSecondary,
    },


    deleteButton: {
      width: 34,

      height: 34,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    productPrice: {
      marginTop: 7,

      fontSize: 16,

      fontWeight: '900',

      color:
        COLORS.primary,
    },


    priceLine: {
      marginTop: 7,

      flexDirection: 'row',

      alignItems: 'center',

      flexWrap: 'wrap',

      gap: 6,
    },


    normalPrice: {
      fontSize: 11,

      color:
        COLORS.textSecondary,

      textDecorationLine:
        'line-through',
    },


    offerBadge: {
      paddingHorizontal: 6,

      paddingVertical: 3,

      borderRadius: 6,

      backgroundColor:
        '#FEF3C7',
    },


    offerBadgeText: {
      fontSize: 8,

      fontWeight: '900',

      color:
        '#92400E',
    },


    offerInfoRow: {
      marginTop: 4,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,
    },


    offerInfoText: {
      flex: 1,

      fontSize: 9,

      fontWeight: '700',

      color:
        COLORS.error,
    },


    stockAvailableText: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.success,
    },


    stockProblemText: {
      marginTop: 2,

      fontSize: 10,

      fontWeight: '700',

      color:
        COLORS.error,
    },


    productBottomRow: {
      marginTop: 9,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    // ======================================================
    // QUANTITY
    // ======================================================

    quantityContainer: {
      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      overflow: 'hidden',
    },


    quantityButton: {
      width: 34,

      height: 34,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.backgroundSoft,
    },


    quantityValue: {
      width: 36,

      height: 34,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },


    quantityText: {
      fontSize: 14,

      fontWeight: '800',

      color:
        COLORS.textPrimary,
    },


    itemTotal: {
      fontSize: 13,

      fontWeight: '900',

      color:
        COLORS.textPrimary,
    },


    // ======================================================
    // COUPON
    // ======================================================

    couponCard: {
      marginTop: 5,

      marginBottom: 11,

      padding: 14,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },


    couponHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    couponTitleRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,
    },


    couponTitle: {
      fontSize: 15,

      fontWeight: '900',

      color:
        COLORS.textPrimary,
    },


    removeCouponText: {
      fontSize: 12,

      fontWeight: '800',

      color:
        COLORS.error,
    },


    couponInputRow: {
      marginTop: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 8,
    },


    couponInput: {
      flex: 1,

      height: 46,

      paddingHorizontal: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 10,

      backgroundColor:
        COLORS.backgroundSoft,

      fontSize: 13,

      fontWeight: '700',

      color:
        COLORS.textPrimary,
    },


    couponInputApplied: {
      borderColor:
        COLORS.success,

      backgroundColor:
        '#F0FDF4',
    },


    applyCouponButton: {
      width: 86,

      height: 46,

      borderRadius: 10,

      backgroundColor:
        COLORS.primary,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    applyCouponButtonDisabled: {
      opacity: 0.65,
    },


    applyCouponText: {
      fontSize: 12,

      fontWeight: '900',

      color:
        COLORS.white,
    },


    appliedCouponBox: {
      marginTop: 11,

      padding: 10,

      borderRadius: 10,

      backgroundColor:
        '#F0FDF4',

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 8,
    },


    appliedCouponTextBox: {
      flex: 1,
    },


    appliedCouponCode: {
      fontSize: 12,

      fontWeight: '900',

      color:
        COLORS.success,
    },


    appliedCouponDescription: {
      marginTop: 2,

      fontSize: 10,

      lineHeight: 15,

      color:
        COLORS.textSecondary,
    },


    freeDeliveryText: {
      fontSize: 11,

      fontWeight: '900',

      color:
        COLORS.success,
    },


    // ======================================================
    // SUMMARY
    // ======================================================

    summaryCard: {
      marginTop: 5,

      padding: 16,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },


    summaryTitle: {
      marginBottom: 14,

      fontSize: 17,

      fontWeight: '900',

      color:
        COLORS.textPrimary,
    },


    summaryRow: {
      marginBottom: 10,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    summaryLabel: {
      fontSize: 13,

      color:
        COLORS.textSecondary,
    },


    summaryValue: {
      fontSize: 13,

      fontWeight: '700',

      color:
        COLORS.textPrimary,
    },


    savingsValue: {
      fontSize: 13,

      fontWeight: '800',

      color:
        COLORS.success,
    },


    deliveryText: {
      fontSize: 11,

      fontWeight: '600',

      color:
        COLORS.primary,
    },


    divider: {
      height: 1,

      marginVertical: 5,

      backgroundColor:
        COLORS.border,
    },


    totalRow: {
      marginTop: 9,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    totalLabel: {
      fontSize: 16,

      fontWeight: '800',

      color:
        COLORS.textPrimary,
    },


    totalValue: {
      fontSize: 20,

      fontWeight: '900',

      color:
        COLORS.primary,
    },


    // ======================================================
    // CHECKOUT BAR
    // ======================================================

    checkoutBar: {
      position: 'absolute',

      left: 0,

      right: 0,

      bottom: 0,

      minHeight: 78,

      paddingHorizontal: 16,

      paddingVertical: 10,

      backgroundColor:
        COLORS.white,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      flexDirection: 'row',

      alignItems: 'center',
    },


    checkoutTotalBox: {
      flex: 1,
    },


    checkoutTotalLabel: {
      fontSize: 10,

      color:
        COLORS.textSecondary,
    },


    checkoutTotal: {
      marginTop: 2,

      fontSize: 20,

      fontWeight: '900',

      color:
        COLORS.primary,
    },


    checkoutButton: {
      minWidth: 145,

      height: 50,

      borderRadius: 12,

      backgroundColor:
        COLORS.primary,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      gap: 7,
    },


    checkoutButtonText: {
      fontSize: 15,

      fontWeight: '800',

      color:
        COLORS.white,
    },


    // ======================================================
    // EMPTY
    // ======================================================

    emptyContainer: {
      flex: 1,

      paddingHorizontal: 30,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    emptyIconBox: {
      width: 120,

      height: 120,

      borderRadius: 60,

      backgroundColor:
        '#E8F5F0',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    emptyTitle: {
      marginTop: 18,

      fontSize: 22,

      fontWeight: '900',

      color:
        COLORS.textPrimary,
    },


    emptyText: {
      marginTop: 7,

      maxWidth: 290,

      textAlign: 'center',

      fontSize: 13,

      lineHeight: 20,

      color:
        COLORS.textSecondary,
    },


    shopButton: {
      height: 50,

      marginTop: 22,

      paddingHorizontal: 23,

      borderRadius: 12,

      backgroundColor:
        COLORS.primary,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      gap: 7,
    },


    shopButtonText: {
      fontSize: 14,

      fontWeight: '800',

      color:
        COLORS.white,
    },


    // ======================================================
    // ERROR
    // ======================================================

    errorBox: {
      margin: 12,

      padding: 15,

      borderRadius: 12,

      backgroundColor:
        '#FEF2F2',

      alignItems: 'center',
    },


    errorText: {
      marginTop: 6,

      textAlign: 'center',

      fontSize: 12,

      color:
        COLORS.error,
    },


    retryButton: {
      marginTop: 10,

      paddingHorizontal: 18,

      paddingVertical: 8,

      borderRadius: 8,

      backgroundColor:
        COLORS.primary,
    },


    retryText: {
      fontWeight: '700',

      color:
        COLORS.white,
    },

  });