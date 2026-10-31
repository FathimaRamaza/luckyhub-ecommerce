import { updateOrderFields } from '../services/orders.js'
import { isRevenueOrder, readAllRows } from '../services/adminData.js'
import { useOrderRefresh } from '../services/useOrderRefresh.js'
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Package,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
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
import './Sales.css'

const PAGE_SIZE = 8
const TIME_ZONE = 'Asia/Colombo'


const actionUi = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 6000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, background: 'rgba(5, 27, 22, 0.52)', backdropFilter: 'blur(2px)',
  },
  modal: {
    width: '100%', maxWidth: 820, maxHeight: '90vh', overflowY: 'auto',
    borderRadius: 15, background: '#fff', boxShadow: '0 24px 70px rgba(0,0,0,.22)',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 18, padding: '19px 22px', borderBottom: '1px solid #e6edeb',
  },
  title: { margin: 0, color: '#18352d', fontSize: 18 },
  subtitle: { margin: '5px 0 0', color: '#7d9089', fontSize: 11.5 },
  close: {
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 0, borderRadius: 8, background: '#f0f5f3', color: '#5d746d', cursor: 'pointer',
  },
  body: { padding: 22 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 },
  item: {
    minHeight: 72, padding: 12, border: '1px solid #e1ebe7', borderRadius: 9,
    background: '#fafcfb', display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: { color: '#81928c', fontSize: 10 },
  value: { color: '#263f38', fontSize: 12.5, fontWeight: 650, wordBreak: 'break-word' },

  section: {
    marginTop: 20,
    paddingTop: 18,
    borderTop: '1px solid #e6edeb',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    background: '#e7f5f1',
    color: '#00796b',
  },
  sectionTitle: {
    margin: 0,
    color: '#203c34',
    fontSize: 14,
    fontWeight: 700,
  },
  sectionSubtitle: {
    margin: '3px 0 0',
    color: '#81928c',
    fontSize: 10.5,
  },
  quantityBadge: {
    minWidth: 34,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 9px',
    borderRadius: 999,
    background: '#fff4d8',
    color: '#a65f00',
    fontSize: 11,
    fontWeight: 700,
  },
  itemsTableWrap: {
    overflowX: 'auto',
    border: '1px solid #dfe9e5',
    borderRadius: 10,
    background: '#fff',
  },
  itemsTable: {
    width: '100%',
    minWidth: 620,
    borderCollapse: 'collapse',
  },
  itemTh: {
    padding: '10px 12px',
    borderBottom: '1px solid #dfe9e5',
    background: '#f4f8f6',
    color: '#4c675f',
    fontSize: 10.5,
    fontWeight: 700,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  itemTd: {
    padding: '11px 12px',
    borderBottom: '1px solid #edf2f0',
    color: '#536c64',
    fontSize: 11.5,
    verticalAlign: 'middle',
  },
  itemName: {
    display: 'block',
    color: '#1f3831',
    fontSize: 12,
    fontWeight: 700,
  },
  itemVariant: {
    display: 'block',
    marginTop: 3,
    color: '#84948f',
    fontSize: 10,
  },
  loadingBox: {
    padding: '26px 14px',
    border: '1px dashed #cfddd8',
    borderRadius: 10,
    background: '#fafcfb',
    color: '#758a83',
    fontSize: 11.5,
    textAlign: 'center',
  },
  totalsBox: {
    marginTop: 12,
    marginLeft: 'auto',
    width: 'min(100%, 340px)',
    padding: 12,
    border: '1px solid #e0e9e6',
    borderRadius: 10,
    background: '#fafcfb',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '5px 0',
    color: '#667d75',
    fontSize: 11.5,
  },
  grandTotalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 5,
    paddingTop: 9,
    borderTop: '1px solid #dfe8e5',
    color: '#183b32',
    fontSize: 13,
    fontWeight: 800,
  },
  deliveryBox: {
    marginTop: 12,
    padding: 12,
    border: '1px solid #e0e9e6',
    borderRadius: 10,
    background: '#fafcfb',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 9, padding: '15px 22px',
    borderTop: '1px solid #e6edeb', background: '#fafcfb', flexWrap: 'wrap',
  },
  button: {
    minHeight: 39, padding: '0 14px', border: '1px solid #d4e0dc', borderRadius: 8,
    background: '#fff', color: '#46635b', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
  },
  primary: {
    minHeight: 39, padding: '0 14px', border: '1px solid #00897b', borderRadius: 8,
    background: '#00897b', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
  },
  danger: {
    minHeight: 39, padding: '0 14px', border: '1px solid #ef4444', borderRadius: 8,
    background: '#fff', color: '#dc3545', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
  },
}


function Sales() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedSale, setSelectedSale] = useState(null)
  const [saleActionLoading, setSaleActionLoading] = useState(false)

  const [saleItems, setSaleItems] = useState([])
  const [saleItemsLoading, setSaleItemsLoading] = useState(false)
  const [saleItemsError, setSaleItemsError] = useState('')

  /* =========================================
     HELPERS
  ========================================= */

  const getValue = (object, keys, fallback = null) => {
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
    return Number.isFinite(number) ? number : 0
  }

  const normalizeStatus = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
  }

  const getStatusLabel = (value) => {
    const status = normalizeStatus(value)
    if (!status) return '—'
    return status.replace(/\b\w/g, (character) => character.toUpperCase())
  }

  /* =========================================
     LOAD SALES
  ========================================= */

  const loadSales = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const { data, error: orderError } = await readAllRows(supabase, 'orders')

      if (orderError) {
        throw orderError
      }

      setOrders(data || [])
    } catch (loadError) {
      console.error('Sales load error:', loadError)

      setError(
        'Sales data could not be loaded. Please check your Supabase connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  /* =========================================
     ORDER HELPERS
  ========================================= */

  const getOrderId = (order) => {
    const value = getValue(
      order,
      [
        'order_number',
        'order_no',
        'order_id',
        'reference',
        'id',
      ],
      '—'
    )

    const text = String(value)

    if (text === '—') return text

    return text.startsWith('#')
      ? text
      : `#${text}`
  }

  const getCustomerName = (order) => {
    return getValue(
      order,
      [
        'customer_name',
        'full_name',
        'name',
        'customer',
      ],
      'Customer'
    )
  }

  const getCustomerPhone = (order) => {
    return getValue(
      order,
      [
        'customer_phone',
        'phone',
        'mobile',
        'contact_number',
      ],
      ''
    )
  }

  const getOrderAmount = (order) => {
    return toNumber(
      getValue(
        order,
        [
          'total_amount',
          'grand_total',
          'total',
          'amount',
          'final_total',
        ],
        0
      )
    )
  }

  const getOrderStatus = (order) => {
    return getValue(
      order,
      [
        'status',
        'order_status',
      ],
      'Pending'
    )
  }

  const getPaymentStatus = (order) => {
    return getValue(
      order,
      [
        'payment_status',
        'paymentStatus',
      ],
      ''
    )
  }

  const getOrderDate = (order) => {
    return getValue(
      order,
      [
        'created_at',
        'order_date',
        'date',
      ],
      null
    )
  }

  const getOrderSubtotal = (order) => {
    return toNumber(
      getValue(
        order,
        [
          'subtotal',
          'sub_total',
        ],
        0
      )
    )
  }

  const getOrderDiscount = (order) => {
    return toNumber(
      getValue(
        order,
        [
          'discount',
          'discount_amount',
        ],
        0
      )
    )
  }

  const getOrderDeliveryFee = (order) => {
    return toNumber(
      getValue(
        order,
        [
          'delivery_fee',
          'delivery_charge',
          'shipping_fee',
        ],
        0
      )
    )
  }

  const getPaymentMethod = (order) => {
    return getValue(
      order,
      [
        'payment_method',
        'paymentMethod',
      ],
      '—'
    )
  }

  const getDeliveryMethod = (order) => {
    return getValue(
      order,
      [
        'delivery_method',
        'deliveryMethod',
      ],
      '—'
    )
  }

  const getDeliveryAddress = (order) => {
    return getValue(
      order,
      [
        'delivery_address',
        'shipping_address',
        'address',
      ],
      ''
    )
  }

  const getOrderNotes = (order) => {
    return getValue(
      order,
      [
        'notes',
        'order_notes',
        'note',
      ],
      ''
    )
  }

  /* =========================================
     ORDER ITEM HELPERS
  ========================================= */

  const getEmbeddedOrderItems = (order) => {
    if (
      Array.isArray(order?.order_items)
    ) {
      return order.order_items
    }

    if (
      Array.isArray(order?.items)
    ) {
      return order.items
    }

    return []
  }

  const getItemName = (item) => {
    return getValue(
      item,
      [
        'product_name',
        'name',
        'title',
      ],
      'Product'
    )
  }

  const getItemVariant = (item) => {
    return getValue(
      item,
      [
        'variant_name',
        'variant',
        'option_name',
      ],
      ''
    )
  }

  const getItemQuantity = (item) => {
    return Math.max(
      0,
      toNumber(
        getValue(
          item,
          [
            'quantity',
            'qty',
          ],
          0
        )
      )
    )
  }

  const getItemUnitPrice = (item) => {
    return toNumber(
      getValue(
        item,
        [
          'unit_price',
          'price',
          'product_price',
        ],
        0
      )
    )
  }

  const getItemSubtotal = (item) => {
    const direct = getValue(
      item,
      [
        'subtotal',
        'line_total',
        'total',
      ],
      null
    )

    if (direct !== null) {
      return toNumber(direct)
    }

    return (
      getItemUnitPrice(item) *
      getItemQuantity(item)
    )
  }

  const getTotalItemQuantity = (items) => {
    return items.reduce(
      (total, item) =>
        total +
        getItemQuantity(item),
      0
    )
  }

  const loadSaleItems = async (order) => {
    setSaleItemsLoading(true)
    setSaleItemsError('')

    try {
      const orderId = getValue(
        order,
        ['id'],
        null
      )

      if (!orderId) {
        const embedded =
          getEmbeddedOrderItems(order)

        setSaleItems(embedded)

        if (embedded.length === 0) {
          setSaleItemsError(
            'No order items were found for this sale.'
          )
        }

        return
      }

      const {
        data,
        error: itemsError,
      } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          unit_price,
          quantity,
          subtotal
        `)
        .eq('order_id', orderId)

      if (itemsError) {
        const embedded =
          getEmbeddedOrderItems(order)

        if (embedded.length > 0) {
          setSaleItems(embedded)
          return
        }

        throw itemsError
      }

      setSaleItems(data || [])

      if (
        !data ||
        data.length === 0
      ) {
        setSaleItemsError(
          'No order items were found for this sale.'
        )
      }
    } catch (itemsLoadError) {
      console.error(
        'Sale items load error:',
        itemsLoadError
      )

      setSaleItems([])

      setSaleItemsError(
        itemsLoadError?.message ||
        'Order items could not be loaded.'
      )
    } finally {
      setSaleItemsLoading(false)
    }
  }

  /* =========================================
     SALE STATUS
  ========================================= */

  const getSaleStatus = (order) => {
    const orderStatus = normalizeStatus(
      getOrderStatus(order)
    )

    if (['cancelled', 'canceled', 'rejected'].includes(orderStatus)) return 'cancelled'
    if (isRevenueOrder(order)) return 'completed'

    return 'pending'
  }

  const formatStatus = (value) => {
    const status = normalizeStatus(value)

    if (!status) return 'Pending'

    return status.replace(
      /\b\w/g,
      (character) => character.toUpperCase()
    )
  }

  /* =========================================
     DATE HELPERS
  ========================================= */

  const getDateKey = (value) => {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).format(date)
  }

  const todayKey = getDateKey(new Date())

  const isToday = (value) => {
    return getDateKey(value) === todayKey
  }

  const isWithinDays = (value, days) => {
    if (!value) return false

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return false
    }

    const difference =
      Date.now() - date.getTime()

    const dayDifference =
      difference /
      (1000 * 60 * 60 * 24)

    return (
      dayDifference >= 0 &&
      dayDifference <= days
    )
  }

  const isCurrentMonth = (value) => {
    if (!value) return false

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return false
    }

    const formatter = new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: 'numeric',
      }
    )

    return (
      formatter.format(date) ===
      formatter.format(new Date())
    )
  }

  /* =========================================
     SUMMARY
  ========================================= */

  const completedSales = useMemo(() => {
    return orders.filter(
      (order) =>
        getSaleStatus(order) === 'completed'
    )
  }, [orders])

  const stats = useMemo(() => {
    const totalRevenue = completedSales.reduce(
      (total, order) =>
        total + getOrderAmount(order),
      0
    )

    const todaySales = completedSales
      .filter((order) =>
        isToday(getOrderDate(order))
      )
      .reduce(
        (total, order) =>
          total + getOrderAmount(order),
        0
      )

    const monthSales = completedSales
      .filter((order) =>
        isCurrentMonth(
          getOrderDate(order)
        )
      )
      .reduce(
        (total, order) =>
          total + getOrderAmount(order),
        0
      )

    const averageOrder =
      completedSales.length > 0
        ? totalRevenue /
          completedSales.length
        : 0

    return {
      totalRevenue,
      todaySales,
      monthSales,
      completedCount: completedSales.length,
      averageOrder,
    }
  }, [completedSales])

  /* =========================================
     FILTER
  ========================================= */

  const filteredSales = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    let result = orders.filter(
      (order) => {
        const orderId = getOrderId(order)
          .toLowerCase()

        const customer = String(
          getCustomerName(order)
        ).toLowerCase()

        const phone = String(
          getCustomerPhone(order)
        ).toLowerCase()

        const saleStatus =
          getSaleStatus(order)

        const date =
          getOrderDate(order)

        const matchesSearch =
          !query ||
          orderId.includes(query) ||
          customer.includes(query) ||
          phone.includes(query)

        const matchesStatus =
          statusFilter === 'all' ||
          saleStatus === statusFilter

        let matchesPeriod = true

        if (periodFilter === 'today') {
          matchesPeriod =
            isToday(date)
        }

        if (periodFilter === '7days') {
          matchesPeriod =
            isWithinDays(date, 7)
        }

        if (periodFilter === '30days') {
          matchesPeriod =
            isWithinDays(date, 30)
        }

        if (periodFilter === 'month') {
          matchesPeriod =
            isCurrentMonth(date)
        }

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPeriod
        )
      }
    )

    result = [...result]

    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return (
          new Date(
            getOrderDate(a) || 0
          ).getTime() -
          new Date(
            getOrderDate(b) || 0
          ).getTime()
        )
      }

      if (sortBy === 'amount-high') {
        return (
          getOrderAmount(b) -
          getOrderAmount(a)
        )
      }

      if (sortBy === 'amount-low') {
        return (
          getOrderAmount(a) -
          getOrderAmount(b)
        )
      }

      return (
        new Date(
          getOrderDate(b) || 0
        ).getTime() -
        new Date(
          getOrderDate(a) || 0
        ).getTime()
      )
    })

    return result
  }, [
    orders,
    search,
    periodFilter,
    statusFilter,
    sortBy,
  ])

  const filteredRevenue = useMemo(() => {
    return filteredSales
      .filter(
        (order) =>
          getSaleStatus(order) ===
          'completed'
      )
      .reduce(
        (total, order) =>
          total +
          getOrderAmount(order),
        0
      )
  }, [filteredSales])

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredSales.length /
        PAGE_SIZE
    )
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [
    search,
    periodFilter,
    statusFilter,
    sortBy,
  ])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [
    currentPage,
    totalPages,
  ])

  const paginatedSales = useMemo(() => {
    const start =
      (currentPage - 1) *
      PAGE_SIZE

    return filteredSales.slice(
      start,
      start + PAGE_SIZE
    )
  }, [
    filteredSales,
    currentPage,
  ])

  /* =========================================
     FORMATTERS
  ========================================= */

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(
      'en-LK',
      {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0,
      }
    ).format(value || 0)
  }

  const formatDate = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat(
      'en-LK',
      {
        timeZone: TIME_ZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(date)
  }

  const formatTime = (value) => {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-LK',
      {
        timeZone: TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    ).format(date)
  }

  /* =========================================
     WORKING SALES ACTIONS
  ========================================= */

  const openSaleView = async (order) => {
    setSelectedSale(order)
    setSaleItems([])
    setSaleItemsError('')

    await loadSaleItems(order)
  }

  const closeSaleView = () => {
    if (saleActionLoading) return

    setSelectedSale(null)
    setSaleItems([])
    setSaleItemsError('')
  }

  const updateSaleOrder = async (order, changes) => {
    setSaleActionLoading(true)

    try {
      await updateOrderFields(supabase, order, changes)
      window.dispatchEvent(new Event('luckyhub:orders-updated'))
      await loadSales(true)
      setSelectedSale(null)
    } catch (actionError) {
      console.error('Sales action error:', actionError)
      window.alert(actionError?.message || 'Sales record could not be updated.')
    } finally {
      setSaleActionLoading(false)
    }
  }

  const markSalePaid = async (order) => updateSaleOrder(order, { payment_status: 'Paid' })
  const markSaleCompleted = async (order) => updateSaleOrder(order, { status: 'Delivered' })

  useOrderRefresh('luckyhub-sales-orders-refresh', () => loadSales(true))

  /* =========================================
     EXPORT PDF
  ========================================= */

  const exportSales = () => {
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
            timeZone:
              TIME_ZONE,
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        ).format(new Date())

      const filteredCompleted =
        filteredSales.filter(
          (order) =>
            getSaleStatus(
              order
            ) ===
            'completed'
        )

      const filteredAverage =
        filteredCompleted.length > 0
          ? filteredRevenue /
            filteredCompleted.length
          : 0

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
        'SALES REPORT',
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
        'Sales & Revenue Report',
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
          label: 'Filtered Revenue',
          value:
            formatCurrency(
              filteredRevenue
            ),
        },
        {
          label: 'Sales Records',
          value:
            filteredSales.length,
        },
        {
          label: 'Completed Sales',
          value:
            filteredCompleted.length,
        },
        {
          label: 'Average Sale',
          value:
            formatCurrency(
              filteredAverage
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

      const periodLabels = {
        all: 'All Time',
        today: 'Today',
        '7days': 'Last 7 Days',
        '30days': 'Last 30 Days',
        month: 'This Month',
      }

      const statusLabels = {
        all: 'All Sales Status',
        completed: 'Completed',
        pending: 'Pending',
        cancelled: 'Cancelled',
      }

      let filterText =
        `Period: ${
          periodLabels[
            periodFilter
          ] ||
          periodFilter
        } | Status: ${
          statusLabels[
            statusFilter
          ] ||
          statusFilter
        }`

      if (search.trim()) {
        filterText +=
          ` | Search: ${search.trim()}`
      }

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
        filteredSales.map(
          (order, index) => [
            index + 1,
            getOrderId(
              order
            ),
            getCustomerName(
              order
            ),
            formatDate(
              getOrderDate(
                order
              )
            ),
            formatStatus(
              getOrderStatus(
                order
              )
            ),
            getPaymentStatus(
              order
            )
              ? formatStatus(
                  getPaymentStatus(
                    order
                  )
                )
              : '—',
            formatCurrency(
              getOrderAmount(
                order
              )
            ),
            getSaleStatus(
              order
            )
              .charAt(0)
              .toUpperCase() +
              getSaleStatus(
                order
              ).slice(1),
          ]
        )

      autoTable(
        doc,
        {
          startY: 82,

          head: [
            [
              'No.',
              'Order ID',
              'Customer',
              'Date',
              'Order Status',
              'Payment',
              'Amount',
              'Sale Status',
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
            fontSize: 7.4,
            cellPadding: 2.5,
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
            fontSize: 7.4,
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
              cellWidth: 32,
            },
            2: {
              cellWidth: 47,
            },
            3: {
              cellWidth: 28,
            },
            4: {
              cellWidth: 34,
              halign: 'center',
            },
            5: {
              cellWidth: 30,
              halign: 'center',
            },
            6: {
              cellWidth: 34,
              halign: 'right',
            },
            7: {
              cellWidth: 31,
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
              'Lucky Hub Management Portal - Sales',
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
        `Lucky-Hub-Sales-${fileDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'Sales PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate sales PDF.'
      )
    }
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="sales-page">

      {/* HEADER */}

      <div className="sales-page-header">

        <div>
          <h1>Sales</h1>

          <p>
            Track revenue and customer
            sales activity.
          </p>
        </div>


        <div className="sales-header-actions">

          <div className="sales-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Search sales..."
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
            className="sales-refresh-button"
            onClick={() =>
              loadSales(true)
            }
            disabled={refreshing}
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'sales-spin'
                  : ''
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="sales-export-button"
            onClick={exportSales}
          >

            <Download size={16} />

            

            Export PDF

          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="sales-error">
          {error}
        </div>
      )}


      {/* SUMMARY */}

      <div className="sales-summary-grid">

        <SalesSummaryCard
          title="Total Revenue"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.totalRevenue
                )
          }
          icon={Banknote}
          tone="green"
          note={`${stats.completedCount} completed sales`}
          currency
        />


        <SalesSummaryCard
          title="Today's Sales"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.todaySales
                )
          }
          icon={TrendingUp}
          tone="purple"
          note="Sri Lanka time"
          currency
        />


        <SalesSummaryCard
          title="This Month"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.monthSales
                )
          }
          icon={ReceiptText}
          tone="blue"
          note="Current month revenue"
          currency
        />


        <SalesSummaryCard
          title="Average Order"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.averageOrder
                )
          }
          icon={ShoppingCart}
          tone="orange"
          note="Average completed sale"
          currency
        />

      </div>


      {/* FILTERS */}

      <div className="sales-filter-row">

        <div className="sales-filters">

          <SalesSelect>
            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Time
              </option>

              <option value="today">
                Today
              </option>

              <option value="7days">
                Last 7 Days
              </option>

              <option value="30days">
                Last 30 Days
              </option>

              <option value="month">
                This Month
              </option>
            </select>
          </SalesSelect>


          <SalesSelect>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Sales Status
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </SalesSelect>


          <SalesSelect>
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

              <option value="oldest">
                Sort by: Oldest
              </option>

              <option value="amount-high">
                Amount: High to Low
              </option>

              <option value="amount-low">
                Amount: Low to High
              </option>
            </select>
          </SalesSelect>

        </div>


        <div className="filtered-sales-total">

          <span>
            Filtered Revenue
          </span>

          <strong>
            {formatCurrency(
              filteredRevenue
            )}
          </strong>

        </div>

      </div>


      {/* TABLE */}

      <div className="sales-table-card">

        <div className="sales-table-wrapper">

          <table className="sales-table">

            <thead>

              <tr>
                <th>Sale</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Order Status</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Sale Status</th>
                <th>Actions</th>
              </tr>

            </thead>


            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="8"
                    className="sales-empty"
                  >
                    Loading sales...
                  </td>
                </tr>

              ) : paginatedSales.length === 0 ? (

                <tr>
                  <td
                    colSpan="8"
                    className="sales-empty"
                  >
                    No sales found.
                  </td>
                </tr>

              ) : (

                paginatedSales.map(
                  (order, index) => {
                    const saleStatus =
                      getSaleStatus(order)

                    const paymentStatus =
                      getPaymentStatus(
                        order
                      )

                    return (
                      <tr
                        key={
                          getValue(
                            order,
                            ['id'],
                            null
                          ) ||
                          `${getOrderId(
                            order
                          )}-${index}`
                        }
                      >

                        <td>

                          <div className="sale-id-cell">

                            <div className="sale-receipt-icon">
                              <ReceiptText
                                size={16}
                              />
                            </div>

                            <div>
                              <strong>
                                {getOrderId(
                                  order
                                )}
                              </strong>

                              <span>
                                Customer Sale
                              </span>
                            </div>

                          </div>

                        </td>


                        <td>

                          <div className="sale-customer-cell">

                            <div className="sale-customer-avatar">

                              {String(
                                getCustomerName(
                                  order
                                )
                              )
                                .charAt(0)
                                .toUpperCase()}

                            </div>

                            <div>

                              <strong>
                                {getCustomerName(
                                  order
                                )}
                              </strong>

                              {getCustomerPhone(
                                order
                              ) && (
                                <span>
                                  {getCustomerPhone(
                                    order
                                  )}
                                </span>
                              )}

                            </div>

                          </div>

                        </td>


                        <td>

                          <div className="sale-date-cell">

                            <strong>
                              {formatDate(
                                getOrderDate(
                                  order
                                )
                              )}
                            </strong>

                            <span>
                              {formatTime(
                                getOrderDate(
                                  order
                                )
                              )}
                            </span>

                          </div>

                        </td>


                        <td>

                          <span className="sale-order-status">

                            {formatStatus(
                              getOrderStatus(
                                order
                              )
                            )}

                          </span>

                        </td>


                        <td>

                          {paymentStatus ? (

                            <span
                              className={`sales-payment-status ${
                                normalizeStatus(
                                  paymentStatus
                                ) === 'paid'
                                  ? 'sales-payment-paid'
                                  : 'sales-payment-pending'
                              }`}
                            >

                              {formatStatus(
                                paymentStatus
                              )}

                            </span>

                          ) : (

                            <span className="sales-payment-status sales-payment-unknown">
                              —
                            </span>

                          )}

                        </td>


                        <td className="sale-amount">

                          {formatCurrency(
                            getOrderAmount(
                              order
                            )
                          )}

                        </td>


                        <td>

                          <span
                            className={`sale-status sale-status-${saleStatus}`}
                          >

                            {saleStatus ===
                              'completed' && (
                              <CheckCircle2
                                size={13}
                              />
                            )}

                            {saleStatus
                              .charAt(0)
                              .toUpperCase() +
                              saleStatus.slice(
                                1
                              )}

                          </span>

                        </td>


                        <td>

                          <button
                            type="button"
                            className="sale-view-button"
                            onClick={() => openSaleView(order)}
                          >

                            <Eye size={15} />

                            View

                          </button>

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

        <div className="sales-table-footer">

          <span>

            Showing{' '}

            {filteredSales.length === 0
              ? 0
              : (currentPage - 1) *
                  PAGE_SIZE +
                1}

            {' '}to{' '}

            {Math.min(
              currentPage * PAGE_SIZE,
              filteredSales.length
            )}

            {' '}of{' '}

            {filteredSales.length}

            {' '}sales records

          </span>


          <div className="sales-pagination">

            <button
              type="button"
              disabled={currentPage === 1}
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

              <ChevronLeft size={14} />

            </button>


            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            )
              .slice(0, 6)
              .map((page) => (

                <button
                  key={page}
                  type="button"
                  className={
                    currentPage === page
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentPage(page)
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

      {/* SALE / PACKING DETAILS MODAL */}
      {selectedSale && (
        <div
          style={actionUi.overlay}
          onMouseDown={closeSaleView}
        >
          <div
            style={actionUi.modal}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div style={actionUi.header}>
              <div>
                <h2 style={actionUi.title}>
                  Sale & Packing Details
                </h2>

                <p style={actionUi.subtitle}>
                  {getOrderId(selectedSale)} •{' '}
                  {getCustomerName(selectedSale)}
                </p>
              </div>

              <button
                type="button"
                style={actionUi.close}
                onClick={closeSaleView}
              >
                <X size={18} />
              </button>
            </div>

            <div style={actionUi.body}>
              <div style={actionUi.grid}>
                <ActionDetail
                  label="Sale / Order"
                  value={getOrderId(
                    selectedSale
                  )}
                />

                <ActionDetail
                  label="Customer"
                  value={getCustomerName(
                    selectedSale
                  )}
                />

                <ActionDetail
                  label="Phone"
                  value={
                    getCustomerPhone(
                      selectedSale
                    ) || '—'
                  }
                />

                <ActionDetail
                  label="Date"
                  value={`${formatDate(
                    getOrderDate(
                      selectedSale
                    )
                  )} ${formatTime(
                    getOrderDate(
                      selectedSale
                    )
                  )}`}
                />

                <ActionDetail
                  label="Order Status"
                  value={getStatusLabel(
                    getOrderStatus(
                      selectedSale
                    )
                  )}
                />

                <ActionDetail
                  label="Payment"
                  value={
                    getPaymentStatus(
                      selectedSale
                    )
                      ? getStatusLabel(
                          getPaymentStatus(
                            selectedSale
                          )
                        )
                      : '—'
                  }
                />

                <ActionDetail
                  label="Payment Method"
                  value={getStatusLabel(
                    getPaymentMethod(
                      selectedSale
                    )
                  )}
                />

                <ActionDetail
                  label="Delivery Method"
                  value={getStatusLabel(
                    getDeliveryMethod(
                      selectedSale
                    )
                  )}
                />
              </div>

              {/* ITEMS TO PACK */}

              <section style={actionUi.section}>
                <div
                  style={
                    actionUi.sectionHeader
                  }
                >
                  <div
                    style={
                      actionUi.sectionTitleWrap
                    }
                  >
                    <div
                      style={
                        actionUi.sectionIcon
                      }
                    >
                      <Package size={18} />
                    </div>

                    <div>
                      <h3
                        style={
                          actionUi.sectionTitle
                        }
                      >
                        Items to Pack
                      </h3>

                      <p
                        style={
                          actionUi.sectionSubtitle
                        }
                      >
                        Product, variant,
                        quantity and price
                        for this order.
                      </p>
                    </div>
                  </div>

                  {!saleItemsLoading &&
                    saleItems.length > 0 && (
                      <span
                        style={
                          actionUi.quantityBadge
                        }
                      >
                        {getTotalItemQuantity(
                          saleItems
                        )}{' '}
                        pcs
                      </span>
                    )}
                </div>

                {saleItemsLoading ? (
                  <div
                    style={
                      actionUi.loadingBox
                    }
                  >
                    Loading ordered
                    products...
                  </div>
                ) : saleItemsError ? (
                  <div
                    style={
                      actionUi.loadingBox
                    }
                  >
                    {saleItemsError}
                  </div>
                ) : (
                  <div
                    style={
                      actionUi.itemsTableWrap
                    }
                  >
                    <table
                      style={
                        actionUi.itemsTable
                      }
                    >
                      <thead>
                        <tr>
                          <th
                            style={
                              actionUi.itemTh
                            }
                          >
                            Product
                          </th>

                          <th
                            style={{
                              ...actionUi.itemTh,
                              textAlign:
                                'center',
                            }}
                          >
                            Qty
                          </th>

                          <th
                            style={{
                              ...actionUi.itemTh,
                              textAlign:
                                'right',
                            }}
                          >
                            Unit Price
                          </th>

                          <th
                            style={{
                              ...actionUi.itemTh,
                              textAlign:
                                'right',
                            }}
                          >
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {saleItems.map(
                          (
                            item,
                            index
                          ) => (
                            <tr
                              key={
                                item.id ||
                                `${getItemName(
                                  item
                                )}-${index}`
                              }
                            >
                              <td
                                style={
                                  actionUi.itemTd
                                }
                              >
                                <span
                                  style={
                                    actionUi.itemName
                                  }
                                >
                                  {getItemName(
                                    item
                                  )}
                                </span>

                                {getItemVariant(
                                  item
                                ) && (
                                  <span
                                    style={
                                      actionUi.itemVariant
                                    }
                                  >
                                    {getItemVariant(
                                      item
                                    )}
                                  </span>
                                )}
                              </td>

                              <td
                                style={{
                                  ...actionUi.itemTd,
                                  textAlign:
                                    'center',
                                }}
                              >
                                <span
                                  style={
                                    actionUi.quantityBadge
                                  }
                                >
                                  {getItemQuantity(
                                    item
                                  )}
                                </span>
                              </td>

                              <td
                                style={{
                                  ...actionUi.itemTd,
                                  textAlign:
                                    'right',
                                  whiteSpace:
                                    'nowrap',
                                }}
                              >
                                {formatCurrency(
                                  getItemUnitPrice(
                                    item
                                  )
                                )}
                              </td>

                              <td
                                style={{
                                  ...actionUi.itemTd,
                                  textAlign:
                                    'right',
                                  whiteSpace:
                                    'nowrap',
                                  color:
                                    '#203c34',
                                  fontWeight:
                                    700,
                                }}
                              >
                                {formatCurrency(
                                  getItemSubtotal(
                                    item
                                  )
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PRICE BREAKDOWN */}

                <div
                  style={
                    actionUi.totalsBox
                  }
                >
                  <div
                    style={
                      actionUi.totalRow
                    }
                  >
                    <span>Subtotal</span>

                    <strong>
                      {formatCurrency(
                        getOrderSubtotal(
                          selectedSale
                        ) ||
                          saleItems.reduce(
                            (
                              total,
                              item
                            ) =>
                              total +
                              getItemSubtotal(
                                item
                              ),
                            0
                          )
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      actionUi.totalRow
                    }
                  >
                    <span>
                      Discount
                    </span>

                    <strong>
                      -
                      {formatCurrency(
                        getOrderDiscount(
                          selectedSale
                        )
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      actionUi.totalRow
                    }
                  >
                    <span>
                      Delivery Fee
                    </span>

                    <strong>
                      {formatCurrency(
                        getOrderDeliveryFee(
                          selectedSale
                        )
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      actionUi.grandTotalRow
                    }
                  >
                    <span>
                      Order Total
                    </span>

                    <span>
                      {formatCurrency(
                        getOrderAmount(
                          selectedSale
                        )
                      )}
                    </span>
                  </div>
                </div>
              </section>

              {/* DELIVERY / PACKING INFO */}

              <section style={actionUi.section}>
                <div
                  style={
                    actionUi.sectionHeader
                  }
                >
                  <div
                    style={
                      actionUi.sectionTitleWrap
                    }
                  >
                    <div
                      style={
                        actionUi.sectionIcon
                      }
                    >
                      <ShoppingCart
                        size={18}
                      />
                    </div>

                    <div>
                      <h3
                        style={
                          actionUi.sectionTitle
                        }
                      >
                        Delivery Information
                      </h3>

                      <p
                        style={
                          actionUi.sectionSubtitle
                        }
                      >
                        Use this information
                        when preparing the
                        order.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  style={
                    actionUi.deliveryBox
                  }
                >
                  <div
                    style={{
                      ...actionUi.totalRow,
                      alignItems:
                        'flex-start',
                    }}
                  >
                    <span>
                      Delivery Method
                    </span>

                    <strong
                      style={{
                        textAlign:
                          'right',
                        color:
                          '#243f37',
                      }}
                    >
                      {getStatusLabel(
                        getDeliveryMethod(
                          selectedSale
                        )
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      ...actionUi.totalRow,
                      alignItems:
                        'flex-start',
                    }}
                  >
                    <span>
                      Address
                    </span>

                    <strong
                      style={{
                        maxWidth:
                          '68%',
                        textAlign:
                          'right',
                        color:
                          '#243f37',
                      }}
                    >
                      {getDeliveryAddress(
                        selectedSale
                      ) || '—'}
                    </strong>
                  </div>

                  {getOrderNotes(
                    selectedSale
                  ) && (
                    <div
                      style={{
                        ...actionUi.totalRow,
                        alignItems:
                          'flex-start',
                      }}
                    >
                      <span>
                        Notes
                      </span>

                      <strong
                        style={{
                          maxWidth:
                            '68%',
                          textAlign:
                            'right',
                          color:
                            '#243f37',
                        }}
                      >
                        {getOrderNotes(
                          selectedSale
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div style={actionUi.footer}>
              {normalizeStatus(
                getPaymentStatus(
                  selectedSale
                )
              ) !== 'paid' && (
                <button
                  type="button"
                  style={actionUi.button}
                  disabled={
                    saleActionLoading
                  }
                  onClick={() =>
                    markSalePaid(
                      selectedSale
                    )
                  }
                >
                  Mark Paid
                </button>
              )}

              {selectedSale.status === 'Out for Delivery' && (
                <button
                  type="button"
                  style={
                    actionUi.primary
                  }
                  disabled={
                    saleActionLoading
                  }
                  onClick={() =>
                    markSaleCompleted(
                      selectedSale
                    )
                  }
                >
                  Mark Delivered
                </button>
              )}

              <button
                type="button"
                style={actionUi.button}
                onClick={
                  closeSaleView
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



function ActionDetail({ label, value }) {
  return (
    <div style={actionUi.item}>
      <span style={actionUi.label}>{label}</span>
      <strong style={actionUi.value}>{String(value ?? '—')}</strong>
    </div>
  )
}

/* =========================================
   SELECT
========================================= */

function SalesSelect({
  children,
}) {
  return (
    <div className="sales-select">

      {children}

      <ChevronDown size={14} />

    </div>
  )
}


/* =========================================
   SUMMARY CARD
========================================= */

function SalesSummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  note,
  currency = false,
}) {
  return (
    <div className="sales-summary-card">

      <div
        className={`sales-summary-icon sales-summary-icon-${tone}`}
      >
        <Icon size={22} />
      </div>

      <div className="sales-summary-content">

        <span>
          {title}
        </span>

        <strong
          className={
            currency
              ? 'sales-summary-currency'
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

export default Sales