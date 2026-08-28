import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import { addToCart } from '../services/cartService';

import {
  getProductById,
  getProductVariants,
  Product,
  ProductVariant,
} from '../services/productService';

import {
  isProductInWishlist,
  toggleWishlist,
} from '../services/wishlistService';


import {
  calculateOfferPrice,
  getActiveOfferByProductId,
  getOfferPercentage,
  ProductOffer,
} from '../services/offerService';


// ======================================================
// COLOUR HELPER
// ======================================================

function getColourValue(value: string) {
  const colour = value.trim().toLowerCase();

  switch (colour) {
    case 'blue':
      return '#2563EB';

    case 'black':
      return '#111827';

    case 'red':
      return '#DC2626';

    case 'green':
      return '#16A34A';

    case 'yellow':
      return '#FACC15';

    case 'orange':
      return '#F97316';

    case 'pink':
      return '#EC4899';

    case 'purple':
      return '#9333EA';

    case 'brown':
      return '#92400E';

    case 'grey':
    case 'gray':
      return '#6B7280';

    case 'white':
      return '#FFFFFF';

    case 'gold':
      return '#B8860B';

    case 'silver':
      return '#7C8795';

    case 'light blue':
      return '#38BDF8';

    case 'lime yellow':
      return '#BEF264';

    case 'pastel pink':
      return '#F9A8D4';

    case 'multi colour':
    case 'multicolour':
    case 'multi-color':
    case 'multicolor':
      return '#8B5CF6';

    default:
      return '#CBD5E1';
  }
}



// ======================================================
// PRODUCT CATEGORY NAME HELPER
// ======================================================

function getProductCategoryName(
  product: Product
): string {
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
// PRODUCT DETAILS SCREEN
// ======================================================

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [variants, setVariants] =
    useState<ProductVariant[]>([]);

  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariant | null>(null);

  const [quantity, setQuantity] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [addingToCart, setAddingToCart] =
    useState(false);

  const [buyingNow, setBuyingNow] =
    useState(false);

  const [isWishlisted, setIsWishlisted] =
    useState(false);

  const [wishlistLoading, setWishlistLoading] =
    useState(false);


  const [offer, setOffer] =
    useState<ProductOffer | null>(null);


  // ====================================================
  // LOAD PRODUCT
  // ====================================================

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError('');

        if (!params.id) {
          setError('Product ID not found.');
          return;
        }

        const productData =
          await getProductById(params.id);

        if (!active) {
          return;
        }

        if (!productData) {
          setError('Product not found.');
          return;
        }

        setProduct(productData);

        const variantData =
          await getProductVariants(params.id);

        if (!active) {
          return;
        }

        console.log(
          'Loaded product variants:',
          variantData
        );

        setVariants(variantData);

        try {
          const offerData =
            await getActiveOfferByProductId(
              params.id
            );

          if (active) {
            setOffer(
              offerData
            );
          }
        } catch (offerError) {
          console.log(
            'Offer load error:',
            offerError
          );

          if (active) {
            setOffer(null);
          }
        }

        if (variantData.length > 0) {
          const firstAvailable =
            variantData.find(
              variant =>
                Number(
                  variant.stock_quantity
                ) > 0
            );

          setSelectedVariant(
            firstAvailable ??
              variantData[0]
          );
        } else {
          setSelectedVariant(null);
        }

        try {
          const saved =
            await isProductInWishlist(
              params.id
            );

          if (active) {
            setIsWishlisted(saved);
          }
        } catch (wishlistError) {
          console.log(
            'Wishlist status error:',
            wishlistError
          );
        }
      } catch (err) {
        console.error(
          'Product details error:',
          err
        );

        if (active) {
          setError(
            'Unable to load this product.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [params.id]);


  // ====================================================
  // VARIANT NAME
  // ====================================================

  const variantName =
    useMemo(() => {
      if (variants.length === 0) {
        return '';
      }

      return (
        variants[0].variant_name ??
        'Option'
      );
    }, [variants]);


  const normalizedVariantName =
    variantName
      .trim()
      .toLowerCase();


  const isColourVariant =
    normalizedVariantName === 'colour' ||
    normalizedVariantName === 'color';


  // ====================================================
  // CURRENT NORMAL PRICE
  // ====================================================

  const currentNormalPrice =
    useMemo(() => {
      if (
        selectedVariant &&
        Number(
          selectedVariant.price
        ) > 0
      ) {
        return Number(
          selectedVariant.price
        );
      }

      return Number(
        product?.base_price ?? 0
      );
    }, [
      product,
      selectedVariant,
    ]);


  // ====================================================
  // CURRENT OFFER PRICE
  // ====================================================

  const currentPrice =
    useMemo(() => {
      if (offer) {
        return calculateOfferPrice(
          currentNormalPrice,
          offer
        );
      }

      return currentNormalPrice;
    }, [
      currentNormalPrice,
      offer,
    ]);


  const hasActiveOffer =
    Boolean(
      offer
    ) &&
    currentPrice <
      currentNormalPrice;


  const offerPercentage =
    hasActiveOffer
      ? getOfferPercentage(
          currentNormalPrice,
          offer
        )
      : 0;


  // ====================================================
  // CURRENT STOCK
  // ====================================================

  const currentStock =
    useMemo(() => {
      if (selectedVariant) {
        return Number(
          selectedVariant.stock_quantity ??
            0
        );
      }

      return Number(
        product?.stock_quantity ??
          0
      );
    }, [
      product,
      selectedVariant,
    ]);


  // ====================================================
  // SELECT VARIANT
  // ====================================================

  const selectVariant = (
    variant: ProductVariant
  ) => {
    const stock =
      Number(
        variant.stock_quantity ??
          0
      );

    if (stock <= 0) {
      Alert.alert(
        'Out of Stock',
        `${variant.variant_value} is currently unavailable.`
      );

      return;
    }

    setSelectedVariant(variant);
    setQuantity(1);
  };


  // ====================================================
  // QUANTITY
  // ====================================================

  const decreaseQuantity = () => {
    setQuantity(current =>
      Math.max(
        1,
        current - 1
      )
    );
  };


  const increaseQuantity = () => {
    setQuantity(current => {
      if (
        current >=
        currentStock
      ) {
        return current;
      }

      return current + 1;
    });
  };


  // ====================================================
  // WISHLIST
  // ====================================================

  const handleWishlist =
    async () => {
      if (
        !product ||
        wishlistLoading
      ) {
        return;
      }

      try {
        setWishlistLoading(true);

        const newStatus =
          await toggleWishlist(
            product.id
          );

        setIsWishlisted(
          newStatus
        );
      } catch (err: any) {
        Alert.alert(
          'Wishlist Error',
          err?.message ??
            'Unable to update wishlist.'
        );
      } finally {
        setWishlistLoading(false);
      }
    };


  // ====================================================
  // VALIDATE PURCHASE
  // ====================================================

  const validatePurchase = () => {
    if (!product) {
      return false;
    }

    if (
      variants.length > 0 &&
      !selectedVariant
    ) {
      Alert.alert(
        'Select Option',
        `Please select ${variantName}.`
      );

      return false;
    }

    if (currentStock <= 0) {
      Alert.alert(
        'Out of Stock',
        selectedVariant
          ? `${selectedVariant.variant_value} is currently unavailable.`
          : 'This product is currently unavailable.'
      );

      return false;
    }

    if (
      quantity >
      currentStock
    ) {
      Alert.alert(
        'Stock Limit',
        `Only ${currentStock} item(s) available.`
      );

      return false;
    }

    return true;
  };


  // ====================================================
  // ADD TO CART
  // ====================================================

  const handleAddToCart =
    async () => {
      if (
        !product ||
        !validatePurchase()
      ) {
        return;
      }

      try {
        setAddingToCart(true);

        await addToCart(
          product.id,
          quantity,
          selectedVariant?.id ??
            null
        );

        Alert.alert(
          'Added to Cart',
          selectedVariant
            ? `${product.name} - ${selectedVariant.variant_value} added to cart.`
            : `${product.name} added to cart.`,
          [
            {
              text: 'Continue',
              style: 'cancel',
            },

            {
              text: 'View Cart',
              onPress: () =>
                router.push(
                  '/(tabs)/cart'
                ),
            },
          ]
        );
      } catch (err: any) {
        Alert.alert(
          'Unable to Add',
          err?.message ??
            'Unable to add product.'
        );
      } finally {
        setAddingToCart(false);
      }
    };


  // ====================================================
  // BUY NOW
  // ====================================================

  const handleBuyNow =
    async () => {
      if (
        !product ||
        !validatePurchase()
      ) {
        return;
      }

      try {
        setBuyingNow(true);

        await addToCart(
          product.id,
          quantity,
          selectedVariant?.id ??
            null
        );

        router.push(
          '/(tabs)/cart'
        );
      } catch (err: any) {
        Alert.alert(
          'Unable to Continue',
          err?.message ??
            'Unable to continue.'
        );
      } finally {
        setBuyingNow(false);
      }
    };


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text
            style={styles.loadingText}
          >
            Loading product...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (
    error ||
    !product
  ) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={55}
            color={COLORS.error}
          />

          <Text
            style={styles.errorTitle}
          >
            Product unavailable
          </Text>

          <Text
            style={styles.errorText}
          >
            {error}
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backButtonText}
            >
              GO BACK
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  // ====================================================
  // PRODUCT IMAGE
  // ====================================================

  const imageSource =
    product.image_url
      ? {
          uri:
            product.image_url,
        }
      : require(
          '../assets/placeholders/product-placeholder.png'
        );


  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >

      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          style={styles.headerIcon}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={
              COLORS.textPrimary
            }
          />
        </Pressable>


        <Pressable
          style={styles.searchBar}
          onPress={() =>
            router.push(
              '/search'
            )
          }
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={styles.searchText}
          >
            Search Lucky Hub
          </Text>
        </Pressable>


        <Pressable
          style={styles.headerIcon}
          onPress={handleWishlist}
        >
          {wishlistLoading ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />
          ) : (
            <Ionicons
              name={
                isWishlisted
                  ? 'heart'
                  : 'heart-outline'
              }
              size={23}
              color={
                isWishlisted
                  ? COLORS.error
                  : COLORS.textPrimary
              }
            />
          )}
        </Pressable>
      </View>


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            105 +
            insets.bottom,
        }}
      >

        {/* IMAGE */}

        <View
          style={styles.imageSection}
        >
          <Image
            source={imageSource}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>


        {/* =================================================
            VARIANT OPTIONS
        ================================================= */}

        {variants.length > 0 && (
          <View
            style={styles.variantSection}
          >

            <View
              style={styles.variantHeader}
            >
              <Text
                style={styles.variantTitle}
              >
                {isColourVariant
                  ? 'Colour'
                  : variantName}
              </Text>

              <Text
                style={styles.selectedText}
              >
                Selected:{' '}
                <Text
                  style={
                    styles.selectedStrong
                  }
                >
                  {
                    selectedVariant
                      ?.variant_value ??
                    'None'
                  }
                </Text>
              </Text>
            </View>


            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.variantRow
              }
            >
              {variants.map(
                variant => {
                  const selected =
                    selectedVariant?.id ===
                    variant.id;

                  const stock =
                    Number(
                      variant.stock_quantity ??
                        0
                    );


                  // ========================================
                  // COLOUR OPTION
                  // ========================================

                  if (isColourVariant) {
                    const colourName =
                      variant.variant_value
                        .trim()
                        .toLowerCase();

                    const colour =
                      getColourValue(
                        variant.variant_value
                      );

                    const isLightColour =
                      colourName === 'white' ||
                      colourName === 'silver' ||
                      colourName === 'gold' ||
                      colourName === 'yellow';


                    return (
                      <Pressable
                        key={variant.id}
                        style={
                          styles.colourWrapper
                        }
                        onPress={() =>
                          selectVariant(
                            variant
                          )
                        }
                      >

                        <View
                          style={[
                            styles.colourBox,

                            selected &&
                              styles.colourBoxSelected,

                            stock <= 0 &&
                              styles.optionDisabled,
                          ]}
                        >

                          <View
                            style={[
                              styles.colourDot,

                              {
                                backgroundColor:
                                  colour,
                              },

                              isLightColour &&
                                styles.lightColourBorder,
                            ]}
                          />


                          {selected && (
                            <View
                              style={
                                styles.checkBadge
                              }
                            >
                              <Ionicons
                                name="checkmark"
                                size={11}
                                color={
                                  COLORS.white
                                }
                              />
                            </View>
                          )}

                        </View>


                        <Text
                          style={[
                            styles.colourLabel,

                            selected &&
                              styles.colourLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {
                            variant.variant_value
                          }
                        </Text>

                      </Pressable>
                    );
                  }


                  // ========================================
                  // WEIGHT / SIZE / PAGES
                  // ========================================

                  return (
                    <Pressable
                      key={variant.id}
                      style={[
                        styles.normalVariant,

                        selected &&
                          styles.normalVariantSelected,

                        stock <= 0 &&
                          styles.optionDisabled,
                      ]}
                      onPress={() =>
                        selectVariant(
                          variant
                        )
                      }
                    >

                      <Text
                        style={[
                          styles.normalVariantText,

                          selected &&
                            styles.normalVariantTextSelected,
                        ]}
                      >
                        {
                          variant.variant_value
                        }
                      </Text>


                      <Text
                        style={
                          styles.variantPrice
                        }
                      >
                        Rs.{' '}
                        {Number(
                          variant.price
                        ).toLocaleString()}
                      </Text>

                    </Pressable>
                  );
                }
              )}
            </ScrollView>

          </View>
        )}


        {/* =================================================
            PRODUCT INFORMATION
        ================================================= */}

        <View
          style={styles.infoSection}
        >

          {/* PRICE */}

          <View
            style={styles.priceRow}
          >
            <Text
              style={styles.price}
            >
              Rs.{' '}
              {currentPrice.toLocaleString()}
            </Text>


            {hasActiveOffer ? (
              <>
                <Text
                  style={styles.oldPrice}
                >
                  Rs.{' '}
                  {currentNormalPrice.toLocaleString()}
                </Text>

                <View
                  style={styles.offerBadge}
                >
                  <Text
                    style={styles.offerBadgeText}
                  >
                    {offerPercentage}% OFF
                  </Text>
                </View>
              </>
            ) : product.compare_at_price &&
              Number(
                product.compare_at_price
              ) >
                currentPrice ? (
              <Text
                style={styles.oldPrice}
              >
                Rs.{' '}
                {Number(
                  product.compare_at_price
                ).toLocaleString()}
              </Text>
            ) : null}
          </View>


          {hasActiveOffer && offer ? (
            <View
              style={styles.offerInfo}
            >
              <Ionicons
                name="flash"
                size={14}
                color={
                  COLORS.error
                }
              />

              <Text
                style={styles.offerInfoText}
              >
                {offer.title}
              </Text>
            </View>
          ) : null}


          {/* PRODUCT NAME */}

          <Text
            style={styles.productName}
          >
            {product.name}
          </Text>


          {/* CATEGORY */}

          {getProductCategoryName(
            product
          ) ? (
            <Text
              style={styles.category}
            >
              {
                getProductCategoryName(
                  product
                )
              }
            </Text>
          ) : null}


          {/* STOCK */}

          <View
            style={styles.stockRow}
          >
            <Ionicons
              name={
                currentStock > 0
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={16}
              color={
                currentStock > 0
                  ? COLORS.success
                  : COLORS.error
              }
            />


            <Text
              style={[
                styles.stockText,

                {
                  color:
                    currentStock > 0
                      ? COLORS.success
                      : COLORS.error,
                },
              ]}
            >
              {currentStock > 0
                ? `In Stock (${currentStock})`
                : 'Out of Stock'}
            </Text>


            {selectedVariant && (
              <Text
                style={
                  styles.selectedOptionInline
                }
              >
                •{' '}
                {
                  selectedVariant.variant_value
                }
              </Text>
            )}

          </View>


          {/* QUANTITY */}

          <View
            style={
              styles.quantitySection
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Quantity
            </Text>


            <View
              style={
                styles.quantityContainer
              }
            >

              <Pressable
                style={
                  styles.quantityButton
                }
                onPress={
                  decreaseQuantity
                }
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={
                    COLORS.textPrimary
                  }
                />
              </Pressable>


              <View
                style={
                  styles.quantityValue
                }
              >
                <Text
                  style={
                    styles.quantityText
                  }
                >
                  {quantity}
                </Text>
              </View>


              <Pressable
                style={
                  styles.quantityButton
                }
                onPress={
                  increaseQuantity
                }
                disabled={
                  currentStock <= 0 ||
                  quantity >=
                    currentStock
                }
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={
                    currentStock <= 0 ||
                    quantity >=
                      currentStock
                      ? COLORS.border
                      : COLORS.textPrimary
                  }
                />
              </Pressable>

            </View>
          </View>


          {/* DESCRIPTION */}

          <View
            style={
              styles.descriptionSection
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Description
            </Text>


            <Text
              style={styles.description}
            >
              {product.description
                ?.trim()
                ? product.description
                : `${product.name} available from Lucky Hub.`}
            </Text>
          </View>

        </View>
      </ScrollView>


      {/* =================================================
          BOTTOM ACTION BAR
      ================================================= */}

      <View
        style={[
          styles.bottomBar,

          {
            paddingBottom:
              Math.max(
                insets.bottom,
                8
              ),
          },
        ]}
      >

        {/* CART */}

        <Pressable
          style={
            styles.cartIconButton
          }
          onPress={() =>
            router.push(
              '/(tabs)/cart'
            )
          }
        >
          <Ionicons
            name="cart-outline"
            size={23}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.cartIconText
            }
          >
            Cart
          </Text>
        </Pressable>


        {/* BUY NOW */}

        <Pressable
          style={[
            styles.buyButton,

            (
              currentStock <= 0 ||
              buyingNow
            ) &&
              styles.disabledButton,
          ]}
          onPress={
            handleBuyNow
          }
          disabled={
            currentStock <= 0 ||
            buyingNow
          }
        >
          {buyingNow ? (
            <ActivityIndicator
              color={
                COLORS.white
              }
            />
          ) : (
            <Text
              style={
                styles.bottomButtonText
              }
            >
              Buy Now
            </Text>
          )}
        </Pressable>


        {/* ADD TO CART */}

        <Pressable
          style={[
            styles.addButton,

            (
              currentStock <= 0 ||
              addingToCart
            ) &&
              styles.disabledButton,
          ]}
          onPress={
            handleAddToCart
          }
          disabled={
            currentStock <= 0 ||
            addingToCart
          }
        >
          {addingToCart ? (
            <ActivityIndicator
              color={
                COLORS.white
              }
            />
          ) : (
            <Text
              style={
                styles.bottomButtonText
              }
            >
              Add to Cart
            </Text>
          )}
        </Pressable>

      </View>
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


    center: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      padding: 25,
    },


    loadingText: {
      marginTop: 10,
      color:
        COLORS.textSecondary,
    },


    errorTitle: {
      marginTop: 14,
      fontSize: 19,
      fontWeight: '900',
      color:
        COLORS.textPrimary,
    },


    errorText: {
      marginTop: 7,
      color:
        COLORS.textSecondary,
      textAlign: 'center',
    },


    backButton: {
      marginTop: 18,
      backgroundColor:
        COLORS.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },


    backButtonText: {
      color:
        COLORS.white,
      fontWeight: '800',
    },


    // ====================================================
    // HEADER
    // ====================================================

    header: {
      height: 55,
      backgroundColor:
        COLORS.white,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 7,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },


    headerIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    searchBar: {
      flex: 1,
      height: 37,
      borderWidth: 1,
      borderColor:
        COLORS.primary,
      borderRadius: 7,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },


    searchText: {
      marginLeft: 7,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },


    // ====================================================
    // IMAGE
    // ====================================================

    imageSection: {
      height: 255,
      backgroundColor:
        COLORS.white,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    productImage: {
      width: '90%',
      height: '90%',
    },


    // ====================================================
    // VARIANT AREA
    // ====================================================

    variantSection: {
      backgroundColor:
        COLORS.white,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
      paddingVertical: 9,
    },


    variantHeader: {
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },


    variantTitle: {
      fontSize: 12,
      fontWeight: '900',
      color:
        COLORS.textPrimary,
    },


    selectedText: {
      marginLeft: 9,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },


    selectedStrong: {
      color:
        COLORS.primary,
      fontWeight: '900',
    },


    variantRow: {
      paddingHorizontal: 14,
      gap: 11,
    },


    // ====================================================
    // COLOURS
    // ====================================================

    colourWrapper: {
      minWidth: 49,
      alignItems: 'center',
    },


    colourBox: {
      width: 42,
      height: 42,
      borderRadius: 9,
      borderWidth: 1,
      borderColor:
        '#D1D5DB',
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent:
        'center',
      position: 'relative',
    },


    colourBoxSelected: {
      borderWidth: 2,
      borderColor:
        COLORS.primary,
      backgroundColor:
        '#F0FDF4',
    },


    colourDot: {
      width: 27,
      height: 27,
      borderRadius: 14,
    },


    lightColourBorder: {
      borderWidth: 1.5,
      borderColor:
        '#475569',
    },


    checkBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    colourLabel: {
      marginTop: 4,
      maxWidth: 62,
      fontSize: 8,
      color:
        COLORS.textSecondary,
      textAlign: 'center',
    },


    colourLabelSelected: {
      color:
        COLORS.primary,
      fontWeight: '900',
    },


    optionDisabled: {
      opacity: 0.35,
    },


    // ====================================================
    // SIZE / WEIGHT / PAGE OPTIONS
    // ====================================================

    normalVariant: {
      minWidth: 76,
      minHeight: 50,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 8,
      paddingHorizontal: 11,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
    },


    normalVariantSelected: {
      borderWidth: 2,
      borderColor:
        COLORS.primary,
      backgroundColor:
        '#ECFDF5',
    },


    normalVariantText: {
      fontSize: 11,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },


    normalVariantTextSelected: {
      color:
        COLORS.primary,
    },


    variantPrice: {
      marginTop: 3,
      fontSize: 9,
      fontWeight: '800',
      color:
        COLORS.primary,
    },


    // ====================================================
    // PRODUCT INFO
    // ====================================================

    infoSection: {
      marginTop: 7,
      backgroundColor:
        COLORS.white,
      padding: 15,
    },


    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },


    price: {
      fontSize: 24,
      fontWeight: '900',
      color:
        COLORS.primary,
    },


    oldPrice: {
      marginLeft: 10,
      fontSize: 12,
      color:
        COLORS.textSecondary,
      textDecorationLine:
        'line-through',
    },


    offerBadge: {
      marginLeft: 9,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor:
        '#FEF3C7',
    },


    offerBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color:
        '#92400E',
    },


    offerInfo: {
      marginTop: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },


    offerInfoText: {
      fontSize: 11,
      fontWeight: '800',
      color:
        COLORS.error,
    },


    productName: {
      marginTop: 8,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '800',
      color:
        COLORS.textPrimary,
    },


    category: {
      marginTop: 5,
      fontSize: 10,
      fontWeight: '700',
      color:
        COLORS.primary,
    },


    stockRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },


    stockText: {
      fontSize: 10,
      fontWeight: '700',
    },


    selectedOptionInline: {
      marginLeft: 3,
      fontSize: 10,
      fontWeight: '800',
      color:
        COLORS.textSecondary,
    },


    // ====================================================
    // QUANTITY
    // ====================================================

    quantitySection: {
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },


    sectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color:
        COLORS.textPrimary,
    },


    quantityContainer: {
      marginTop: 9,
      flexDirection: 'row',
      alignItems: 'center',
    },


    quantityButton: {
      width: 36,
      height: 36,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    quantityValue: {
      width: 48,
      alignItems: 'center',
    },


    quantityText: {
      fontSize: 15,
      fontWeight: '900',
      color:
        COLORS.textPrimary,
    },


    // ====================================================
    // DESCRIPTION
    // ====================================================

    descriptionSection: {
      marginTop: 20,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },


    description: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 19,
      color:
        COLORS.textSecondary,
    },


    // ====================================================
    // BOTTOM BAR
    // ====================================================

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 7,
      paddingHorizontal: 7,
      backgroundColor:
        COLORS.white,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      flexDirection: 'row',
      alignItems: 'center',
    },


    cartIconButton: {
      width: 53,
      height: 48,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    cartIconText: {
      fontSize: 8,
      marginTop: 1,
      color:
        COLORS.primary,
    },


    buyButton: {
      flex: 1,
      height: 48,
      marginLeft: 5,
      backgroundColor:
        COLORS.secondary,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    addButton: {
      flex: 1,
      height: 48,
      marginLeft: 6,
      backgroundColor:
        COLORS.primary,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent:
        'center',
    },


    disabledButton: {
      opacity: 0.45,
    },


    bottomButtonText: {
      color:
        COLORS.white,
      fontSize: 12,
      fontWeight: '900',
    },
  });