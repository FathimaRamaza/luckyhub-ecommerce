import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
  CartItem,
  getCartItems,
  getCartSubtotal,
} from '../services/cartService';

import {
  createOrder,
} from '../services/orderService';


import {
  applyCoupon,
  CouponResult,
} from '../services/couponService';


import {
  DeliveryQuote,
  getDeliveryQuote,
  getStorePickupFee,
} from '../services/deliveryService';

import {
  supabase,
} from '../lib/supabase';


export default function CheckoutAddressScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      couponCode?: string;
    }>();

  const insets =
    useSafeAreaInsets();


  // ======================================================
  // CART
  // ======================================================

  const [
    cartItems,
    setCartItems,
  ] =
    useState<CartItem[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    placingOrder,
    setPlacingOrder,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    couponResult,
    setCouponResult,
  ] =
    useState<CouponResult | null>(
      null
    );


  // ======================================================
  // CUSTOMER
  // ======================================================

  const [
    fullName,
    setFullName,
  ] =
    useState('');


  const [
    mobile,
    setMobile,
  ] =
    useState('');


  const [
    addressLine1,
    setAddressLine1,
  ] =
    useState('');


  const [
    addressLine2,
    setAddressLine2,
  ] =
    useState('');


  const [
    city,
    setCity,
  ] =
    useState('');


  const [
    postalCode,
    setPostalCode,
  ] =
    useState('');


  // ======================================================
  // DELIVERY / PAYMENT
  // ======================================================

  const [
    deliveryMethod,
    setDeliveryMethod,
  ] =
    useState<
      'standard' |
      'pickup'
    >(
      'standard'
    );


  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<'cod'>(
      'cod'
    );


  const [
    deliveryQuote,
    setDeliveryQuote,
  ] =
    useState<DeliveryQuote | null>(
      null
    );


  const [
    deliveryLoading,
    setDeliveryLoading,
  ] =
    useState(false);


  const [
    deliveryError,
    setDeliveryError,
  ] =
    useState('');


  // ======================================================
  // LOAD CHECKOUT
  // ======================================================

  useEffect(() => {

    const loadCheckout =
      async () => {

        try {
          setLoading(true);
          setError('');


          // CART

          const items =
            await getCartItems();

          setCartItems(items);


          // =================================================
          // COUPON
          // Revalidate from the fresh cart instead of trusting
          // the discount value passed from the Cart screen.
          // =================================================

          const cleanCouponCode =
            String(
              params.couponCode ??
                ''
            )
              .trim()
              .toUpperCase();


          if (cleanCouponCode) {
            try {
              const freshSubtotal =
                getCartSubtotal(
                  items
                );

              const validatedCoupon =
                await applyCoupon(
                  cleanCouponCode,
                  freshSubtotal
                );

              setCouponResult(
                validatedCoupon
              );

            } catch (couponError: any) {
              console.log(
                'Checkout coupon validation error:',
                couponError
              );

              setCouponResult(
                null
              );

              Alert.alert(
                'Coupon Removed',
                couponError?.message ??
                  'This coupon is no longer valid.'
              );
            }

          } else {
            setCouponResult(
              null
            );
          }


          // USER

          const {
            data: { user },
          } =
            await supabase.auth.getUser();


          if (!user) {
            return;
          }


          // PROFILE

          const {
            data: profile,
          } =
            await supabase
              .from('profiles')
              .select(`
                full_name,
                phone
              `)
              .eq(
                'id',
                user.id
              )
              .maybeSingle();


          if (
            profile?.full_name
          ) {
            setFullName(
              profile.full_name
            );
          }


          if (
            profile?.phone
          ) {
            setMobile(
              profile.phone
            );
          }


          // =================================================
          // MOST RECENT ADDRESS
          // CORRECT DATABASE COLUMN NAMES
          // =================================================

          const {
            data: savedAddress,
            error:
              savedAddressError,
          } =
            await supabase
              .from('addresses')
              .select(`
                recipient_name,
                phone,
                address_line_1,
                address_line_2,
                city,
                postal_code
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
              )
              .limit(1)
              .maybeSingle();


          if (
            savedAddressError
          ) {
            console.error(
              'Load saved address error:',
              savedAddressError
            );
          }


          if (
            savedAddress
          ) {

            setFullName(
              savedAddress
                .recipient_name ||
                profile?.full_name ||
                ''
            );


            setMobile(
              savedAddress
                .phone ||
                profile?.phone ||
                ''
            );


            setAddressLine1(
              savedAddress
                .address_line_1 ||
                ''
            );


            setAddressLine2(
              savedAddress
                .address_line_2 ||
                ''
            );


            setCity(
              savedAddress
                .city ||
                ''
            );


            setPostalCode(
              savedAddress
                .postal_code ||
                ''
            );
          }


        } catch (err: any) {

          console.error(
            'Checkout load error:',
            err
          );


          setError(
            err?.message ||
              'Unable to load checkout.'
          );


        } finally {
          setLoading(false);
        }
      };


    loadCheckout();

  }, [params.couponCode]);


  // ======================================================
  // LOAD DELIVERY FEE FROM SUPABASE
  // ======================================================

  useEffect(() => {

    let cancelled =
      false;


    if (
      deliveryMethod ===
      'pickup'
    ) {

      setDeliveryQuote(
        null
      );

      setDeliveryError(
        ''
      );

      setDeliveryLoading(
        false
      );

      return () => {
        cancelled = true;
      };
    }


    const cleanCity =
      city.trim();


    if (
      !cleanCity
    ) {

      setDeliveryQuote(
        null
      );

      setDeliveryError(
        ''
      );

      setDeliveryLoading(
        false
      );

      return () => {
        cancelled = true;
      };
    }


    setDeliveryLoading(
      true
    );

    setDeliveryError(
      ''
    );


    const timer =
      setTimeout(
        async () => {

          try {

            const quote =
              await getDeliveryQuote(
                cleanCity
              );


            if (
              cancelled
            ) {
              return;
            }


            setDeliveryQuote(
              quote
            );


          } catch (err: any) {

            if (
              cancelled
            ) {
              return;
            }


            console.log(
              'Delivery quote error:',
              err
            );


            setDeliveryQuote(
              null
            );


            setDeliveryError(
              err?.message ??
                'Unable to calculate delivery for this city.'
            );


          } finally {

            if (
              !cancelled
            ) {
              setDeliveryLoading(
                false
              );
            }
          }

        },
        500
      );


    return () => {

      cancelled = true;

      clearTimeout(
        timer
      );
    };

  }, [
    city,
    deliveryMethod,
  ]);


  // ======================================================
  // TOTALS
  // ======================================================

  const subtotal =
    useMemo(
      () =>
        getCartSubtotal(
          cartItems
        ),
      [cartItems]
    );


  const itemCount =
    useMemo(
      () =>
        cartItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.quantity,
          0
        ),
      [cartItems]
    );


  const couponDiscount =
    couponResult?.discount ??
    0;


  const hasFreeDeliveryCoupon =
    couponResult?.freeDelivery ??
    false;


  const standardDeliveryFee =
    deliveryQuote
      ?.deliveryFee ??
    0;


  const deliveryFee =
    deliveryMethod ===
    'pickup'
      ? getStorePickupFee()
      : (
          hasFreeDeliveryCoupon
            ? 0
            : standardDeliveryFee
        );


  const discount =
    Math.min(
      subtotal,
      Math.max(
        0,
        Number(
          couponDiscount
        )
      )
    );


  const total =
    Math.max(
      0,
      subtotal +
        deliveryFee -
        discount
    );


  // ======================================================
  // VALIDATE
  // ======================================================

  const validateCheckout =
    () => {

      if (!fullName.trim()) {
        Alert.alert(
          'Full Name Required',
          'Please enter your full name.'
        );

        return false;
      }


      if (!mobile.trim()) {
        Alert.alert(
          'Mobile Number Required',
          'Please enter your mobile number.'
        );

        return false;
      }


      if (
        deliveryMethod ===
        'standard'
      ) {

        if (
          !addressLine1.trim()
        ) {
          Alert.alert(
            'Address Required',
            'Please enter your delivery address.'
          );

          return false;
        }


        if (!city.trim()) {
          Alert.alert(
            'City Required',
            'Please enter your city.'
          );

          return false;
        }


        if (
          deliveryLoading
        ) {
          Alert.alert(
            'Checking Delivery',
            'Please wait while we calculate the delivery charge.'
          );

          return false;
        }


        if (
          !deliveryQuote
        ) {
          Alert.alert(
            'Delivery Unavailable',
            deliveryError ||
              'Delivery is not available for this city yet.'
          );

          return false;
        }
      }


      if (
        cartItems.length ===
        0
      ) {
        Alert.alert(
          'Cart Empty',
          'Your cart is empty.'
        );

        return false;
      }


      return true;
    };


  // ======================================================
  // PLACE ORDER
  // ======================================================

  const handlePlaceOrder =
    async () => {

      if (
        !validateCheckout()
      ) {
        return;
      }


      try {
        setPlacingOrder(
          true
        );


        const result =
          await createOrder({

            deliveryMethod:
              deliveryMethod ===
              'standard'
                ? 'Standard Delivery'
                : 'Store Pickup',

            paymentMethod:
              'Cash on Delivery',

            deliveryFee,

            discount,

            couponCode:
              couponResult
                ?.coupon
                .code ??
              null,

            address:
              deliveryMethod ===
              'standard'
                ? {
                    fullName:
                      fullName.trim(),

                    mobile:
                      mobile.trim(),

                    addressLine1:
                      addressLine1.trim(),

                    addressLine2:
                      addressLine2.trim(),

                    city:
                      city.trim(),

                    postalCode:
                      postalCode.trim(),
                  }
                : null,
          });


        router.replace({
          pathname:
            '/order-success',

          params: {
            orderNumber:
              result.orderNumber,

            fullName:
              fullName.trim(),

            mobile:
              mobile.trim(),

            total:
              String(
                result.total
              ),

            itemCount:
              String(
                result.itemCount
              ),

            paymentMethod:
              'Cash on Delivery',

            deliveryMethod:
              deliveryMethod ===
              'standard'
                ? 'Standard Delivery'
                : 'Store Pickup',

            couponCode:
              couponResult
                ?.coupon
                .code ??
              '',
          },
        });


      } catch (err: any) {

        console.error(
          'Place order error:',
          err
        );


        Alert.alert(
          'Order Failed',
          err?.message ||
            'Unable to place your order. Please try again.'
        );


      } finally {
        setPlacingOrder(
          false
        );
      }
    };


  // ======================================================
  // LOADING
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
          style={styles.center}
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
            Preparing checkout...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  // ======================================================
  // SCREEN
  // ======================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={['top']}
    >

      {/* HEADER */}

      <View
        style={styles.header}
      >

        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={
              COLORS.textPrimary
            }
          />
        </Pressable>


        <Text
          style={
            styles.headerTitle
          }
        >
          Checkout
        </Text>


        <View
          style={
            styles.headerSpace
          }
        />

      </View>


      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                110 +
                insets.bottom,
            },
          ]}
        >

          {/* STEPS */}

          <View
            style={
              styles.stepsCard
            }
          >

            <View style={styles.step}>
              <View
                style={
                  styles.stepCircleActive
                }
              >
                <Text
                  style={
                    styles.stepNumberActive
                  }
                >
                  1
                </Text>
              </View>

              <Text
                style={
                  styles.stepTextActive
                }
              >
                Address
              </Text>
            </View>


            <View
              style={
                styles.stepLineActive
              }
            />


            <View style={styles.step}>
              <View
                style={
                  styles.stepCircleActive
                }
              >
                <Text
                  style={
                    styles.stepNumberActive
                  }
                >
                  2
                </Text>
              </View>

              <Text
                style={
                  styles.stepTextActive
                }
              >
                Payment
              </Text>
            </View>


            <View
              style={styles.stepLine}
            />


            <View style={styles.step}>
              <View
                style={
                  styles.stepCircle
                }
              >
                <Text
                  style={
                    styles.stepNumber
                  }
                >
                  3
                </Text>
              </View>

              <Text
                style={
                  styles.stepText
                }
              >
                Confirm
              </Text>
            </View>

          </View>


          {/* ERROR */}

          {error ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={22}
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
            </View>
          ) : null}


          {/* CUSTOMER DETAILS */}

          <View
            style={styles.section}
          >

            <View
              style={
                styles.sectionHeader
              }
            >
              <Ionicons
                name="location-outline"
                size={22}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Customer Details
              </Text>
            </View>


            <InputField
              label="Full Name *"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={
                setFullName
              }
            />


            <InputField
              label="Mobile Number *"
              placeholder="07X XXX XXXX"
              value={mobile}
              onChangeText={
                setMobile
              }
              keyboardType="phone-pad"
            />


            {deliveryMethod ===
              'standard' && (
              <>

                <InputField
                  label="Address Line 1 *"
                  placeholder="House number, street"
                  value={
                    addressLine1
                  }
                  onChangeText={
                    setAddressLine1
                  }
                />


                <InputField
                  label="Address Line 2"
                  placeholder="Area / Landmark"
                  value={
                    addressLine2
                  }
                  onChangeText={
                    setAddressLine2
                  }
                />


                <InputField
                  label="City *"
                  placeholder="Enter city"
                  value={city}
                  onChangeText={
                    setCity
                  }
                />


                <InputField
                  label="Postal Code"
                  placeholder="Postal code"
                  value={
                    postalCode
                  }
                  onChangeText={
                    setPostalCode
                  }
                  keyboardType="number-pad"
                />

              </>
            )}

          </View>


          {/* DELIVERY METHOD */}

          <View
            style={styles.section}
          >

            <View
              style={
                styles.sectionHeader
              }
            >
              <Ionicons
                name="car-outline"
                size={22}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Delivery Method
              </Text>
            </View>


            <Pressable
              style={[
                styles.optionCard,
                deliveryMethod ===
                  'standard' &&
                  styles.optionCardSelected,
              ]}
              onPress={() =>
                setDeliveryMethod(
                  'standard'
                )
              }
            >
              <View
                style={
                  styles.optionLeft
                }
              >
                <Ionicons
                  name="cube-outline"
                  size={25}
                  color={
                    COLORS.primary
                  }
                />

                <View
                  style={
                    styles.optionInfo
                  }
                >
                  <Text
                    style={
                      styles.optionTitle
                    }
                  >
                    Standard Delivery
                  </Text>

                  <Text
                    style={
                      styles.optionDescription
                    }
                  >
                    {deliveryLoading
                      ? 'Checking delivery charge...'
                      : deliveryQuote
                        ? (
                            hasFreeDeliveryCoupon
                              ? `FREE with coupon · Estimated ${deliveryQuote.estimatedDays} day(s)`
                              : `Rs. ${deliveryQuote.deliveryFee.toLocaleString()} · Estimated ${deliveryQuote.estimatedDays} day(s)`
                          )
                        : city.trim()
                          ? (
                              deliveryError ||
                              'Delivery fee unavailable'
                            )
                          : 'Enter your city to calculate delivery'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  deliveryMethod ===
                    'standard' &&
                    styles.radioOuterActive,
                ]}
              >
                {deliveryMethod ===
                  'standard' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </Pressable>


            {deliveryMethod ===
              'standard' &&
              city.trim() !== '' && (

              <View
                style={[
                  styles.deliveryStatusCard,

                  deliveryError
                    ? styles.deliveryStatusError
                    : styles.deliveryStatusSuccess,
                ]}
              >

                {deliveryLoading ? (

                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.primary
                    }
                  />

                ) : (

                  <Ionicons
                    name={
                      deliveryError
                        ? 'alert-circle-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={20}
                    color={
                      deliveryError
                        ? COLORS.error
                        : COLORS.success
                    }
                  />

                )}


                <View
                  style={
                    styles.deliveryStatusInfo
                  }
                >

                  <Text
                    style={[
                      styles.deliveryStatusTitle,

                      deliveryError &&
                        styles.deliveryStatusTitleError,
                    ]}
                  >
                    {deliveryLoading
                      ? 'Checking delivery...'
                      : deliveryQuote
                        ? deliveryQuote.zone.city
                        : 'Delivery unavailable'}
                  </Text>


                  <Text
                    style={
                      styles.deliveryStatusText
                    }
                  >
                    {deliveryLoading
                      ? 'Please wait while we calculate your delivery charge.'
                      : deliveryQuote
                        ? (
                            hasFreeDeliveryCoupon
                              ? `Normal fee Rs. ${deliveryQuote.deliveryFee.toLocaleString()} · FREEDLV makes it free`
                              : `Delivery fee Rs. ${deliveryQuote.deliveryFee.toLocaleString()} · Estimated ${deliveryQuote.estimatedDays} day(s)`
                          )
                        : deliveryError}
                  </Text>

                </View>

              </View>

            )}


            <Pressable
              style={[
                styles.optionCard,
                deliveryMethod ===
                  'pickup' &&
                  styles.optionCardSelected,
              ]}
              onPress={() =>
                setDeliveryMethod(
                  'pickup'
                )
              }
            >
              <View
                style={
                  styles.optionLeft
                }
              >
                <Ionicons
                  name="storefront-outline"
                  size={25}
                  color={
                    COLORS.primary
                  }
                />

                <View
                  style={
                    styles.optionInfo
                  }
                >
                  <Text
                    style={
                      styles.optionTitle
                    }
                  >
                    Store Pickup
                  </Text>

                  <Text
                    style={
                      styles.optionDescription
                    }
                  >
                    Collect from Lucky Hub
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  deliveryMethod ===
                    'pickup' &&
                    styles.radioOuterActive,
                ]}
              >
                {deliveryMethod ===
                  'pickup' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </Pressable>

          </View>


          {/* PAYMENT */}

          <View
            style={styles.section}
          >

            <View
              style={
                styles.sectionHeader
              }
            >
              <Ionicons
                name="wallet-outline"
                size={22}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Payment Method
              </Text>
            </View>


            <Pressable
              style={[
                styles.optionCard,
                paymentMethod ===
                  'cod' &&
                  styles.optionCardSelected,
              ]}
              onPress={() =>
                setPaymentMethod(
                  'cod'
                )
              }
            >
              <View
                style={
                  styles.optionLeft
                }
              >
                <Ionicons
                  name="cash-outline"
                  size={27}
                  color={
                    COLORS.primary
                  }
                />

                <View
                  style={
                    styles.optionInfo
                  }
                >
                  <Text
                    style={
                      styles.optionTitle
                    }
                  >
                    Cash on Delivery
                  </Text>

                  <Text
                    style={
                      styles.optionDescription
                    }
                  >
                    Pay when your order arrives
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.radioOuterActive
                }
              >
                <View
                  style={
                    styles.radioInner
                  }
                />
              </View>
            </Pressable>


            <View
              style={
                styles.onlineNotice
              }
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={
                  COLORS.textSecondary
                }
              />

              <Text
                style={
                  styles.onlineNoticeText
                }
              >
                Online payment will be connected later.
              </Text>
            </View>

          </View>


          {/* COUPON */}

          {couponResult && (
            <View
              style={
                styles.couponSection
              }
            >

              <View
                style={
                  styles.couponIconBox
                }
              >
                <Ionicons
                  name="ticket-outline"
                  size={22}
                  color={
                    COLORS.success
                  }
                />
              </View>


              <View
                style={
                  styles.couponInfo
                }
              >
                <Text
                  style={
                    styles.couponCode
                  }
                >
                  {
                    couponResult
                      .coupon
                      .code
                  } APPLIED
                </Text>

                <Text
                  style={
                    styles.couponDescription
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


              {couponResult.discount >
                0 && (
                <Text
                  style={
                    styles.couponSaving
                  }
                >
                  - Rs.{' '}
                  {couponResult
                    .discount
                    .toLocaleString()}
                </Text>
              )}

            </View>
          )}


          {/* SUMMARY */}

          <View
            style={styles.section}
          >

            <View
              style={
                styles.sectionHeader
              }
            >
              <Ionicons
                name="receipt-outline"
                size={22}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Order Summary
              </Text>
            </View>


            <SummaryRow
              label={`Items (${itemCount})`}
              value={subtotal}
            />


            {deliveryMethod ===
              'standard' &&
            deliveryLoading ? (

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
                    styles.deliveryPendingValue
                  }
                >
                  Checking...
                </Text>
              </View>

            ) : hasFreeDeliveryCoupon &&
            deliveryMethod ===
              'standard' &&
            deliveryQuote ? (

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
                    styles.freeDeliveryValue
                  }
                >
                  FREE
                </Text>
              </View>

            ) : deliveryMethod ===
              'standard' &&
            !deliveryQuote ? (

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
                    styles.deliveryPendingValue
                  }
                >
                  --
                </Text>
              </View>

            ) : (

              <SummaryRow
                label="Delivery"
                value={
                  deliveryFee
                }
              />

            )}


            <SummaryRow
              label={
                couponResult
                  ? `Coupon (${couponResult.coupon.code})`
                  : 'Discount'
              }
              value={discount}
              negative
            />


            <View
              style={styles.divider}
            />


            <View
              style={styles.totalRow}
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                TOTAL
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                Rs.{' '}
                {total.toLocaleString()}
              </Text>
            </View>

          </View>


          <View
            style={
              styles.noticeCard
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.noticeText
              }
            >
              Please check your delivery information carefully before placing the order.
            </Text>
          </View>

        </ScrollView>


        {/* BOTTOM BAR */}

        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom:
                Math.max(
                  insets.bottom,
                  12
                ),
            },
          ]}
        >

          <View
            style={
              styles.bottomTotalBox
            }
          >
            <Text
              style={
                styles.bottomLabel
              }
            >
              Total
            </Text>

            <Text
              style={
                styles.bottomTotal
              }
            >
              Rs.{' '}
              {total.toLocaleString()}
            </Text>
          </View>


          <Pressable
            style={[
              styles.placeOrderButton,
              (
                placingOrder ||
                cartItems.length ===
                  0 ||
                (
                  deliveryMethod ===
                    'standard' &&
                  (
                    deliveryLoading ||
                    !deliveryQuote
                  )
                )
              ) &&
                styles.placeOrderButtonDisabled,
            ]}
            onPress={
              handlePlaceOrder
            }
            disabled={
              placingOrder ||
              cartItems.length ===
                0 ||
              (
                deliveryMethod ===
                  'standard' &&
                (
                  deliveryLoading ||
                  !deliveryQuote
                )
              )
            }
          >

            {placingOrder ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.white
                }
              />
            ) : (
              <>
                <Text
                  style={
                    styles.placeOrderText
                  }
                >
                  PLACE ORDER
                </Text>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={
                    COLORS.white
                  }
                />
              </>
            )}

          </Pressable>

        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}


function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText:
    (value: string) => void;
  keyboardType?:
    | 'default'
    | 'phone-pad'
    | 'number-pad';
}) {
  return (
    <View
      style={styles.inputGroup}
    >
      <Text
        style={styles.inputLabel}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={placeholder}
        placeholderTextColor={
          COLORS.textSecondary
        }
        keyboardType={
          keyboardType
        }
        style={styles.input}
      />
    </View>
  );
}


function SummaryRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <View
      style={styles.summaryRow}
    >
      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          negative &&
            styles.discountValue,
        ]}
      >
        {negative &&
        value > 0
          ? '- '
          : ''}
        Rs.{' '}
        {value.toLocaleString()}
      </Text>
    </View>
  );
}


const styles =
  StyleSheet.create({

    flex: {
      flex: 1,
    },

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
      color:
        COLORS.textSecondary,
    },

    header: {
      height: 58,
      backgroundColor:
        COLORS.white,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    backButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },

    headerSpace: {
      width: 42,
    },

    content: {
      padding: 14,
    },

    stepsCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    step: {
      alignItems: 'center',
    },

    stepCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        COLORS.backgroundSoft,
      alignItems: 'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    stepCircleActive: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    stepNumber: {
      fontSize: 12,
      fontWeight: '800',
      color:
        COLORS.textSecondary,
    },

    stepNumberActive: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.white,
    },

    stepText: {
      marginTop: 5,
      fontSize: 10,
      fontWeight: '600',
      color:
        COLORS.textSecondary,
    },

    stepTextActive: {
      marginTop: 5,
      fontSize: 10,
      fontWeight: '800',
      color:
        COLORS.primary,
    },

    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor:
        COLORS.border,
      marginHorizontal: 8,
      marginBottom: 18,
    },

    stepLineActive: {
      flex: 1,
      height: 2,
      backgroundColor:
        COLORS.primary,
      marginHorizontal: 8,
      marginBottom: 18,
    },

    section: {
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 16,
      marginBottom: 12,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },

    sectionTitle: {
      marginLeft: 8,
      fontSize: 17,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },

    inputGroup: {
      marginBottom: 14,
    },

    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
      marginBottom: 7,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      fontSize: 14,
      color:
        COLORS.textPrimary,
      backgroundColor:
        COLORS.backgroundSoft,
    },

    optionCard: {
      minHeight: 72,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      padding: 13,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    optionCardSelected: {
      borderColor:
        COLORS.primary,
      backgroundColor:
        '#E8F5F0',
    },

    optionLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    optionInfo: {
      flex: 1,
      marginLeft: 12,
    },

    optionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },

    optionDescription: {
      marginTop: 4,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    radioOuterActive: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        COLORS.primary,
    },

    deliveryStatusCard: {
      marginBottom: 10,
      borderRadius: 11,
      borderWidth: 1,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    deliveryStatusSuccess: {
      borderColor:
        '#BBF7D0',
      backgroundColor:
        '#F0FDF4',
    },

    deliveryStatusError: {
      borderColor:
        '#FECACA',
      backgroundColor:
        '#FEF2F2',
    },

    deliveryStatusInfo: {
      flex: 1,
      marginLeft: 9,
    },

    deliveryStatusTitle: {
      fontSize: 12,
      fontWeight: '900',
      color:
        COLORS.success,
    },

    deliveryStatusTitleError: {
      color:
        COLORS.error,
    },

    deliveryStatusText: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color:
        COLORS.textSecondary,
    },

    deliveryPendingValue: {
      fontSize: 13,
      fontWeight: '800',
      color:
        COLORS.textSecondary,
    },

    onlineNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.backgroundSoft,
      borderRadius: 10,
      padding: 12,
      marginTop: 5,
    },

    onlineNoticeText: {
      flex: 1,
      marginLeft: 9,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    couponSection: {
      backgroundColor:
        '#F0FDF4',
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        '#BBF7D0',
      padding: 13,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },

    couponIconBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        COLORS.white,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    couponInfo: {
      flex: 1,
      marginLeft: 10,
    },

    couponCode: {
      fontSize: 12,
      fontWeight: '900',
      color:
        COLORS.success,
    },

    couponDescription: {
      marginTop: 2,
      fontSize: 10,
      lineHeight: 15,
      color:
        COLORS.textSecondary,
    },

    couponSaving: {
      marginLeft: 8,
      fontSize: 12,
      fontWeight: '900',
      color:
        COLORS.success,
    },

    freeDeliveryValue: {
      fontSize: 13,
      fontWeight: '900',
      color:
        COLORS.success,
    },

    summaryRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      marginBottom: 12,
    },

    summaryLabel: {
      fontSize: 14,
      color:
        COLORS.textSecondary,
    },

    summaryValue: {
      fontSize: 14,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
    },

    discountValue: {
      color:
        COLORS.success,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 4,
    },

    totalRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginTop: 12,
    },

    totalLabel: {
      fontSize: 16,
      fontWeight: '900',
      color:
        COLORS.textPrimary,
    },

    totalValue: {
      fontSize: 21,
      fontWeight: '900',
      color:
        COLORS.primary,
    },

    noticeCard: {
      backgroundColor:
        '#E8F5F0',
      borderRadius: 13,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },

    noticeText: {
      flex: 1,
      marginLeft: 10,
      color:
        COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor:
        COLORS.white,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      paddingHorizontal: 15,
      paddingTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    bottomTotalBox: {
      flex: 1,
      paddingRight: 10,
    },

    bottomLabel: {
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },

    bottomTotal: {
      marginTop: 2,
      fontSize: 19,
      fontWeight: '900',
      color:
        COLORS.primary,
    },

    placeOrderButton: {
      minWidth: 170,
      height: 52,
      borderRadius: 11,
      backgroundColor:
        COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 7,
    },

    placeOrderButtonDisabled: {
      backgroundColor:
        COLORS.textSecondary,
    },

    placeOrderText: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '900',
    },

    errorCard: {
      marginBottom: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor:
        '#FEF2F2',
      flexDirection: 'row',
      alignItems: 'center',
    },

    errorText: {
      flex: 1,
      marginLeft: 8,
      color:
        COLORS.error,
      fontSize: 12,
    },

  });