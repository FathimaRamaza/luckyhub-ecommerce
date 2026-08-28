import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '../constants/colors';
import {
  getActiveProducts,
  Product,
} from '../services/productService';

export default function SearchScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');


  // ======================================================
  // LOAD PRODUCTS FROM SUPABASE
  // ======================================================

  const loadProducts = async () => {
    try {
      setError('');

      const data = await getActiveProducts();

      setProducts(data);
    } catch (err) {
      console.error(err);

      setError(
        'Unable to load products. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadProducts();
  }, []);


  // ======================================================
  // REFRESH
  // ======================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };


  // ======================================================
  // SEARCH
  // Search name, SKU, brand and category
  // ======================================================

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() ?? '';
      const sku = product.sku?.toLowerCase() ?? '';
      const brand = product.brand?.toLowerCase() ?? '';
      const category =
        product.categories?.name?.toLowerCase() ?? '';

      return (
        name.includes(query) ||
        sku.includes(query) ||
        brand.includes(query) ||
        category.includes(query)
      );
    });
  }, [products, searchText]);


  // ======================================================
  // OPEN PRODUCT
  // ======================================================

  const openProduct = (product: Product) => {
    router.push({
      pathname: '/product-details',
      params: {
        id: product.id,
      },
    });
  };


  // ======================================================
  // PRODUCT CARD
  // ======================================================

  const renderProduct = ({ item }: { item: Product }) => {
    const imageSource = item.image_url
      ? { uri: item.image_url }
      : require('../assets/placeholders/product-placeholder.png');

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => openProduct(item)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.productImage}
            resizeMode="contain"
          />

          {item.stock_quantity <= 0 && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>
                Out of Stock
              </Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          {item.brand ? (
            <Text style={styles.brand} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}

          <Text
            style={styles.productName}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {item.sku ? (
            <Text style={styles.sku}>
              SKU: {item.sku}
            </Text>
          ) : null}

          <View style={styles.bottomRow}>
            <Text style={styles.price}>
              Rs. {item.base_price.toLocaleString()}
            </Text>

            <View style={styles.stockBox}>
              <Text style={styles.stockText}>
                {item.stock_quantity} left
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading Lucky Hub products...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ======================================================
  // SCREEN
  // ======================================================

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Search Products
        </Text>

        <View style={styles.headerSpacer} />
      </View>


      {/* SEARCH BAR */}

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={21}
            color={COLORS.textSecondary}
          />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search product, SKU or brand..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons
                name="close-circle"
                size={21}
                color={COLORS.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>


      {/* RESULT INFO */}

      <View style={styles.resultHeader}>
        <Text style={styles.resultText}>
          {filteredProducts.length}{' '}
          {filteredProducts.length === 1
            ? 'product'
            : 'products'}
        </Text>
      </View>


      {/* ERROR */}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={COLORS.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable onPress={loadProducts}>
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}


      {/* PRODUCTS */}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={60}
              color={COLORS.border}
            />

            <Text style={styles.emptyTitle}>
              No products found
            </Text>

            <Text style={styles.emptySubtitle}>
              Try searching with another product name,
              SKU or brand.
            </Text>
          </View>
        }
      />

    </SafeAreaView>
  );
}


// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },


  // HEADER

  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  headerSpacer: {
    width: 40,
  },


  // SEARCH

  searchWrapper: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },

  searchBox: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSoft,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 15,
    color: COLORS.textPrimary,
  },


  // RESULTS

  resultHeader: {
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },


  // PRODUCTS

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  productCard: {
    width: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  imageContainer: {
    height: 150,
    backgroundColor: COLORS.white,
    position: 'relative',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  outOfStockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.error,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },

  outOfStockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },

  productInfo: {
    padding: 11,
  },

  brand: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 3,
  },

  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 19,
    minHeight: 38,
  },

  sku: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  bottomRow: {
    marginTop: 9,
  },

  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },

  stockBox: {
    marginTop: 5,
  },

  stockText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },


  // ERROR

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },

  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 13,
    marginVertical: 7,
  },

  retryText: {
    color: COLORS.primary,
    fontWeight: '700',
  },


  // EMPTY

  emptyContainer: {
    paddingTop: 90,
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  emptySubtitle: {
    marginTop: 7,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

});