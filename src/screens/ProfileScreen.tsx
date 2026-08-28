import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { supabase } from '../lib/supabase';


// ======================================================
// TYPES
// ======================================================

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
};


type SavedAddress = {
  id: string;
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postal_code: string | null;
  is_default: boolean;
};


type AddressForm = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
};


// ======================================================
// EMPTY ADDRESS
// ======================================================

const EMPTY_ADDRESS: AddressForm = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
};


// ======================================================
// PROFILE SCREEN
// ======================================================

export default function ProfileScreen() {
  const router = useRouter();


  // ====================================================
  // PROFILE
  // ====================================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    fullName,
    setFullName,
  ] = useState(
    'Lucky Hub Customer'
  );


  const [
    email,
    setEmail,
  ] = useState('');


  const [
    phone,
    setPhone,
  ] = useState('');


  const [
    userId,
    setUserId,
  ] = useState('');


  const [
    profileRow,
    setProfileRow,
  ] = useState<any>(
    null
  );


  // ====================================================
  // COUNTS
  // ====================================================

  const [
    orderCount,
    setOrderCount,
  ] = useState(0);


  const [
    wishlistCount,
    setWishlistCount,
  ] = useState(0);


  // ====================================================
  // EDIT PROFILE
  // ====================================================

  const [
    editProfileVisible,
    setEditProfileVisible,
  ] = useState(false);


  const [
    editName,
    setEditName,
  ] = useState('');


  const [
    editPhone,
    setEditPhone,
  ] = useState('');


  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);


  // ====================================================
  // ADDRESSES
  // ====================================================

  const [
    addressesVisible,
    setAddressesVisible,
  ] = useState(false);


  const [
    savedAddresses,
    setSavedAddresses,
  ] = useState<
    SavedAddress[]
  >([]);


  const [
    addressFormVisible,
    setAddressFormVisible,
  ] = useState(false);


  const [
    editingAddressId,
    setEditingAddressId,
  ] = useState<
    string | null
  >(null);


  const [
    addressForm,
    setAddressForm,
  ] = useState<AddressForm>(
    EMPTY_ADDRESS
  );


  const [
    savingAddress,
    setSavingAddress,
  ] = useState(false);


  // ====================================================
  // COMING SOON
  // ====================================================

  const showComingSoon = (
    title: string,
    step: string
  ) => {
    Alert.alert(
      title,
      `${title} will be connected in ${step}.`
    );
  };


  // ====================================================
  // LOAD ADDRESSES
  // ====================================================

  const loadAddresses =
    async (
      currentUserId?: string
    ) => {
      try {
        let id =
          currentUserId ??
          userId;


        if (!id) {
          const {
            data,
          } =
            await supabase.auth.getUser();


          id =
            data.user?.id ??
            '';
        }


        if (!id) {
          return;
        }


        const {
          data,
          error,
        } =
          await supabase
            .from('addresses')
            .select(`
              id,
              recipient_name,
              phone,
              address_line_1,
              address_line_2,
              city,
              postal_code,
              is_default
            `)
            .eq(
              'user_id',
              id
            )
            .order(
              'is_default',
              {
                ascending:
                  false,
              }
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            );


        if (error) {
          throw error;
        }


        setSavedAddresses(
          (data ??
            []) as SavedAddress[]
        );

      } catch (
        error: any
      ) {
        console.error(
          'Load addresses error:',
          error
        );
      }
    };


  // ====================================================
  // LOAD PROFILE
  // ====================================================

  const loadProfile =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );


          // ==============================================
          // USER
          // ==============================================

          const {
            data:
              userData,
            error:
              userError,
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
            router.replace(
              '/login'
            );

            return;
          }


          setUserId(
            user.id
          );


          setEmail(
            user.email ??
              ''
          );


          // ==============================================
          // PROFILE TABLE
          // ==============================================

          const {
            data:
              profile,
            error:
              profileError,
          } =
            await supabase
              .from('profiles')
              .select('*')
              .eq(
                'id',
                user.id
              )
              .maybeSingle();


          if (
            profileError
          ) {
            console.log(
              'Profile table read error:',
              profileError
            );
          }


          setProfileRow(
            profile
          );


          // ==============================================
          // NAME
          // ==============================================

          const profileName =
            profile?.full_name ??
            profile?.name ??
            profile?.display_name ??
            user.user_metadata
              ?.full_name ??
            user.user_metadata
              ?.name ??
            'Lucky Hub Customer';


          // ==============================================
          // PHONE
          // ==============================================

          const profilePhone =
            profile?.phone ??
            profile?.mobile ??
            profile?.phone_number ??
            user.user_metadata
              ?.phone ??
            '';


          setFullName(
            profileName
          );


          setPhone(
            profilePhone
          );


          // ==============================================
          // REAL ORDER COUNT
          // ==============================================

          const {
            count:
              realOrderCount,
            error:
              orderCountError,
          } =
            await supabase
              .from('orders')
              .select(
                'id',
                {
                  count:
                    'exact',
                  head:
                    true,
                }
              )
              .eq(
                'user_id',
                user.id
              );


          if (
            orderCountError
          ) {
            console.log(
              'Order count error:',
              orderCountError
            );
          }


          setOrderCount(
            realOrderCount ??
              0
          );


          // ==============================================
          // REAL WISHLIST COUNT
          // ==============================================

          const {
            count:
              realWishlistCount,
            error:
              wishlistCountError,
          } =
            await supabase
              .from('wishlist')
              .select(
                'id',
                {
                  count:
                    'exact',
                  head:
                    true,
                }
              )
              .eq(
                'user_id',
                user.id
              );


          if (
            wishlistCountError
          ) {
            console.log(
              'Wishlist count error:',
              wishlistCountError
            );
          }


          setWishlistCount(
            realWishlistCount ??
              0
          );


          // ==============================================
          // REAL ADDRESSES
          // ==============================================

          await loadAddresses(
            user.id
          );

        } catch (
          error: any
        ) {
          console.error(
            'Profile load error:',
            error
          );


          Alert.alert(
            'Profile Error',
            error?.message ??
              'Unable to load your profile.'
          );

        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );


  // ====================================================
  // REFRESH WHEN ACCOUNT OPENS
  // ====================================================

  useFocusEffect(
    useCallback(
      () => {
        loadProfile();
      },
      [loadProfile]
    )
  );


  // ====================================================
  // OPEN EDIT PROFILE
  // ====================================================

  const openEditProfile =
    () => {
      setEditName(
        fullName
      );


      setEditPhone(
        phone
      );


      setEditProfileVisible(
        true
      );
    };


  // ====================================================
  // SAVE PROFILE
  // ====================================================

  const saveProfile =
    async () => {
      const cleanName =
        editName.trim();


      const cleanPhone =
        editPhone.trim();


      if (!cleanName) {
        Alert.alert(
          'Name Required',
          'Please enter your full name.'
        );

        return;
      }


      try {
        setSavingProfile(
          true
        );


        // ==============================================
        // AUTH METADATA
        // ==============================================

        const {
          error:
            authUpdateError,
        } =
          await supabase.auth.updateUser(
            {
              data: {
                full_name:
                  cleanName,

                phone:
                  cleanPhone,
              },
            }
          );


        if (
          authUpdateError
        ) {
          throw authUpdateError;
        }


        // ==============================================
        // PROFILE TABLE
        // ==============================================

        if (
          profileRow &&
          userId
        ) {
          const updatePayload:
            Record<
              string,
              any
            > = {};


          if (
            Object.prototype.hasOwnProperty.call(
              profileRow,
              'full_name'
            )
          ) {
            updatePayload.full_name =
              cleanName;

          } else if (
            Object.prototype.hasOwnProperty.call(
              profileRow,
              'name'
            )
          ) {
            updatePayload.name =
              cleanName;

          } else if (
            Object.prototype.hasOwnProperty.call(
              profileRow,
              'display_name'
            )
          ) {
            updatePayload.display_name =
              cleanName;
          }


          if (
            Object.prototype.hasOwnProperty.call(
              profileRow,
              'phone'
            )
          ) {
            updatePayload.phone =
              cleanPhone;

          } else if (
            Object.prototype.hasOwnProperty.call(
              profileRow,
              'mobile'
            )
          ) {
            updatePayload.mobile =
              cleanPhone;

          } else if (
            Object.prototype.hasOwnProperty.call(
              profileRow,
              'phone_number'
            )
          ) {
            updatePayload.phone_number =
              cleanPhone;
          }


          if (
            Object.keys(
              updatePayload
            ).length >
            0
          ) {
            const {
              error:
                profileUpdateError,
            } =
              await supabase
                .from('profiles')
                .update(
                  updatePayload
                )
                .eq(
                  'id',
                  userId
                );


            if (
              profileUpdateError
            ) {
              console.log(
                'Profile update error:',
                profileUpdateError
              );
            }
          }
        }


        setFullName(
          cleanName
        );


        setPhone(
          cleanPhone
        );


        setEditProfileVisible(
          false
        );


        Alert.alert(
          'Profile Updated',
          'Your profile has been updated successfully.'
        );


        await loadProfile();

      } catch (
        error: any
      ) {
        Alert.alert(
          'Update Failed',
          error?.message ??
            'Unable to update your profile.'
        );

      } finally {
        setSavingProfile(
          false
        );
      }
    };


  // ====================================================
  // NEW ADDRESS
  // ====================================================

  const openNewAddress =
    () => {
      setEditingAddressId(
        null
      );


      setAddressForm({
        recipientName:
          fullName,

        phone:
          phone,

        addressLine1:
          '',

        addressLine2:
          '',

        city:
          '',

        postalCode:
          '',
      });


      setAddressFormVisible(
        true
      );
    };


  // ====================================================
  // EDIT ADDRESS
  // ====================================================

  const openEditAddress =
    (
      address:
        SavedAddress
    ) => {
      setEditingAddressId(
        address.id
      );


      setAddressForm({
        recipientName:
          address.recipient_name,

        phone:
          address.phone,

        addressLine1:
          address.address_line_1,

        addressLine2:
          address.address_line_2 ??
          '',

        city:
          address.city,

        postalCode:
          address.postal_code ??
          '',
      });


      setAddressFormVisible(
        true
      );
    };


  // ====================================================
  // UPDATE ADDRESS FIELD
  // ====================================================

  const updateAddressField =
    (
      key:
        keyof AddressForm,
      value: string
    ) => {
      setAddressForm(
        previous => ({
          ...previous,
          [key]:
            value,
        })
      );
    };


  // ====================================================
  // SAVE ADDRESS
  // ====================================================

  const saveAddress =
    async () => {
      if (
        !addressForm
          .recipientName
          .trim() ||
        !addressForm
          .phone
          .trim() ||
        !addressForm
          .addressLine1
          .trim() ||
        !addressForm
          .city
          .trim()
      ) {
        Alert.alert(
          'Missing Details',
          'Please enter name, phone, address and city.'
        );

        return;
      }


      try {
        setSavingAddress(
          true
        );


        const {
          data:
            userData,
          error:
            userError,
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
            'Please login again.'
          );
        }


        const payload = {
          recipient_name:
            addressForm
              .recipientName
              .trim(),

          phone:
            addressForm
              .phone
              .trim(),

          address_line_1:
            addressForm
              .addressLine1
              .trim(),

          address_line_2:
            addressForm
              .addressLine2
              .trim() ||
            null,

          city:
            addressForm
              .city
              .trim(),

          postal_code:
            addressForm
              .postalCode
              .trim() ||
            null,
        };


        if (
          editingAddressId
        ) {
          const {
            error,
          } =
            await supabase
              .from('addresses')
              .update(
                payload
              )
              .eq(
                'id',
                editingAddressId
              )
              .eq(
                'user_id',
                user.id
              );


          if (
            error
          ) {
            throw error;
          }

        } else {
          const {
            error,
          } =
            await supabase
              .from('addresses')
              .insert({
                user_id:
                  user.id,

                ...payload,

                is_default:
                  savedAddresses.length ===
                  0,
              });


          if (
            error
          ) {
            throw error;
          }
        }


        setAddressFormVisible(
          false
        );


        setEditingAddressId(
          null
        );


        setAddressForm(
          EMPTY_ADDRESS
        );


        await loadAddresses(
          user.id
        );


        Alert.alert(
          'Saved',
          editingAddressId
            ? 'Address updated successfully.'
            : 'Address added successfully.'
        );

      } catch (
        error: any
      ) {
        Alert.alert(
          'Address Error',
          error?.message ??
            'Unable to save address.'
        );

      } finally {
        setSavingAddress(
          false
        );
      }
    };


  // ====================================================
  // DEFAULT ADDRESS
  // ====================================================

  const setDefaultAddress =
    async (
      addressId:
        string
    ) => {
      try {
        const {
          data:
            userData,
        } =
          await supabase.auth.getUser();


        const user =
          userData.user;


        if (!user) {
          return;
        }


        const {
          error:
            resetError,
        } =
          await supabase
            .from('addresses')
            .update({
              is_default:
                false,
            })
            .eq(
              'user_id',
              user.id
            );


        if (
          resetError
        ) {
          throw resetError;
        }


        const {
          error:
            defaultError,
        } =
          await supabase
            .from('addresses')
            .update({
              is_default:
                true,
            })
            .eq(
              'id',
              addressId
            )
            .eq(
              'user_id',
              user.id
            );


        if (
          defaultError
        ) {
          throw defaultError;
        }


        await loadAddresses(
          user.id
        );

      } catch (
        error: any
      ) {
        Alert.alert(
          'Unable to Set Default',
          error?.message ??
            'Please try again.'
        );
      }
    };


  // ====================================================
  // DELETE ADDRESS
  // ====================================================

  const deleteAddress =
    (
      address:
        SavedAddress
    ) => {
      Alert.alert(
        'Delete Address',
        'Are you sure you want to delete this address?',
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Delete',

            style:
              'destructive',

            onPress:
              async () => {
                try {
                  const {
                    data:
                      userData,
                  } =
                    await supabase.auth.getUser();


                  const user =
                    userData.user;


                  if (!user) {
                    return;
                  }


                  const {
                    error,
                  } =
                    await supabase
                      .from('addresses')
                      .delete()
                      .eq(
                        'id',
                        address.id
                      )
                      .eq(
                        'user_id',
                        user.id
                      );


                  if (
                    error
                  ) {
                    throw error;
                  }


                  await loadAddresses(
                    user.id
                  );

                } catch (
                  error: any
                ) {
                  Alert.alert(
                    'Delete Failed',
                    error?.message ??
                      'Unable to delete address.'
                  );
                }
              },
          },
        ]
      );
    };


  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout =
    () => {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Logout',

            style:
              'destructive',

            onPress:
              async () => {
                try {
                  const {
                    error,
                  } =
                    await supabase.auth.signOut();


                  if (
                    error
                  ) {
                    Alert.alert(
                      'Logout Failed',
                      error.message
                    );

                    return;
                  }


                  router.replace(
                    '/login'
                  );

                } catch {
                  Alert.alert(
                    'Logout Failed',
                    'Something went wrong. Please try again.'
                  );
                }
              },
          },
        ]
      );
    };


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
            My Account
          </Text>
        </View>


        <View
          style={
            styles.loadingContainer
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
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ====================================================
  // MAIN UI
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

      {/* HEADER */}

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
          My Account
        </Text>


        <Pressable
          style={
            styles.settingsButton
          }
          onPress={() =>
            showComingSoon(
              'Settings',
              'a later step'
            )
          }
        >
          <Ionicons
            name="settings-outline"
            size={23}
            color={
              COLORS.textPrimary
            }
          />
        </Pressable>
      </View>


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* PROFILE CARD */}

        <View
          style={
            styles.profileCard
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            <Ionicons
              name="person"
              size={42}
              color={
                COLORS.primary
              }
            />
          </View>


          <View
            style={
              styles.profileInfo
            }
          >
            <Text
              style={
                styles.profileName
              }
            >
              {fullName}
            </Text>


            <Text
              style={
                styles.profileEmail
              }
            >
              {email ||
                'No email'}
            </Text>


            <Text
              style={
                styles.profilePhone
              }
            >
              {phone ||
                'No mobile number added'}
            </Text>
          </View>


          <Pressable
            style={
              styles.editButton
            }
            onPress={
              openEditProfile
            }
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={
                COLORS.primary
              }
            />
          </Pressable>
        </View>


        {/* QUICK CARDS */}

        <View
          style={
            styles.quickRow
          }
        >
          <Pressable
            style={
              styles.quickCard
            }
            onPress={() =>
              router.push(
                '/(tabs)/orders'
              )
            }
          >
            <View
              style={
                styles.quickIcon
              }
            >
              <Ionicons
                name="cube-outline"
                size={24}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.quickNumber
              }
            >
              {orderCount}
            </Text>

            <Text
              style={
                styles.quickLabel
              }
            >
              Orders
            </Text>
          </Pressable>


          <Pressable
            style={
              styles.quickCard
            }
            onPress={() =>
              router.push(
                '/wishlist'
              )
            }
          >
            <View
              style={
                styles.quickIcon
              }
            >
              <Ionicons
                name="heart-outline"
                size={24}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.quickNumber
              }
            >
              {wishlistCount}
            </Text>

            <Text
              style={
                styles.quickLabel
              }
            >
              Wishlist
            </Text>
          </Pressable>


          <Pressable
            style={
              styles.quickCard
            }
            onPress={() =>
              setAddressesVisible(
                true
              )
            }
          >
            <View
              style={
                styles.quickIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={24}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.quickNumber
              }
            >
              {
                savedAddresses.length
              }
            </Text>

            <Text
              style={
                styles.quickLabel
              }
            >
              Addresses
            </Text>
          </Pressable>
        </View>


        {/* SHOPPING */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          SHOPPING
        </Text>


        <View
          style={
            styles.menuCard
          }
        >
          <MenuItem
            icon="cube-outline"
            title="My Orders"
            subtitle="View orders and tracking"
            onPress={() =>
              router.push(
                '/(tabs)/orders'
              )
            }
          />

          <Divider />

          <MenuItem
            icon="heart-outline"
            title="My Wishlist"
            subtitle="Products you saved"
            onPress={() =>
              router.push(
                '/wishlist'
              )
            }
          />

          <Divider />

          <MenuItem
            icon="location-outline"
            title="Saved Addresses"
            subtitle={`${savedAddresses.length} saved ${
              savedAddresses.length ===
              1
                ? 'address'
                : 'addresses'
            }`}
            onPress={() =>
              setAddressesVisible(
                true
              )
            }
          />

          <Divider />

          <MenuItem
            icon="ticket-outline"
            title="Coupons & Offers"
            subtitle="View available discounts"
            onPress={() =>
              showComingSoon(
                'Coupons',
                'Step 32'
              )
            }
          />
        </View>


        {/* LUCKY HUB SERVICES */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          LUCKY HUB SERVICES
        </Text>


        <View
          style={
            styles.menuCard
          }
        >

          {/* REAL PRINTING SERVICE */}

          <MenuItem
            icon="print-outline"
            title="Printing Service"
            subtitle="Upload documents for printing"
            onPress={() =>
              router.push(
                '/printing-service'
              )
            }
          />

          <Divider />

          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Orders, offers and updates"
            onPress={() =>
              showComingSoon(
                'Notifications',
                'Step 35'
              )
            }
          />
        </View>


        {/* SUPPORT */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          SUPPORT
        </Text>


        <View
          style={
            styles.menuCard
          }
        >
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with your order"
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Lucky Hub customer support will be connected later.'
              )
            }
          />

          <Divider />

          <MenuItem
            icon="chatbubble-ellipses-outline"
            title="Contact Lucky Hub"
            subtitle="Contact our shop"
            onPress={() =>
              Alert.alert(
                'Contact Lucky Hub',
                'Contact information will be added later.'
              )
            }
          />

          <Divider />

          <MenuItem
            icon="information-circle-outline"
            title="About Lucky Hub"
            subtitle="Learn more about our store"
            onPress={() =>
              Alert.alert(
                'Lucky Hub',
                'Your stationery, printing and school supplies store.'
              )
            }
          />
        </View>


        {/* ACCOUNT */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          ACCOUNT
        </Text>


        <View
          style={
            styles.menuCard
          }
        >
          <MenuItem
            icon="lock-closed-outline"
            title="Privacy & Security"
            subtitle="Manage your account security"
            onPress={() =>
              showComingSoon(
                'Privacy & Security',
                'a later step'
              )
            }
          />

          <Divider />

          <MenuItem
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out from Lucky Hub"
            danger
            onPress={
              handleLogout
            }
          />
        </View>


        {/* VERSION */}

        <View
          style={
            styles.versionContainer
          }
        >
          <Text
            style={
              styles.brandName
            }
          >
            Lucky Hub
          </Text>

          <Text
            style={
              styles.versionText
            }
          >
            Mobile App Version 1.0
          </Text>
        </View>
      </ScrollView>


      {/* ==================================================
          EDIT PROFILE MODAL
      ================================================== */}

      <Modal
        visible={
          editProfileVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setEditProfileVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Edit Profile
              </Text>

              <Pressable
                onPress={() =>
                  setEditProfileVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={26}
                  color={
                    COLORS.textPrimary
                  }
                />
              </Pressable>
            </View>


            <Text
              style={
                styles.inputLabel
              }
            >
              Full Name
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                editName
              }
              onChangeText={
                setEditName
              }
              placeholder="Full Name"
            />


            <Text
              style={
                styles.inputLabel
              }
            >
              Mobile Number
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                editPhone
              }
              onChangeText={
                setEditPhone
              }
              placeholder="Mobile Number"
              keyboardType="phone-pad"
            />


            <Text
              style={
                styles.inputLabel
              }
            >
              Email
            </Text>

            <View
              style={
                styles.disabledInput
              }
            >
              <Text
                style={
                  styles.disabledInputText
                }
              >
                {email}
              </Text>
            </View>


            <Pressable
              style={
                styles.primaryButton
              }
              disabled={
                savingProfile
              }
              onPress={
                saveProfile
              }
            >
              {savingProfile ? (
                <ActivityIndicator
                  color={
                    COLORS.white
                  }
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  SAVE PROFILE
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>


      {/* ==================================================
          SAVED ADDRESSES
      ================================================== */}

      <Modal
        visible={
          addressesVisible
        }
        animationType="slide"
        onRequestClose={() =>
          setAddressesVisible(
            false
          )
        }
      >
        <SafeAreaView
          style={
            styles.addressPage
          }
        >
          <View
            style={
              styles.addressHeader
            }
          >
            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                setAddressesVisible(
                  false
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
                styles.addressHeaderTitle
              }
            >
              Saved Addresses
            </Text>


            <Pressable
              style={
                styles.addButton
              }
              onPress={
                openNewAddress
              }
            >
              <Ionicons
                name="add"
                size={25}
                color={
                  COLORS.white
                }
              />
            </Pressable>
          </View>


          {savedAddresses.length ===
          0 ? (
            <View
              style={
                styles.emptyAddressContainer
              }
            >
              <Ionicons
                name="location-outline"
                size={70}
                color={
                  COLORS.textSecondary
                }
              />

              <Text
                style={
                  styles.emptyAddressTitle
                }
              >
                No saved addresses
              </Text>

              <Text
                style={
                  styles.emptyAddressText
                }
              >
                Add an address for faster checkout.
              </Text>

              <Pressable
                style={
                  styles.emptyAddressButton
                }
                onPress={
                  openNewAddress
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  ADD ADDRESS
                </Text>
              </Pressable>
            </View>

          ) : (
            <ScrollView
              contentContainerStyle={
                styles.addressList
              }
            >
              {savedAddresses.map(
                address => (
                  <View
                    key={
                      address.id
                    }
                    style={
                      styles.addressCard
                    }
                  >
                    <View
                      style={
                        styles.addressCardTop
                      }
                    >
                      <View
                        style={
                          styles.addressIcon
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
                          styles.addressInfo
                        }
                      >
                        <View
                          style={
                            styles.addressNameRow
                          }
                        >
                          <Text
                            style={
                              styles.addressName
                            }
                          >
                            {
                              address.recipient_name
                            }
                          </Text>


                          {address.is_default && (
                            <View
                              style={
                                styles.defaultBadge
                              }
                            >
                              <Text
                                style={
                                  styles.defaultBadgeText
                                }
                              >
                                DEFAULT
                              </Text>
                            </View>
                          )}
                        </View>


                        <Text
                          style={
                            styles.addressPhone
                          }
                        >
                          {
                            address.phone
                          }
                        </Text>


                        <Text
                          style={
                            styles.addressBody
                          }
                        >
                          {
                            address.address_line_1
                          }

                          {address.address_line_2
                            ? `, ${address.address_line_2}`
                            : ''}

                          {`, ${address.city}`}

                          {address.postal_code
                            ? `, ${address.postal_code}`
                            : ''}
                        </Text>
                      </View>
                    </View>


                    <View
                      style={
                        styles.addressActions
                      }
                    >
                      {!address.is_default && (
                        <Pressable
                          style={
                            styles.addressActionButton
                          }
                          onPress={() =>
                            setDefaultAddress(
                              address.id
                            )
                          }
                        >
                          <Text
                            style={
                              styles.addressActionText
                            }
                          >
                            Set Default
                          </Text>
                        </Pressable>
                      )}


                      <Pressable
                        style={
                          styles.addressActionButton
                        }
                        onPress={() =>
                          openEditAddress(
                            address
                          )
                        }
                      >
                        <Text
                          style={
                            styles.addressActionText
                          }
                        >
                          Edit
                        </Text>
                      </Pressable>


                      <Pressable
                        style={
                          styles.addressActionButton
                        }
                        onPress={() =>
                          deleteAddress(
                            address
                          )
                        }
                      >
                        <Text
                          style={
                            styles.deleteText
                          }
                        >
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )
              )}


              <Pressable
                style={
                  styles.addAddressBottomButton
                }
                onPress={
                  openNewAddress
                }
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  ADD NEW ADDRESS
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>


      {/* ==================================================
          ADD / EDIT ADDRESS
      ================================================== */}

      <Modal
        visible={
          addressFormVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setAddressFormVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.largeModalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                {editingAddressId
                  ? 'Edit Address'
                  : 'Add Address'}
              </Text>

              <Pressable
                onPress={() =>
                  setAddressFormVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={26}
                  color={
                    COLORS.textPrimary
                  }
                />
              </Pressable>
            </View>


            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
              <Text
                style={
                  styles.inputLabel
                }
              >
                Recipient Name
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  addressForm.recipientName
                }
                onChangeText={
                  value =>
                    updateAddressField(
                      'recipientName',
                      value
                    )
                }
                placeholder="Recipient Name"
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Phone
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  addressForm.phone
                }
                onChangeText={
                  value =>
                    updateAddressField(
                      'phone',
                      value
                    )
                }
                placeholder="Phone"
                keyboardType="phone-pad"
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Address Line 1
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  addressForm.addressLine1
                }
                onChangeText={
                  value =>
                    updateAddressField(
                      'addressLine1',
                      value
                    )
                }
                placeholder="House / Road"
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Address Line 2
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  addressForm.addressLine2
                }
                onChangeText={
                  value =>
                    updateAddressField(
                      'addressLine2',
                      value
                    )
                }
                placeholder="Area / Landmark"
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                City
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  addressForm.city
                }
                onChangeText={
                  value =>
                    updateAddressField(
                      'city',
                      value
                    )
                }
                placeholder="City"
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Postal Code
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  addressForm.postalCode
                }
                onChangeText={
                  value =>
                    updateAddressField(
                      'postalCode',
                      value
                    )
                }
                placeholder="Postal Code"
                keyboardType="number-pad"
              />


              <Pressable
                style={
                  styles.primaryButton
                }
                disabled={
                  savingAddress
                }
                onPress={
                  saveAddress
                }
              >
                {savingAddress ? (
                  <ActivityIndicator
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    {editingAddressId
                      ? 'UPDATE ADDRESS'
                      : 'SAVE ADDRESS'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


// ======================================================
// MENU ITEM
// ======================================================

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: MenuItemProps) {
  return (
    <Pressable
      style={({
        pressed,
      }) => [
        styles.menuItem,

        pressed &&
          styles.menuItemPressed,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={[
          styles.menuIcon,

          danger &&
            styles.menuIconDanger,
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={22}
          color={
            danger
              ? COLORS.error
              : COLORS.primary
          }
        />
      </View>


      <View
        style={
          styles.menuInfo
        }
      >
        <Text
          style={[
            styles.menuTitle,

            danger &&
              styles.menuTitleDanger,
          ]}
        >
          {title}
        </Text>


        {subtitle ? (
          <Text
            style={
              styles.menuSubtitle
            }
          >
            {subtitle}
          </Text>
        ) : null}
      </View>


      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          COLORS.textSecondary
        }
      />
    </Pressable>
  );
}


// ======================================================
// DIVIDER
// ======================================================

function Divider() {
  return (
    <View
      style={
        styles.divider
      }
    />
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

    loadingContainer: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color:
        COLORS.textSecondary,
    },

    header: {
      height: 60,
      backgroundColor:
        COLORS.white,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    headerTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    settingsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    content: {
      padding: 14,
      paddingBottom: 45,
    },

    profileCard: {
      backgroundColor:
        COLORS.primary,
      borderRadius: 18,
      padding: 18,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 14,
    },

    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        COLORS.white,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    profileInfo: {
      flex: 1,
      marginLeft: 14,
    },

    profileName: {
      fontSize: 18,
      fontWeight:
        '900',
      color:
        COLORS.white,
    },

    profileEmail: {
      marginTop: 4,
      fontSize: 12,
      fontWeight:
        '700',
      color:
        COLORS.secondary,
    },

    profilePhone: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 15,
      color:
        COLORS.white,
      opacity: 0.9,
    },

    editButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        COLORS.white,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    quickRow: {
      flexDirection:
        'row',
      gap: 10,
      marginBottom: 22,
    },

    quickCard: {
      flex: 1,
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems:
        'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    quickIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    quickNumber: {
      marginTop: 7,
      fontSize: 17,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    quickLabel: {
      marginTop: 2,
      fontSize: 10,
      fontWeight:
        '700',
      color:
        COLORS.textSecondary,
    },

    sectionLabel: {
      marginLeft: 3,
      marginBottom: 8,
      marginTop: 4,
      fontSize: 11,
      fontWeight:
        '800',
      color:
        COLORS.textSecondary,
    },

    menuCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      marginBottom: 20,
      overflow:
        'hidden',
    },

    menuItem: {
      minHeight: 72,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },

    menuItemPressed: {
      backgroundColor:
        COLORS.backgroundSoft,
    },

    menuIcon: {
      width: 43,
      height: 43,
      borderRadius: 11,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    menuIconDanger: {
      backgroundColor:
        '#FEECEC',
    },

    menuInfo: {
      flex: 1,
      marginLeft: 12,
    },

    menuTitle: {
      fontSize: 14,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    menuTitleDanger: {
      color:
        COLORS.error,
    },

    menuSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginLeft: 69,
    },

    versionContainer: {
      alignItems:
        'center',
      paddingTop: 5,
      paddingBottom: 10,
    },

    brandName: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    versionText: {
      marginTop: 4,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.45)',
      justifyContent:
        'flex-end',
    },

    modalCard: {
      backgroundColor:
        COLORS.white,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      paddingBottom: 30,
    },

    largeModalCard: {
      backgroundColor:
        COLORS.white,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      maxHeight: '90%',
    },

    modalHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 20,
    },

    modalTitle: {
      fontSize: 20,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    inputLabel: {
      fontSize: 12,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
      marginBottom: 7,
      marginTop: 8,
    },

    input: {
      height: 50,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 11,
      paddingHorizontal: 13,
      fontSize: 14,
      color:
        COLORS.textPrimary,
      backgroundColor:
        COLORS.white,
    },

    disabledInput: {
      height: 50,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 11,
      paddingHorizontal: 13,
      justifyContent:
        'center',
      backgroundColor:
        COLORS.backgroundSoft,
    },

    disabledInputText: {
      fontSize: 14,
      color:
        COLORS.textSecondary,
    },

    primaryButton: {
      height: 52,
      backgroundColor:
        COLORS.primary,
      borderRadius: 11,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 22,
    },

    primaryButtonText: {
      color:
        COLORS.white,
      fontSize: 13,
      fontWeight:
        '900',
    },

    addressPage: {
      flex: 1,
      backgroundColor:
        COLORS.backgroundSoft,
    },

    addressHeader: {
      height: 60,
      backgroundColor:
        COLORS.white,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 12,
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

    addressHeaderTitle: {
      flex: 1,
      textAlign:
        'center',
      fontSize: 19,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    addButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        COLORS.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    addressList: {
      padding: 14,
      paddingBottom: 40,
    },

    addressCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 15,
      marginBottom: 12,
    },

    addressCardTop: {
      flexDirection:
        'row',
    },

    addressIcon: {
      width: 45,
      height: 45,
      borderRadius: 11,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    addressInfo: {
      flex: 1,
      marginLeft: 12,
    },

    addressNameRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flexWrap:
        'wrap',
      gap: 7,
    },

    addressName: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    defaultBadge: {
      backgroundColor:
        '#E8F5F0',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },

    defaultBadgeText: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    addressPhone: {
      marginTop: 4,
      fontSize: 12,
      fontWeight:
        '700',
      color:
        COLORS.textSecondary,
    },

    addressBody: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.textPrimary,
    },

    addressActions: {
      flexDirection:
        'row',
      justifyContent:
        'flex-end',
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    addressActionButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    addressActionText: {
      fontSize: 11,
      fontWeight:
        '800',
      color:
        COLORS.primary,
    },

    deleteText: {
      fontSize: 11,
      fontWeight:
        '800',
      color:
        COLORS.error,
    },

    addAddressBottomButton: {
      height: 52,
      backgroundColor:
        COLORS.primary,
      borderRadius: 11,
      flexDirection:
        'row',
      gap: 7,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 5,
    },

    emptyAddressContainer: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal: 30,
    },

    emptyAddressTitle: {
      marginTop: 15,
      fontSize: 20,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    emptyAddressText: {
      marginTop: 7,
      fontSize: 13,
      color:
        COLORS.textSecondary,
      textAlign:
        'center',
    },

    emptyAddressButton: {
      width: 170,
      height: 50,
      marginTop: 20,
      borderRadius: 11,
      backgroundColor:
        COLORS.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
    },
  });