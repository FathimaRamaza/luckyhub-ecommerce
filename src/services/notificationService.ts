import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {
    Platform,
} from 'react-native';

import {
    supabase,
} from '../lib/supabase';


// ======================================================
// NOTIFICATION HANDLER
// ======================================================

Notifications.setNotificationHandler({

  handleNotification:
    async () => ({

      shouldPlaySound:
        true,

      shouldSetBadge:
        false,

      shouldShowBanner:
        true,

      shouldShowList:
        true,

    }),

});


// ======================================================
// TYPES
// ======================================================

export type PushRegistrationResult = {
  success: boolean;

  token:
    string | null;

  message: string;
};


export type LocalNotificationData =
  Record<
    string,
    string | number | boolean
  >;


// ======================================================
// ANDROID CHANNEL
// ======================================================

export async function configureNotificationChannel() {

  if (
    Platform.OS !==
    'android'
  ) {
    return;
  }


  await Notifications
    .setNotificationChannelAsync(
      'orders',
      {

        name:
          'Order Updates',

        importance:
          Notifications
            .AndroidImportance
            .HIGH,

        vibrationPattern: [
          0,
          250,
          250,
          250,
        ],

        sound:
          'default',

      }
    );
}


// ======================================================
// GET NOTIFICATION PERMISSION
// ======================================================

export async function requestNotificationPermission():
Promise<boolean> {

  await configureNotificationChannel();


  const {
    status:
      existingStatus,
  } =
    await Notifications
      .getPermissionsAsync();


  if (
    existingStatus ===
    'granted'
  ) {
    return true;
  }


  const {
    status,
  } =
    await Notifications
      .requestPermissionsAsync();


  return (
    status ===
    'granted'
  );
}


// ======================================================
// GET EXPO PROJECT ID
// ======================================================

function getExpoProjectId():
string | null {

  const projectId =
    Constants
      .expoConfig
      ?.extra
      ?.eas
      ?.projectId ??
    Constants
      .easConfig
      ?.projectId ??
    null;


  return projectId;
}


// ======================================================
// SAVE PUSH TOKEN
// ======================================================

async function savePushToken(
  token: string
) {

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase
      .auth
      .getUser();


  if (
    userError
  ) {

    console.error(
      'Push token user error:',
      userError
    );

    throw userError;
  }


  if (
    !user
  ) {

    throw new Error(
      'Please login before enabling notifications.'
    );
  }


  const platform =
    Platform.OS ===
    'ios'
      ? 'ios'
      : 'android';


  const {
    error,
  } =
    await supabase
      .from(
        'push_tokens'
      )
      .upsert(
        {

          user_id:
            user.id,

          expo_push_token:
            token,

          platform,

          is_active:
            true,

          updated_at:
            new Date()
              .toISOString(),

        },
        {

          onConflict:
            'user_id,expo_push_token',

        }
      );


  if (
    error
  ) {

    console.error(
      'Save push token error:',
      error
    );

    throw error;
  }
}


// ======================================================
// REGISTER EXPO PUSH TOKEN
//
// Remote push notifications require an Expo development
// build / production build on current Expo SDK versions.
// This function fails safely when running in Expo Go.
// ======================================================

export async function registerForPushNotifications():
Promise<PushRegistrationResult> {

  try {

    const permissionGranted =
      await requestNotificationPermission();


    if (
      !permissionGranted
    ) {

      return {

        success:
          false,

        token:
          null,

        message:
          'Notification permission was not granted.',

      };
    }


    const projectId =
      getExpoProjectId();


    if (
      !projectId
    ) {

      return {

        success:
          false,

        token:
          null,

        message:
          'Push notifications will be activated when the Lucky Hub development build is created.',

      };
    }


    try {

      const tokenResult =
        await Notifications
          .getExpoPushTokenAsync(
            {
              projectId,
            }
          );


      const token =
        tokenResult
          .data
          ?.trim();


      if (
        !token
      ) {

        return {

          success:
            false,

          token:
            null,

          message:
            'Unable to generate a push notification token.',

        };
      }


      await savePushToken(
        token
      );


      console.log(
        'Expo push token registered:',
        token
      );


      return {

        success:
          true,

        token,

        message:
          'Push notifications are enabled.',

      };


    } catch (tokenError) {

      console.log(
        'Expo push token unavailable in current build:',
        tokenError
      );


      return {

        success:
          false,

        token:
          null,

        message:
          'Remote push notifications will be tested after creating the Lucky Hub development build.',

      };
    }


  } catch (error: any) {

    console.error(
      'registerForPushNotifications error:',
      error
    );


    return {

      success:
        false,

      token:
        null,

      message:
        error?.message ??
        'Unable to enable notifications.',

    };
  }
}


// ======================================================
// DEACTIVATE CURRENT USER PUSH TOKENS
// Useful during logout.
// ======================================================

export async function deactivateCurrentUserPushTokens() {

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase
      .auth
      .getUser();


  if (
    userError
  ) {

    console.error(
      'Deactivate token user error:',
      userError
    );

    return;
  }


  if (
    !user
  ) {
    return;
  }


  const {
    error,
  } =
    await supabase
      .from(
        'push_tokens'
      )
      .update(
        {

          is_active:
            false,

          updated_at:
            new Date()
              .toISOString(),

        }
      )
      .eq(
        'user_id',
        user.id
      );


  if (
    error
  ) {

    console.error(
      'Deactivate push tokens error:',
      error
    );
  }
}


// ======================================================
// LOCAL NOTIFICATION
//
// Local notifications can be used now for testing.
// ======================================================

export async function showLocalNotification(
  title: string,
  body: string,
  data:
    LocalNotificationData =
    {}
) {

  const permissionGranted =
    await requestNotificationPermission();


  if (
    !permissionGranted
  ) {

    throw new Error(
      'Notification permission is required.'
    );
  }


  await Notifications
    .scheduleNotificationAsync(
      {

        content: {

          title,

          body,

          data,

          sound:
            'default',

        },

        trigger:
          null,

      }
    );
}


// ======================================================
// ORDER NOTIFICATION HELPERS
// ======================================================

export async function showOrderPlacedNotification(
  orderNumber: string
) {

  await showLocalNotification(
    'Order Placed Successfully',
    `Your Lucky Hub order ${orderNumber} has been placed successfully.`,
    {
      type:
        'order',

      status:
        'placed',

      orderNumber,
    }
  );
}


export async function showOrderProcessingNotification(
  orderNumber: string
) {

  await showLocalNotification(
    'Order Processing',
    `Your Lucky Hub order ${orderNumber} is being prepared.`,
    {
      type:
        'order',

      status:
        'processing',

      orderNumber,
    }
  );
}


export async function showOrderShippedNotification(
  orderNumber: string
) {

  await showLocalNotification(
    'Order On The Way',
    `Your Lucky Hub order ${orderNumber} is on the way.`,
    {
      type:
        'order',

      status:
        'shipped',

      orderNumber,
    }
  );
}


export async function showOrderDeliveredNotification(
  orderNumber: string
) {

  await showLocalNotification(
    'Order Delivered',
    `Your Lucky Hub order ${orderNumber} has been delivered.`,
    {
      type:
        'order',

      status:
        'delivered',

      orderNumber,
    }
  );
}


// ======================================================
// PRINTING REQUEST NOTIFICATION HELPERS
// ======================================================

export async function showPrintingReadyNotification(
  requestNumber: string
) {

  await showLocalNotification(
    'Printing Order Ready',
    `Your Lucky Hub printing request ${requestNumber} is ready.`,
    {
      type:
        'printing',

      status:
        'ready',

      requestNumber,
    }
  );
}
