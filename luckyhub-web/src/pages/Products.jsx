import { validateProductForm, updateSingleRow, deleteSingleRow, readAllRows } from '../services/adminData.js'
import {
  AlertTriangle,
  Box,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  Grid2X2,
  ImagePlus,
  List,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { supabase } from '../services/supabase.js'
import './Products.css'

const PAGE_SIZE = 6
const TIME_ZONE = 'Asia/Colombo'
const PRODUCT_IMAGE_BUCKET = 'product-images'
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_PRODUCT_IMAGES = 5

const FALLBACK_PRODUCT = {
  name: '',
  sku: '',
  description: '',
  base_price: 0,
  compare_at_price: null,
  stock_quantity: 0,
  alert_quantity: 5,
  category_id: null,
  image_url: null,
  is_active: true,
  slug: '',
}

function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState('list')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [saving, setSaving] = useState(false)

  const [galleryImages, setGalleryImages] = useState([])
  const [removedGalleryImages, setRemovedGalleryImages] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    price: 0,
    comparePrice: '',
    stock: 0,
    threshold: 5,
    imageUrl: '',
    active: true,
  })

  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockProduct, setStockProduct] = useState(null)
  const [stockValue, setStockValue] = useState('')

  const [menuProduct, setMenuProduct] = useState(null)

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  })

  /* =========================================
     BASIC HELPERS
  ========================================= */

  const getValue = (
    object,
    keys,
    fallback = null
  ) => {
    if (!object) {
      return fallback
    }

    for (const key of keys) {
      const value = object[key]

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        return value
      }
    }

    return fallback
  }

  const getExistingKey = (
    object,
    keys
  ) => {
    if (!object) {
      return null
    }

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(
          object,
          key
        )
      ) {
        return key
      }
    }

    return null
  }

  const toNumber = (value) => {
    const number = Number(value)

    return Number.isFinite(number)
      ? number
      : 0
  }

  const createSlug = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /* =========================================
     LOAD DATA
  ========================================= */

  const loadData = async (
    showRefresh = false
  ) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const [
        productResult,
        categoryResult,
      ] = await Promise.all([
        readAllRows(supabase, 'products'),

        readAllRows(supabase, 'categories'),
      ])

      if (productResult.error) {
        throw productResult.error
      }

      setProducts(
        productResult.data || []
      )

      if (!categoryResult.error) {
        setCategories(
          categoryResult.data || []
        )
      }
    } catch (loadError) {
      console.error(
        'Products load error:',
        loadError
      )

      setError(
        loadError?.message ||
        'Products could not be loaded.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  /* =========================================
     MORE MENU
  ========================================= */

  useEffect(() => {
    const closeMenu = () => {
      setMenuProduct(null)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuProduct(null)
      }
    }

    document.addEventListener(
      'click',
      closeMenu
    )

    document.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      document.removeEventListener(
        'click',
        closeMenu
      )

      document.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [])

  const openMoreMenu = (
    event,
    product
  ) => {
    event.stopPropagation()

    const rect =
      event.currentTarget.getBoundingClientRect()

    const menuWidth = 200

    let left =
      rect.right -
      menuWidth

    if (left < 10) {
      left = 10
    }

    setMenuPosition({
      top: rect.bottom + 6,
      left,
    })

    setMenuProduct(product)
  }

  /* =========================================
     CATEGORY MAP
  ========================================= */

  const categoryMap = useMemo(() => {
    const map = new Map()

    categories.forEach((category) => {
      const id = getValue(
        category,
        [
          'id',
          'category_id',
        ],
        null
      )

      const name = getValue(
        category,
        [
          'name',
          'category_name',
          'title',
        ],
        'Uncategorized'
      )

      if (id !== null) {
        map.set(
          String(id),
          String(name)
        )
      }
    })

    return map
  }, [categories])

  /* =========================================
     PRODUCT HELPERS
  ========================================= */

  const getProductId = (
    product
  ) => {
    return getValue(
      product,
      [
        'id',
        'product_id',
      ],
      ''
    )
  }

  const getProductName = (
    product
  ) => {
    return getValue(
      product,
      [
        'name',
        'product_name',
        'title',
      ],
      'Unnamed Product'
    )
  }

  const getDescription = (
    product
  ) => {
    return getValue(
      product,
      [
        'description',
        'short_description',
        'subtitle',
      ],
      ''
    )
  }

  const getSku = (
    product
  ) => {
    return getValue(
      product,
      [
        'sku',
        'product_code',
        'code',
      ],
      '—'
    )
  }

  const getPrice = (
    product
  ) => {
    return toNumber(
      getValue(
        product,
        [
          'base_price',
          'price',
          'selling_price',
          'unit_price',
          'sale_price',
        ],
        0
      )
    )
  }

  const getCompareAtPrice = (
    product
  ) => {
    const value = getValue(
      product,
      [
        'compare_at_price',
      ],
      null
    )

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null
    }

    const number = Number(value)

    return Number.isFinite(number)
      ? number
      : null
  }

  const getDiscountPercent = (
    product
  ) => {
    const sellingPrice =
      getPrice(product)

    const originalPrice =
      getCompareAtPrice(product)

    if (
      originalPrice === null ||
      originalPrice <= sellingPrice ||
      originalPrice <= 0
    ) {
      return 0
    }

    return Math.round(
      (
        (originalPrice - sellingPrice) /
        originalPrice
      ) *
        100
    )
  }

  const getStock = (
    product
  ) => {
    return toNumber(
      getValue(
        product,
        [
          'stock_quantity',
          'stock',
          'quantity',
          'qty',
          'available_stock',
        ],
        0
      )
    )
  }

  const getThreshold = (
    product
  ) => {
    return toNumber(
      getValue(
        product,
        [
          'alert_quantity',
          'low_stock_threshold',
          'reorder_level',
          'minimum_stock',
          'min_stock',
        ],
        5
      )
    )
  }

  const getCategoryId = (
    product
  ) => {
    return getValue(
      product,
      [
        'category_id',
        'categoryId',
      ],
      ''
    )
  }

  const getCategoryName = (
    product
  ) => {
    const categoryId =
      getCategoryId(product)

    if (categoryId) {
      return (
        categoryMap.get(
          String(categoryId)
        ) ||
        'Uncategorized'
      )
    }

    const direct =
      getValue(
        product,
        [
          'category_name',
          'category',
        ],
        null
      )

    if (
      typeof direct === 'string' &&
      direct.trim()
    ) {
      return direct
    }

    return 'Uncategorized'
  }

  const getImage = (
    product
  ) => {
    const image =
      getValue(
        product,
        [
          'image_url',
          'image',
          'thumbnail_url',
          'thumbnail',
          'product_image',
          'photo_url',
        ],
        null
      )

    if (image) {
      return image
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      const first =
        product.images[0]

      if (
        typeof first === 'string'
      ) {
        return first
      }

      return (
        first?.url ||
        first?.image_url ||
        null
      )
    }

    return null
  }

  const getActiveState = (
    product
  ) => {
    const key =
      getExistingKey(
        product,
        [
          'is_active',
          'active',
        ]
      )

    if (!key) {
      return true
    }

    return Boolean(
      product[key]
    )
  }

  const getStockStatus = (
    product
  ) => {
    const stock =
      getStock(product)

    const threshold =
      getThreshold(product)

    if (stock <= 0) {
      return {
        key: 'out',
        label: 'Out of Stock',
      }
    }

    if (stock <= threshold) {
      return {
        key: 'low',
        label: 'Low Stock',
      }
    }

    return {
      key: 'in',
      label: 'In Stock',
    }
  }

  const getCategoryTone = (
    product
  ) => {
    const tones = [
      'purple',
      'blue',
      'green',
      'orange',
      'pink',
    ]

    const name =
      getCategoryName(product)

    const total =
      [...name].reduce(
        (
          sum,
          character
        ) =>
          sum +
          character.charCodeAt(0),
        0
      )

    return tones[
      total % tones.length
    ]
  }

  /* =========================================
     PRODUCT IMAGE GALLERY + STORAGE
  ========================================= */

  const makeGalleryKey = () => {
    if (
      globalThis.crypto
        ?.randomUUID
    ) {
      return globalThis.crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
  }

  const getGalleryImageSrc = (
    image
  ) => {
    return (
      image?.previewUrl ||
      image?.imageUrl ||
      ''
    )
  }

  const revokeLocalGalleryPreviews = (
    images = galleryImages
  ) => {
    images.forEach((image) => {
      if (
        image?.previewUrl &&
        String(
          image.previewUrl
        ).startsWith('blob:')
      ) {
        URL.revokeObjectURL(
          image.previewUrl
        )
      }
    })
  }

  const uploadProductImage = async (
    file,
    productName
  ) => {
    const originalExtension =
      String(file.name || '')
        .split('.')
        .pop()
        ?.toLowerCase()

    const extension =
      originalExtension &&
      /^[a-z0-9]+$/.test(
        originalExtension
      )
        ? originalExtension
        : 'jpg'

    const productFolder =
      createSlug(productName) ||
      'product'

    const uniqueId =
      globalThis.crypto
        ?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`

    const storagePath =
      `${productFolder}/${uniqueId}.${extension}`

    const {
      error: uploadError,
    } = await supabase.storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .upload(
        storagePath,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType:
            file.type ||
            undefined,
        }
      )

    if (uploadError) {
      throw uploadError
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .getPublicUrl(
        storagePath
      )

    const publicUrl =
      publicUrlData?.publicUrl

    if (!publicUrl) {
      await supabase.storage
        .from(
          PRODUCT_IMAGE_BUCKET
        )
        .remove([
          storagePath,
        ])

      throw new Error(
        'Product image public URL could not be generated.'
      )
    }

    return {
      publicUrl,
      storagePath,
    }
  }

  const getProductImageStoragePath = (
    imageUrl
  ) => {
    if (!imageUrl) {
      return null
    }

    const marker =
      `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`

    const markerIndex =
      String(imageUrl).indexOf(
        marker
      )

    if (markerIndex === -1) {
      return null
    }

    const encodedPath =
      String(imageUrl).slice(
        markerIndex +
          marker.length
      )

    try {
      return decodeURIComponent(
        encodedPath
      )
    } catch {
      return encodedPath
    }
  }

  const deleteStoredProductImage = async (
    imageUrl
  ) => {
    const storagePath =
      getProductImageStoragePath(
        imageUrl
      )

    if (!storagePath) {
      return
    }

    const {
      error: removeError,
    } = await supabase.storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .remove([
        storagePath,
      ])

    if (removeError) {
      console.warn(
        'Product image could not be removed from Storage:',
        removeError
      )
    }
  }

  const loadProductGallery = async (
    productId,
    fallbackImageUrl = ''
  ) => {
    const {
      data,
      error: galleryError,
    } = await supabase
      .from('product_images')
      .select(
        'id, product_id, image_url, storage_path, sort_order, is_primary'
      )
      .eq(
        'product_id',
        productId
      )
      .order(
        'sort_order',
        {
          ascending: true,
        }
      )

    if (galleryError) {
      throw galleryError
    }

    const rows =
      (data || []).map(
        (row) => ({
          key:
            `db-${row.id}`,
          id:
            row.id,
          imageUrl:
            row.image_url,
          storagePath:
            row.storage_path ||
            getProductImageStoragePath(
              row.image_url
            ),
          previewUrl:
            row.image_url,
          file:
            null,
          isPrimary:
            Boolean(
              row.is_primary
            ),
          persisted:
            true,
        })
      )

    if (
      rows.length === 0 &&
      fallbackImageUrl
    ) {
      return [
        {
          key:
            `legacy-${productId}`,
          id:
            null,
          imageUrl:
            fallbackImageUrl,
          storagePath:
            getProductImageStoragePath(
              fallbackImageUrl
            ),
          previewUrl:
            fallbackImageUrl,
          file:
            null,
          isPrimary:
            true,
          persisted:
            false,
        },
      ]
    }

    if (
      rows.length > 0 &&
      !rows.some(
        (image) =>
          image.isPrimary
      )
    ) {
      rows[0].isPrimary = true
    }

    return rows
  }

  const handleProductImagesChange = (
    event
  ) => {
    const selectedFiles =
      Array.from(
        event.target.files || []
      )

    if (
      selectedFiles.length === 0
    ) {
      return
    }

    const remainingSlots =
      Math.max(
        0,
        MAX_PRODUCT_IMAGES -
          galleryImages.length
      )

    if (
      remainingSlots === 0
    ) {
      window.alert(
        `Maximum ${MAX_PRODUCT_IMAGES} product images are allowed.`
      )

      event.target.value = ''
      return
    }

    const acceptedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    const validFiles = []
    const rejectedFiles = []

    selectedFiles.forEach(
      (file) => {
        if (
          !acceptedTypes.includes(
            file.type
          )
        ) {
          rejectedFiles.push(
            `${file.name}: unsupported format`
          )
          return
        }

        if (
          file.size >
          MAX_PRODUCT_IMAGE_SIZE
        ) {
          rejectedFiles.push(
            `${file.name}: larger than 5 MB`
          )
          return
        }

        validFiles.push(file)
      }
    )

    if (
      rejectedFiles.length > 0
    ) {
      window.alert(
        `Some images were skipped:\n\n${rejectedFiles.join(
          '\n'
        )}`
      )
    }

    const filesToAdd =
      validFiles.slice(
        0,
        remainingSlots
      )

    if (
      validFiles.length >
      remainingSlots
    ) {
      window.alert(
        `Only ${remainingSlots} more image${
          remainingSlots === 1
            ? ''
            : 's'
        } can be added. Maximum is ${MAX_PRODUCT_IMAGES}.`
      )
    }

    if (
      filesToAdd.length > 0
    ) {
      setGalleryImages(
        (current) => {
          const hasPrimary =
            current.some(
              (image) =>
                image.isPrimary
            )

          const additions =
            filesToAdd.map(
              (
                file,
                index
              ) => ({
                key:
                  `new-${makeGalleryKey()}`,
                id:
                  null,
                imageUrl:
                  '',
                storagePath:
                  null,
                previewUrl:
                  URL.createObjectURL(
                    file
                  ),
                file,
                isPrimary:
                  !hasPrimary &&
                  index === 0,
                persisted:
                  false,
              })
            )

          return [
            ...current,
            ...additions,
          ]
        }
      )
    }

    event.target.value = ''
  }

  const setPrimaryGalleryImage = (
    key
  ) => {
    setGalleryImages(
      (current) =>
        current.map(
          (image) => ({
            ...image,
            isPrimary:
              image.key === key,
          })
        )
    )
  }

  const moveGalleryImage = (
    index,
    direction
  ) => {
    setGalleryImages(
      (current) => {
        const next =
          [...current]

        const targetIndex =
          index + direction

        if (
          targetIndex < 0 ||
          targetIndex >=
            next.length
        ) {
          return current
        }

        const [
          movedImage,
        ] = next.splice(
          index,
          1
        )

        next.splice(
          targetIndex,
          0,
          movedImage
        )

        return next
      }
    )
  }

  const removeGalleryImage = (
    key
  ) => {
    const target =
      galleryImages.find(
        (image) =>
          image.key === key
      )

    if (!target) {
      return
    }

    if (
      target.previewUrl &&
      String(
        target.previewUrl
      ).startsWith('blob:')
    ) {
      URL.revokeObjectURL(
        target.previewUrl
      )
    }

    if (
      target.id ||
      target.imageUrl
    ) {
      setRemovedGalleryImages(
        (current) => [
          ...current,
          target,
        ]
      )
    }

    setGalleryImages(
      (current) => {
        const next =
          current.filter(
            (image) =>
              image.key !== key
          )

        if (
          target.isPrimary &&
          next.length > 0
        ) {
          return next.map(
            (
              image,
              index
            ) => ({
              ...image,
              isPrimary:
                index === 0,
            })
          )
        }

        return next
      }
    )
  }

  const closeProductFormModal =
    () => {
      revokeLocalGalleryPreviews()

      setGalleryImages([])
      setRemovedGalleryImages([])
      setGalleryLoading(false)
      setEditingProduct(null)
      setFormModalOpen(false)
    }

  /* =========================================
     SUMMARY
  ========================================= */

  const stats = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0

    products.forEach((product) => {
      const status =
        getStockStatus(product)

      if (
        status.key === 'in'
      ) {
        inStock += 1
      }

      if (
        status.key === 'low'
      ) {
        lowStock += 1
      }

      if (
        status.key === 'out'
      ) {
        outOfStock += 1
      }
    })

    return {
      total:
        products.length,

      inStock,

      lowStock,

      outOfStock,
    }
  }, [products])

  /* =========================================
     FILTER + SORT
  ========================================= */

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      let result =
        products.filter((product) => {
          const name =
            getProductName(
              product
            ).toLowerCase()

          const sku =
            String(
              getSku(product)
            ).toLowerCase()

          const category =
            getCategoryName(
              product
            ).toLowerCase()

          const stockStatus =
            getStockStatus(
              product
            ).key

          const matchesSearch =
            !query ||
            name.includes(query) ||
            sku.includes(query) ||
            category.includes(query)

          const matchesCategory =
            categoryFilter === 'all' ||
            String(
              getCategoryId(
                product
              )
            ) ===
              String(
                categoryFilter
              )

          const matchesStock =
            stockFilter === 'all' ||
            stockStatus ===
              stockFilter

          return (
            matchesSearch &&
            matchesCategory &&
            matchesStock
          )
        })

      result = [...result]

      result.sort((a, b) => {
        if (
          sortBy === 'name'
        ) {
          return getProductName(a)
            .localeCompare(
              getProductName(b)
            )
        }

        if (
          sortBy === 'price-high'
        ) {
          return (
            getPrice(b) -
            getPrice(a)
          )
        }

        if (
          sortBy === 'price-low'
        ) {
          return (
            getPrice(a) -
            getPrice(b)
          )
        }

        if (
          sortBy === 'stock-high'
        ) {
          return (
            getStock(b) -
            getStock(a)
          )
        }

        if (
          sortBy === 'stock-low'
        ) {
          return (
            getStock(a) -
            getStock(b)
          )
        }

        return (
          new Date(
            b.created_at || 0
          ).getTime() -
          new Date(
            a.created_at || 0
          ).getTime()
        )
      })

      return result
    }, [
      products,
      categoryMap,
      search,
      categoryFilter,
      stockFilter,
      sortBy,
    ])

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredProducts.length /
          PAGE_SIZE
      )
    )

  useEffect(() => {
    setCurrentPage(1)
  }, [
    search,
    categoryFilter,
    stockFilter,
    sortBy,
  ])

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      )
    }
  }, [
    currentPage,
    totalPages,
  ])

  const paginatedProducts =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE

      return filteredProducts.slice(
        start,
        start + PAGE_SIZE
      )
    }, [
      filteredProducts,
      currentPage,
    ])

  const paginationItems =
    useMemo(() => {
      if (
        totalPages <= 7
      ) {
        return Array.from(
          {
            length:
              totalPages,
          },
          (
            _,
            index
          ) =>
            index + 1
        )
      }

      if (
        currentPage <= 4
      ) {
        return [
          1,
          2,
          3,
          4,
          5,
          'dots-right',
          totalPages,
        ]
      }

      if (
        currentPage >=
        totalPages - 3
      ) {
        return [
          1,
          'dots-left',
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        ]
      }

      return [
        1,
        'dots-left',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'dots-right',
        totalPages,
      ]
    }, [
      totalPages,
      currentPage,
    ])

  /* =========================================
     ADD PRODUCT
  ========================================= */

  const openAddProduct = () => {
    revokeLocalGalleryPreviews()

    setEditingProduct(null)
    setGalleryImages([])
    setRemovedGalleryImages([])
    setGalleryLoading(false)

    setProductForm({
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      price: 0,
      comparePrice: '',
      stock: 0,
      threshold: 5,
      imageUrl: '',
      active: true,
    })

    setFormModalOpen(true)
  }

  /* =========================================
     EDIT
  ========================================= */

  const openEditProduct = async (
    product
  ) => {
    setMenuProduct(null)

    revokeLocalGalleryPreviews()

    const existingImage =
      getImage(product) || ''

    const productId =
      getProductId(product)

    setEditingProduct(
      product
    )

    setGalleryImages([])
    setRemovedGalleryImages([])
    setGalleryLoading(true)

    setProductForm({
      name:
        getProductName(
          product
        ),

      sku:
        getSku(product) ===
        '—'
          ? ''
          : getSku(product),

      description:
        getDescription(
          product
        ),

      categoryId:
        getCategoryId(
          product
        ),

      price:
        getPrice(product),

      comparePrice:
        getCompareAtPrice(
          product
        ) ?? '',

      stock:
        getStock(product),

      threshold:
        getThreshold(
          product
        ),

      imageUrl:
        existingImage,

      active:
        getActiveState(
          product
        ),
    })

    setFormModalOpen(true)

    try {
      if (!productId) {
        throw new Error(
          'Product ID could not be detected.'
        )
      }

      const images =
        await loadProductGallery(
          productId,
          existingImage
        )

      setGalleryImages(
        images
      )
    } catch (galleryError) {
      console.error(
        'Product gallery load error:',
        galleryError
      )

      if (existingImage) {
        setGalleryImages([
          {
            key:
              `fallback-${productId || makeGalleryKey()}`,
            id:
              null,
            imageUrl:
              existingImage,
            storagePath:
              getProductImageStoragePath(
                existingImage
              ),
            previewUrl:
              existingImage,
            file:
              null,
            isPrimary:
              true,
            persisted:
              false,
          },
        ])
      }

      window.alert(
        galleryError?.message ||
        'Product gallery could not be loaded.'
      )
    } finally {
      setGalleryLoading(false)
    }
  }

  /* =========================================
     SAVE PRODUCT
  ========================================= */

  const saveProduct = async (
    event
  ) => {
    event.preventDefault()
    if (saving) return
    try { validateProductForm(productForm) } catch (validationError) { window.alert(validationError.message); return }

    if (
      !productForm.name.trim()
    ) {
      window.alert(
        'Product name is required.'
      )

      return
    }

    if (
      galleryImages.length >
      MAX_PRODUCT_IMAGES
    ) {
      window.alert(
        `Maximum ${MAX_PRODUCT_IMAGES} product images are allowed.`
      )

      return
    }

    const sellingPrice =
      Number(productForm.price) || 0

    const comparePrice =
      productForm.comparePrice === '' ||
      productForm.comparePrice === null ||
      productForm.comparePrice === undefined
        ? null
        : Number(
            productForm.comparePrice
          )

    if (
      comparePrice !== null &&
      (
        !Number.isFinite(comparePrice) ||
        comparePrice < 0
      )
    ) {
      window.alert(
        'Enter a valid original price.'
      )

      return
    }

    if (
      comparePrice !== null &&
      comparePrice > 0 &&
      comparePrice <= sellingPrice
    ) {
      window.alert(
        'Original price must be higher than the selling price to apply a discount.'
      )

      return
    }

    setSaving(true)

    const newlyUploadedPaths = []
    let galleryWriteAttempted = false

    try {
      const schemaSource =
        editingProduct ||
        products[0] ||
        FALLBACK_PRODUCT

      const payload = {}

      const nameKey =
        getExistingKey(
          schemaSource,
          [
            'name',
            'product_name',
            'title',
          ]
        )

      const skuKey =
        getExistingKey(
          schemaSource,
          [
            'sku',
            'product_code',
            'code',
          ]
        )

      const descriptionKey =
        getExistingKey(
          schemaSource,
          [
            'description',
            'short_description',
            'subtitle',
          ]
        )

      const priceKey =
        getExistingKey(
          schemaSource,
          [
            'base_price',
            'price',
            'selling_price',
            'unit_price',
            'sale_price',
          ]
        )

      const comparePriceKey =
        'compare_at_price'

      const stockKey =
        getExistingKey(
          schemaSource,
          [
            'stock_quantity',
            'stock',
            'quantity',
            'qty',
            'available_stock',
          ]
        )

      const thresholdKey =
        getExistingKey(
          schemaSource,
          [
            'alert_quantity',
            'low_stock_threshold',
            'reorder_level',
            'minimum_stock',
            'min_stock',
          ]
        )

      const categoryKey =
        getExistingKey(
          schemaSource,
          [
            'category_id',
            'categoryId',
          ]
        )

      const imageKey =
        'image_url'

      const activeKey =
        getExistingKey(
          schemaSource,
          [
            'is_active',
            'active',
          ]
        )

      const slugKey =
        getExistingKey(
          schemaSource,
          [
            'slug',
          ]
        )

      if (nameKey) {
        payload[nameKey] =
          productForm.name.trim()
      }

      if (skuKey) {
        payload[skuKey] =
          productForm.sku.trim() ||
          null
      }

      if (descriptionKey) {
        payload[descriptionKey] =
          productForm.description.trim() ||
          null
      }

      if (priceKey) {
        payload[priceKey] =
          Number(
            productForm.price
          ) || 0
      }

      payload[comparePriceKey] =
        comparePrice &&
        comparePrice > 0
          ? comparePrice
          : null

      if (stockKey) {
        payload[stockKey] =
          Number(
            productForm.stock
          ) || 0
      }

      if (thresholdKey) {
        payload[thresholdKey] =
          Number(
            productForm.threshold
          ) || 0
      }

      if (categoryKey) {
        payload[categoryKey] =
          productForm.categoryId ||
          null
      }

      payload[imageKey] =
        editingProduct
          ? getImage(
              editingProduct
            ) || null
          : (
              galleryImages.find(
                (image) =>
                  image.isPrimary &&
                  image.imageUrl
              )?.imageUrl ||
              galleryImages.find(
                (image) =>
                  image.imageUrl
              )?.imageUrl ||
              null
            )

      if (activeKey) {
        payload[activeKey] =
          Boolean(
            productForm.active
          )
      }

      if (slugKey) {
        const currentSlug =
          editingProduct
            ? editingProduct[
                slugKey
              ]
            : null

        payload[slugKey] =
          currentSlug ||
          createSlug(
            productForm.name
          )
      }

      let savedProductId = null

      if (
        editingProduct
      ) {
        const idKey =
          getExistingKey(
            editingProduct,
            [
              'id',
              'product_id',
            ]
          )

        if (!idKey) {
          throw new Error(
            'Product ID column could not be detected.'
          )
        }

        const {
          data: updatedProduct,
          error: updateError,
        } = await supabase
          .from('products')
          .update(payload)
          .eq(
            idKey,
            editingProduct[
              idKey
            ]
          )
          .select('id')
          .maybeSingle()

        if (updateError) {
          throw updateError
        }

        if (!updatedProduct) {
          throw new Error(
            'Product update did not modify a row. Check the products UPDATE RLS policy for this staff account.'
          )
        }

        savedProductId =
          updatedProduct.id
      } else {
        const {
          data: insertedProduct,
          error: insertError,
        } = await supabase
          .from('products')
          .insert([
            payload,
          ])
          .select('id')
          .maybeSingle()

        if (insertError) {
          throw insertError
        }

        if (!insertedProduct) {
          throw new Error(
            'Product insert did not return a row. Check the products INSERT/SELECT RLS policies for this staff account.'
          )
        }

        savedProductId =
          insertedProduct.id
      }

      if (!savedProductId) {
        throw new Error(
          'Saved product ID is missing.'
        )
      }

      const finalizedGallery = []

      for (
        let index = 0;
        index <
        galleryImages.length;
        index += 1
      ) {
        const image =
          galleryImages[index]

        if (image.file) {
          const uploaded =
            await uploadProductImage(
              image.file,
              productForm.name
            )

          newlyUploadedPaths.push(
            uploaded.storagePath
          )

          finalizedGallery.push({
            ...image,
            imageUrl:
              uploaded.publicUrl,
            storagePath:
              uploaded.storagePath,
            previewUrl:
              uploaded.publicUrl,
            file:
              null,
          })
        } else if (
          image.imageUrl
        ) {
          finalizedGallery.push({
            ...image,
            storagePath:
              image.storagePath ||
              getProductImageStoragePath(
                image.imageUrl
              ),
          })
        }
      }

      if (
        finalizedGallery.length >
        0 &&
        !finalizedGallery.some(
          (image) =>
            image.isPrimary
        )
      ) {
        finalizedGallery[0] = {
          ...finalizedGallery[0],
          isPrimary:
            true,
        }
      }

      const {
        error: clearPrimaryError,
      } = await supabase
        .from('product_images')
        .update({
          is_primary:
            false,
        })
        .eq(
          'product_id',
          savedProductId
        )

      if (clearPrimaryError) {
        throw clearPrimaryError
      }

      const removedIds =
        removedGalleryImages
          .map(
            (image) =>
              image.id
          )
          .filter(Boolean)

      if (
        removedIds.length > 0
      ) {
        const {
          error: deleteRowsError,
        } = await supabase
          .from('product_images')
          .delete()
          .in(
            'id',
            removedIds
          )

        if (deleteRowsError) {
          throw deleteRowsError
        }
      }

      for (
        let index = 0;
        index <
        finalizedGallery.length;
        index += 1
      ) {
        const image =
          finalizedGallery[index]

        if (!image.id) {
          continue
        }

        const {
          error: updateImageError,
        } = await supabase
          .from('product_images')
          .update({
            image_url:
              image.imageUrl,
            storage_path:
              image.storagePath ||
              null,
            sort_order:
              index,
            is_primary:
              Boolean(
                image.isPrimary
              ),
          })
          .eq(
            'id',
            image.id
          )
          .eq(
            'product_id',
            savedProductId
          )

        if (updateImageError) {
          throw updateImageError
        }
      }

      const newRows =
        finalizedGallery
          .map(
            (
              image,
              index
            ) => ({
              image,
              index,
            })
          )
          .filter(
            ({ image }) =>
              !image.id
          )
          .map(
            ({
              image,
              index,
            }) => ({
              product_id:
                savedProductId,
              image_url:
                image.imageUrl,
              storage_path:
                image.storagePath ||
                null,
              sort_order:
                index,
              is_primary:
                Boolean(
                  image.isPrimary
                ),
            })
          )

      if (
        newRows.length > 0
      ) {
        galleryWriteAttempted = true
        const {
          error: insertImagesError,
        } = await supabase
          .from('product_images')
          .insert(
            newRows
          )

        if (insertImagesError) {
          throw insertImagesError
        }
      }

      const primaryImage =
        finalizedGallery.find(
          (image) =>
            image.isPrimary
        ) ||
        finalizedGallery[0] ||
        null

      const finalPrimaryUrl =
        primaryImage?.imageUrl ||
        null

      const {
        data: finalProduct,
        error: finalProductError,
      } = await supabase
        .from('products')
        .update({
          image_url:
            finalPrimaryUrl,
        })
        .eq(
          'id',
          savedProductId
        )
        .select(
          'id, image_url'
        )
        .maybeSingle()

      if (finalProductError) {
        throw finalProductError
      }

      if (!finalProduct) {
        throw new Error(
          'Main product image could not be updated.'
        )
      }

      if (
        (finalProduct.image_url || null) !==
        (finalPrimaryUrl || null)
      ) {
        throw new Error(
          'The selected main image was not saved to products.image_url.'
        )
      }

      const retainedUrls =
        new Set(
          finalizedGallery.map(
            (image) =>
              image.imageUrl
          )
        )

      for (
        const removedImage
        of removedGalleryImages
      ) {
        if (
          removedImage.imageUrl &&
          !retainedUrls.has(
            removedImage.imageUrl
          )
        ) {
          await deleteStoredProductImage(
            removedImage.imageUrl
          )
        }
      }

      revokeLocalGalleryPreviews()

      setFormModalOpen(false)
      setEditingProduct(null)
      setGalleryImages([])
      setRemovedGalleryImages([])
      setGalleryLoading(false)

      await loadData(true)
    } catch (saveError) {
      if (
        newlyUploadedPaths.length >
        0 && !galleryWriteAttempted
      ) {
        const {
          error: cleanupError,
        } = await supabase.storage
          .from(
            PRODUCT_IMAGE_BUCKET
          )
          .remove(
            newlyUploadedPaths
          )

        if (cleanupError) {
          console.warn(
            'New product image cleanup failed:',
            cleanupError
          )
        }
      }

      console.error(
        'Product save error:',
        saveError
      )

      window.alert(
        saveError?.message ||
        'Product could not be saved.'
      )
    } finally {
      setSaving(false)
    }
  }

  /* =========================================
     VIEW PRODUCT
  ========================================= */

  const openViewProduct = (
    product
  ) => {
    setMenuProduct(null)

    setSelectedProduct(
      product
    )

    setViewModalOpen(
      true
    )
  }

  /* =========================================
     STOCK
  ========================================= */

  const openStockModal = (
    product
  ) => {
    setMenuProduct(null)

    setStockProduct(
      product
    )

    setStockValue(
      String(
        getStock(product)
      )
    )

    setStockModalOpen(
      true
    )
  }

  const saveStock = async () => {
    if (!stockProduct) {
      return
    }

    if (String(stockValue).trim() === '') { window.alert('Stock quantity is required.'); return }
    const quantity =
      Number(stockValue)

    if (
      !Number.isSafeInteger(
        quantity
      ) ||
      quantity < 0
    ) {
      window.alert(
        'Enter a valid stock quantity.'
      )

      return
    }

    try {
      const stockKey =
        getExistingKey(
          stockProduct,
          [
            'stock_quantity',
            'stock',
            'quantity',
            'qty',
            'available_stock',
          ]
        )

      const idKey =
        getExistingKey(
          stockProduct,
          [
            'id',
            'product_id',
          ]
        )

      if (!stockKey) {
        throw new Error(
          'Stock column could not be detected.'
        )
      }

      if (!idKey) {
        throw new Error(
          'Product ID could not be detected.'
        )
      }

      await updateSingleRow(supabase, 'products', stockProduct, { [stockKey]: quantity }, idKey, { [stockKey]: stockProduct[stockKey] })

      setStockModalOpen(
        false
      )

      setStockProduct(
        null
      )

      await loadData(true)
    } catch (stockError) {
      console.error(
        'Stock update error:',
        stockError
      )

      window.alert(
        stockError?.message ||
        'Stock could not be updated.'
      )
    }
  }

  /* =========================================
     ACTIVATE / DEACTIVATE
  ========================================= */

  const toggleProductStatus = async (
    product
  ) => {
    setMenuProduct(null)

    const activeKey =
      getExistingKey(
        product,
        [
          'is_active',
          'active',
        ]
      )

    if (!activeKey) {
      window.alert(
        'Your products table does not have an is_active or active column.'
      )

      return
    }

    const idKey =
      getExistingKey(
        product,
        [
          'id',
          'product_id',
        ]
      )

    if (!idKey) {
      window.alert(
        'Product ID could not be detected.'
      )

      return
    }

    try {
      const newStatus =
        !Boolean(
          product[
            activeKey
          ]
        )

      await updateSingleRow(supabase, 'products', product, { [activeKey]: newStatus }, idKey, { [activeKey]: product[activeKey] })

      await loadData(true)
    } catch (statusError) {
      console.error(
        'Product status error:',
        statusError
      )

      window.alert(
        statusError?.message ||
        'Product status could not be changed.'
      )
    }
  }

  /* =========================================
     DELETE PRODUCT
  ========================================= */

  const deleteProduct = async (
    product
  ) => {
    setMenuProduct(null)

    const confirmed =
      window.confirm(
        `Delete "${getProductName(
          product
        )}"?\n\nThis cannot be undone.`
      )

    if (!confirmed) {
      return
    }

    try {
      const idKey =
        getExistingKey(
          product,
          [
            'id',
            'product_id',
          ]
        )

      if (!idKey) {
        throw new Error(
          'Product ID could not be detected.'
        )
      }

      const productId =
        product[idKey]

      let galleryUrls = []

      const {
        data: galleryRows,
        error: galleryLoadError,
      } = await supabase
        .from('product_images')
        .select(
          'image_url'
        )
        .eq(
          'product_id',
          productId
        )

      if (galleryLoadError) {
        console.warn(
          'Product gallery could not be loaded before delete:',
          galleryLoadError
        )
      } else {
        galleryUrls =
          (galleryRows || [])
            .map(
              (row) =>
                row.image_url
            )
            .filter(Boolean)
      }

      await deleteSingleRow(supabase, 'products', product, idKey)

      const mainImage =
        getImage(product)

      const storageUrls =
        Array.from(
          new Set([
            ...galleryUrls,
            ...(mainImage
              ? [mainImage]
              : []),
          ])
        )

      for (
        const imageUrl
        of storageUrls
      ) {
        await deleteStoredProductImage(
          imageUrl
        )
      }

      await loadData(true)
    } catch (deleteError) {
      console.error(
        'Product delete error:',
        deleteError
      )

      window.alert(
        deleteError?.message ||
        'Product could not be deleted.'
      )
    }
  }

  /* =========================================
     CURRENCY
  ========================================= */

  const formatCurrency = (
    value
  ) => {
    return new Intl.NumberFormat(
      'en-LK',
      {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits:
          0,
      }
    ).format(
      value || 0
    )
  }

  /* =========================================
     EXPORT PRODUCTS PDF
  ========================================= */

  const exportProducts = () => {
    try {
      const doc =
        new jsPDF({
          orientation:
            'landscape',

          unit: 'mm',

          format: 'a4',
        })

      const pageWidth =
        doc.internal
          .pageSize
          .getWidth()

      const generatedDate =
        new Intl.DateTimeFormat(
          'en-LK',
          {
            timeZone:
              TIME_ZONE,

            day:
              '2-digit',

            month:
              'short',

            year:
              'numeric',

            hour:
              '2-digit',

            minute:
              '2-digit',

            hour12:
              true,
          }
        ).format(
          new Date()
        )

      /* =====================================
         HEADER
      ====================================== */

      doc.setFillColor(
        0,
        76,
        68
      )

      doc.rect(
        0,
        0,
        pageWidth,
        26,
        'F'
      )

      doc.setTextColor(
        255,
        255,
        255
      )

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(
        18
      )

      doc.text(
        'Lucky Hub',
        14,
        11
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(
        8
      )

      doc.text(
        'Management Portal',
        14,
        17
      )

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(
        14
      )

      doc.text(
        'PRODUCT REPORT',
        pageWidth - 14,
        11,
        {
          align:
            'right',
        }
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(
        8
      )

      doc.text(
        `Generated: ${generatedDate}`,
        pageWidth - 14,
        17,
        {
          align:
            'right',
        }
      )

      /* =====================================
         TITLE
      ====================================== */

      doc.setTextColor(
        25,
        43,
        38
      )

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(
        16
      )

      doc.text(
        'Product Catalogue Report',
        14,
        38
      )

      doc.setTextColor(
        105,
        125,
        118
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(
        9
      )

      doc.text(
        'Lucky Hub stationery and printing management system',
        14,
        44
      )

      /* =====================================
         SUMMARY
      ====================================== */

      const summaryData = [
        {
          label:
            'Total Products',

          value:
            stats.total,
        },

        {
          label:
            'In Stock',

          value:
            stats.inStock,
        },

        {
          label:
            'Low Stock',

          value:
            stats.lowStock,
        },

        {
          label:
            'Out of Stock',

          value:
            stats.outOfStock,
        },
      ]

      const boxWidth =
        57

      const boxHeight =
        18

      const boxGap =
        6

      summaryData.forEach(
        (
          item,
          index
        ) => {
          const x =
            14 +
            index *
              (
                boxWidth +
                boxGap
              )

          doc.setFillColor(
            246,
            249,
            248
          )

          doc.setDrawColor(
            220,
            231,
            227
          )

          doc.roundedRect(
            x,
            51,
            boxWidth,
            boxHeight,
            2,
            2,
            'FD'
          )

          doc.setFont(
            'helvetica',
            'normal'
          )

          doc.setFontSize(
            7.5
          )

          doc.setTextColor(
            105,
            125,
            118
          )

          doc.text(
            item.label,
            x + 4,
            57
          )

          doc.setFont(
            'helvetica',
            'bold'
          )

          doc.setFontSize(
            13
          )

          doc.setTextColor(
            24,
            48,
            41
          )

          doc.text(
            String(
              item.value
            ),
            x + 4,
            65
          )
        }
      )

      /* =====================================
         FILTER INFORMATION
      ====================================== */

      const selectedCategory =
        categories.find(
          (category) =>
            String(
              getValue(
                category,
                [
                  'id',
                  'category_id',
                ]
              )
            ) ===
            String(
              categoryFilter
            )
        )

      const categoryText =
        categoryFilter ===
        'all'
          ? 'All Categories'
          : getValue(
              selectedCategory,
              [
                'name',
                'category_name',
                'title',
              ],
              'Category'
            )

      let stockText =
        'All Stock Status'

      if (
        stockFilter ===
        'in'
      ) {
        stockText =
          'In Stock'
      }

      if (
        stockFilter ===
        'low'
      ) {
        stockText =
          'Low Stock'
      }

      if (
        stockFilter ===
        'out'
      ) {
        stockText =
          'Out of Stock'
      }

      let filterText =
        `Category: ${categoryText} | Stock: ${stockText}`

      if (
        search.trim()
      ) {
        filterText +=
          ` | Search: ${search.trim()}`
      }

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(
        8
      )

      doc.setTextColor(
        96,
        116,
        109
      )

      doc.text(
        filterText,
        14,
        77
      )

      /* =====================================
         TABLE
      ====================================== */

      const tableRows =
        filteredProducts.map(
          (
            product,
            index
          ) => {
            const status =
              getStockStatus(
                product
              )

            return [
              index + 1,

              getProductName(
                product
              ),

              getSku(
                product
              ),

              getCategoryName(
                product
              ),

              formatCurrency(
                getPrice(
                  product
                )
              ),

              getStock(
                product
              ),

              status.label,
            ]
          }
        )

      autoTable(
        doc,
        {
          startY: 82,

          head: [
            [
              'No.',
              'Product',
              'SKU',
              'Category',
              'Price',
              'Stock',
              'Status',
            ],
          ],

          body:
            tableRows,

          theme:
            'grid',

          margin: {
            left: 14,
            right: 14,
            bottom: 18,
          },

          styles: {
            font:
              'helvetica',

            fontSize: 8,

            cellPadding: 3,

            textColor: [
              47,
              68,
              61,
            ],

            lineColor: [
              225,
              233,
              230,
            ],

            lineWidth:
              0.2,

            valign:
              'middle',
          },

          headStyles: {
            fillColor: [
              0,
              121,
              107,
            ],

            textColor: [
              255,
              255,
              255,
            ],

            fontStyle:
              'bold',

            fontSize:
              8,
          },

          alternateRowStyles: {
            fillColor: [
              248,
              251,
              250,
            ],
          },

          columnStyles: {
            0: {
              cellWidth:
                12,

              halign:
                'center',
            },

            1: {
              cellWidth:
                55,
            },

            2: {
              cellWidth:
                27,
            },

            3: {
              cellWidth:
                58,
            },

            4: {
              cellWidth:
                35,

              halign:
                'right',
            },

            5: {
              cellWidth:
                24,

              halign:
                'center',
            },

            6: {
              cellWidth:
                35,

              halign:
                'center',
            },
          },

          didDrawPage: () => {
            const pageNumber =
              doc.internal
                .getNumberOfPages()

            const pageHeight =
              doc.internal
                .pageSize
                .getHeight()

            doc.setFont(
              'helvetica',
              'normal'
            )

            doc.setFontSize(
              7.5
            )

            doc.setTextColor(
              120,
              136,
              131
            )

            doc.text(
              'Lucky Hub Management Portal - Products',
              14,
              pageHeight - 8
            )

            doc.text(
              `Page ${pageNumber}`,
              pageWidth - 14,
              pageHeight - 8,
              {
                align:
                  'right',
              }
            )
          },
        }
      )

      /* =====================================
         SAVE PDF
      ====================================== */

      const filenameDate =
        new Intl.DateTimeFormat(
          'en-CA',
          {
            timeZone:
              TIME_ZONE,

            year:
              'numeric',

            month:
              '2-digit',

            day:
              '2-digit',
          }
        )
          .format(
            new Date()
          )
          .replaceAll(
            '/',
            '-'
          )

      doc.save(
        `Lucky-Hub-Products-${filenameDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate product PDF.'
      )
    }
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="products-page">

      {/* HEADER */}

      <div className="products-page-header">

        <div>
          <h1>
            Products
          </h1>

          <p>
            Manage your product catalogue
          </p>
        </div>


        <div className="products-header-actions">

          <div className="products-search">

            <Search
              size={16}
            />

            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            <span className="search-shortcut">
              Ctrl + K
            </span>

          </div>


          <button
            type="button"
            className="products-add-button"
            onClick={
              openAddProduct
            }
          >
            <Plus
              size={16}
            />

            Add Product
          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="products-error">

          <AlertTriangle
            size={16}
          />

          {error}

        </div>
      )}


      {/* SUMMARY */}

      <div className="products-summary-grid">

        <SummaryCard
          title="Total Products"
          value={
            loading
              ? '—'
              : stats.total
          }
          note="+12% from last month"
          tone="purple"
          icon={Package}
        />


        <SummaryCard
          title="In Stock"
          value={
            loading
              ? '—'
              : stats.inStock
          }
          note={
            stats.total
              ? `${Math.round(
                  (
                    stats.inStock /
                    stats.total
                  ) *
                    100
                )}% of total`
              : '0% of total'
          }
          tone="green"
          icon={Boxes}
        />


        <SummaryCard
          title="Low Stock"
          value={
            loading
              ? '—'
              : stats.lowStock
          }
          note={
            stats.total
              ? `${Math.round(
                  (
                    stats.lowStock /
                    stats.total
                  ) *
                    100
                )}% of total`
              : '0% of total'
          }
          tone="orange"
          icon={AlertTriangle}
        />


        <SummaryCard
          title="Out of Stock"
          value={
            loading
              ? '—'
              : stats.outOfStock
          }
          note={
            stats.total
              ? `${Math.round(
                  (
                    stats.outOfStock /
                    stats.total
                  ) *
                    100
                )}% of total`
              : '0% of total'
          }
          tone="red"
          icon={Box}
        />

      </div>


      {/* FILTER */}

      <div className="products-filter-row">

        <div className="products-filters">

          <FilterSelect>

            <select
              value={
                categoryFilter
              }
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Categories
              </option>


              {categories.map(
                (category) => {
                  const id =
                    getValue(
                      category,
                      [
                        'id',
                        'category_id',
                      ]
                    )

                  return (
                    <option
                      key={id}
                      value={id}
                    >
                      {getValue(
                        category,
                        [
                          'name',
                          'category_name',
                          'title',
                        ],
                        'Category'
                      )}
                    </option>
                  )
                }
              )}

            </select>

          </FilterSelect>


          <FilterSelect>

            <select
              value={
                stockFilter
              }
              onChange={(event) =>
                setStockFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Stock Status
              </option>

              <option value="in">
                In Stock
              </option>

              <option value="low">
                Low Stock
              </option>

              <option value="out">
                Out of Stock
              </option>

            </select>

          </FilterSelect>


          <FilterSelect>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
            >

              <option value="newest">
                Sort by: Newest
              </option>

              <option value="name">
                Product Name
              </option>

              <option value="price-high">
                Price: High to Low
              </option>

              <option value="price-low">
                Price: Low to High
              </option>

              <option value="stock-high">
                Stock: High to Low
              </option>

              <option value="stock-low">
                Stock: Low to High
              </option>

            </select>

          </FilterSelect>

        </div>


        <div className="products-view-actions">

          <div className="view-toggle">

            <button
              type="button"
              className={
                viewMode ===
                'list'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setViewMode(
                  'list'
                )
              }
            >
              <List
                size={16}
              />
            </button>


            <button
              type="button"
              className={
                viewMode ===
                'grid'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setViewMode(
                  'grid'
                )
              }
            >
              <Grid2X2
                size={16}
              />
            </button>

          </div>


          <button
            type="button"
            className="products-refresh-button"
            onClick={() =>
              loadData(
                true
              )
            }
            disabled={
              refreshing
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'products-spin'
                  : ''
              }
            />
          </button>


          <button
            type="button"
            className="products-export-button"
            onClick={
              exportProducts
            }
          >
            <Download
              size={16}
            />

            Export PDF
          </button>

        </div>

      </div>


      {/* LIST VIEW */}

      {viewMode ===
        'list' && (

        <div className="products-table-card">

          <div className="products-table-wrapper">

            <table className="products-table">

              <thead>

                <tr>

                  <th className="checkbox-column">
                    <input
                      type="checkbox"
                      aria-label="Select all products"
                    />
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="products-empty"
                    >
                      Loading products...
                    </td>

                  </tr>

                ) : paginatedProducts.length === 0 ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="products-empty"
                    >
                      No products found.
                    </td>

                  </tr>

                ) : (

                  paginatedProducts.map(
                    (
                      product,
                      index
                    ) => {
                      const status =
                        getStockStatus(
                          product
                        )

                      const image =
                        getImage(
                          product
                        )

                      const tone =
                        getCategoryTone(
                          product
                        )

                      return (
                        <tr
                          key={
                            getProductId(
                              product
                            ) ||
                            index
                          }
                        >

                          <td className="checkbox-column">

                            <input
                              type="checkbox"
                              aria-label={`Select ${getProductName(
                                product
                              )}`}
                            />

                          </td>


                          <td>

                            <div className="product-name-cell">

                              <div className="product-thumbnail">

                                {image ? (

                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      getProductName(
                                        product
                                      )
                                    }
                                  />

                                ) : (

                                  <Package
                                    size={18}
                                  />

                                )}

                              </div>


                              <div className="product-name-text">

                                <strong>
                                  {getProductName(
                                    product
                                  )}
                                </strong>

                                {getDescription(
                                  product
                                ) && (

                                  <span>
                                    {getDescription(
                                      product
                                    )}
                                  </span>

                                )}

                              </div>

                            </div>

                          </td>


                          <td className="product-sku">
                            {getSku(
                              product
                            )}
                          </td>


                          <td>

                            <span
                              className={`category-badge category-${tone}`}
                            >
                              {getCategoryName(
                                product
                              )}
                            </span>

                          </td>


                          <td className="product-price">

                            <div
                              style={{
                                display: 'grid',
                                gap: '3px',
                              }}
                            >
                              <strong>
                                {formatCurrency(
                                  getPrice(
                                    product
                                  )
                                )}
                              </strong>

                              {getDiscountPercent(
                                product
                              ) > 0 && (
                                <>
                                  <span
                                    style={{
                                      color: '#8a9691',
                                      fontSize: '11px',
                                      textDecoration:
                                        'line-through',
                                    }}
                                  >
                                    {formatCurrency(
                                      getCompareAtPrice(
                                        product
                                      )
                                    )}
                                  </span>

                                  <span
                                    style={{
                                      width: 'fit-content',
                                      padding: '2px 6px',
                                      borderRadius: '999px',
                                      background: '#e7f7f0',
                                      color: '#08735f',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    {getDiscountPercent(
                                      product
                                    )}% OFF
                                  </span>
                                </>
                              )}
                            </div>

                          </td>


                          <td
                            className={
                              status.key !==
                              'in'
                                ? 'stock-number stock-number-warning'
                                : 'stock-number'
                            }
                          >
                            {getStock(
                              product
                            )}
                          </td>


                          <td>

                            <span
                              className={`stock-status stock-status-${status.key}`}
                            >

                              <span className="stock-status-dot" />

                              {status.label}

                            </span>

                          </td>


                          <td>

                            <div className="product-row-actions">

                              <button
                                type="button"
                                title="Edit product"
                                onClick={() =>
                                  openEditProduct(
                                    product
                                  )
                                }
                              >
                                <Edit3
                                  size={15}
                                />
                              </button>


                              <button
                                type="button"
                                title="View product"
                                onClick={() =>
                                  openViewProduct(
                                    product
                                  )
                                }
                              >
                                <Eye
                                  size={15}
                                />
                              </button>


                              <button
                                type="button"
                                title="More options"
                                onClick={(event) =>
                                  openMoreMenu(
                                    event,
                                    product
                                  )
                                }
                              >
                                <MoreVertical
                                  size={15}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    }
                  )

                )}

              </tbody>

            </table>

          </div>


          <ProductsFooter
            currentPage={
              currentPage
            }
            totalPages={
              totalPages
            }
            filteredCount={
              filteredProducts.length
            }
            paginationItems={
              paginationItems
            }
            setCurrentPage={
              setCurrentPage
            }
          />

        </div>

      )}


      {/* GRID VIEW */}

      {viewMode ===
        'grid' && (

        <>
          <div className="products-grid">

            {paginatedProducts.map(
              (
                product,
                index
              ) => {
                const image =
                  getImage(
                    product
                  )

                const status =
                  getStockStatus(
                    product
                  )

                return (
                  <div
                    className="product-grid-card"
                    key={
                      getProductId(
                        product
                      ) ||
                      index
                    }
                  >

                    <div className="product-grid-image">

                      {image ? (

                        <img
                          src={image}
                          alt={
                            getProductName(
                              product
                            )
                          }
                        />

                      ) : (

                        <Package
                          size={38}
                        />

                      )}

                    </div>


                    <div className="product-grid-content">

                      <div className="product-grid-title">

                        <div>

                          <strong>
                            {getProductName(
                              product
                            )}
                          </strong>

                          <span>
                            SKU:{' '}
                            {getSku(
                              product
                            )}
                          </span>

                        </div>


                        <button
                          type="button"
                          onClick={(event) =>
                            openMoreMenu(
                              event,
                              product
                            )
                          }
                        >
                          <MoreVertical
                            size={16}
                          />
                        </button>

                      </div>


                      <div className="product-grid-bottom">

                        <div
                          style={{
                            display: 'grid',
                            gap: '3px',
                          }}
                        >
                          <strong>
                            {formatCurrency(
                              getPrice(
                                product
                              )
                            )}
                          </strong>

                          {getDiscountPercent(
                            product
                          ) > 0 && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  color: '#8a9691',
                                  fontSize: '11px',
                                  textDecoration:
                                    'line-through',
                                }}
                              >
                                {formatCurrency(
                                  getCompareAtPrice(
                                    product
                                  )
                                )}
                              </span>

                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '999px',
                                  background: '#e7f7f0',
                                  color: '#08735f',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                }}
                              >
                                {getDiscountPercent(
                                  product
                                )}% OFF
                              </span>
                            </div>
                          )}
                        </div>


                        <span
                          className={`stock-status stock-status-${status.key}`}
                        >

                          <span className="stock-status-dot" />

                          {status.label}

                        </span>

                      </div>

                    </div>

                  </div>
                )
              }
            )}

          </div>


          <ProductsFooter
            currentPage={
              currentPage
            }
            totalPages={
              totalPages
            }
            filteredCount={
              filteredProducts.length
            }
            paginationItems={
              paginationItems
            }
            setCurrentPage={
              setCurrentPage
            }
          />

        </>

      )}


      {/* MORE MENU */}

      {menuProduct && (

        <div
          className="product-action-menu"
          style={{
            top:
              menuPosition.top,

            left:
              menuPosition.left,
          }}
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <button
            type="button"
            onClick={() =>
              openViewProduct(
                menuProduct
              )
            }
          >
            <Eye
              size={15}
            />

            View Product
          </button>


          <button
            type="button"
            onClick={() =>
              openEditProduct(
                menuProduct
              )
            }
          >
            <Edit3
              size={15}
            />

            Edit Product
          </button>


          <button
            type="button"
            onClick={() =>
              openStockModal(
                menuProduct
              )
            }
          >
            <Boxes
              size={15}
            />

            Update Stock
          </button>


          <button
            type="button"
            onClick={() =>
              toggleProductStatus(
                menuProduct
              )
            }
          >
            <CheckCircle2
              size={15}
            />

            {getActiveState(
              menuProduct
            )
              ? 'Deactivate'
              : 'Activate'}
          </button>


          <div className="product-action-menu-divider" />


          <button
            type="button"
            className="product-action-delete"
            onClick={() =>
              deleteProduct(
                menuProduct
              )
            }
          >
            <Trash2
              size={15}
            />

            Delete Product
          </button>

        </div>

      )}


      {/* ADD / EDIT MODAL */}

      {formModalOpen && (

        <div className="product-modal-overlay">

          <div className="product-management-modal">

            <div className="product-modal-header">

              <div>

                <h2>
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}
                </h2>

                <p>
                  {editingProduct
                    ? 'Update Lucky Hub product information.'
                    : 'Create a new Lucky Hub product.'}
                </p>

              </div>


              <button
                type="button"
                className="product-modal-close"
                onClick={
                  closeProductFormModal
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>


            <form
              onSubmit={
                saveProduct
              }
            >

              <div className="product-form-grid">

                <ProductFormField
                  label="Product Name"
                >
                  <input
                    type="text"
                    value={
                      productForm.name
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          name:
                            event.target.value,
                        })
                      )
                    }
                    required
                  />
                </ProductFormField>


                <ProductFormField
                  label="SKU"
                >
                  <input
                    type="text"
                    value={
                      productForm.sku
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          sku:
                            event.target.value,
                        })
                      )
                    }
                  />
                </ProductFormField>


                <ProductFormField
                  label="Category"
                >

                  <select
                    value={
                      productForm.categoryId ||
                      ''
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          categoryId:
                            event.target.value,
                        })
                      )
                    }
                  >

                    <option value="">
                      Uncategorized
                    </option>


                    {categories.map(
                      (
                        category
                      ) => {
                        const id =
                          getValue(
                            category,
                            [
                              'id',
                              'category_id',
                            ]
                          )

                        return (
                          <option
                            key={id}
                            value={id}
                          >
                            {getValue(
                              category,
                              [
                                'name',
                                'category_name',
                                'title',
                              ],
                              'Category'
                            )}
                          </option>
                        )
                      }
                    )}

                  </select>

                </ProductFormField>


                <ProductFormField
                  label="Selling Price (LKR)"
                >
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      productForm.price
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          price:
                            event.target.value,
                        })
                      )
                    }
                  />
                </ProductFormField>


                <ProductFormField
                  label="Original Price (LKR) - Optional"
                >
                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Leave empty for no discount"
                      value={
                        productForm.comparePrice
                      }
                      onChange={(event) =>
                        setProductForm(
                          (
                            current
                          ) => ({
                            ...current,

                            comparePrice:
                              event.target.value,
                          })
                        )
                      }
                    />

                    {Number(
                      productForm.comparePrice
                    ) >
                      Number(
                        productForm.price
                      ) &&
                      Number(
                        productForm.comparePrice
                      ) >
                        0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: '#e7f7f0',
                              color: '#08735f',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {Math.round(
                              (
                                (
                                  Number(
                                    productForm.comparePrice
                                  ) -
                                  Number(
                                    productForm.price
                                  )
                                ) /
                                Number(
                                  productForm.comparePrice
                                )
                              ) *
                                100
                            )}% OFF
                          </span>

                          <small
                            style={{
                              color: '#718078',
                              fontSize: '11px',
                            }}
                          >
                            Discount is calculated automatically.
                          </small>
                        </div>
                      )}
                  </div>
                </ProductFormField>


                <ProductFormField
                  label="Stock"
                >
                  <input
                    type="number"
                    min="0"
                    value={
                      productForm.stock
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          stock:
                            event.target.value,
                        })
                      )
                    }
                  />
                </ProductFormField>


                <ProductFormField
                  label="Low Stock Level"
                >
                  <input
                    type="number"
                    min="0"
                    value={
                      productForm.threshold
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          threshold:
                            event.target.value,
                        })
                      )
                    }
                  />
                </ProductFormField>


                <div className="product-form-field product-form-full">
                  <label>
                    Product Images
                  </label>

                  <div className="product-gallery-editor">

                    <div className="product-gallery-toolbar">

                      <label className="product-gallery-add-button">
                        <ImagePlus
                          size={16}
                        />

                        <span>
                          Add Images
                        </span>

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          onChange={
                            handleProductImagesChange
                          }
                          disabled={
                            galleryLoading ||
                            galleryImages.length >=
                              MAX_PRODUCT_IMAGES
                          }
                        />
                      </label>

                      <span className="product-gallery-count">
                        {galleryImages.length}
                        {' / '}
                        {MAX_PRODUCT_IMAGES}
                      </span>

                    </div>


                    <small className="product-gallery-help">
                      Upload up to 5 JPG, PNG or WEBP images. Maximum 5 MB each.
                      Choose one image as Main. Use the arrow buttons to control
                      the order shown in the mobile app.
                    </small>


                    {galleryLoading ? (

                      <div className="product-gallery-empty">
                        Loading product images...
                      </div>

                    ) : galleryImages.length === 0 ? (

                      <div className="product-gallery-empty">
                        No product images selected yet.
                      </div>

                    ) : (

                      <div className="product-gallery-grid">

                        {galleryImages.map(
                          (
                            image,
                            index
                          ) => {

                            const imageSrc =
                              getGalleryImageSrc(
                                image
                              )

                            return (
                              <div
                                key={
                                  image.key
                                }
                                className={`product-gallery-card ${
                                  image.isPrimary
                                    ? 'is-primary'
                                    : ''
                                }`}
                              >

                                <div className="product-gallery-image-box">

                                  {imageSrc ? (
                                    <img
                                      src={
                                        imageSrc
                                      }
                                      alt={`Product ${index + 1}`}
                                    />
                                  ) : (
                                    <Package
                                      size={24}
                                    />
                                  )}

                                  {image.isPrimary && (
                                    <span className="product-gallery-primary-badge">
                                      Main
                                    </span>
                                  )}

                                </div>


                                <div className="product-gallery-card-info">

                                  <strong>
                                    {image.file
                                      ? image.file.name
                                      : `Image ${index + 1}`}
                                  </strong>

                                  <span>
                                    Position {index + 1}
                                  </span>

                                </div>


                                <div className="product-gallery-card-actions">

                                  <button
                                    type="button"
                                    className="product-gallery-main-button"
                                    disabled={
                                      image.isPrimary
                                    }
                                    onClick={() =>
                                      setPrimaryGalleryImage(
                                        image.key
                                      )
                                    }
                                  >
                                    {image.isPrimary
                                      ? 'Main Image'
                                      : 'Set Main'}
                                  </button>


                                  <div className="product-gallery-order-actions">

                                    <button
                                      type="button"
                                      title="Move left"
                                      disabled={
                                        index === 0
                                      }
                                      onClick={() =>
                                        moveGalleryImage(
                                          index,
                                          -1
                                        )
                                      }
                                    >
                                      <ChevronLeft
                                        size={14}
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      title="Move right"
                                      disabled={
                                        index ===
                                        galleryImages.length -
                                          1
                                      }
                                      onClick={() =>
                                        moveGalleryImage(
                                          index,
                                          1
                                        )
                                      }
                                    >
                                      <ChevronRight
                                        size={14}
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      className="product-gallery-remove-button"
                                      title="Remove image"
                                      onClick={() =>
                                        removeGalleryImage(
                                          image.key
                                        )
                                      }
                                    >
                                      <Trash2
                                        size={14}
                                      />
                                    </button>

                                  </div>

                                </div>

                              </div>
                            )
                          }
                        )}

                      </div>
                    )}

                  </div>
                </div>


                <ProductFormField
                  label="Status"
                >

                  <select
                    value={
                      productForm.active
                        ? 'active'
                        : 'inactive'
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          active:
                            event.target.value ===
                            'active',
                        })
                      )
                    }
                  >

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                  </select>

                </ProductFormField>


                <div className="product-form-field product-form-full">

                  <label>
                    Description
                  </label>

                  <textarea
                    rows="4"
                    value={
                      productForm.description
                    }
                    onChange={(event) =>
                      setProductForm(
                        (
                          current
                        ) => ({
                          ...current,

                          description:
                            event.target.value,
                        })
                      )
                    }
                  />

                </div>

              </div>


              <div className="product-modal-footer">

                <button
                  type="button"
                  className="product-modal-secondary"
                  onClick={() =>
                    setFormModalOpen(
                      false
                    )
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="product-modal-primary"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                      ? 'Save Changes'
                      : 'Add Product'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* VIEW MODAL */}

      {viewModalOpen &&
        selectedProduct && (

        <div className="product-modal-overlay">

          <div className="product-management-modal">

            <div className="product-modal-header">

              <div>

                <h2>
                  Product Details
                </h2>

                <p>
                  Lucky Hub product information
                </p>

              </div>


              <button
                type="button"
                className="product-modal-close"
                onClick={() =>
                  setViewModalOpen(
                    false
                  )
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>


            <div className="product-view-body">

              <div className="product-view-top">

                <div className="product-view-large-image">

                  {getImage(
                    selectedProduct
                  ) ? (

                    <img
                      src={
                        getImage(
                          selectedProduct
                        )
                      }
                      alt={
                        getProductName(
                          selectedProduct
                        )
                      }
                    />

                  ) : (

                    <Package
                      size={38}
                    />

                  )}

                </div>


                <div>

                  <h3>
                    {getProductName(
                      selectedProduct
                    )}
                  </h3>

                  <span>
                    SKU:{' '}
                    {getSku(
                      selectedProduct
                    )}
                  </span>

                  <p>
                    {getDescription(
                      selectedProduct
                    ) ||
                      'No description available.'}
                  </p>

                </div>

              </div>


              <div className="product-detail-grid">

                <ProductDetail
                  label="Category"
                  value={
                    getCategoryName(
                      selectedProduct
                    )
                  }
                />

                <ProductDetail
                  label="Selling Price"
                  value={
                    formatCurrency(
                      getPrice(
                        selectedProduct
                      )
                    )
                  }
                />

                {getDiscountPercent(
                  selectedProduct
                ) > 0 && (
                  <>
                    <ProductDetail
                      label="Original Price"
                      value={
                        formatCurrency(
                          getCompareAtPrice(
                            selectedProduct
                          )
                        )
                      }
                    />

                    <ProductDetail
                      label="Discount"
                      value={`${getDiscountPercent(
                        selectedProduct
                      )}% OFF`}
                    />
                  </>
                )}

                <ProductDetail
                  label="Stock"
                  value={
                    getStock(
                      selectedProduct
                    )
                  }
                />

                <ProductDetail
                  label="Minimum Stock"
                  value={
                    getThreshold(
                      selectedProduct
                    )
                  }
                />

                <ProductDetail
                  label="Stock Status"
                  value={
                    getStockStatus(
                      selectedProduct
                    ).label
                  }
                />

                <ProductDetail
                  label="Product Status"
                  value={
                    getActiveState(
                      selectedProduct
                    )
                      ? 'Active'
                      : 'Inactive'
                  }
                />

              </div>

            </div>


            <div className="product-modal-footer">

              <button
                type="button"
                className="product-modal-secondary"
                onClick={() =>
                  setViewModalOpen(
                    false
                  )
                }
              >
                Close
              </button>


              <button
                type="button"
                className="product-modal-primary"
                onClick={() => {
                  setViewModalOpen(
                    false
                  )

                  openEditProduct(
                    selectedProduct
                  )
                }}
              >
                <Edit3
                  size={15}
                />

                Edit Product
              </button>

            </div>

          </div>

        </div>

      )}


      {/* STOCK MODAL */}

      {stockModalOpen &&
        stockProduct && (

        <div className="product-modal-overlay">

          <div className="product-management-modal product-stock-modal">

            <div className="product-modal-header">

              <div>

                <h2>
                  Update Stock
                </h2>

                <p>
                  {getProductName(
                    stockProduct
                  )}
                </p>

              </div>


              <button
                type="button"
                className="product-modal-close"
                onClick={() =>
                  setStockModalOpen(
                    false
                  )
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>


            <div className="product-stock-body">

              <label>
                Stock Quantity
              </label>

              <input
                type="number"
                min="0"
                value={
                  stockValue
                }
                onChange={(event) =>
                  setStockValue(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="product-modal-footer">

              <button
                type="button"
                className="product-modal-secondary"
                onClick={() =>
                  setStockModalOpen(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="product-modal-primary"
                onClick={
                  saveStock
                }
              >
                Update Stock
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}


/* =========================================
   SUMMARY CARD
========================================= */

function SummaryCard({
  title,
  value,
  note,
  tone,
  icon: Icon,
}) {
  return (
    <div className="product-summary-card">

      <div
        className={`summary-icon summary-icon-${tone}`}
      >
        <Icon
          size={22}
        />
      </div>


      <div className="summary-card-content">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small
          className={`summary-note summary-note-${tone}`}
        >
          {note}
        </small>

      </div>


      <svg
        className={`summary-line summary-line-${tone}`}
        viewBox="0 0 70 30"
        fill="none"
      >
        <path
          d="M2 26 C12 26, 13 17, 24 19 C35 21, 37 10, 49 12 C58 13, 63 5, 68 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

    </div>
  )
}


/* =========================================
   FILTER SELECT
========================================= */

function FilterSelect({
  children,
}) {
  return (
    <div className="filter-select">

      {children}

      <ChevronDown
        size={14}
      />

    </div>
  )
}


/* =========================================
   FORM FIELD
========================================= */

function ProductFormField({
  label,
  children,
}) {
  return (
    <div className="product-form-field">

      <label>
        {label}
      </label>

      {children}

    </div>
  )
}


/* =========================================
   PRODUCT DETAIL
========================================= */

function ProductDetail({
  label,
  value,
}) {
  return (
    <div className="product-detail-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  )
}


/* =========================================
   TABLE FOOTER
========================================= */

function ProductsFooter({
  currentPage,
  totalPages,
  filteredCount,
  paginationItems,
  setCurrentPage,
}) {
  return (
    <div className="products-table-footer">

      <span>

        Showing{' '}

        {filteredCount === 0
          ? 0
          : (
              currentPage -
              1
            ) *
              PAGE_SIZE +
            1}

        {' '}to{' '}

        {Math.min(
          currentPage *
            PAGE_SIZE,
          filteredCount
        )}

        {' '}of{' '}

        {filteredCount}

        {' '}products

      </span>


      <div className="products-pagination">

        <button
          type="button"
          className="pagination-arrow"
          disabled={
            currentPage === 1
          }
          onClick={() =>
            setCurrentPage(
              (page) =>
                Math.max(
                  1,
                  page - 1
                )
            )
          }
        >
          <ChevronLeft
            size={14}
          />
        </button>


        {paginationItems.map(
          (item) => {
            if (
              typeof item ===
              'string'
            ) {
              return (
                <span
                  key={item}
                  className="pagination-dots"
                >
                  ...
                </span>
              )
            }

            return (
              <button
                key={item}
                type="button"
                className={`pagination-page ${
                  currentPage ===
                  item
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setCurrentPage(
                    item
                  )
                }
              >
                {item}
              </button>
            )
          }
        )}


        <button
          type="button"
          className="pagination-arrow"
          disabled={
            currentPage ===
            totalPages
          }
          onClick={() =>
            setCurrentPage(
              (page) =>
                Math.min(
                  totalPages,
                  page + 1
                )
            )
          }
        >
          <ChevronRight
            size={14}
          />
        </button>

      </div>

    </div>
  )
}

export default Products