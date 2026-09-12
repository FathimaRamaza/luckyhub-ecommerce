import {
    useEffect,
    useRef,
} from 'react';

import {
    supabase,
} from '../lib/supabase';

import {
    registerForPushNotifications,
} from '../services/notificationService';


export default function NotificationBootstrap() {

  const lastRegisteredUserIdRef =
    useRef<string | null>(
      null
    );


  useEffect(() => {

    let mounted =
      true;


    // ======================================================
    // REGISTER CURRENT LOGGED-IN USER
    // ======================================================

    const registerCurrentUser =
      async () => {

        try {

          const {
            data: {
              session,
            },
            error,
          } =
            await supabase
              .auth
              .getSession();


          if (
            error
          ) {

            console.log(
              'Notification bootstrap session error:',
              error
            );

            return;
          }


          const userId =
            session
              ?.user
              ?.id ??
            null;


          if (
            !mounted ||
            !userId
          ) {
            return;
          }


          if (
            lastRegisteredUserIdRef
              .current ===
            userId
          ) {
            return;
          }


          lastRegisteredUserIdRef
            .current =
            userId;


          const result =
            await registerForPushNotifications();


          console.log(
            'Notification registration result:',
            result.message
          );


        } catch (
          error
        ) {

          console.log(
            'Notification bootstrap error:',
            error
          );
        }
      };


    registerCurrentUser();


    // ======================================================
    // REGISTER AGAIN AFTER LOGIN / SESSION CHANGE
    // ======================================================

    const {
      data: {
        subscription,
      },
    } =
      supabase
        .auth
        .onAuthStateChange(
          async (
            event,
            session
          ) => {

            if (
              !mounted
            ) {
              return;
            }


            if (
              event ===
              'SIGNED_OUT'
            ) {

              lastRegisteredUserIdRef
                .current =
                null;

              return;
            }


            const userId =
              session
                ?.user
                ?.id ??
              null;


            if (
              !userId
            ) {
              return;
            }


            if (
              lastRegisteredUserIdRef
                .current ===
              userId
            ) {
              return;
            }


            lastRegisteredUserIdRef
              .current =
              userId;


            try {

              const result =
                await registerForPushNotifications();


              console.log(
                'Notification registration result:',
                result.message
              );


            } catch (
              error
            ) {

              console.log(
                'Notification auth registration error:',
                error
              );
            }
          }
        );


    return () => {

      mounted =
        false;


      subscription
        .unsubscribe();
    };

  }, []);


  return null;
}
