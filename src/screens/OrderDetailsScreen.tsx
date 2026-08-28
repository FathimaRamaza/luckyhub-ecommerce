import { Ionicons } from '@expo/vector-icons';
import {
    useLocalSearchParams,
    usePathname,
    useRouter,
} from 'expo-router';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { orders } from '../data/orders';

export default function OrderDetailsScreen() {
  const router = useRouter();

  const pathname = usePathname();

  const params =
    useLocalSearchParams<{
      orderNumber?:
        | string
        | string[];
    }>();

  // FIRST TRY THE DYNAMIC PARAMETER
  const parameterOrderNumber =
    Array.isArray(
      params.orderNumber
    )
      ? params.orderNumber[0]
      : params.orderNumber;

  // BACKUP: READ ORDER NUMBER FROM URL
  // Example:
  // /order/LH24081901
  const pathParts = pathname
    .split('/')
    .filter(Boolean);

  const pathOrderNumber =
    pathParts.length > 0
      ? pathParts[
          pathParts.length - 1
        ]
      : '';

  const rawOrderNumber =
    parameterOrderNumber ||
    pathOrderNumber ||
    '';

  const orderNumber =
    decodeURIComponent(
      rawOrderNumber
    )
      .trim()
      .toUpperCase();

  const order = orders.find(
    (item) =>
      item.orderNumber
        .trim()
        .toUpperCase() ===
      orderNumber
  );

  if (!order) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
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
            style={styles.headerTitle}
          >
            Order Details
          </Text>

          <View
            style={styles.headerSpace}
          />
        </View>

        <View
          style={
            styles.notFoundContainer
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={70}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={
              styles.notFoundTitle
            }
          >
            Order Not Found
          </Text>

          <Text
            style={
              styles.notFoundText
            }
          >
            Received order:
          </Text>

          <Text
            style={
              styles.debugOrderNumber
            }
          >
            {orderNumber ||
              'NO ORDER NUMBER'}
          </Text>

          <Pressable
            style={
              styles.backToOrdersButton
            }
            onPress={() =>
              router.replace(
                '/(tabs)/orders'
              )
            }
          >
            <Text
              style={
                styles.backToOrdersText
              }
            >
              BACK TO ORDERS
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const itemCount =
    order.items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  const handleTracking = () => {
    Alert.alert(
      'Order Tracking',
      'Order Tracking will be connected in Step 16.'
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
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
          style={styles.headerTitle}
        >
          Order Details
        </Text>

        <View
          style={styles.headerSpace}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* STATUS */}

        <View
          style={styles.statusCard}
        >
          <View
            style={styles.statusIcon}
          >
            <Ionicons
              name={
                order.status ===
                'Delivered'
                  ? 'checkmark-circle'
                  : order.status ===
                    'Shipped'
                  ? 'car-outline'
                  : 'time-outline'
              }
              size={32}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={styles.statusInfo}
          >
            <Text
              style={
                styles.statusLabel
              }
            >
              Order Status
            </Text>

            <Text
              style={
                styles.statusValue
              }
            >
              {order.status}
            </Text>
          </View>
        </View>

        {/* INFORMATION */}

        <View style={styles.section}>
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
              order.orderNumber
            }
          />

          <DetailRow
            label="Order Date"
            value={order.date}
          />

          <DetailRow
            label="Items"
            value={`${itemCount} ${
              itemCount === 1
                ? 'item'
                : 'items'
            }`}
          />
        </View>

        {/* PRODUCTS */}

        <View style={styles.section}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Products
          </Text>

          {order.items.map(
            (item) => (
              <View
                key={item.id}
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
                    name="image-outline"
                    size={35}
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
                    {item.name}
                  </Text>

                  {item.variant ? (
                    <Text
                      style={
                        styles.variantText
                      }
                    >
                      {item.variant}
                    </Text>
                  ) : null}

                  <Text
                    style={
                      styles.productPrice
                    }
                  >
                    Rs.{' '}
                    {item.price.toLocaleString()}
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
                    × {item.quantity}
                  </Text>

                  <Text
                    style={
                      styles.productSubtotal
                    }
                  >
                    Rs.{' '}
                    {(
                      item.price *
                      item.quantity
                    ).toLocaleString()}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>

        {/* DELIVERY */}

        <View style={styles.section}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Delivery
          </Text>

          <View
            style={styles.methodRow}
          >
            <View
              style={styles.methodIcon}
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
              style={styles.methodInfo}
            >
              <Text
                style={
                  styles.methodTitle
                }
              >
                {
                  order.deliveryMethod
                }
              </Text>

              <Text
                style={
                  styles.methodText
                }
              >
                Delivery method selected
                for this order.
              </Text>
            </View>
          </View>
        </View>

        {/* PAYMENT */}

        <View style={styles.section}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Payment
          </Text>

          <View
            style={styles.methodRow}
          >
            <View
              style={styles.methodIcon}
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
              style={styles.methodInfo}
            >
              <Text
                style={
                  styles.methodTitle
                }
              >
                {
                  order.paymentMethod
                }
              </Text>

              <Text
                style={
                  styles.methodText
                }
              >
                Payment method selected
                for this order.
              </Text>
            </View>
          </View>
        </View>

        {/* TOTAL */}

        <View
          style={styles.totalCard}
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
              Including delivery and
              discounts
            </Text>
          </View>

          <Text
            style={
              styles.totalValue
            }
          >
            Rs.{' '}
            {order.total.toLocaleString()}
          </Text>
        </View>
      </ScrollView>

      {order.status !==
        'Delivered' &&
        order.status !==
          'Cancelled' && (
          <View
            style={
              styles.bottomBar
            }
          >
            <Pressable
              style={
                styles.trackButton
              }
              onPress={
                handleTracking
              }
            >
              <Ionicons
                name="location-outline"
                size={21}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.trackButtonText
                }
              >
                TRACK ORDER
              </Text>
            </Pressable>
          </View>
        )}
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.detailRow}
    >
      <Text
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.detailValue}
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.backgroundSoft,
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
      justifyContent: 'center',
    },

    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 19,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },

    headerSpace: {
      width: 42,
    },

    content: {
      padding: 14,
      paddingBottom: 30,
    },

    statusCard: {
      backgroundColor:
        '#E8F5F0',
      borderRadius: 15,
      padding: 17,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    statusIcon: {
      width: 55,
      height: 55,
      borderRadius: 28,
      backgroundColor:
        COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
    },

    statusInfo: {
      marginLeft: 13,
    },

    statusLabel: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    statusValue: {
      marginTop: 3,
      fontSize: 19,
      fontWeight: '900',
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
      fontWeight: '800',
      color:
        COLORS.textPrimary,
      marginBottom: 15,
    },

    detailRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      marginBottom: 13,
    },

    detailLabel: {
      fontSize: 13,
      color:
        COLORS.textSecondary,
    },

    detailValue: {
      flexShrink: 1,
      marginLeft: 15,
      fontSize: 13,
      fontWeight: '700',
      color:
        COLORS.textPrimary,
      textAlign: 'right',
    },

    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },

    productImage: {
      width: 65,
      height: 65,
      borderRadius: 10,
      backgroundColor:
        COLORS.backgroundSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    productInfo: {
      flex: 1,
    },

    productName: {
      fontSize: 14,
      fontWeight: '700',
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
      fontWeight: '800',
      color:
        COLORS.primary,
    },

    productRight: {
      alignItems: 'flex-end',
    },

    quantityText: {
      fontSize: 14,
      fontWeight: '800',
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
      flexDirection: 'row',
      alignItems: 'center',
    },

    methodIcon: {
      width: 45,
      height: 45,
      borderRadius: 10,
      backgroundColor:
        '#E8F5F0',
      alignItems: 'center',
      justifyContent: 'center',
    },

    methodInfo: {
      flex: 1,
      marginLeft: 12,
    },

    methodTitle: {
      fontSize: 14,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },

    methodText: {
      marginTop: 3,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },

    totalCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 17,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    totalLabel: {
      fontSize: 15,
      fontWeight: '800',
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
      fontWeight: '900',
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    trackButtonText: {
      fontSize: 14,
      fontWeight: '900',
      color:
        COLORS.white,
    },

    notFoundContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
    },

    notFoundTitle: {
      marginTop: 15,
      fontSize: 21,
      fontWeight: '900',
      color:
        COLORS.textPrimary,
    },

    notFoundText: {
      marginTop: 10,
      fontSize: 13,
      color:
        COLORS.textSecondary,
    },

    debugOrderNumber: {
      marginTop: 5,
      fontSize: 18,
      fontWeight: '900',
      color:
        COLORS.error,
    },

    backToOrdersButton: {
      marginTop: 24,
      height: 48,
      paddingHorizontal: 30,
      borderRadius: 10,
      backgroundColor:
        COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    backToOrdersText: {
      color:
        COLORS.white,
      fontSize: 13,
      fontWeight: '900',
    },
  });