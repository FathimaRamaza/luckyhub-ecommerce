import Constants, {
  ExecutionEnvironment,
} from 'expo-constants';

import {
  Platform,
} from 'react-native';

import {
  supabase,
} from '../lib/supabase';


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
// EXPO NOTIFICATIONS MODULE
//
// IMPORTANT:
// On Android Expo Go, remote push notification support is
// unavailable on current Expo SDK versions. In this project,
// importing / initializing expo-notifications during startup
// caused Expo Go to close with an uncaught error.
//
// Therefore:
// - Expo Go Android: notification native APIs are skipped.
// - Development / production builds: expo-notifications loads
//   normally and push/local notifications work.
// ======================================================

type NotificationsModule =
  typeof import('expo-notifications');


let notificationsModulePromise:
  Promise<NotificationsModule> | null =
  null;


let notificationHandlerConfigured =
  false;


function isAndroidExpoGo() {

  return (
    Platform.OS ===
      'android' &&
    Constants
      .executionEnvironment ===
      ExecutionEnvironment
        .StoreClient
  );
}


export async function getNotificationsModule():
Promise<NotificationsModule | null> {

  if (
    Platform.OS ===
    'web'
  ) {

    return null;
  }


  if (
    isAndroidExpoGo()
  ) {

    return null;
  }


  try {

    if (
      !notificationsModulePromise
    ) {

      notificationsModulePromise =
        import(
          'expo-notifications'
        );
    }


    const Notifications =
      await notificationsModulePromise;


    if (
      !notificationHandlerConfigured
    ) {

      Notifications
        .setNotificationHandler({

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


      notificationHandlerConfigured =
        true;
    }


    return Notifications;


  } catch (
    error
  ) {

    notificationsModulePromise =
      null;


    console.log(
      'expo-notifications unavailable in current runtime:',
      error
    );


    return null;
  }
}


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


  const Notifications =
    await getNotificationsModule();


  if (
    !Notifications
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

  const Notifications =
    await getNotificationsModule();


  if (
    !Notifications
  ) {

    return false;
  }


  if (
    Platform.OS ===
    'android'
  ) {

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
// Expo Go on Android cannot use remote push notifications.
// We intentionally return before loading expo-notifications
// so Expo Go can run the Lucky Hub app without crashing.
//
// Development / production builds continue with the normal
// Expo push-token registration flow.
// ======================================================

export async function registerForPushNotifications():
Promise<PushRegistrationResult> {

  if (
    isAndroidExpoGo()
  ) {

    return {

      success:
        false,

      token:
        null,

      message:
        'Remote push notifications are skipped in Expo Go on Android. They will be enabled in the Lucky Hub development build.',

    };
  }


  if (
    Platform.OS ===
    'web'
  ) {

    return {

      success:
        false,

      token:
        null,

      message:
        'Push notification registration is not enabled on web.',

    };
  }


  try {

    const Notifications =
      await getNotificationsModule();


    if (
      !Notifications
    ) {

      return {

        success:
          false,

        token:
          null,

        message:
          'Notifications are unavailable in the current runtime.',

      };
    }


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
          'Push notifications will be activated when the Lucky Hub development build is configured.',

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




      return {

        success:
          true,

        token,

        message:
          'Push notifications are enabled.',

      };


    } catch (
      tokenError
    ) {

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


  } catch (
    error: any
  ) {

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
// Local notification calls are skipped in Android Expo Go
// in this project so expo-notifications is never initialized
// there. This prevents the SDK 57 Expo Go startup crash.
//
// They work normally in a Lucky Hub development / production
// build.
// ======================================================

export async function showLocalNotification(
  title: string,
  body: string,
  data:
    LocalNotificationData =
    {}
) {

  if (
    isAndroidExpoGo()
  ) {

    console.log(
      'Local notification skipped in Android Expo Go:',
      title,
      body
    );

    return;
  }


  const Notifications =
    await getNotificationsModule();


  if (
    !Notifications
  ) {

    console.log(
      'Local notification unavailable in current runtime:',
      title
    );

    return;
  }


  const permissionGranted =
    await requestNotificationPermission();


  if (
    !permissionGranted
  ) {

    console.log(
      'Local notification skipped because permission was not granted.'
    );

    return;
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
