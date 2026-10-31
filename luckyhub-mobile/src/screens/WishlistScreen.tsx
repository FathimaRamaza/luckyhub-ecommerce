import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    useCallback,
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
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
    addToCart,
} from '../services/cartService';

import {
    getProductVariants,
    Product,
} from '../services/productService';


import {
    getWishlistProducts,
    removeFromWishlist,
} from '../services/wishlistService';

// ======================================================
// PRODUCT CATEGORY NAME
// ======================================================

function getProductCategoryName(product: Product): string {
  const category = product.categories;

  if (!category) {
    return '';
  }

  if (Array.isArray(category)) {
    return category[0]?.name ?? '';
  }

  return category.name ?? '';
}




// ======================================================
// SCREEN
// ======================================================

export default function WishlistScreen() {
  const router =
    useRouter();

  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      []
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
    workingProductId,
    setWorkingProductId,
  ] =
    useState<
      string | null
    >(null);


  // ====================================================
  // LOAD
  // ====================================================

  const loadWishlist =
    useCallback(
      async (
        showLoader =
          true
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          const data =
            await getWishlistProducts();

          setProducts(
            data
          );

        } catch (
          error: any
        ) {
          console.error(
            'Wishlist load error:',
            error
          );

          Alert.alert(
            'Wishlist Error',
            error?.message ??
              'Unable to load your wishlist.'
          );

        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );


  useFocusEffect(
    useCallback(
      () => {
        loadWishlist(
          true
        );
      },
      [loadWishlist]
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

      await loadWishlist(
        false
      );
    };


  // ====================================================
  // REMOVE
  // ====================================================

  const handleRemove =
    (
      product:
        Product
    ) => {
      Alert.alert(
        'Remove from Wishlist',
        `Remove ${product.name} from your wishlist?`,
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
              async () => {
                try {
                  setWorkingProductId(
                    product.id
                  );

                  await removeFromWishlist(
                    product.id
                  );

                  setProducts(
                    current =>
                      current.filter(
                        item =>
                          item.id !==
                          product.id
                      )
                  );

                } catch (
                  error: any
                ) {
                  Alert.alert(
                    'Unable to Remove',
                    error?.message ??
                      'Please try again.'
                  );

                } finally {
                  setWorkingProductId(
                    null
                  );
                }
              },
          },
        ]
      );
    };


  // ====================================================
  // ADD TO CART
  // ====================================================

  const handleAddToCart =
    async (
      product:
        Product
    ) => {
      try {
        setWorkingProductId(
          product.id
        );

        const variants =
          await getProductVariants(
            product.id
          );

        if (
          variants.length >
          0
        ) {
          Alert.alert(
            'Choose Product Option',
            'This product has options. Please open the product and select the required option.',
            [
              {
                text:
                  'Cancel',

                style:
                  'cancel',
              },

              {
                text:
                  'View Product',

                onPress:
                  () =>
                    router.push({
                      pathname:
                        '/product-details',

                      params: {
                        id:
                          product.id,
                      },
                    }),
              },
            ]
          );

          return;
        }

        const stock =
          Number(
            product.stock_quantity ??
              0
          );

        if (
          stock <=
          0
        ) {
          Alert.alert(
            'Out of Stock',
            'This product is currently unavailable.'
          );

          return;
        }

        await addToCart(
          product.id,
          1,
          null
        );

        Alert.alert(
          'Added to Cart',
          `${product.name} has been added to your cart.`,
          [
            {
              text:
                'Continue',
            },

            {
              text:
                'View Cart',

              onPress:
                () =>
                  router.push(
                    '/(tabs)/cart'
                  ),
            },
          ]
        );

      } catch (
        error: any
      ) {
        Alert.alert(
          'Unable to Add',
          error?.message ??
            'Unable to add this product to cart.'
        );

      } finally {
        setWorkingProductId(
          null
        );
      }
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
          <Pressable
            style={
              styles.headerButton
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
            My Wishlist
          </Text>

          <View
            style={
              styles.headerButton
            }
          />
        </View>

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
            Loading wishlist...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ====================================================
  // MAIN
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
        <Pressable
          style={
            styles.headerButton
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
          My Wishlist
        </Text>

        <View
          style={
            styles.headerButton
          }
        />
      </View>


      {products.length ===
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
          <View
            style={
              styles.emptyIcon
            }
          >
            <Ionicons
              name="heart-outline"
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
            Your wishlist is empty
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Tap the heart icon on a product to save it here.
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
            <Text
              style={
                styles.shopButtonText
              }
            >
              START SHOPPING
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
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
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={
              styles.countRow
            }
          >
            <Text
              style={
                styles.countText
              }
            >
              {products.length}{' '}
              {products.length ===
              1
                ? 'saved product'
                : 'saved products'}
            </Text>
          </View>


          {products.map(
            product => {
              const imageSource =
                product.image_url
                  ? {
                      uri:
                        product.image_url,
                    }
                  : require('../assets/placeholders/product-placeholder.png');

              const working =
                workingProductId ===
                product.id;

              const sellingPrice =
                Number(
                  product.base_price ??
                    0
                );

              const compareAtPrice =
                product.compare_at_price ===
                  null ||
                product.compare_at_price ===
                  undefined
                  ? 0
                  : Number(
                      product.compare_at_price
                    );

              const hasDiscount =
                compareAtPrice >
                sellingPrice;

              const discountPercentage =
                hasDiscount
                  ? Math.round(
                      (
                        (
                          compareAtPrice -
                          sellingPrice
                        ) /
                        compareAtPrice
                      ) *
                        100
                    )
                  : 0;

              return (
                <View
                  key={
                    product.id
                  }
                  style={
                    styles.productCard
                  }
                >
                  <Pressable
                    style={
                      styles.productMain
                    }
                    onPress={() =>
                      router.push({
                        pathname:
                          '/product-details',

                        params: {
                          id:
                            product.id,
                        },
                      })
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

                    <View
                      style={
                        styles.productInfo
                      }
                    >
                      {getProductCategoryName(product) ? (
                        <Text
                          style={
                            styles.category
                          }
                        >
                          {getProductCategoryName(product)}
                        </Text>
                      ) : null}

                      <Text
                        style={
                          styles.productName
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {
                          product.name
                        }
                      </Text>

                      {product.brand ? (
                        <Text
                          style={
                            styles.brand
                          }
                        >
                          {
                            product.brand
                          }
                        </Text>
                      ) : null}

                      <View
                        style={
                          styles.priceRow
                        }
                      >
                        <Text
                          style={
                            styles.price
                          }
                        >
                          Rs.{' '}
                          {sellingPrice.toLocaleString()}
                        </Text>

                        {hasDiscount && (
                          <>
                            <Text
                              style={
                                styles.oldPrice
                              }
                            >
                              Rs.{' '}
                              {compareAtPrice.toLocaleString()}
                            </Text>

                            <View
                              style={
                                styles.discountBadge
                              }
                            >
                              <Text
                                style={
                                  styles.discountBadgeText
                                }
                              >
                                {discountPercentage}% OFF
                              </Text>
                            </View>
                          </>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.stockText,

                          Number(
                            product.stock_quantity ??
                              0
                          ) >
                          0
                            ? styles.inStock
                            : styles.outStock,
                        ]}
                      >
                        {Number(
                          product.stock_quantity ??
                            0
                        ) >
                        0
                          ? 'In Stock'
                          : 'Out of Stock'}
                      </Text>
                    </View>
                  </Pressable>


                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <Pressable
                      style={
                        styles.removeButton
                      }
                      disabled={
                        working
                      }
                      onPress={() =>
                        handleRemove(
                          product
                        )
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={
                          COLORS.error
                        }
                      />

                      <Text
                        style={
                          styles.removeText
                        }
                      >
                        Remove
                      </Text>
                    </Pressable>


                    <Pressable
                      style={
                        styles.cartButton
                      }
                      disabled={
                        working
                      }
                      onPress={() =>
                        handleAddToCart(
                          product
                        )
                      }
                    >
                      {working ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.white
                          }
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="cart-outline"
                            size={18}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.cartButtonText
                            }
                          >
                            Add to Cart
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            }
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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

    header: {
      height: 58,
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

    headerButton: {
      width: 42,
      height: 42,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    headerTitle: {
      flex: 1,
      textAlign:
        'center',
      fontSize: 19,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    center: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    loadingText: {
      marginTop: 12,
      color:
        COLORS.textSecondary,
    },

    emptyContainer: {
      flexGrow: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 35,
      paddingBottom: 60,
    },

    emptyIcon: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyTitle: {
      marginTop: 18,
      fontSize: 20,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    emptyText: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      textAlign:
        'center',
      color:
        COLORS.textSecondary,
    },

    shopButton: {
      marginTop: 22,
      height: 48,
      paddingHorizontal: 28,
      borderRadius: 11,
      backgroundColor:
        COLORS.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    shopButtonText: {
      color:
        COLORS.white,
      fontSize: 13,
      fontWeight:
        '900',
    },

    content: {
      padding: 14,
      paddingBottom: 40,
    },

    countRow: {
      marginBottom: 10,
    },

    countText: {
      fontSize: 12,
      fontWeight:
        '700',
      color:
        COLORS.textSecondary,
    },

    productCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      marginBottom: 13,
      overflow:
        'hidden',
    },

    productMain: {
      flexDirection:
        'row',
      padding: 13,
    },

    productImage: {
      width: 100,
      height: 100,
      borderRadius: 10,
      backgroundColor:
        COLORS.backgroundSoft,
    },

    productInfo: {
      flex: 1,
      paddingLeft: 13,
    },

    category: {
      fontSize: 10,
      fontWeight:
        '700',
      color:
        COLORS.primary,
    },

    productName: {
      marginTop: 4,
      fontSize: 15,
      lineHeight: 20,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    brand: {
      marginTop: 3,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },

    priceRow: {
      marginTop: 8,
      flexDirection:
        'row',
      alignItems:
        'center',
      flexWrap:
        'wrap',
      gap: 6,
    },

    price: {
      fontSize: 17,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    oldPrice: {
      fontSize: 11,
      color:
        COLORS.textSecondary,
      textDecorationLine:
        'line-through',
    },

    discountBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor:
        '#FEF3C7',
    },

    discountBadgeText: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#92400E',
    },

    stockText: {
      marginTop: 4,
      fontSize: 10,
      fontWeight:
        '700',
    },

    inStock: {
      color:
        COLORS.success,
    },

    outStock: {
      color:
        COLORS.error,
    },

    actionRow: {
      flexDirection:
        'row',
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      padding: 10,
      gap: 9,
    },

    removeButton: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 10,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
    },

    removeText: {
      fontSize: 12,
      fontWeight:
        '800',
      color:
        COLORS.error,
    },

    cartButton: {
      flex: 1.35,
      height: 44,
      borderRadius: 10,
      backgroundColor:
        COLORS.primary,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
    },

    cartButtonText: {
      color:
        COLORS.white,
      fontSize: 12,
      fontWeight:
        '900',
    },
  });