import { Ionicons } from '@expo/vector-icons';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
  Category,
  getCategories,
} from '../services/categoryService';

import {
  getProductsByCategory,
  Product,
} from '../services/productService';


// ======================================================
// HIDE ATLAS RULE CATEGORIES
// ======================================================

function isAtlasRuleCategory(
  category: Category
) {
  const name =
    String(
      category.name ?? ''
    )
      .trim()
      .toLowerCase();

  const slug =
    String(
      category.slug ?? ''
    )
      .trim()
      .toLowerCase();

  const hiddenSlugs = [
    'atlas-single-rule',
    'atlas-square-rule',
    'atlas-jaffna-rule',
  ];

  if (
    hiddenSlugs.includes(
      slug
    )
  ) {
    return true;
  }

  if (
    name.startsWith(
      'atlas '
    )
  ) {
    return true;
  }

  return false;
}


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
// SCREEN
// ======================================================

export default function CategoriesScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      categoryId?: string;
      categoryName?: string;
    }>();

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(
      null
    );

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');


  // ======================================================
  // LOAD PRODUCTS
  // ======================================================

  const loadProducts =
    async (
      category: Category
    ) => {
      try {
        setLoadingProducts(
          true
        );

        setError('');

        const data =
          await getProductsByCategory(
            category.id
          );

        setProducts(
          data
        );

      } catch (err) {
        console.error(
          err
        );

        setError(
          'Unable to load products.'
        );

      } finally {
        setLoadingProducts(
          false
        );
      }
    };


  // ======================================================
  // LOAD CATEGORIES
  // ======================================================

  const loadCategories =
    async () => {
      try {
        setError('');

        const data =
          await getCategories();

        const visibleCategories =
          data.filter(
            category =>
              !isAtlasRuleCategory(
                category
              )
          );

        setCategories(
          visibleCategories
        );

        if (
          params.categoryId
        ) {
          const found =
            visibleCategories.find(
              category =>
                category.id ===
                params.categoryId
            );

          if (
            found
          ) {
            setSelectedCategory(
              found
            );

            await loadProducts(
              found
            );

            return;
          }

          setSelectedCategory(
            null
          );

          setProducts(
            []
          );
        }

      } catch (err) {
        console.error(
          err
        );

        setError(
          'Unable to load categories.'
        );

      } finally {
        setLoadingCategories(
          false
        );

        setRefreshing(
          false
        );
      }
    };


  useEffect(() => {
    loadCategories();
  }, [
    params.categoryId,
  ]);


  // ======================================================
  // SELECT CATEGORY
  // ======================================================

  const selectCategory =
    async (
      category: Category
    ) => {
      setSelectedCategory(
        category
      );

      await loadProducts(
        category
      );
    };


  // ======================================================
  // BACK TO CATEGORIES
  // ======================================================

  const showAllCategories =
    () => {
      setSelectedCategory(
        null
      );

      setProducts(
        []
      );
    };


  // ======================================================
  // REFRESH
  // ======================================================

  const handleRefresh =
    async () => {
      setRefreshing(
        true
      );

      if (
        selectedCategory
      ) {
        await loadProducts(
          selectedCategory
        );

        setRefreshing(
          false
        );

        return;
      }

      await loadCategories();
    };


  // ======================================================
  // OPEN PRODUCT
  // ======================================================

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


  // ======================================================
  // INITIAL LOADING
  // ======================================================

  if (
    loadingCategories
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
            Loading categories...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


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
      ]}
    >

      {/* HEADER */}

      <View
        style={
          styles.header
        }
      >

        {selectedCategory ? (
          <Pressable
            style={
              styles.headerButton
            }
            onPress={
              showAllCategories
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
        ) : (
          <View
            style={
              styles.headerButton
            }
          />
        )}

        <Text
          style={
            styles.headerTitle
          }
          numberOfLines={1}
        >
          {selectedCategory
            ? selectedCategory.name
            : 'Categories'}
        </Text>

        <Pressable
          style={
            styles.headerButton
          }
          onPress={() =>
            router.push(
              '/search'
            )
          }
        >
          <Ionicons
            name="search-outline"
            size={23}
            color={
              COLORS.textPrimary
            }
          />
        </Pressable>

      </View>


      {/* CATEGORY LIST */}

      {!selectedCategory && (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.content
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              colors={[
                COLORS.primary,
              ]}
            />
          }
        >

          <Text
            style={
              styles.pageTitle
            }
          >
            Shop by Category
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Find everything you need from Lucky Hub.
          </Text>

          {error ? (
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          ) : null}

          <View
            style={
              styles.categoryGrid
            }
          >
            {categories.map(
              category => (
                <Pressable
                  key={
                    category.id
                  }
                  style={
                    styles.categoryCard
                  }
                  onPress={() =>
                    selectCategory(
                      category
                    )
                  }
                >
                  <View
                    style={
                      styles.categoryIcon
                    }
                  >
                    <Ionicons
                      name={
                        getCategoryIcon(
                          category.slug
                        ) as any
                      }
                      size={32}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.categoryName
                    }
                    numberOfLines={2}
                  >
                    {category.name}
                  </Text>

                  <View
                    style={
                      styles.openRow
                    }
                  >
                    <Text
                      style={
                        styles.openText
                      }
                    >
                      View Products
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>
                </Pressable>
              )
            )}
          </View>

        </ScrollView>
      )}


      {/* CATEGORY PRODUCTS */}

      {selectedCategory && (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.productContent
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              colors={[
                COLORS.primary,
              ]}
            />
          }
        >

          <View
            style={
              styles.categoryInfo
            }
          >
            <View
              style={
                styles.categoryLargeIcon
              }
            >
              <Ionicons
                name={
                  getCategoryIcon(
                    selectedCategory.slug
                  ) as any
                }
                size={31}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.categoryInfoText
              }
            >
              <Text
                style={
                  styles.selectedTitle
                }
              >
                {
                  selectedCategory.name
                }
              </Text>

              <Text
                style={
                  styles.productCount
                }
              >
                {products.length}{' '}
                {products.length ===
                1
                  ? 'product'
                  : 'products'}
              </Text>
            </View>
          </View>


          {loadingProducts ? (
            <View
              style={
                styles.productLoading
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
                Loading products...
              </Text>
            </View>
          ) : error ? (
            <View
              style={
                styles.emptyBox
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={45}
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
            </View>
          ) : products.length ===
            0 ? (
            <View
              style={
                styles.emptyBox
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
                No active products
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                Products from this category will appear when they are activated.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.productGrid
              }
            >
              {products.map(
                product => (
                  <ProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    onPress={() =>
                      openProduct(
                        product
                      )
                    }
                  />
                )
              )}
            </View>
          )}

        </ScrollView>
      )}

    </SafeAreaView>
  );
}


// ======================================================
// PRODUCT CARD
// ======================================================

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
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

  return (
    <Pressable
      style={
        styles.productCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.productImageBox
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
      </View>

      {product.brand ? (
        <Text
          style={
            styles.brand
          }
          numberOfLines={1}
        >
          {product.brand}
        </Text>
      ) : null}

      <Text
        style={
          styles.productName
        }
        numberOfLines={2}
      >
        {product.name}
      </Text>

      {product.sku ? (
        <Text
          style={
            styles.sku
          }
        >
          SKU: {product.sku}
        </Text>
      ) : null}

      <Text
        style={
          styles.price
        }
      >
        Rs.{' '}
        {product.base_price.toLocaleString()}
      </Text>

      <Text
        style={
          styles.stock
        }
      >
        {product.stock_quantity}{' '}
        in stock
      </Text>
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

    center: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 10,
      color:
        COLORS.textSecondary,
      fontSize: 13,
    },

    header: {
      height: 58,
      paddingHorizontal: 12,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.white,
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
      fontSize: 18,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    content: {
      padding: 16,
      paddingBottom: 40,
    },

    pageTitle: {
      fontSize: 24,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    pageSubtitle: {
      marginTop: 5,
      marginBottom: 20,
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textSecondary,
    },

    categoryGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      justifyContent:
        'space-between',
    },

    categoryCard: {
      width:
        '48%',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      padding: 14,
      marginBottom: 13,
    },

    categoryIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 12,
    },

    categoryName: {
      minHeight: 40,
      fontSize: 14,
      lineHeight: 20,
      fontWeight:
        '700',
      color:
        COLORS.textPrimary,
    },

    openRow: {
      marginTop: 9,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    openText: {
      fontSize: 11,
      fontWeight:
        '700',
      color:
        COLORS.primary,
    },

    productContent: {
      padding: 12,
      paddingBottom: 40,
    },

    categoryInfo: {
      marginBottom: 15,
      padding: 14,
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    categoryLargeIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    categoryInfoText: {
      flex: 1,
      marginLeft: 13,
    },

    selectedTitle: {
      fontSize: 17,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    productCount: {
      marginTop: 4,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    productLoading: {
      paddingVertical: 70,
      alignItems:
        'center',
    },

    productGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      justifyContent:
        'space-between',
    },

    productCard: {
      width:
        '48.5%',
      marginBottom: 13,
      padding: 9,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.white,
    },

    productImageBox: {
      height: 135,
      marginBottom: 9,
      borderRadius: 10,
      overflow:
        'hidden',
      backgroundColor:
        COLORS.backgroundSoft,
    },

    productImage: {
      width:
        '100%',
      height:
        '100%',
    },

    brand: {
      fontSize: 10,
      fontWeight:
        '700',
      color:
        COLORS.primary,
      marginBottom: 3,
    },

    productName: {
      minHeight: 38,
      fontSize: 14,
      lineHeight: 19,
      fontWeight:
        '700',
      color:
        COLORS.textPrimary,
    },

    sku: {
      marginTop: 5,
      fontSize: 9,
      color:
        COLORS.textSecondary,
    },

    price: {
      marginTop: 7,
      fontSize: 16,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    stock: {
      marginTop: 3,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },

    emptyBox: {
      paddingTop: 80,
      paddingHorizontal: 30,
      alignItems:
        'center',
    },

    emptyTitle: {
      marginTop: 12,
      fontSize: 18,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    emptySubtitle: {
      marginTop: 6,
      textAlign:
        'center',
      lineHeight: 19,
      color:
        COLORS.textSecondary,
    },

    errorText: {
      marginTop: 10,
      color:
        COLORS.error,
      textAlign:
        'center',
    },

  });
