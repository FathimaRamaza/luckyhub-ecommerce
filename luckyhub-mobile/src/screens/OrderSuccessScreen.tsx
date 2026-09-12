import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useEffect,
  useRef,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
  showOrderPlacedNotification,
} from '../services/notificationService';


export default function OrderSuccessScreen() {
  const router =
    useRouter();


  const notificationShownRef =
    useRef(false);


  const params =
    useLocalSearchParams<{
      orderNumber?: string;
      fullName?: string;
      mobile?: string;
      total?: string;
      itemCount?: string;
      paymentMethod?: string;
      deliveryMethod?: string;
    }>();


  const orderNumber =
    params.orderNumber ||
    'LH00000000';


  const fullName =
    params.fullName ||
    'Customer';


  const total =
    Number(
      params.total ||
      0
    );


  const itemCount =
    Number(
      params.itemCount ||
      0
    );


  const paymentMethod =
    params.paymentMethod ||
    'Cash on Delivery';


  const deliveryMethod =
    params.deliveryMethod ||
    'Standard Delivery';


  // ======================================================
  // ORDER PLACED NOTIFICATION
  // ======================================================

  useEffect(() => {

    if (
      notificationShownRef
        .current
    ) {
      return;
    }


    if (
      !params.orderNumber
    ) {
      return;
    }


    notificationShownRef
      .current =
      true;


    const sendNotification =
      async () => {

        try {

          await showOrderPlacedNotification(
            orderNumber
          );


        } catch (
          error
        ) {

          console.log(
            'Order placed notification error:',
            error
          );
        }
      };


    sendNotification();

  }, [
    orderNumber,
    params.orderNumber,
  ]);


  // ======================================================
  // ACTIONS
  // ======================================================

  const viewOrders =
    () => {

      router.replace(
        '/(tabs)/orders'
      );
    };


  const continueShopping =
    () => {

      router.replace(
        '/(tabs)/home'
      );
    };


  // ======================================================
  // SCREEN
  // ======================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
        'bottom',
      ]}
    >

      <View
        style={
          styles.content
        }
      >

        {/* SUCCESS ICON */}

        <View
          style={
            styles.successCircle
          }
        >

          <Ionicons
            name="checkmark"
            size={60}
            color={
              COLORS.white
            }
          />

        </View>


        <Text
          style={
            styles.successTitle
          }
        >
          Order Placed Successfully!
        </Text>


        <Text
          style={
            styles.successMessage
          }
        >
          Thank you, {fullName}. Your Lucky Hub
          order has been received successfully.
        </Text>


        {/* ORDER NUMBER */}

        <View
          style={
            styles.orderNumberCard
          }
        >

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
            {orderNumber}
          </Text>


          <Text
            style={
              styles.saveText
            }
          >
            Please keep this number for reference.
          </Text>

        </View>


        {/* ORDER INFORMATION */}

        <View
          style={
            styles.detailsCard
          }
        >

          <Text
            style={
              styles.detailsTitle
            }
          >
            Order Details
          </Text>


          <DetailRow
            icon="bag-outline"
            label="Items"
            value={`${itemCount} item${
              itemCount ===
              1
                ? ''
                : 's'
            }`}
          />


          <DetailRow
            icon="wallet-outline"
            label="Payment"
            value={
              paymentMethod
            }
          />


          <DetailRow
            icon="cube-outline"
            label="Delivery"
            value={
              deliveryMethod
            }
          />


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
              Total Amount
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


        {/* PAYMENT NOTICE */}

        <View
          style={
            styles.paymentNotice
          }
        >

          <Ionicons
            name="cash-outline"
            size={25}
            color={
              COLORS.primary
            }
          />


          <View
            style={
              styles.paymentNoticeInfo
            }
          >

            <Text
              style={
                styles.paymentNoticeTitle
              }
            >
              Cash on Delivery
            </Text>


            <Text
              style={
                styles.paymentNoticeText
              }
            >
              Please keep the payment ready when
              your order is delivered.
            </Text>

          </View>

        </View>

      </View>


      {/* BOTTOM BUTTONS */}

      <View
        style={
          styles.bottomContainer
        }
      >

        <Pressable
          style={
            styles.viewOrderButton
          }
          onPress={
            viewOrders
          }
        >

          <Ionicons
            name="receipt-outline"
            size={20}
            color={
              COLORS.primary
            }
          />


          <Text
            style={
              styles.viewOrderText
            }
          >
            VIEW ORDER
          </Text>

        </Pressable>


        <Pressable
          style={
            styles.shoppingButton
          }
          onPress={
            continueShopping
          }
        >

          <Text
            style={
              styles.shoppingButtonText
            }
          >
            CONTINUE SHOPPING
          </Text>


          <Ionicons
            name="arrow-forward"
            size={20}
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
// DETAIL ROW
// ======================================================

function DetailRow({
  icon,
  label,
  value,
}: {
  icon:
    | 'bag-outline'
    | 'wallet-outline'
    | 'cube-outline';

  label: string;

  value: string;
}) {

  return (
    <View
      style={
        styles.detailRow
      }
    >

      <View
        style={
          styles.detailLeft
        }
      >

        <Ionicons
          name={
            icon
          }
          size={19}
          color={
            COLORS.textSecondary
          }
        />


        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>

      </View>


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

    container: {
      flex: 1,

      backgroundColor:
        COLORS.backgroundSoft,
    },


    content: {
      flex: 1,

      paddingHorizontal: 20,

      paddingTop: 35,

      alignItems:
        'center',
    },


    successCircle: {
      width: 110,

      height: 110,

      borderRadius: 55,

      backgroundColor:
        COLORS.success,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 22,
    },


    successTitle: {
      fontSize: 25,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,

      textAlign:
        'center',
    },


    successMessage: {
      marginTop: 10,

      fontSize: 14,

      lineHeight: 21,

      color:
        COLORS.textSecondary,

      textAlign:
        'center',

      paddingHorizontal: 15,
    },


    orderNumberCard: {
      width:
        '100%',

      marginTop: 25,

      backgroundColor:
        '#E8F5F0',

      borderRadius: 15,

      padding: 18,

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#C8E9DC',
    },


    orderNumberLabel: {
      fontSize: 11,

      fontWeight:
        '800',

      color:
        COLORS.textSecondary,

      letterSpacing: 1,
    },


    orderNumber: {
      marginTop: 7,

      fontSize: 24,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },


    saveText: {
      marginTop: 5,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },


    detailsCard: {
      width:
        '100%',

      marginTop: 14,

      padding: 17,

      borderRadius: 15,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    detailsTitle: {
      fontSize: 17,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,

      marginBottom: 16,
    },


    detailRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginBottom: 14,
    },


    detailLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    detailLabel: {
      marginLeft: 9,

      fontSize: 13,

      color:
        COLORS.textSecondary,
    },


    detailValue: {
      flexShrink: 1,

      marginLeft: 15,

      fontSize: 13,

      fontWeight:
        '700',

      color:
        COLORS.textPrimary,

      textAlign:
        'right',
    },


    divider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginBottom: 14,
    },


    totalRow: {
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


    totalValue: {
      fontSize: 20,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },


    paymentNotice: {
      width:
        '100%',

      marginTop: 14,

      padding: 14,

      borderRadius: 13,

      backgroundColor:
        '#FFF8E1',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    paymentNoticeInfo: {
      flex: 1,

      marginLeft: 11,
    },


    paymentNoticeTitle: {
      fontSize: 14,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },


    paymentNoticeText: {
      marginTop: 3,

      fontSize: 11,

      lineHeight: 17,

      color:
        COLORS.textSecondary,
    },


    bottomContainer: {
      backgroundColor:
        COLORS.white,

      paddingHorizontal: 15,

      paddingTop: 10,

      paddingBottom: 12,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      gap: 9,
    },


    viewOrderButton: {
      width:
        '100%',

      height: 50,

      borderRadius: 11,

      borderWidth: 1.5,

      borderColor:
        COLORS.primary,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,
    },


    viewOrderText: {
      fontSize: 13,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },


    shoppingButton: {
      width:
        '100%',

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


    shoppingButtonText: {
      fontSize: 14,

      fontWeight:
        '900',

      color:
        COLORS.white,
    },

  });
