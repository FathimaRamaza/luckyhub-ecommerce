import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

export default function SplashScreen() {
  const router = useRouter();

  const [step, setStep] =
    useState<'logo' | 'splash'>(
      'logo'
    );

  useEffect(() => {
    let mounted = true;

    const runSplashFlow =
      async () => {
        try {
          // ==========================================
          // FIRST SPLASH
          // Lucky Hub main logo
          // White background
          // ==========================================

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                2000
              )
          );

          if (!mounted) {
            return;
          }

          // ==========================================
          // SECOND SPLASH
          // Previous splash image
          // White background
          // ==========================================

          setStep(
            'splash'
          );

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                3000
              )
          );

          if (!mounted) {
            return;
          }

          // ==========================================
          // CHECK LOGIN SESSION
          // ==========================================

          const {
            data: {
              session,
            },
          } =
            await supabase.auth.getSession();

          if (!mounted) {
            return;
          }

          if (session) {
            router.replace(
              '/(tabs)/home'
            );
          } else {
            router.replace(
              '/login'
            );
          }

        } catch (error) {

          console.log(
            'Splash error:',
            error
          );

          if (mounted) {
            router.replace(
              '/login'
            );
          }
        }
      };

    runSplashFlow();

    return () => {
      mounted = false;
    };
  }, [router]);


  return (
    <View
      style={
        styles.container
      }
    >

      {step === 'logo' ? (

        <Image
          source={require(
            '../assets/logos/luckyhub-logo.png'
          )}
          style={
            styles.firstLogo
          }
          resizeMode="contain"
        />

      ) : (

        <Image
          source={require(
            '../assets/logos/splash-logo.png'
          )}
          style={
            styles.secondLogo
          }
          resizeMode="contain"
        />

      )}

    </View>
  );
}


const styles =
  StyleSheet.create({

    container: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    firstLogo: {
      width: '88%',

      height: '30%',
    },


    secondLogo: {
      width: '92%',

      height: '70%',
    },

  });