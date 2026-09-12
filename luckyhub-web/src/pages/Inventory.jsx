import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Download,
  Eye,
  MoreVertical,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Save,
  WalletCards,
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
import './Inventory.css'

const PAGE_SIZE = 8

function Inventory() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortBy, setSortBy] = useState('stock-low')

  const [currentPage, setCurrentPage] = useState(1)

  // Inventory row actions
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [stockValue, setStockValue] = useState('')
  const [minimumStockValue, setMinimumStockValue] = useState('')
  const [savingStock, setSavingStock] = useState(false)
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
    if (!object) return fallback

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

  const toNumber = (value) => {
    const number = Number(value)

    return Number.isFinite(number)
      ? number
      : 0
  }

  const getExistingKey = (
    object,
    keys
  ) => {
    if (!object) return null

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

  /* =========================================
     LOAD DATA
  ========================================= */

  const loadInventory = async (
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
        supabase
          .from('products')
          .select('*'),

        supabase
          .from('categories')
          .select('*'),
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
        'Inventory load error:',
        loadError
      )

      setError(
        'Inventory data could not be loaded. Please check your Supabase connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    const closeMenu = () => {
      setMenuProduct(null)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuProduct(null)
        setStockModalOpen(false)
        setDetailsModalOpen(false)
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

  /* =========================================
     CATEGORY MAP
  ========================================= */

  const categoryMap = useMemo(() => {
    const map = new Map()

    categories.forEach(
      (category) => {
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
      }
    )

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

  const getProductImage = (
    product
  ) => {
    const image = getValue(
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
        typeof first ===
        'string'
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

  const getProductCategory = (
    product
  ) => {
    const direct = getValue(
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

    if (
      direct &&
      typeof direct === 'object'
    ) {
      return (
        direct.name ||
        direct.category_name ||
        'Uncategorized'
      )
    }

    if (product.categories) {
      return (
        product.categories.name ||
        product.categories.category_name ||
        'Uncategorized'
      )
    }

    const categoryId =
      getValue(
        product,
        [
          'category_id',
          'categoryId',
        ],
        null
      )

    if (categoryId !== null) {
      return (
        categoryMap.get(
          String(categoryId)
        ) ||
        'Uncategorized'
      )
    }

    return 'Uncategorized'
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

  const getMinimumStock = (
    product
  ) => {
    return toNumber(
      getValue(
        product,
        [
          'low_stock_threshold',
          'reorder_level',
          'minimum_stock',
          'min_stock',
        ],
        5
      )
    )
  }

  const getPrice = (
    product
  ) => {
    return toNumber(
      getValue(
        product,
        [
          'price',
          'selling_price',
          'unit_price',
          'sale_price',
        ],
        0
      )
    )
  }

  const getLastUpdated = (
    product
  ) => {
    return getValue(
      product,
      [
        'updated_at',
        'modified_at',
        'created_at',
      ],
      null
    )
  }

  const getStockStatus = (
    product
  ) => {
    const stock =
      getStock(product)

    const minimum =
      getMinimumStock(product)

    if (stock <= 0) {
      return {
        key: 'out',
        label: 'Out of Stock',
      }
    }

    if (stock <= minimum) {
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

  /* =========================================
     SUMMARY
  ========================================= */

  const stats = useMemo(() => {
    let totalStock = 0
    let lowStock = 0
    let outOfStock = 0
    let stockValue = 0

    products.forEach(
      (product) => {
        const stock =
          getStock(product)

        const price =
          getPrice(product)

        const status =
          getStockStatus(product)

        totalStock += stock

        stockValue +=
          stock * price

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
      }
    )

    return {
      totalStock,
      lowStock,
      outOfStock,
      stockValue,
    }
  }, [products])

  /* =========================================
     CATEGORY OPTIONS
  ========================================= */

  const categoryOptions =
    useMemo(() => {
      const values =
        new Set()

      products.forEach(
        (product) => {
          values.add(
            getProductCategory(
              product
            )
          )
        }
      )

      return Array.from(
        values
      )
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.localeCompare(b)
        )
    }, [
      products,
      categoryMap,
    ])

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
        products.filter(
          (product) => {
            const name =
              getProductName(
                product
              ).toLowerCase()

            const category =
              getProductCategory(
                product
              ).toLowerCase()

            const stockStatus =
              getStockStatus(
                product
              ).key

            const matchesSearch =
              !query ||
              name.includes(
                query
              ) ||
              category.includes(
                query
              )

            const matchesCategory =
              categoryFilter ===
                'all' ||
              category ===
                categoryFilter
                  .toLowerCase()

            const matchesStock =
              stockFilter ===
                'all' ||
              stockStatus ===
                stockFilter

            return (
              matchesSearch &&
              matchesCategory &&
              matchesStock
            )
          }
        )

      result = [...result]

      result.sort(
        (a, b) => {
          if (
            sortBy ===
            'stock-low'
          ) {
            return (
              getStock(a) -
              getStock(b)
            )
          }

          if (
            sortBy ===
            'stock-high'
          ) {
            return (
              getStock(b) -
              getStock(a)
            )
          }

          if (
            sortBy ===
            'name'
          ) {
            return getProductName(
              a
            ).localeCompare(
              getProductName(b)
            )
          }

          if (
            sortBy ===
            'updated'
          ) {
            return (
              new Date(
                getLastUpdated(
                  b
                ) || 0
              ).getTime() -
              new Date(
                getLastUpdated(
                  a
                ) || 0
              ).getTime()
            )
          }

          return 0
        }
      )

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

  /* =========================================
     FORMATTERS
  ========================================= */

  const formatCurrency = (
    amount
  ) => {
    return new Intl.NumberFormat(
      'en-LK',
      {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0,
      }
    ).format(
      amount || 0
    )
  }

  const formatDate = (
    value
  ) => {
    if (!value) {
      return '—'
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—'
    }

    return new Intl.DateTimeFormat(
      'en-LK',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(date)
  }

  /* =========================================
     INVENTORY ACTIONS
  ========================================= */

  const openMoreMenu = (
    event,
    product
  ) => {
    event.stopPropagation()

    const rect =
      event.currentTarget.getBoundingClientRect()

    const menuWidth = 200

    let left =
      rect.right - menuWidth

    if (left < 10) {
      left = 10
    }

    setMenuPosition({
      top: rect.bottom + 6,
      left,
    })

    setMenuProduct(product)
  }

  const openStockEditor = (
    product
  ) => {
    setMenuProduct(null)
    setSelectedProduct(product)

    setStockValue(
      String(
        getStock(product)
      )
    )

    setMinimumStockValue(
      String(
        getMinimumStock(
          product
        )
      )
    )

    setStockModalOpen(true)
  }

  const openInventoryDetails = (
    product
  ) => {
    setMenuProduct(null)
    setSelectedProduct(product)
    setDetailsModalOpen(true)
  }

  const saveInventoryStock = async (
    event
  ) => {
    event.preventDefault()

    if (!selectedProduct) {
      return
    }

    const nextStock =
      Number(stockValue)

    const nextMinimum =
      Number(minimumStockValue)

    if (
      !Number.isFinite(nextStock) ||
      nextStock < 0
    ) {
      window.alert(
        'Enter a valid stock quantity.'
      )

      return
    }

    if (
      !Number.isFinite(
        nextMinimum
      ) ||
      nextMinimum < 0
    ) {
      window.alert(
        'Enter a valid minimum stock quantity.'
      )

      return
    }

    const idKey =
      getExistingKey(
        selectedProduct,
        [
          'id',
          'product_id',
        ]
      )

    const stockKey =
      getExistingKey(
        selectedProduct,
        [
          'stock_quantity',
          'stock',
          'quantity',
          'qty',
          'available_stock',
        ]
      )

    const minimumKey =
      getExistingKey(
        selectedProduct,
        [
          'low_stock_threshold',
          'reorder_level',
          'minimum_stock',
          'min_stock',
        ]
      )

    if (!idKey) {
      window.alert(
        'Product ID column could not be detected.'
      )

      return
    }

    if (!stockKey) {
      window.alert(
        'Stock column could not be detected in your products table.'
      )

      return
    }

    const payload = {
      [stockKey]: nextStock,
    }

    if (minimumKey) {
      payload[minimumKey] =
        nextMinimum
    }

    if (
      Object.prototype.hasOwnProperty.call(
        selectedProduct,
        'updated_at'
      )
    ) {
      payload.updated_at =
        new Date().toISOString()
    }

    setSavingStock(true)

    try {
      const { error: updateError } =
        await supabase
          .from('products')
          .update(payload)
          .eq(
            idKey,
            selectedProduct[idKey]
          )

      if (updateError) {
        throw updateError
      }

      setStockModalOpen(false)
      setSelectedProduct(null)

      await loadInventory(true)
    } catch (updateError) {
      console.error(
        'Inventory stock update error:',
        updateError
      )

      window.alert(
        updateError?.message ||
        'Inventory stock could not be updated.'
      )
    } finally {
      setSavingStock(false)
    }
  }

  /* =========================================
     EXPORT PDF
  ========================================= */

  const exportInventory = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth =
        doc.internal.pageSize.getWidth()

      const generatedDate =
        new Intl.DateTimeFormat(
          'en-LK',
          {
            timeZone: 'Asia/Colombo',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        ).format(new Date())

      const filteredStats =
        filteredProducts.reduce(
          (result, product) => {
            const stock =
              getStock(product)

            const minimum =
              getMinimumStock(product)

            const price =
              getPrice(product)

            result.totalStock +=
              stock

            result.stockValue +=
              stock * price

            if (stock <= 0) {
              result.outOfStock += 1
            } else if (
              stock <= minimum
            ) {
              result.lowStock += 1
            }

            return result
          },
          {
            totalStock: 0,
            lowStock: 0,
            outOfStock: 0,
            stockValue: 0,
          }
        )

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

      doc.setFontSize(18)

      doc.text(
        'Lucky Hub',
        14,
        11
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(8)

      doc.text(
        'Management Portal',
        14,
        17
      )

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(14)

      doc.text(
        'INVENTORY REPORT',
        pageWidth - 14,
        11,
        {
          align: 'right',
        }
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(8)

      doc.text(
        `Generated: ${generatedDate}`,
        pageWidth - 14,
        17,
        {
          align: 'right',
        }
      )

      doc.setTextColor(
        25,
        43,
        38
      )

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(16)

      doc.text(
        'Inventory Stock Report',
        14,
        38
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(9)

      doc.setTextColor(
        105,
        125,
        118
      )

      doc.text(
        'Lucky Hub stationery and printing management system',
        14,
        44
      )

      const summaryData = [
        {
          label: 'Total Stock',
          value:
            filteredStats.totalStock,
        },
        {
          label: 'Low Stock Items',
          value:
            filteredStats.lowStock,
        },
        {
          label: 'Out of Stock',
          value:
            filteredStats.outOfStock,
        },
        {
          label: 'Stock Value',
          value:
            formatCurrency(
              filteredStats.stockValue
            ),
        },
      ]

      const boxWidth = 57
      const boxHeight = 18
      const boxGap = 6

      summaryData.forEach(
        (item, index) => {
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

          doc.setFontSize(7.5)

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
            typeof item.value ===
            'string'
              ? 9.5
              : 13
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

      let stockText =
        'All Stock Status'

      if (
        stockFilter === 'in'
      ) {
        stockText =
          'In Stock'
      }

      if (
        stockFilter === 'low'
      ) {
        stockText =
          'Low Stock'
      }

      if (
        stockFilter === 'out'
      ) {
        stockText =
          'Out of Stock'
      }

      let filterText =
        `Category: ${
          categoryFilter === 'all'
            ? 'All Categories'
            : categoryFilter
        } | Stock: ${stockText}`

      if (search.trim()) {
        filterText +=
          ` | Search: ${search.trim()}`
      }

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(8)

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

      const tableRows =
        filteredProducts.map(
          (product, index) => [
            index + 1,
            getProductName(
              product
            ),
            getProductCategory(
              product
            ),
            getStock(
              product
            ),
            getMinimumStock(
              product
            ),
            getStockStatus(
              product
            ).label,
            formatCurrency(
              getPrice(
                product
              )
            ),
            formatCurrency(
              getPrice(
                product
              ) *
                getStock(
                  product
                )
            ),
            formatDate(
              getLastUpdated(
                product
              )
            ),
          ]
        )

      autoTable(
        doc,
        {
          startY: 82,

          head: [
            [
              'No.',
              'Product',
              'Category',
              'Current Stock',
              'Minimum Stock',
              'Status',
              'Unit Price',
              'Stock Value',
              'Last Updated',
            ],
          ],

          body: tableRows,

          theme: 'grid',

          margin: {
            left: 10,
            right: 10,
            bottom: 18,
          },

          styles: {
            font: 'helvetica',
            fontSize: 7,
            cellPadding: 2.3,
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
            lineWidth: 0.2,
            valign: 'middle',
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
            fontStyle: 'bold',
            fontSize: 7,
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
              cellWidth: 10,
              halign: 'center',
            },
            1: {
              cellWidth: 48,
            },
            2: {
              cellWidth: 45,
            },
            3: {
              cellWidth: 24,
              halign: 'center',
            },
            4: {
              cellWidth: 24,
              halign: 'center',
            },
            5: {
              cellWidth: 28,
              halign: 'center',
            },
            6: {
              cellWidth: 28,
              halign: 'right',
            },
            7: {
              cellWidth: 32,
              halign: 'right',
            },
            8: {
              cellWidth: 28,
              halign: 'center',
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

            doc.setFontSize(7.5)

            doc.setTextColor(
              120,
              136,
              131
            )

            doc.text(
              'Lucky Hub Management Portal - Inventory',
              10,
              pageHeight - 8
            )

            doc.text(
              `Page ${pageNumber}`,
              pageWidth - 10,
              pageHeight - 8,
              {
                align: 'right',
              }
            )
          },
        }
      )

      const fileDate =
        new Intl.DateTimeFormat(
          'en-CA',
          {
            timeZone:
              'Asia/Colombo',
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
        `Lucky-Hub-Inventory-${fileDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'Inventory PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate inventory PDF.'
      )
    }
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="inventory-page">

      {/* HEADER */}

      <div className="inventory-page-header">

        <div>

          <h1>
            Inventory
          </h1>

          <p>
            Track stock levels and
            manage inventory.
          </p>

        </div>


        <div className="inventory-header-actions">

          <div className="inventory-search">

            <Search size={16} />

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

            <span>
              Ctrl + K
            </span>

          </div>


          <button
            type="button"
            className="inventory-refresh-button"
            onClick={() =>
              loadInventory(true)
            }
            disabled={
              refreshing
            }
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'inventory-spin'
                  : ''
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="inventory-export-button"
            onClick={
              exportInventory
            }
          >

            <Download
              size={16}
            />

            

            Export PDF

          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="inventory-error">

          <AlertTriangle
            size={16}
          />

          {error}

        </div>
      )}


      {/* SUMMARY CARDS */}

      <div className="inventory-summary-grid">

        <InventorySummaryCard
          title="Total Stock"
          value={
            loading
              ? '—'
              : stats.totalStock
          }
          icon={Boxes}
          tone="green"
          note="Available units"
        />


        <InventorySummaryCard
          title="Low Stock Items"
          value={
            loading
              ? '—'
              : stats.lowStock
          }
          icon={
            AlertTriangle
          }
          tone="orange"
          note="Need attention"
        />


        <InventorySummaryCard
          title="Out of Stock Items"
          value={
            loading
              ? '—'
              : stats.outOfStock
          }
          icon={CircleOff}
          tone="red"
          note="Restock required"
        />


        <InventorySummaryCard
          title="Stock Value"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.stockValue
                )
          }
          icon={WalletCards}
          tone="yellow"
          note="Current inventory value"
          currency
        />

      </div>


      {/* FILTERS */}

      <div className="inventory-filter-row">

        <div className="inventory-filters">

          <div className="inventory-select">

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

              {categoryOptions.map(
                (category) => (
                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {category}
                  </option>
                )
              )}

            </select>

            <ChevronDown
              size={14}
            />

          </div>


          <div className="inventory-select">

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

            <ChevronDown
              size={14}
            />

          </div>


          <div className="inventory-select">

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
            >

              <option value="stock-low">
                Sort: Stock Low to High
              </option>

              <option value="stock-high">
                Sort: Stock High to Low
              </option>

              <option value="name">
                Sort: Product Name
              </option>

              <option value="updated">
                Sort: Last Updated
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>

        </div>

      </div>


      {/* TABLE */}

      <div className="inventory-table-card">

        <div className="inventory-table-wrapper">

          <table className="inventory-table">

            <thead>

              <tr>

                <th className="inventory-checkbox-column">

                  <input
                    type="checkbox"
                    aria-label="Select all"
                  />

                </th>

                <th>
                  Product
                </th>

                <th>
                  Category
                </th>

                <th>
                  Current Stock
                </th>

                <th>
                  Minimum Stock
                </th>

                <th>
                  Status
                </th>

                <th>
                  Last Updated
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
                    className="inventory-empty"
                  >
                    Loading inventory...
                  </td>

                </tr>

              ) : paginatedProducts.length === 0 ? (

                <tr>

                  <td
                    colSpan="8"
                    className="inventory-empty"
                  >
                    No inventory records found.
                  </td>

                </tr>

              ) : (

                paginatedProducts.map(
                  (
                    product,
                    index
                  ) => {
                    const name =
                      getProductName(
                        product
                      )

                    const category =
                      getProductCategory(
                        product
                      )

                    const stock =
                      getStock(
                        product
                      )

                    const minimum =
                      getMinimumStock(
                        product
                      )

                    const status =
                      getStockStatus(
                        product
                      )

                    const image =
                      getProductImage(
                        product
                      )

                    return (
                      <tr
                        key={
                          getProductId(
                            product
                          ) ||
                          `${name}-${index}`
                        }
                      >

                        <td className="inventory-checkbox-column">

                          <input
                            type="checkbox"
                            aria-label={`Select ${name}`}
                          />

                        </td>


                        <td>

                          <div className="inventory-product-cell">

                            <div className="inventory-product-image">

                              {image ? (
                                <img
                                  src={
                                    image
                                  }
                                  alt={
                                    name
                                  }
                                />
                              ) : (
                                <Package
                                  size={18}
                                />
                              )}

                            </div>


                            <strong>
                              {name}
                            </strong>

                          </div>

                        </td>


                        <td>

                          <span className="inventory-category">

                            {category}

                          </span>

                        </td>


                        <td>

                          <strong
                            className={
                              stock <=
                              minimum
                                ? 'inventory-stock inventory-stock-warning'
                                : 'inventory-stock'
                            }
                          >
                            {stock}
                          </strong>

                        </td>


                        <td>

                          <span className="minimum-stock">

                            {minimum}

                          </span>

                        </td>


                        <td>

                          <span
                            className={`inventory-status inventory-status-${status.key}`}
                          >

                            <span className="inventory-status-dot" />

                            {status.label}

                          </span>

                        </td>


                        <td className="inventory-updated">

                          {formatDate(
                            getLastUpdated(
                              product
                            )
                          )}

                        </td>


                        <td>

                          <div className="inventory-row-actions">

                            <button
                              type="button"
                              title="Update stock"
                              onClick={() =>
                                openStockEditor(
                                  product
                                )
                              }
                            >

                              <Pencil
                                size={14}
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
                                size={14}
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


        {/* FOOTER */}

        <div className="inventory-table-footer">

          <span>

            Showing{' '}

            {filteredProducts.length ===
            0
              ? 0
              : (currentPage - 1) *
                  PAGE_SIZE +
                1}

            {' '}to{' '}

            {Math.min(
              currentPage *
                PAGE_SIZE,
              filteredProducts.length
            )}

            {' '}of{' '}

            {filteredProducts.length}

            {' '}products

          </span>


          <div className="inventory-pagination">

            <button
              type="button"
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


            {Array.from(
              {
                length:
                  totalPages,
              },
              (_, index) =>
                index + 1
            )
              .slice(0, 6)
              .map((page) => (

                <button
                  type="button"
                  key={page}
                  className={
                    currentPage ===
                    page
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentPage(
                      page
                    )
                  }
                >
                  {page}
                </button>

              ))}


            <button
              type="button"
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

      </div>


      {/* INVENTORY ACTION MENU */}

      {menuProduct && (
        <div
          onClick={(event) =>
            event.stopPropagation()
          }
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            width: 200,
            zIndex: 2000,
            overflow: 'hidden',
            border: '1px solid #dbe6e2',
            borderRadius: 10,
            background: '#ffffff',
            boxShadow: '0 14px 32px rgba(20, 55, 47, 0.16)',
          }}
        >
          <button
            type="button"
            onClick={() =>
              openInventoryDetails(
                menuProduct
              )
            }
            style={inventoryMenuButtonStyle}
          >
            <Eye size={15} />
            View Details
          </button>

          <button
            type="button"
            onClick={() =>
              openStockEditor(
                menuProduct
              )
            }
            style={inventoryMenuButtonStyle}
          >
            <Pencil size={15} />
            Update Stock
          </button>
        </div>
      )}


      {/* UPDATE STOCK MODAL */}

      {stockModalOpen &&
        selectedProduct && (
        <div
          style={inventoryModalOverlayStyle}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setStockModalOpen(false)
            }
          }}
        >
          <div
            style={inventoryModalStyle}
          >
            <div
              style={inventoryModalHeaderStyle}
            >
              <div>
                <h2
                  style={inventoryModalTitleStyle}
                >
                  Update Inventory
                </h2>

                <p
                  style={inventoryModalSubtitleStyle}
                >
                  {getProductName(
                    selectedProduct
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setStockModalOpen(
                    false
                  )
                }
                style={inventoryCloseButtonStyle}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                saveInventoryStock
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  padding: '20px 22px',
                }}
              >
                <label
                  style={inventoryFieldStyle}
                >
                  <span
                    style={inventoryLabelStyle}
                  >
                    Current Stock
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockValue}
                    onChange={(event) =>
                      setStockValue(
                        event.target.value
                      )
                    }
                    style={inventoryInputStyle}
                    autoFocus
                  />
                </label>

                <label
                  style={inventoryFieldStyle}
                >
                  <span
                    style={inventoryLabelStyle}
                  >
                    Minimum Stock
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      minimumStockValue
                    }
                    onChange={(event) =>
                      setMinimumStockValue(
                        event.target.value
                      )
                    }
                    style={inventoryInputStyle}
                  />
                </label>
              </div>

              <div
                style={inventoryModalFooterStyle}
              >
                <button
                  type="button"
                  onClick={() =>
                    setStockModalOpen(
                      false
                    )
                  }
                  style={inventorySecondaryButtonStyle}
                  disabled={savingStock}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={inventoryPrimaryButtonStyle}
                  disabled={savingStock}
                >
                  <Save size={15} />
                  {savingStock
                    ? 'Saving...'
                    : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* INVENTORY DETAILS MODAL */}

      {detailsModalOpen &&
        selectedProduct && (
        <div
          style={inventoryModalOverlayStyle}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDetailsModalOpen(false)
            }
          }}
        >
          <div
            style={inventoryModalStyle}
          >
            <div
              style={inventoryModalHeaderStyle}
            >
              <div>
                <h2
                  style={inventoryModalTitleStyle}
                >
                  Inventory Details
                </h2>

                <p
                  style={inventoryModalSubtitleStyle}
                >
                  {getProductName(
                    selectedProduct
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailsModalOpen(
                    false
                  )
                }
                style={inventoryCloseButtonStyle}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '20px 22px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <InventoryDetailItem
                  label="Category"
                  value={getProductCategory(
                    selectedProduct
                  )}
                />

                <InventoryDetailItem
                  label="Status"
                  value={getStockStatus(
                    selectedProduct
                  ).label}
                />

                <InventoryDetailItem
                  label="Current Stock"
                  value={getStock(
                    selectedProduct
                  )}
                />

                <InventoryDetailItem
                  label="Minimum Stock"
                  value={getMinimumStock(
                    selectedProduct
                  )}
                />

                <InventoryDetailItem
                  label="Unit Price"
                  value={formatCurrency(
                    getPrice(
                      selectedProduct
                    )
                  )}
                />

                <InventoryDetailItem
                  label="Stock Value"
                  value={formatCurrency(
                    getPrice(
                      selectedProduct
                    ) *
                    getStock(
                      selectedProduct
                    )
                  )}
                />

                <InventoryDetailItem
                  label="Last Updated"
                  value={formatDate(
                    getLastUpdated(
                      selectedProduct
                    )
                  )}
                />
              </div>
            </div>

            <div
              style={inventoryModalFooterStyle}
            >
              <button
                type="button"
                onClick={() =>
                  setDetailsModalOpen(
                    false
                  )
                }
                style={inventorySecondaryButtonStyle}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailsModalOpen(
                    false
                  )

                  openStockEditor(
                    selectedProduct
                  )
                }}
                style={inventoryPrimaryButtonStyle}
              >
                <Pencil size={15} />
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
   ACTION UI STYLES
========================================= */

const inventoryMenuButtonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '11px 13px',
  border: 'none',
  borderBottom: '1px solid #eef3f1',
  background: '#ffffff',
  color: '#35544c',
  fontSize: 12.5,
  fontWeight: 600,
  textAlign: 'left',
}

const inventoryModalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 2500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'rgba(10, 35, 30, 0.38)',
  backdropFilter: 'blur(2px)',
}

const inventoryModalStyle = {
  width: 'min(560px, 100%)',
  overflow: 'hidden',
  border: '1px solid #dce7e3',
  borderRadius: 14,
  background: '#ffffff',
  boxShadow: '0 24px 60px rgba(10, 45, 37, 0.22)',
}

const inventoryModalHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  padding: '18px 22px',
  borderBottom: '1px solid #e7efec',
}

const inventoryModalTitleStyle = {
  margin: 0,
  color: '#18312a',
  fontSize: 19,
  fontWeight: 700,
}

const inventoryModalSubtitleStyle = {
  margin: '5px 0 0',
  color: '#7a8e88',
  fontSize: 12.5,
}

const inventoryCloseButtonStyle = {
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #dce7e3',
  borderRadius: 8,
  background: '#ffffff',
  color: '#5c756e',
}

const inventoryFieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
}

const inventoryLabelStyle = {
  color: '#405b54',
  fontSize: 12,
  fontWeight: 650,
}

const inventoryInputStyle = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  border: '1px solid #d8e4e0',
  borderRadius: 8,
  outline: 'none',
  background: '#ffffff',
  color: '#203a33',
  fontSize: 13,
}

const inventoryModalFooterStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 9,
  padding: '14px 22px',
  borderTop: '1px solid #e7efec',
  background: '#fafcfb',
}

const inventorySecondaryButtonStyle = {
  height: 39,
  padding: '0 16px',
  border: '1px solid #d7e3df',
  borderRadius: 8,
  background: '#ffffff',
  color: '#506861',
  fontSize: 12.5,
  fontWeight: 650,
}

const inventoryPrimaryButtonStyle = {
  height: 39,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '0 17px',
  border: 'none',
  borderRadius: 8,
  background: '#00796b',
  color: '#ffffff',
  fontSize: 12.5,
  fontWeight: 650,
}

function InventoryDetailItem({
  label,
  value,
}) {
  return (
    <div
      style={{
        minHeight: 72,
        padding: '12px 13px',
        border: '1px solid #e2ebe8',
        borderRadius: 9,
        background: '#f8fbfa',
      }}
    >
      <span
        style={{
          display: 'block',
          marginBottom: 7,
          color: '#83938e',
          fontSize: 10.5,
          fontWeight: 600,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: '#28463e',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {value ?? '—'}
      </strong>
    </div>
  )
}


/* =========================================
   SUMMARY CARD
========================================= */

function InventorySummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  note,
  currency = false,
}) {
  return (
    <div className="inventory-summary-card">

      <div
        className={`inventory-summary-icon inventory-summary-icon-${tone}`}
      >

        <Icon size={22} />

      </div>


      <div className="inventory-summary-content">

        <span>
          {title}
        </span>

        <strong
          className={
            currency
              ? 'inventory-summary-currency'
              : ''
          }
        >
          {value}
        </strong>

        <small>
          {note}
        </small>

      </div>

    </div>
  )
}

export default Inventory