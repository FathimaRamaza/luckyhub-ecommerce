import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  COLORS,
} from '../constants/colors';

import {
  getActiveProducts,
  Product,
} from '../services/productService';

import {
  Category,
  getCategories,
} from '../services/categoryService';


import {
  calculateOfferPrice,
  getActiveOffers,
  getOfferPercentage,
  ProductOffer,
} from '../services/offerService';


const SCREEN_WIDTH =
  Dimensions.get('window').width;

const CATEGORY_WIDTH =
  (SCREEN_WIDTH - 32) / 3;


// ======================================================
// CATEGORY ICON
// ======================================================

function getCategoryIcon(
  slug: string
) {
  switch (slug) {

    case 'printing-services':
    case 'printing-photocopy':
      return 'print-outline';

    case 'pens-pencils-markers':
      return 'pencil-outline';

    case 'exercise-books-notebooks':
    case 'books-notebooks':
      return 'book-outline';

    case 'educational-books-model-papers':
      return 'library-outline';

    case 'paper-boards-envelopes':
    case 'paper-boards':
      return 'document-outline';

    case 'files-office-supplies':
      return 'folder-open-outline';

    case 'glue-tape-cutting-correction':
    case 'glue-cutting-correction':
      return 'cut-outline';

    case 'art-craft':
      return 'color-palette-outline';

    case 'school-accessories-geometry':
    case 'school-accessories':
      return 'school-outline';

    case 'bags-lunch-boxes-water-bottles':
      return 'bag-handle-outline';

    case 'toys-games':
      return 'game-controller-outline';

    case 'gifts-key-tags-party-items':
    case 'bags-gifts-novelty':
      return 'gift-outline';

    case 'other-shop-items':
      return 'storefront-outline';

    default:
      return 'grid-outline';
  }
}


// ======================================================
// REMOVE DUPLICATES
// ======================================================

function uniqueProducts(
  products: Product[]
) {
  const seen =
    new Set<string>();

  return products.filter(
    product => {

      if (
        seen.has(
          product.id
        )
      ) {
        return false;
      }

      seen.add(
        product.id
      );

      return true;
    }
  );
}


// ======================================================
// MIX PRODUCTS ACROSS CATEGORIES
//
// For demo purposes this prevents the homepage
// from showing many products from only one category.
// ======================================================

function diversifyProducts(
  products: Product[],
  limit: number
) {
  const groups =
    new Map<
      string,
      Product[]
    >();


  products.forEach(
    product => {

      const categoryKey =
        product.category_id ??
        'uncategorized';


      const current =
        groups.get(
          categoryKey
        ) ?? [];


      current.push(
        product
      );


      groups.set(
        categoryKey,
        current
      );
    }
  );


  const categoryGroups =
    Array.from(
      groups.values()
    ).map(
      group => [
        ...group,
      ]
    );


  const result:
    Product[] = [];


  let index = 0;


  while (
    result.length <
      limit &&
    categoryGroups.some(
      group =>
        group.length >
        index
    )
  ) {

    for (
      const group
      of categoryGroups
    ) {

      if (
        result.length >=
        limit
      ) {
        break;
      }


      if (
        group[index]
      ) {
        result.push(
          group[index]
        );
      }
    }


    index += 1;
  }


  return result;
}


// ======================================================
// BUILD HOME SECTION
// ======================================================

function buildSection(
  preferred: Product[],
  fallback: Product[],
  limit: number
) {
  const mixedFallback =
    diversifyProducts(
      fallback,
      Math.max(
        limit * 2,
        limit
      )
    );


  return uniqueProducts([
    ...preferred,
    ...mixedFallback,
  ]).slice(
    0,
    limit
  );
}



// ======================================================
// PRODUCT CATEGORY NAME
// ======================================================

function getProductCategoryName(
  product: Product
) {
  const category =
    product.categories;

  if (!category) {
    return '';
  }

  if (Array.isArray(category)) {
    return (
      category[0]?.name ??
      ''
    );
  }

  return (
    category.name ??
    ''
  );
}


// ======================================================
// HOME SCREEN
// ======================================================

export default function HomeScreen() {

  const router =
    useRouter();


  const [
    products,
    setProducts,
  ] =
    useState<Product[]>([]);


  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);


  // ====================================================
  // HOME CATEGORIES
  // Hide Atlas rule categories from the Home category strip.
  // They remain in Supabase and can still be used elsewhere.
  // ====================================================

  const homeCategories =
    useMemo(
      () =>
        categories.filter(
          category => {

            const name =
              category.name
                .trim()
                .toLowerCase();

            const slug =
              category.slug
                .trim()
                .toLowerCase();


            const atlasSlugs =
              new Set([
                'atlas-single-rule',
                'atlas-square-rule',
                'atlas-jaffna-rule',
              ]);


            if (
              atlasSlugs.has(
                slug
              )
            ) {
              return false;
            }


            if (
              name.startsWith(
                'atlas '
              )
            ) {
              return false;
            }


            return true;
          }
        ),
      [
        categories,
      ]
    );


  const [
    offers,
    setOffers,
  ] =
    useState<ProductOffer[]>([]);


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
    error,
    setError,
  ] =
    useState('');


  // ====================================================
  // LOAD HOME DATA
  // ====================================================

  const loadHomeData =
    async (
      isRefresh = false
    ) => {

      try {

        if (
          isRefresh
        ) {
          setRefreshing(
            true
          );

        } else {
          setLoading(
            true
          );
        }


        setError('');


        const [
          productData,
          categoryData,
          offerData,
        ] =
          await Promise.all([
            getActiveProducts(),
            getCategories(),
            getActiveOffers(),
          ]);


        setProducts(
          productData
        );


        setCategories(
          categoryData
        );


        setOffers(
          offerData
        );


      } catch (
        err
      ) {

        console.error(
          'Home data error:',
          err
        );


        setError(
          'Unable to load Lucky Hub products.'
        );


      } finally {

        setLoading(
          false
        );


        setRefreshing(
          false
        );
      }
    };


  useEffect(
    () => {

      loadHomeData();

    },
    []
  );


  // ====================================================
  // BASE DIVERSE PRODUCT LIST
  // ====================================================

  const diverseProducts =
    useMemo(
      () =>
        diversifyProducts(
          products,
          products.length
        ),
      [
        products,
      ]
    );


  // ====================================================
  // REAL FLASH DEALS - MAX 10
  // ====================================================

  const flashDeals =
    useMemo(
      () =>
        offers
          .filter(
            offer =>
              Boolean(
                offer.product
              )
          )
          .slice(
            0,
            10
          ),
      [
        offers,
      ]
    );


  // ====================================================
  // TRENDING - MAX 10
  // ====================================================

  const trendingProducts =
    useMemo(
      () => {

        const trending =
          products.filter(
            product =>
              product.is_trending
          );


        return buildSection(
          trending,
          [
            ...diverseProducts,
          ].reverse(),
          10
        );

      },
      [
        products,
        diverseProducts,
      ]
    );


  // ====================================================
  // RECOMMENDED - MAX 8
  // ====================================================

  const recommendedProducts =
    useMemo(
      () => {

        const featured =
          products.filter(
            product =>
              product.is_featured
          );


        return buildSection(
          featured,
          diverseProducts,
          8
        );

      },
      [
        products,
        diverseProducts,
      ]
    );


  // ====================================================
  // NEW ARRIVALS - MAX 10
  // ====================================================

  const newArrivalProducts =
    useMemo(
      () => {

        const newArrivals =
          products.filter(
            product =>
              product.is_new_arrival
          );


        return buildSection(
          newArrivals,
          [
            ...diverseProducts,
          ].reverse(),
          10
        );

      },
      [
        products,
        diverseProducts,
      ]
    );


  // ====================================================
  // ALL PRODUCTS DEMO - MAX 12
  // ====================================================

  const homeProducts =
    useMemo(
      () =>
        diversifyProducts(
          products,
          12
        ),
      [
        products,
      ]
    );


  // ====================================================
  // OPEN PRODUCT
  // ====================================================

  const openProduct =
    (
      product: Product
    ) => {

      router.push({
        pathname:
          '/product-details',

        params: {
          id:
            product.id,
        },
      });
    };


  // ====================================================
  // OPEN CATEGORY
  // ====================================================

  const openCategory =
    (
      category: Category
    ) => {

      router.push({
        pathname:
          '/(tabs)/categories',

        params: {
          categoryId:
            category.id,

          categoryName:
            category.name,
        },
      });
    };


  // ====================================================
  // SCREEN
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

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadHomeData(
                true
              )
            }
            colors={[
              COLORS.primary,
            ]}
          />
        }
      >

        {/* ================================================
            HEADER
        ================================================ */}

        <View
          style={
            styles.header
          }
        >

          <Image
            source={
              require(
                '../assets/logos/luckyhub-logo.png'
              )
            }
            style={
              styles.logo
            }
            resizeMode="contain"
          />


          <View
            style={
              styles.headerIcons
            }
          >

            {/* REAL WISHLIST */}

            <Pressable
              style={
                styles.iconButton
              }
              onPress={() =>
                router.push(
                  '/wishlist'
                )
              }
            >

              <Ionicons
                name="heart-outline"
                size={23}
                color={
                  COLORS.primary
                }
              />

            </Pressable>


            {/* NOTIFICATIONS - STEP 35 */}

            <Pressable
              style={
                styles.iconButton
              }
              onPress={() => {

                Alert.alert(
                  'Notifications',
                  'Notifications will be connected in Step 35.'
                );

              }}
            >

              <Ionicons
                name="notifications-outline"
                size={23}
                color={
                  COLORS.primary
                }
              />

            </Pressable>

          </View>

        </View>


        {/* ================================================
            SEARCH
        ================================================ */}

        <Pressable
          style={
            styles.searchBox
          }
          onPress={() =>
            router.push(
              '/search'
            )
          }
        >

          <Ionicons
            name="search-outline"
            size={21}
            color={
              COLORS.textSecondary
            }
          />


          <TextInput
            style={
              styles.searchInput
            }
            placeholder="Search stationery..."
            placeholderTextColor={
              COLORS.textSecondary
            }
            editable={
              false
            }
            pointerEvents="none"
          />


          <Ionicons
            name="camera-outline"
            size={22}
            color={
              COLORS.primary
            }
          />

        </Pressable>


        {/* ================================================
            SALE BANNER
        ================================================ */}

        <View
          style={
            styles.saleBanner
          }
        >

          <View
            style={
              styles.saleLeft
            }
          >

            <Text
              style={
                styles.bigSale
              }
            >
              BIG SALE
            </Text>


            <Text
              style={
                styles.upTo
              }
            >
              LUCKY HUB
            </Text>


            <Text
              style={
                styles.discount
              }
            >
              SPECIAL DEALS
            </Text>


            <Pressable
              style={
                styles.shopNowButton
              }
              onPress={() =>
                router.push(
                  '/search'
                )
              }
            >

              <Text
                style={
                  styles.shopNowText
                }
              >
                SHOP NOW
              </Text>

            </Pressable>

          </View>


          <View
            style={
              styles.saleRight
            }
          >

            <Ionicons
              name="bag-handle"
              size={82}
              color={
                COLORS.secondary
              }
            />

          </View>

        </View>


        {/* ================================================
            CATEGORIES
        ================================================ */}

        <SectionTitle
          title="Categories"
          subtitle={`${homeCategories.length} categories`}
          showSeeAll
          onSeeAll={() =>
            router.push(
              '/(tabs)/categories'
            )
          }
        />


        {loading ? (

          <View
            style={
              styles.categoryLoading
            }
          >

            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />

          </View>

        ) : (

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.categoriesHorizontal
            }
            decelerationRate="fast"
          >

            {homeCategories.map(
              category => (

                <Pressable
                  key={
                    category.id
                  }
                  style={
                    styles.categoryItem
                  }
                  onPress={() =>
                    openCategory(
                      category
                    )
                  }
                >

                  <View
                    style={
                      styles.categoryCircle
                    }
                  >

                    <Ionicons
                      name={
                        getCategoryIcon(
                          category.slug
                        ) as any
                      }
                      size={29}
                      color={
                        COLORS.primary
                      }
                    />

                  </View>


                  <Text
                    style={
                      styles.categoryName
                    }
                    numberOfLines={
                      2
                    }
                  >
                    {
                      category.name
                    }
                  </Text>

                </Pressable>

              )
            )}

          </ScrollView>

        )}


        {!loading &&
          homeCategories.length >
            3 && (

          <View
            style={
              styles.swipeHint
            }
          >

            <Ionicons
              name="chevron-back"
              size={13}
              color={
                COLORS.textSecondary
              }
            />


            <Text
              style={
                styles.swipeHintText
              }
            >
              Swipe to see more categories
            </Text>


            <Ionicons
              name="chevron-forward"
              size={13}
              color={
                COLORS.textSecondary
              }
            />

          </View>

        )}


        {/* ================================================
            LOADING
        ================================================ */}

        {loading && (

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
              Loading Lucky Hub products...
            </Text>

          </View>

        )}


        {/* ================================================
            ERROR
        ================================================ */}

        {!loading &&
          error ? (

          <View
            style={
              styles.errorBox
            }
          >

            <Ionicons
              name="alert-circle-outline"
              size={30}
              color={
                COLORS.error
              }
            />


            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>


            <Pressable
              style={
                styles.retryButton
              }
              onPress={() =>
                loadHomeData()
              }
            >

              <Text
                style={
                  styles.retryText
                }
              >
                Retry
              </Text>

            </Pressable>

          </View>

        ) : null}


        {/* ================================================
            PRODUCT SECTIONS
        ================================================ */}

        {!loading &&
          !error &&
          products.length >
            0 && (

          <>

            {/* REAL FLASH DEALS */}

            {flashDeals.length > 0 && (
              <>
                <SectionTitle
                  title="🔥 Flash Deals"
                  subtitle={`${flashDeals.length} active offer${flashDeals.length === 1 ? '' : 's'}`}
                  showSeeAll
                  onSeeAll={() =>
                    router.push(
                      '/search'
                    )
                  }
                />


                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.horizontalProducts
                  }
                >

                  {flashDeals.map(
                    offer => {
                      const product =
                        offer.product;

                      if (!product) {
                        return null;
                      }

                      return (
                        <ProductCard
                          key={
                            `flash-${offer.id}`
                          }
                          product={
                            product
                          }
                          offer={
                            offer
                          }
                          onPress={() =>
                            openProduct(
                              product
                            )
                          }
                          onCart={() =>
                            openProduct(
                              product
                            )
                          }
                        />
                      );
                    }
                  )}

                </ScrollView>
              </>
            )}


            {/* TRENDING */}

            <SectionTitle
              title="Trending Products"
              subtitle="Popular Lucky Hub products"
              showSeeAll
              onSeeAll={() =>
                router.push(
                  '/search'
                )
              }
            />


            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.horizontalProducts
              }
            >

              {trendingProducts.map(
                product => (

                  <ProductCard
                    key={
                      `trending-${product.id}`
                    }
                    product={
                      product
                    }
                    onPress={() =>
                      openProduct(
                        product
                      )
                    }
                    onCart={() =>
                      openProduct(
                        product
                      )
                    }
                  />

                )
              )}

            </ScrollView>


            {/* RECOMMENDED */}

            <SectionTitle
              title="Recommended For You"
              subtitle="Selected from different categories"
              showSeeAll
              onSeeAll={() =>
                router.push(
                  '/search'
                )
              }
            />


            <View
              style={
                styles.productGrid
              }
            >

              {recommendedProducts.map(
                product => (

                  <ProductCard
                    key={
                      `recommended-${product.id}`
                    }
                    product={
                      product
                    }
                    grid
                    onPress={() =>
                      openProduct(
                        product
                      )
                    }
                    onCart={() =>
                      openProduct(
                        product
                      )
                    }
                  />

                )
              )}

            </View>


            {/* NEW ARRIVALS */}

            <SectionTitle
              title="New Arrivals"
              subtitle="Explore more products"
              showSeeAll
              onSeeAll={() =>
                router.push(
                  '/search'
                )
              }
            />


            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.horizontalProducts
              }
            >

              {newArrivalProducts.map(
                product => (

                  <ProductCard
                    key={
                      `new-${product.id}`
                    }
                    product={
                      product
                    }
                    onPress={() =>
                      openProduct(
                        product
                      )
                    }
                    onCart={() =>
                      openProduct(
                        product
                      )
                    }
                  />

                )
              )}

            </ScrollView>


            {/* ============================================
                ALL PRODUCTS
            ============================================ */}

            <SectionTitle
              title="All Products"
              subtitle={`${products.length} active products available`}
              showSeeAll
              onSeeAll={() =>
                router.push(
                  '/search'
                )
              }
            />


            <View
              style={
                styles.productGrid
              }
            >

              {homeProducts.map(
                product => (

                  <ProductCard
                    key={
                      `all-${product.id}`
                    }
                    product={
                      product
                    }
                    grid
                    onPress={() =>
                      openProduct(
                        product
                      )
                    }
                    onCart={() =>
                      openProduct(
                        product
                      )
                    }
                  />

                )
              )}

            </View>


            {/* VIEW ALL */}

            {products.length >
              homeProducts.length && (

              <Pressable
                style={
                  styles.viewAllButton
                }
                onPress={() =>
                  router.push(
                    '/search'
                  )
                }
              >

                <Text
                  style={
                    styles.viewAllButtonText
                  }
                >
                  VIEW ALL PRODUCTS
                </Text>


                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={
                    COLORS.white
                  }
                />

              </Pressable>

            )}

          </>

        )}


        {/* ================================================
            NO PRODUCTS
        ================================================ */}

        {!loading &&
          !error &&
          products.length ===
            0 && (

          <View
            style={
              styles.emptyContainer
            }
          >

            <Ionicons
              name="cube-outline"
              size={55}
              color={
                COLORS.border
              }
            />


            <Text
              style={
                styles.emptyTitle
              }
            >
              No products available
            </Text>


            <Text
              style={
                styles.emptyText
              }
            >
              Active products will appear here.
            </Text>

          </View>

        )}

      </ScrollView>

    </SafeAreaView>
  );
}


// ======================================================
// SECTION TITLE
// ======================================================

function SectionTitle({
  title,
  subtitle,
  showSeeAll = false,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}) {

  return (

    <View
      style={
        styles.sectionHeader
      }
    >

      <View
        style={
          styles.sectionTitleBox
        }
      >

        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>


        {subtitle ? (

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            {subtitle}
          </Text>

        ) : null}

      </View>


      {showSeeAll && (

        <Pressable
          onPress={
            onSeeAll
          }
        >

          <Text
            style={
              styles.seeAll
            }
          >
            See All
          </Text>

        </Pressable>

      )}

    </View>
  );
}


// ======================================================
// PRODUCT CARD
// ======================================================

function ProductCard({
  product,
  offer = null,
  grid = false,
  onPress,
  onCart,
}: {
  product: Product;
  offer?: ProductOffer | null;
  grid?: boolean;
  onPress: () => void;
  onCart: () => void;
}) {

  const imageSource =
    product.image_url
      ? {
          uri:
            product.image_url,
        }
      : require(
          '../assets/placeholders/product-placeholder.png'
        );


  const offerPrice =
    offer
      ? calculateOfferPrice(
          product.base_price,
          offer
        )
      : product.base_price;


  const hasOffer =
    Boolean(
      offer
    ) &&
    offerPrice <
      product.base_price;


  const offerDiscountPercentage =
    hasOffer
      ? getOfferPercentage(
          product.base_price,
          offer
        )
      : 0;


  const hasOldPrice =
    !hasOffer &&
    product.compare_at_price !==
      null &&
    product.compare_at_price >
      product.base_price;


  const discountPercentage =
    hasOffer
      ? offerDiscountPercentage
      : hasOldPrice &&
        product.compare_at_price
        ? Math.round(
            (
              (
                product.compare_at_price -
                product.base_price
              ) /
              product.compare_at_price
            ) *
              100
          )
        : 0;


  return (

    <Pressable
      onPress={
        onPress
      }
      style={[
        styles.productCard,

        grid &&
          styles.productCardGrid,
      ]}
    >

      <View
        style={
          styles.productImageContainer
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


        {(hasOffer || hasOldPrice) && (

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
              -{discountPercentage}%
            </Text>

          </View>

        )}


        {product.stock_quantity <=
          0 && (

          <View
            style={
              styles.outOfStockBadge
            }
          >

            <Text
              style={
                styles.outOfStockText
              }
            >
              Out of Stock
            </Text>

          </View>

        )}

      </View>


      {getProductCategoryName(
        product
      ) ? (

        <Text
          style={
            styles.productCategory
          }
          numberOfLines={
            1
          }
        >
          {
            getProductCategoryName(
              product
            )
          }
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
        {product.name}
      </Text>


      {product.brand ? (

        <Text
          style={
            styles.brandText
          }
          numberOfLines={
            1
          }
        >
          {product.brand}
        </Text>

      ) : null}


      {hasOffer && offer ? (
        <Text
          style={
            styles.offerTitle
          }
          numberOfLines={
            1
          }
        >
          {offer.title}
        </Text>
      ) : null}


      <Text
        style={
          styles.productPrice
        }
      >
        Rs.{' '}
        {offerPrice.toLocaleString()}
      </Text>


      {hasOffer ? (

        <Text
          style={
            styles.oldPrice
          }
        >
          Rs.{' '}
          {product.base_price.toLocaleString()}
        </Text>

      ) : hasOldPrice ? (

        <Text
          style={
            styles.oldPrice
          }
        >
          Rs.{' '}
          {product.compare_at_price?.toLocaleString()}
        </Text>

      ) : (

        <Text
          style={
            styles.stockSmallText
          }
        >
          Stock:{' '}
          {
            product.stock_quantity
          }
        </Text>

      )}


      {/* OPEN DETAILS TO ADD PROPERLY */}

      <Pressable
        style={[
          styles.addButton,

          product.stock_quantity <=
            0 &&
            styles.addButtonDisabled,
        ]}
        disabled={
          product.stock_quantity <=
          0
        }
        onPress={
          onCart
        }
      >

        <Ionicons
          name="cart-outline"
          size={18}
          color={
            COLORS.white
          }
        />

      </Pressable>

    </Pressable>
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


    scrollContent: {
      paddingBottom: 45,
    },


    // ====================================================
    // HEADER
    // ====================================================

    header: {
      backgroundColor:
        COLORS.white,

      paddingHorizontal: 16,

      paddingTop: 5,

      paddingBottom: 8,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    logo: {
      width: 145,

      height: 50,
    },


    headerIcons: {
      flexDirection:
        'row',

      gap: 8,
    },


    iconButton: {
      width: 40,

      height: 40,

      borderRadius: 20,

      backgroundColor:
        COLORS.backgroundSoft,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    // ====================================================
    // SEARCH
    // ====================================================

    searchBox: {
      height: 50,

      marginHorizontal: 16,

      marginTop: 10,

      marginBottom: 15,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 12,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal: 14,
    },


    searchInput: {
      flex: 1,

      marginHorizontal: 10,

      fontSize: 15,

      color:
        COLORS.textPrimary,
    },


    // ====================================================
    // SALE
    // ====================================================

    saleBanner: {
      marginHorizontal: 16,

      backgroundColor:
        COLORS.primary,

      borderRadius: 18,

      minHeight: 175,

      padding: 20,

      flexDirection:
        'row',

      overflow:
        'hidden',
    },


    saleLeft: {
      flex: 1,

      justifyContent:
        'center',
    },


    saleRight: {
      width: 105,

      justifyContent:
        'center',

      alignItems:
        'center',
    },


    bigSale: {
      color:
        COLORS.white,

      fontSize: 27,

      fontWeight:
        '900',
    },


    upTo: {
      color:
        COLORS.white,

      fontSize: 12,

      fontWeight:
        '700',

      marginTop: 3,
    },


    discount: {
      color:
        COLORS.secondary,

      fontSize: 22,

      fontWeight:
        '900',

      marginTop: 2,
    },


    shopNowButton: {
      marginTop: 12,

      backgroundColor:
        COLORS.secondary,

      paddingVertical: 8,

      paddingHorizontal: 15,

      borderRadius: 8,

      alignSelf:
        'flex-start',
    },


    shopNowText: {
      fontSize: 12,

      fontWeight:
        '800',

      color:
        COLORS.textPrimary,
    },


    // ====================================================
    // SECTION HEADER
    // ====================================================

    sectionHeader: {
      marginTop: 24,

      marginBottom: 12,

      paddingHorizontal: 16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    sectionTitleBox: {
      flex: 1,

      paddingRight: 10,
    },


    sectionTitle: {
      fontSize: 18,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,
    },


    sectionSubtitle: {
      marginTop: 3,

      fontSize: 10,

      color:
        COLORS.textSecondary,
    },


    seeAll: {
      fontSize: 13,

      fontWeight:
        '800',

      color:
        COLORS.primary,
    },


    // ====================================================
    // CATEGORIES
    // ====================================================

    categoryLoading: {
      height: 110,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    categoriesHorizontal: {
      paddingHorizontal: 16,

      paddingBottom: 5,
    },


    categoryItem: {
      width:
        CATEGORY_WIDTH,

      alignItems:
        'center',

      paddingHorizontal: 4,
    },


    categoryCircle: {
      width: 66,

      height: 66,

      borderRadius: 21,

      backgroundColor:
        '#E8F5F0',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 8,
    },


    categoryName: {
      fontSize: 12,

      lineHeight: 16,

      fontWeight:
        '700',

      textAlign:
        'center',

      color:
        COLORS.textPrimary,

      minHeight: 34,
    },


    swipeHint: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop: 7,

      gap: 2,
    },


    swipeHintText: {
      fontSize: 10,

      color:
        COLORS.textSecondary,
    },


    // ====================================================
    // PRODUCTS
    // ====================================================

    horizontalProducts: {
      paddingLeft: 16,

      paddingRight: 4,

      paddingBottom: 5,
    },


    productGrid: {
      paddingHorizontal: 10,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',
    },


    productCard: {
      width: 165,

      backgroundColor:
        COLORS.white,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 9,

      marginRight: 12,

      position:
        'relative',
    },


    productCardGrid: {
      width: '48%',

      marginRight: 0,

      marginBottom: 12,
    },


    productImageContainer: {
      width: '100%',

      height: 125,

      borderRadius: 10,

      overflow:
        'hidden',

      backgroundColor:
        COLORS.backgroundSoft,

      marginBottom: 9,

      position:
        'relative',
    },


    productImage: {
      width: '100%',

      height: '100%',
    },


    discountBadge: {
      position:
        'absolute',

      left: 7,

      top: 7,

      backgroundColor:
        COLORS.secondary,

      borderRadius: 6,

      paddingHorizontal: 6,

      paddingVertical: 3,
    },


    discountBadgeText: {
      fontSize: 9,

      fontWeight:
        '900',

      color:
        COLORS.textPrimary,
    },


    outOfStockBadge: {
      position:
        'absolute',

      left: 7,

      bottom: 7,

      backgroundColor:
        COLORS.error,

      paddingHorizontal: 6,

      paddingVertical: 3,

      borderRadius: 5,
    },


    outOfStockText: {
      color:
        COLORS.white,

      fontSize: 9,

      fontWeight:
        '700',
    },


    productCategory: {
      marginBottom: 3,

      fontSize: 9,

      fontWeight:
        '800',

      color:
        COLORS.primary,
    },


    productName: {
      fontSize: 13,

      lineHeight: 18,

      fontWeight:
        '700',

      color:
        COLORS.textPrimary,

      minHeight: 38,

      paddingRight: 25,
    },


    brandText: {
      fontSize: 10,

      color:
        COLORS.textSecondary,

      marginTop: 2,
    },


    offerTitle: {
      marginTop: 3,

      fontSize: 9,

      fontWeight:
        '800',

      color:
        COLORS.error,
    },


    productPrice: {
      marginTop: 5,

      fontSize: 15,

      fontWeight:
        '900',

      color:
        COLORS.primary,
    },


    oldPrice: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.textSecondary,

      textDecorationLine:
        'line-through',
    },


    stockSmallText: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.textSecondary,
    },


    addButton: {
      position:
        'absolute',

      right: 9,

      bottom: 9,

      width: 32,

      height: 32,

      borderRadius: 16,

      backgroundColor:
        COLORS.primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    addButtonDisabled: {
      backgroundColor:
        COLORS.textSecondary,
    },


    // ====================================================
    // VIEW ALL
    // ====================================================

    viewAllButton: {
      height: 50,

      marginHorizontal: 16,

      marginTop: 6,

      borderRadius: 12,

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


    viewAllButtonText: {
      color:
        COLORS.white,

      fontSize: 12,

      fontWeight:
        '900',
    },


    // ====================================================
    // LOADING
    // ====================================================

    loadingContainer: {
      paddingVertical: 50,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    loadingText: {
      marginTop: 10,

      fontSize: 13,

      color:
        COLORS.textSecondary,
    },


    // ====================================================
    // ERROR
    // ====================================================

    errorBox: {
      marginHorizontal: 16,

      marginTop: 20,

      padding: 20,

      backgroundColor:
        COLORS.white,

      borderRadius: 12,

      alignItems:
        'center',
    },


    errorText: {
      marginTop: 8,

      color:
        COLORS.error,

      textAlign:
        'center',
    },


    retryButton: {
      marginTop: 12,

      backgroundColor:
        COLORS.primary,

      paddingHorizontal: 20,

      paddingVertical: 9,

      borderRadius: 8,
    },


    retryText: {
      color:
        COLORS.white,

      fontWeight:
        '700',
    },


    // ====================================================
    // EMPTY
    // ====================================================

    emptyContainer: {
      paddingVertical: 60,

      alignItems:
        'center',
    },


    emptyTitle: {
      marginTop: 12,

      fontSize: 17,

      fontWeight:
        '700',

      color:
        COLORS.textPrimary,
    },


    emptyText: {
      marginTop: 5,

      fontSize: 13,

      color:
        COLORS.textSecondary,
    },

  });