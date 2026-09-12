import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { supabase } from '../lib/supabase';

import {
  showLocalNotification,
} from '../services/notificationService';


// ======================================================
// TYPES
// ======================================================

type OrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  subtotal: number;
};


type Order = {
  id: string;

  orderNumber: string;

  date: string;

  createdAt: string;

  status: string;

  total: number;

  subtotal: number;

  discount: number;

  deliveryFee: number;

  paymentMethod: string;

  paymentStatus: string;

  deliveryMethod: string;

  estimatedDelivery: string;

  trackingNumber: string;

  customerName: string;

  customerPhone: string;

  deliveryAddress: string;

  notes: string;

  items: OrderItem[];
};


const ORDER_STATUS_STORAGE_KEY =
  'luckyhub_order_statuses_v1';


// ======================================================
// DATE FORMATTER
// ======================================================

function formatDate(
  value?: string | null
) {
  if (!value) {
    return 'Not assigned yet';
  }


  const date = new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}


// ======================================================
// MONEY FORMATTER
// ======================================================

function formatMoney(
  value: number
) {
  return Number(
    value || 0
  ).toLocaleString();
}


// ======================================================
// STATUS HELPERS
// ======================================================

function getStatusIcon(
  status: string
) {
  const normalized =
    status.toLowerCase();


  if (
    normalized === 'delivered'
  ) {
    return 'checkmark-circle' as const;
  }


  if (
    normalized ===
    'out for delivery'
  ) {
    return 'navigate-outline' as const;
  }


  if (
    normalized === 'shipped'
  ) {
    return 'car-outline' as const;
  }


  if (
    normalized ===
    'cancelled'
  ) {
    return 'close-circle-outline' as const;
  }


  return 'time-outline' as const;
}


// ======================================================
// STATUS NOTIFICATION MESSAGE
// ======================================================

function getOrderStatusNotification(
  status: string
): {
  title: string;
  bodyPrefix: string;
} | null {

  const normalized =
    status
      .trim()
      .toLowerCase();


  switch (
    normalized
  ) {

    case 'processing':

    case 'preparing':
      return {
        title:
          'Order Processing',

        bodyPrefix:
          'Your Lucky Hub order is being prepared.',
      };


    case 'ready':

    case 'ready for delivery':
      return {
        title:
          'Order Ready',

        bodyPrefix:
          'Your Lucky Hub order is ready for dispatch.',
      };


    case 'shipped':
      return {
        title:
          'Order Shipped',

        bodyPrefix:
          'Your Lucky Hub order has been dispatched.',
      };


    case 'out for delivery':
      return {
        title:
          'Order Out for Delivery',

        bodyPrefix:
          'Your Lucky Hub order is on the way to you.',
      };


    case 'delivered':
      return {
        title:
          'Order Delivered',

        bodyPrefix:
          'Your Lucky Hub order has been delivered.',
      };


    case 'cancelled':
      return {
        title:
          'Order Cancelled',

        bodyPrefix:
          'Your Lucky Hub order has been cancelled.',
      };


    default:
      return null;
  }
}


// ======================================================
// SCREEN
// ======================================================

export default function OrdersScreen() {

  const statusStorageReadyRef =
    useRef(false);


  const [orders, setOrders] =
    useState<Order[]>([]);


  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<Order | null>(
      null
    );


  const [
    trackingOrder,
    setTrackingOrder,
  ] =
    useState<Order | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');


  // ====================================================
  // LOAD REAL ORDERS FROM SUPABASE
  // ====================================================

  const loadOrders =
    useCallback(
      async (
        showLoader = true
      ) => {

        try {

          if (
            showLoader
          ) {
            setLoading(true);
          }


          setErrorMessage('');


          // ==============================================
          // CURRENT USER
          // ==============================================

          const {
            data: userData,
            error: userError,
          } =
            await supabase.auth.getUser();


          if (
            userError
          ) {
            throw userError;
          }


          const user =
            userData.user;


          if (!user) {
            throw new Error(
              'Please login to view your orders.'
            );
          }


          // ==============================================
          // GET ORDERS + ORDER ITEMS
          // ==============================================

          const {
            data,
            error,
          } =
            await supabase
              .from('orders')
              .select(`
                id,
                user_id,
                order_number,
                status,
                payment_method,
                payment_status,
                delivery_method,
                subtotal,
                discount,
                delivery_fee,
                total,
                tracking_number,
                estimated_delivery,
                customer_name,
                customer_phone,
                delivery_address,
                notes,
                created_at,
                order_items (
                  id,
                  product_id,
                  variant_id,
                  product_name,
                  variant_name,
                  unit_price,
                  quantity,
                  subtotal
                )
              `)
              .eq(
                'user_id',
                user.id
              )
              .order(
                'created_at',
                {
                  ascending: false,
                }
              );


          if (
            error
          ) {
            console.error(
              'Load orders error:',
              error
            );

            throw error;
          }


          // ==============================================
          // CONVERT DATABASE DATA TO SCREEN DATA
          // ==============================================

          const mappedOrders:
            Order[] =
            (
              data ?? []
            ).map(
              (
                raw: any
              ) => {

                const rawItems =
                  Array.isArray(
                    raw.order_items
                  )
                    ? raw.order_items
                    : [];


                const items:
                  OrderItem[] =
                  rawItems.map(
                    (
                      item: any
                    ) => ({
                      id:
                        String(
                          item.id
                        ),

                      productId:
                        item.product_id ??
                        null,

                      variantId:
                        item.variant_id ??
                        null,

                      name:
                        item.product_name ||
                        'Product',

                      variant:
                        item.variant_name ||
                        '',

                      price:
                        Number(
                          item.unit_price ??
                            0
                        ),

                      quantity:
                        Number(
                          item.quantity ??
                            0
                        ),

                      subtotal:
                        Number(
                          item.subtotal ??
                            0
                        ),
                    })
                  );


                return {

                  id:
                    String(
                      raw.id
                    ),

                  orderNumber:
                    raw.order_number ||
                    '',

                  date:
                    formatDate(
                      raw.created_at
                    ),

                  createdAt:
                    raw.created_at ||
                    '',

                  status:
                    raw.status ||
                    'Processing',

                  total:
                    Number(
                      raw.total ??
                        0
                    ),

                  subtotal:
                    Number(
                      raw.subtotal ??
                        0
                    ),

                  discount:
                    Number(
                      raw.discount ??
                        0
                    ),

                  deliveryFee:
                    Number(
                      raw.delivery_fee ??
                        0
                    ),

                  paymentMethod:
                    raw.payment_method ||
                    'Cash on Delivery',

                  paymentStatus:
                    raw.payment_status ||
                    'Pending',

                  deliveryMethod:
                    raw.delivery_method ||
                    'Standard Delivery',

                  estimatedDelivery:
                    formatDate(
                      raw.estimated_delivery
                    ),

                  trackingNumber:
                    raw.tracking_number ||
                    'Not assigned yet',

                  customerName:
                    raw.customer_name ||
                    '',

                  customerPhone:
                    raw.customer_phone ||
                    '',

                  deliveryAddress:
                    raw.delivery_address ||
                    '',

                  notes:
                    raw.notes ||
                    '',

                  items,
                };
              }
            );


          setOrders(
            mappedOrders
          );


          // ==============================================
          // ORDER STATUS CHANGE NOTIFICATIONS
          //
          // First load only saves the current statuses.
          // Later refreshes compare against the saved
          // statuses and notify only when something changed.
          // ==============================================

          try {

            const savedStatusJson =
              await AsyncStorage
                .getItem(
                  ORDER_STATUS_STORAGE_KEY
                );


            const previousStatuses:
              Record<
                string,
                string
              > =
              savedStatusJson
                ? JSON.parse(
                    savedStatusJson
                  )
                : {};


            const currentStatuses:
              Record<
                string,
                string
              > = {};


            for (
              const order
              of mappedOrders
            ) {

              currentStatuses[
                order.id
              ] =
                order.status;


              if (
                !statusStorageReadyRef
                  .current
              ) {
                continue;
              }


              const previousStatus =
                previousStatuses[
                  order.id
                ];


              if (
                !previousStatus
              ) {
                continue;
              }


              if (
                previousStatus ===
                order.status
              ) {
                continue;
              }


              const notification =
                getOrderStatusNotification(
                  order.status
                );


              if (
                !notification
              ) {
                continue;
              }


              try {

                await showLocalNotification(
                  notification.title,
                  `${notification.bodyPrefix} Order ${order.orderNumber}.`,
                  {
                    type:
                      'order',

                    orderNumber:
                      order.orderNumber,

                    orderId:
                      order.id,

                    status:
                      order.status,
                  }
                );


              } catch (
                notificationError
              ) {

                console.log(
                  'Order status notification error:',
                  notificationError
                );
              }
            }


            await AsyncStorage
              .setItem(
                ORDER_STATUS_STORAGE_KEY,
                JSON.stringify(
                  currentStatuses
                )
              );


            statusStorageReadyRef
              .current =
              true;


          } catch (
            statusStorageError
          ) {

            console.log(
              'Order status storage error:',
              statusStorageError
            );
          }


          // ==============================================
          // REFRESH SELECTED ORDER TOO
          // ==============================================

          if (
            selectedOrder
          ) {

            const updated =
              mappedOrders.find(
                (
                  item
                ) =>
                  item.id ===
                  selectedOrder.id
              );


            if (
              updated
            ) {
              setSelectedOrder(
                updated
              );
            }
          }


          if (
            trackingOrder
          ) {

            const updated =
              mappedOrders.find(
                (
                  item
                ) =>
                  item.id ===
                  trackingOrder.id
              );


            if (
              updated
            ) {
              setTrackingOrder(
                updated
              );
            }
          }

        } catch (
          error: any
        ) {

          console.error(
            'Orders screen error:',
            error
          );


          setErrorMessage(
            error?.message ||
              'Unable to load your orders.'
          );

        } finally {

          setLoading(false);

          setRefreshing(
            false
          );
        }
      },
      [
        selectedOrder,
        trackingOrder,
      ]
    );


  // ====================================================
  // LOAD WHEN ORDERS TAB OPENS
  // ====================================================

  useFocusEffect(
    useCallback(
      () => {

        loadOrders(
          true
        );

      },
      []
    )
  );


  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh =
    async () => {

      setRefreshing(
        true
      );

      await loadOrders(
        false
      );
    };


  // ====================================================
  // TRACKING VIEW
  // ====================================================

  if (
    trackingOrder
  ) {

    return (
      <OrderTrackingView
        order={
          trackingOrder
        }
        refreshing={
          refreshing
        }
        onRefresh={
          handleRefresh
        }
        onBack={() =>
          setTrackingOrder(
            null
          )
        }
      />
    );
  }


  // ====================================================
  // ORDER DETAILS VIEW
  // ====================================================

  if (
    selectedOrder
  ) {

    const itemCount =
      selectedOrder.items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.quantity,
        0
      );


    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          'top',
        ]}
      >

        {/* HEADER */}

        <View
          style={
            styles.detailsHeader
          }
        >

          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              setSelectedOrder(
                null
              )
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
              styles.detailsHeaderTitle
            }
          >
            Order Details
          </Text>


          <View
            style={
              styles.headerSpace
            }
          />

        </View>


        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
            />
          }
          contentContainerStyle={
            styles.content
          }
        >

          {/* STATUS */}

          <View
            style={
              styles.statusCard
            }
          >

            <View
              style={
                styles.statusIcon
              }
            >

              <Ionicons
                name={getStatusIcon(
                  selectedOrder.status
                )}
                size={32}
                color={
                  selectedOrder.status
                    .toLowerCase() ===
                  'cancelled'
                    ? COLORS.error
                    : COLORS.primary
                }
              />

            </View>


            <View
              style={
                styles.statusInfo
              }
            >

              <Text
                style={
                  styles.statusLabel
                }
              >
                Order Status
              </Text>


              <Text
                style={[
                  styles.statusValue,

                  selectedOrder.status
                    .toLowerCase() ===
                    'cancelled' && {
                    color:
                      COLORS.error,
                  },
                ]}
              >
                {
                  selectedOrder.status
                }
              </Text>

            </View>

          </View>


          {/* ORDER INFORMATION */}

          <View
            style={
              styles.section
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              Order Information
            </Text>


            <DetailRow
              label="Order Number"
              value={
                selectedOrder.orderNumber
              }
            />


            <DetailRow
              label="Order Date"
              value={
                selectedOrder.date
              }
            />


            <DetailRow
              label="Items"
              value={`${itemCount} ${
                itemCount ===
                1
                  ? 'item'
                  : 'items'
              }`}
            />


            <DetailRow
              label="Payment Status"
              value={
                selectedOrder.paymentStatus
              }
            />

          </View>


          {/* PRODUCTS */}

          <View
            style={
              styles.section
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              Products
            </Text>


            {selectedOrder
              .items
              .length ===
            0 ? (

              <Text
                style={
                  styles.emptySectionText
                }
              >
                No products found
                for this order.
              </Text>

            ) : (

              selectedOrder.items.map(
                (
                  item
                ) => (

                  <View
                    key={
                      item.id
                    }
                    style={
                      styles.productCard
                    }
                  >

                    <View
                      style={
                        styles.productImage
                      }
                    >

                      <Ionicons
                        name="cube-outline"
                        size={34}
                        color={
                          COLORS.textSecondary
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.productInfo
                      }
                    >

                      <Text
                        style={
                          styles.productName
                        }
                      >
                        {
                          item.name
                        }
                      </Text>


                      {item.variant !==
                        '' && (

                        <Text
                          style={
                            styles.variantText
                          }
                        >
                          {
                            item.variant
                          }
                        </Text>

                      )}


                      <Text
                        style={
                          styles.productPrice
                        }
                      >
                        Rs.{' '}
                        {formatMoney(
                          item.price
                        )}
                      </Text>

                    </View>


                    <View
                      style={
                        styles.productRight
                      }
                    >

                      <Text
                        style={
                          styles.quantityText
                        }
                      >
                        ×{' '}
                        {
                          item.quantity
                        }
                      </Text>


                      <Text
                        style={
                          styles.productSubtotal
                        }
                      >
                        Rs.{' '}
                        {formatMoney(
                          item.subtotal
                        )}
                      </Text>

                    </View>

                  </View>

                )
              )

            )}

          </View>


          {/* DELIVERY ADDRESS */}

          {selectedOrder
            .deliveryAddress !==
            '' && (

            <View
              style={
                styles.section
              }
            >

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Delivery Address
              </Text>


              <View
                style={
                  styles.methodRow
                }
              >

                <View
                  style={
                    styles.methodIcon
                  }
                >

                  <Ionicons
                    name="location-outline"
                    size={22}
                    color={
                      COLORS.primary
                    }
                  />

                </View>


                <View
                  style={
                    styles.methodInfo
                  }
                >

                  {selectedOrder
                    .customerName !==
                    '' && (

                    <Text
                      style={
                        styles.methodTitle
                      }
                    >
                      {
                        selectedOrder.customerName
                      }
                    </Text>

                  )}


                  {selectedOrder
                    .customerPhone !==
                    '' && (

                    <Text
                      style={
                        styles.methodText
                      }
                    >
                      {
                        selectedOrder.customerPhone
                      }
                    </Text>

                  )}


                  <Text
                    style={
                      styles.addressText
                    }
                  >
                    {
                      selectedOrder.deliveryAddress
                    }
                  </Text>

                </View>

              </View>

            </View>

          )}


          {/* DELIVERY */}

          <View
            style={
              styles.section
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery
            </Text>


            <View
              style={
                styles.methodRow
              }
            >

              <View
                style={
                  styles.methodIcon
                }
              >

                <Ionicons
                  name="cube-outline"
                  size={22}
                  color={
                    COLORS.primary
                  }
                />

              </View>


              <View
                style={
                  styles.methodInfo
                }
              >

                <Text
                  style={
                    styles.methodTitle
                  }
                >
                  {
                    selectedOrder.deliveryMethod
                  }
                </Text>


                <Text
                  style={
                    styles.methodText
                  }
                >
                  Estimated
                  delivery:{' '}
                  {
                    selectedOrder.estimatedDelivery
                  }
                </Text>

              </View>

            </View>

          </View>


          {/* PAYMENT */}

          <View
            style={
              styles.section
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              Payment
            </Text>


            <View
              style={
                styles.methodRow
              }
            >

              <View
                style={
                  styles.methodIcon
                }
              >

                <Ionicons
                  name="cash-outline"
                  size={22}
                  color={
                    COLORS.primary
                  }
                />

              </View>


              <View
                style={
                  styles.methodInfo
                }
              >

                <Text
                  style={
                    styles.methodTitle
                  }
                >
                  {
                    selectedOrder.paymentMethod
                  }
                </Text>


                <Text
                  style={
                    styles.methodText
                  }
                >
                  Payment status:{' '}
                  {
                    selectedOrder.paymentStatus
                  }
                </Text>

              </View>

            </View>

          </View>


          {/* PRICE SUMMARY */}

          <View
            style={
              styles.section
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              Order Summary
            </Text>


            <DetailRow
              label="Subtotal"
              value={`Rs. ${formatMoney(
                selectedOrder.subtotal
              )}`}
            />


            <DetailRow
              label="Discount"
              value={`Rs. ${formatMoney(
                selectedOrder.discount
              )}`}
            />


            <DetailRow
              label="Delivery Fee"
              value={`Rs. ${formatMoney(
                selectedOrder.deliveryFee
              )}`}
            />

          </View>


          {/* TOTAL */}

          <View
            style={
              styles.totalCard
            }
          >

            <View>

              <Text
                style={
                  styles.totalLabel
                }
              >
                Total Amount
              </Text>


              <Text
                style={
                  styles.totalDescription
                }
              >
                Final order total
              </Text>

            </View>


            <Text
              style={
                styles.totalValue
              }
            >
              Rs.{' '}
              {formatMoney(
                selectedOrder.total
              )}
            </Text>

          </View>

        </ScrollView>


        {/* TRACK BUTTON */}

        {selectedOrder.status
          .toLowerCase() !==
          'cancelled' && (

          <View
            style={
              styles.bottomBar
            }
          >

            <Pressable
              style={
                styles.trackButton
              }
              onPress={() =>
                setTrackingOrder(
                  selectedOrder
                )
              }
            >

              <Ionicons
                name="location-outline"
                size={20}
                color={
                  COLORS.white
                }
              />


              <Text
                style={
                  styles.trackButtonText
                }
              >
                {selectedOrder.status
                  .toLowerCase() ===
                'delivered'
                  ? 'VIEW TRACKING'
                  : 'TRACK ORDER'}
              </Text>

            </Pressable>

          </View>

        )}

      </SafeAreaView>
    );
  }


  // ====================================================
  // LOADING
  // ====================================================

  if (
    loading
  ) {

    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          'top',
        ]}
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
            My Orders
          </Text>
        </View>


        <View
          style={
            styles.centerState
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
            Loading your
            orders...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (
    errorMessage !==
    ''
  ) {

    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          'top',
        ]}
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
            My Orders
          </Text>
        </View>


        <View
          style={
            styles.centerState
          }
        >

          <Ionicons
            name="alert-circle-outline"
            size={55}
            color={
              COLORS.error
            }
          />


          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to load
            orders
          </Text>


          <Text
            style={
              styles.errorText
            }
          >
            {
              errorMessage
            }
          </Text>


          <Pressable
            style={
              styles.retryButton
            }
            onPress={() =>
              loadOrders(
                true
              )
            }
          >

            <Text
              style={
                styles.retryButtonText
              }
            >
              TRY AGAIN
            </Text>

          </Pressable>

        </View>

      </SafeAreaView>
    );
  }


  // ====================================================
  // MY ORDERS LIST
  // ====================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
      ]}
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
          My Orders
        </Text>

      </View>


      {orders.length ===
      0 ? (

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
            />
          }
          contentContainerStyle={
            styles.emptyContainer
          }
        >

          <Ionicons
            name="bag-handle-outline"
            size={72}
            color={
              COLORS.textSecondary
            }
          />


          <Text
            style={
              styles.emptyTitle
            }
          >
            No orders yet
          </Text>


          <Text
            style={
              styles.emptyText
            }
          >
            Your Lucky Hub
            orders will appear
            here after checkout.
          </Text>

        </ScrollView>

      ) : (

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
            />
          }
          contentContainerStyle={
            styles.content
          }
        >

          {orders.map(
            (
              order
            ) => {

              const itemCount =
                order.items.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    item.quantity,
                  0
                );


              return (
                <Pressable
                  key={
                    order.id
                  }
                  style={
                    styles.orderCard
                  }
                  onPress={() =>
                    setSelectedOrder(
                      order
                    )
                  }
                >

                  <View
                    style={
                      styles.orderTop
                    }
                  >

                    <View>

                      <Text
                        style={
                          styles.orderNumberLabel
                        }
                      >
                        ORDER NUMBER
                      </Text>


                      <Text
                        style={
                          styles.orderNumber
                        }
                      >
                        {
                          order.orderNumber
                        }
                      </Text>

                    </View>


                    <StatusBadge
                      status={
                        order.status
                      }
                    />

                  </View>


                  <View
                    style={
                      styles.divider
                    }
                  />


                  <InfoRow
                    icon="calendar-outline"
                    label="Order Date"
                    value={
                      order.date
                    }
                  />


                  <InfoRow
                    icon="bag-outline"
                    label="Items"
                    value={`${itemCount} ${
                      itemCount ===
                      1
                        ? 'item'
                        : 'items'
                    }`}
                  />


                  <InfoRow
                    icon="cash-outline"
                    label="Payment"
                    value={
                      order.paymentMethod
                    }
                  />


                  <View
                    style={
                      styles.divider
                    }
                  />


                  <View
                    style={
                      styles.orderBottom
                    }
                  >

                    <View>

                      <Text
                        style={
                          styles.totalSmall
                        }
                      >
                        Total Amount
                      </Text>


                      <Text
                        style={
                          styles.totalListValue
                        }
                      >
                        Rs.{' '}
                        {formatMoney(
                          order.total
                        )}
                      </Text>

                    </View>


                    <View
                      style={
                        styles.viewDetails
                      }
                    >

                      <Text
                        style={
                          styles.viewDetailsText
                        }
                      >
                        View Details
                      </Text>


                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={
                          COLORS.primary
                        }
                      />

                    </View>

                  </View>

                </Pressable>
              );
            }
          )}

        </ScrollView>

      )}

    </SafeAreaView>
  );
}


// ======================================================
// STATUS BADGE
// ======================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {

  const normalized =
    status.toLowerCase();


  let badgeStyle =
    styles.processingBadge;


  if (
    normalized ===
    'delivered'
  ) {
    badgeStyle =
      styles.deliveredBadge;
  } else if (
    normalized ===
    'out for delivery'
  ) {
    badgeStyle =
      styles.deliveryBadge;
  } else if (
    normalized ===
    'shipped'
  ) {
    badgeStyle =
      styles.shippedBadge;
  } else if (
    normalized ===
    'cancelled'
  ) {
    badgeStyle =
      styles.cancelledBadge;
  }


  return (
    <View
      style={[
        styles.statusBadge,
        badgeStyle,
      ]}
    >

      <Text
        style={[
          styles.statusBadgeText,

          normalized ===
            'cancelled' && {
            color:
              COLORS.error,
          },
        ]}
      >
        {status}
      </Text>

    </View>
  );
}


// ======================================================
// ORDER TRACKING VIEW
// ======================================================

function OrderTrackingView({
  order,
  onBack,
  refreshing,
  onRefresh,
}: {
  order: Order;

  onBack: () => void;

  refreshing: boolean;

  onRefresh: () => void;
}) {

  const trackingSteps = [
    {
      title:
        'Order Confirmed',

      description:
        'Your order has been received.',

      icon:
        'receipt-outline' as const,
    },

    {
      title:
        'Processing',

      description:
        'Lucky Hub is preparing your order.',

      icon:
        'cube-outline' as const,
    },

    {
      title:
        'Shipped',

      description:
        'Your order has been dispatched.',

      icon:
        'car-outline' as const,
    },

    {
      title:
        'Out for Delivery',

      description:
        'Your order is on the way to you.',

      icon:
        'navigate-outline' as const,
    },

    {
      title:
        'Delivered',

      description:
        'Your order has been delivered.',

      icon:
        'checkmark-circle-outline' as const,
    },
  ];


  const getCurrentStep =
    () => {

      const status =
        order.status
          .toLowerCase();


      switch (
        status
      ) {

        case 'new':

        case 'confirmed':
          return 0;


        case 'processing':

        case 'preparing':
          return 1;


        case 'ready':

        case 'ready for delivery':

        case 'shipped':
          return 2;


        case 'out for delivery':
          return 3;


        case 'delivered':
          return 4;


        default:
          return 0;
      }
    };


  const currentStep =
    getCurrentStep();


  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
      ]}
    >

      {/* HEADER */}

      <View
        style={
          styles.detailsHeader
        }
      >

        <Pressable
          style={
            styles.backButton
          }
          onPress={
            onBack
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
            styles.detailsHeaderTitle
          }
        >
          Track Order
        </Text>


        <View
          style={
            styles.headerSpace
          }
        />

      </View>


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
          />
        }
        contentContainerStyle={
          styles.trackingContent
        }
      >

        {/* TRACKING HEADER */}

        <View
          style={
            styles.trackingTopCard
          }
        >

          <View
            style={
              styles.trackingIcon
            }
          >

            <Ionicons
              name="location-outline"
              size={30}
              color={
                COLORS.primary
              }
            />

          </View>


          <Text
            style={
              styles.trackingOrderNumber
            }
          >
            {
              order.orderNumber
            }
          </Text>


          <Text
            style={
              styles.trackingStatus
            }
          >
            {
              order.status
            }
          </Text>


          <Text
            style={
              styles.trackingMessage
            }
          >
            Pull down to refresh
            the latest order
            status.
          </Text>

        </View>


        {/* DELIVERY INFORMATION */}

        <View
          style={
            styles.trackingInfoCard
          }
        >

          <View
            style={
              styles.trackingInfoRow
            }
          >

            <View
              style={
                styles.trackingInfoIcon
              }
            >

              <Ionicons
                name="calendar-outline"
                size={20}
                color={
                  COLORS.primary
                }
              />

            </View>


            <View
              style={
                styles.flex
              }
            >

              <Text
                style={
                  styles.trackingInfoLabel
                }
              >
                Estimated Delivery
              </Text>


              <Text
                style={
                  styles.trackingInfoValue
                }
              >
                {
                  order.estimatedDelivery
                }
              </Text>

            </View>

          </View>


          <View
            style={
              styles.trackingInfoDivider
            }
          />


          <View
            style={
              styles.trackingInfoRow
            }
          >

            <View
              style={
                styles.trackingInfoIcon
              }
            >

              <Ionicons
                name="barcode-outline"
                size={20}
                color={
                  COLORS.primary
                }
              />

            </View>


            <View
              style={
                styles.flex
              }
            >

              <Text
                style={
                  styles.trackingInfoLabel
                }
              >
                Tracking Number
              </Text>


              <Text
                style={
                  styles.trackingInfoValue
                }
              >
                {
                  order.trackingNumber
                }
              </Text>

            </View>

          </View>

        </View>


        {/* TIMELINE */}

        <View
          style={
            styles.timelineCard
          }
        >

          <Text
            style={
              styles.timelineTitle
            }
          >
            Order Progress
          </Text>


          {trackingSteps.map(
            (
              step,
              index
            ) => {

              const completed =
                index <=
                currentStep;


              const current =
                index ===
                currentStep;


              const isLast =
                index ===
                trackingSteps.length -
                  1;


              return (
                <View
                  key={
                    step.title
                  }
                  style={
                    styles.timelineRow
                  }
                >

                  <View
                    style={
                      styles.timelineLeft
                    }
                  >

                    <View
                      style={[
                        styles.timelineCircle,

                        completed &&
                          styles.timelineCircleCompleted,

                        current &&
                          styles.timelineCircleCurrent,
                      ]}
                    >

                      <Ionicons
                        name={
                          completed &&
                          !current
                            ? 'checkmark'
                            : step.icon
                        }
                        size={18}
                        color={
                          completed
                            ? COLORS.white
                            : COLORS.textSecondary
                        }
                      />

                    </View>


                    {!isLast && (

                      <View
                        style={[
                          styles.timelineLine,

                          index <
                            currentStep &&
                            styles.timelineLineCompleted,
                        ]}
                      />

                    )}

                  </View>


                  <View
                    style={
                      styles.timelineTextContainer
                    }
                  >

                    <Text
                      style={[
                        styles.timelineStepTitle,

                        completed &&
                          styles.timelineStepTitleCompleted,
                      ]}
                    >
                      {
                        step.title
                      }
                    </Text>


                    <Text
                      style={
                        styles.timelineDescription
                      }
                    >
                      {
                        step.description
                      }
                    </Text>


                    {index ===
                      0 && (

                      <Text
                        style={
                          styles.timelineDate
                        }
                      >
                        {
                          order.date
                        }
                      </Text>

                    )}


                    {current && (

                      <View
                        style={
                          styles.currentBadge
                        }
                      >

                        <Text
                          style={
                            styles.currentBadgeText
                          }
                        >
                          CURRENT STATUS
                        </Text>

                      </View>

                    )}

                  </View>

                </View>
              );
            }
          )}

        </View>


        {/* HELP */}

        <View
          style={
            styles.helpCard
          }
        >

          <Ionicons
            name="information-circle-outline"
            size={24}
            color={
              COLORS.primary
            }
          />


          <Text
            style={
              styles.helpText
            }
          >
            Tracking changes
            whenever the order
            status is updated in
            Lucky Hub.
          </Text>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


// ======================================================
// INFO ROW
// ======================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon:
    | 'calendar-outline'
    | 'bag-outline'
    | 'cash-outline';

  label: string;

  value: string;
}) {

  return (
    <View
      style={
        styles.infoRow
      }
    >

      <View
        style={
          styles.infoLeft
        }
      >

        <Ionicons
          name={
            icon
          }
          size={18}
          color={
            COLORS.textSecondary
          }
        />


        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

      </View>


      <Text
        style={
          styles.infoValue
        }
      >
        {value}
      </Text>

    </View>
  );
}


// ======================================================
// DETAIL ROW
// ======================================================

function DetailRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {

  return (
    <View
      style={
        styles.detailRow
      }
    >

      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>


      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>

    </View>
  );
}


// ======================================================
// STYLES
// ======================================================

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

    header: {
      height: 60,

      paddingHorizontal: 18,

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    headerTitle: {
      fontSize: 22,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,
    },

    detailsHeader: {
      height: 58,

      backgroundColor:
        COLORS.white,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal: 14,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    backButton: {
      width: 42,

      height: 42,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    detailsHeaderTitle: {
      flex: 1,

      textAlign:
        'center',

      fontSize: 19,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },

    headerSpace: {
      width: 42,
    },

    content: {
      padding: 14,

      paddingBottom: 35,
    },

    centerState: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 30,
    },

    loadingText: {
      marginTop: 14,

      fontSize: 14,

      color:
        COLORS.textSecondary,
    },

    errorTitle: {
      marginTop: 14,

      fontSize: 18,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,
    },

    errorText: {
      marginTop: 7,

      fontSize: 13,

      lineHeight: 19,

      textAlign:
        'center',

      color:
        COLORS.textSecondary,
    },

    retryButton: {
      marginTop: 20,

      minWidth: 135,

      height: 46,

      borderRadius: 10,

      backgroundColor:
        COLORS.primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    retryButtonText: {
      color:
        COLORS.white,

      fontWeight:
        '900',

      fontSize: 13,
    },

    emptyContainer: {
      flexGrow: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 35,

      paddingBottom: 80,
    },

    emptyTitle: {
      marginTop: 15,

      fontSize: 20,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,
    },

    emptyText: {
      marginTop: 7,

      textAlign:
        'center',

      fontSize: 13,

      lineHeight: 19,

      color:
        COLORS.textSecondary,
    },

    orderCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 15,

      padding: 16,

      marginBottom: 13,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    orderTop: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },

    orderNumberLabel: {
      fontSize: 10,

      fontWeight:
        '700',

      color:
        COLORS.textSecondary,
    },

    orderNumber: {
      marginTop: 4,

      fontSize: 17,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,
    },

    statusBadge: {
      maxWidth: 135,

      paddingHorizontal: 10,

      paddingVertical: 7,

      borderRadius: 18,
    },

    processingBadge: {
      backgroundColor:
        '#FFF3CD',
    },

    shippedBadge: {
      backgroundColor:
        '#E8F0FE',
    },

    deliveryBadge: {
      backgroundColor:
        '#EDE9FE',
    },

    deliveredBadge: {
      backgroundColor:
        '#E8F5F0',
    },

    cancelledBadge: {
      backgroundColor:
        '#FDECEC',
    },

    statusBadgeText: {
      fontSize: 11,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,

      textAlign:
        'center',
    },

    divider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginVertical: 14,
    },

    infoRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginBottom: 11,

      gap: 15,
    },

    infoLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    infoLabel: {
      marginLeft: 8,

      fontSize: 13,

      color:
        COLORS.textSecondary,
    },

    infoValue: {
      flexShrink: 1,

      fontSize: 13,

      fontWeight:
        '700',

      textAlign:
        'right',

      color:
        COLORS.textPrimary,
    },

    orderBottom: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },

    totalSmall: {
      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    totalListValue: {
      marginTop: 3,

      fontSize: 19,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },

    viewDetails: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    viewDetailsText: {
      fontSize: 12,

      fontWeight:
        '800',

      color:
        COLORS.primary,
    },

    statusCard: {
      backgroundColor:
        '#E8F5F0',

      borderRadius: 15,

      padding: 17,

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 12,
    },

    statusIcon: {
      width: 55,

      height: 55,

      borderRadius: 28,

      backgroundColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    statusInfo: {
      marginLeft: 13,

      flex: 1,
    },

    statusLabel: {
      fontSize: 12,

      color:
        COLORS.textSecondary,
    },

    statusValue: {
      marginTop: 3,

      fontSize: 19,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },

    section: {
      backgroundColor:
        COLORS.white,

      borderRadius: 15,

      padding: 16,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 17,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,

      marginBottom: 15,
    },

    emptySectionText: {
      fontSize: 13,

      color:
        COLORS.textSecondary,
    },

    detailRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap: 20,

      marginBottom: 13,
    },

    detailLabel: {
      fontSize: 13,

      color:
        COLORS.textSecondary,
    },

    detailValue: {
      flexShrink: 1,

      fontSize: 13,

      fontWeight:
        '700',

      textAlign:
        'right',

      color:
        COLORS.textPrimary,
    },

    productCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 15,
    },

    productImage: {
      width: 65,

      height: 65,

      borderRadius: 10,

      backgroundColor:
        COLORS.backgroundSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 11,
    },

    productInfo: {
      flex: 1,
    },

    productName: {
      fontSize: 14,

      fontWeight:
        '700',

      color:
        COLORS.textPrimary,
    },

    variantText: {
      marginTop: 3,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    productPrice: {
      marginTop: 5,

      fontSize: 14,

      fontWeight:
        '800',

      color:
        COLORS.primary,
    },

    productRight: {
      alignItems:
        'flex-end',

      marginLeft: 8,
    },

    quantityText: {
      fontSize: 14,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },

    productSubtotal: {
      marginTop: 5,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    methodRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    methodIcon: {
      width: 45,

      height: 45,

      borderRadius: 10,

      backgroundColor:
        '#E8F5F0',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    methodInfo: {
      flex: 1,

      marginLeft: 12,
    },

    methodTitle: {
      fontSize: 14,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },

    methodText: {
      marginTop: 3,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    addressText: {
      marginTop: 7,

      fontSize: 12,

      lineHeight: 18,

      color:
        COLORS.textPrimary,
    },

    totalCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 17,

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },

    totalLabel: {
      fontSize: 15,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },

    totalDescription: {
      marginTop: 3,

      fontSize: 10,

      color:
        COLORS.textSecondary,
    },

    totalValue: {
      fontSize: 21,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },

    bottomBar: {
      backgroundColor:
        COLORS.white,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      paddingHorizontal: 15,

      paddingTop: 10,

      paddingBottom: 12,
    },

    trackButton: {
      height: 52,

      borderRadius: 11,

      backgroundColor:
        COLORS.primary,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 8,
    },

    trackButtonText: {
      fontSize: 14,

      fontWeight:
        '900',

      color:
        COLORS.white,
    },

    trackingContent: {
      padding: 14,

      paddingBottom: 40,
    },

    trackingTopCard: {
      backgroundColor:
        COLORS.primary,

      borderRadius: 18,

      padding: 24,

      alignItems:
        'center',

      marginBottom: 12,
    },

    trackingIcon: {
      width: 62,

      height: 62,

      borderRadius: 31,

      backgroundColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    trackingOrderNumber: {
      marginTop: 14,

      fontSize: 18,

      fontWeight:
        '900',

      color:
        COLORS.white,
    },

    trackingStatus: {
      marginTop: 7,

      fontSize: 21,

      fontWeight:
        '900',

      color:
        COLORS.secondary,
    },

    trackingMessage: {
      marginTop: 7,

      fontSize: 12,

      color:
        COLORS.white,

      textAlign:
        'center',
    },

    trackingInfoCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 16,

      marginBottom: 12,
    },

    trackingInfoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    trackingInfoIcon: {
      width: 42,

      height: 42,

      borderRadius: 10,

      backgroundColor:
        '#E8F5F0',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 12,
    },

    trackingInfoLabel: {
      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    trackingInfoValue: {
      marginTop: 3,

      fontSize: 14,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },

    trackingInfoDivider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginVertical: 14,
    },

    timelineCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 18,
    },

    timelineTitle: {
      fontSize: 18,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,

      marginBottom: 20,
    },

    timelineRow: {
      flexDirection:
        'row',

      minHeight: 105,
    },

    timelineLeft: {
      width: 45,

      alignItems:
        'center',
    },

    timelineCircle: {
      width: 36,

      height: 36,

      borderRadius: 18,

      backgroundColor:
        COLORS.backgroundSoft,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        'center',

      justifyContent:
        'center',

      zIndex: 2,
    },

    timelineCircleCompleted: {
      backgroundColor:
        COLORS.primary,

      borderColor:
        COLORS.primary,
    },

    timelineCircleCurrent: {
      borderWidth: 3,

      borderColor:
        COLORS.secondary,
    },

    timelineLine: {
      width: 3,

      flex: 1,

      backgroundColor:
        COLORS.border,
    },

    timelineLineCompleted: {
      backgroundColor:
        COLORS.primary,
    },

    timelineTextContainer: {
      flex: 1,

      paddingLeft: 12,

      paddingBottom: 18,
    },

    timelineStepTitle: {
      fontSize: 15,

      fontWeight:
        '800',

      color:
        COLORS.textSecondary,
    },

    timelineStepTitleCompleted: {
      color:
        COLORS.textPrimary,
    },

    timelineDescription: {
      marginTop: 4,

      fontSize: 12,

      lineHeight: 18,

      color:
        COLORS.textSecondary,
    },

    timelineDate: {
      marginTop: 5,

      fontSize: 11,

      color:
        COLORS.primary,

      fontWeight:
        '700',
    },

    currentBadge: {
      alignSelf:
        'flex-start',

      marginTop: 8,

      backgroundColor:
        '#FFF3CD',

      paddingHorizontal: 8,

      paddingVertical: 4,

      borderRadius: 5,
    },

    currentBadgeText: {
      fontSize: 9,

      fontWeight:
        '900',

      color:
        '#9A6B00',
    },

    helpCard: {
      marginTop: 12,

      borderRadius: 13,

      backgroundColor:
        '#E8F5F0',

      padding: 14,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    helpText: {
      flex: 1,

      marginLeft: 10,

      fontSize: 12,

      lineHeight: 18,

      color:
        COLORS.textSecondary,
    },

  });