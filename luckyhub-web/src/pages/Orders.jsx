import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  MoreVertical,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useSearchParams } from 'react-router-dom'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { supabase } from '../services/supabase.js'
import './Orders.css'

const PAGE_SIZE = 7

const SRI_LANKA_TIME_ZONE = 'Asia/Colombo'


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


function Orders() {
  const [searchParams] = useSearchParams()

  const requestedOrder =
    searchParams.get('order')

  const autoOpenedOrderRef =
    useRef('')

  const [orders, setOrders] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [currentPage, setCurrentPage] = useState(1)

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderModalMode, setOrderModalMode] = useState(null)
  const [orderActionLoading, setOrderActionLoading] = useState(false)

  const [orderItems, setOrderItems] = useState([])
  const [orderItemsLoading, setOrderItemsLoading] = useState(false)
  const [orderItemsError, setOrderItemsError] = useState('')

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

  const getExistingKey = (object, keys) => {
    if (!object) return null

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
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

  const normalizeStatus = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
  }

  /* =========================================
     LOAD ORDERS
  ========================================= */

  const loadOrders = async (
    showRefresh = false
  ) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const {
        data,
        error: orderError,
      } = await supabase
        .from('orders')
        .select('*')

      if (orderError) {
        throw orderError
      }

      setOrders(
        data || []
      )
    } catch (loadError) {
      console.error(
        'Orders load error:',
        loadError
      )

      setError(
        'Orders could not be loaded. Please check your Supabase connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadOrders()
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

    if (text === '—') {
      return text
    }

    return text.startsWith('#')
      ? text
      : `#${text}`
  }

  const getCustomerName = (
    order
  ) => {
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

  const getCustomerPhone = (
    order
  ) => {
    return getValue(
      order,
      [
        'phone',
        'customer_phone',
        'mobile',
        'contact_number',
      ],
      ''
    )
  }

  const getOrderStatus = (
    order
  ) => {
    return getValue(
      order,
      [
        'status',
        'order_status',
      ],
      'Pending'
    )
  }

  const getPaymentStatus = (
    order
  ) => {
    return getValue(
      order,
      [
        'payment_status',
        'paymentStatus',
      ],
      ''
    )
  }

  const getOrderAmount = (
    order
  ) => {
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

  const getOrderDate = (
    order
  ) => {
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

  const getOrderItemCount = (
    order
  ) => {
    const direct = getValue(
      order,
      [
        'item_count',
        'total_items',
        'items_count',
        'quantity',
      ],
      null
    )

    if (direct !== null) {
      return toNumber(direct)
    }

    if (
      Array.isArray(order.items)
    ) {
      return order.items.length
    }

    if (
      Array.isArray(
        order.order_items
      )
    ) {
      return order.order_items.length
    }

    return null
  }


  const getOrderSubtotal = (
    order
  ) => {
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

  const getOrderDiscount = (
    order
  ) => {
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

  const getOrderDeliveryFee = (
    order
  ) => {
    return toNumber(
      getValue(
        order,
        [
          'delivery_fee',
          'shipping_fee',
          'delivery_charge',
        ],
        0
      )
    )
  }

  const getPaymentMethod = (
    order
  ) => {
    return getValue(
      order,
      [
        'payment_method',
        'paymentMethod',
      ],
      '—'
    )
  }

  const getDeliveryMethod = (
    order
  ) => {
    return getValue(
      order,
      [
        'delivery_method',
        'deliveryMethod',
      ],
      '—'
    )
  }

  const getDeliveryAddress = (
    order
  ) => {
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

  const getOrderNotes = (
    order
  ) => {
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

  const getEmbeddedOrderItems = (
    order
  ) => {
    if (
      Array.isArray(
        order?.order_items
      )
    ) {
      return order.order_items
    }

    if (
      Array.isArray(
        order?.items
      )
    ) {
      return order.items
    }

    return []
  }

  const getItemName = (
    item
  ) => {
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

  const getItemVariant = (
    item
  ) => {
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

  const getItemQuantity = (
    item
  ) => {
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

  const getItemUnitPrice = (
    item
  ) => {
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

  const getItemSubtotal = (
    item
  ) => {
    const direct =
      getValue(
        item,
        [
          'subtotal',
          'line_total',
          'total',
        ],
        null
      )

    if (
      direct !== null
    ) {
      return toNumber(
        direct
      )
    }

    return (
      getItemUnitPrice(
        item
      ) *
      getItemQuantity(
        item
      )
    )
  }

  const getTotalItemQuantity = (
    items
  ) => {
    return items.reduce(
      (
        total,
        item
      ) =>
        total +
        getItemQuantity(
          item
        ),
      0
    )
  }

  const loadOrderItems = async (
    order
  ) => {
    setOrderItemsLoading(
      true
    )
    setOrderItemsError('')

    try {
      const orderId =
        getValue(
          order,
          ['id'],
          null
        )

      if (!orderId) {
        const embedded =
          getEmbeddedOrderItems(
            order
          )

        setOrderItems(
          embedded
        )

        if (
          embedded.length ===
          0
        ) {
          setOrderItemsError(
            'No order items were found for this order.'
          )
        }

        return
      }

      const {
        data,
        error:
          itemsError,
      } = await supabase
        .from(
          'order_items'
        )
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
        .eq(
          'order_id',
          orderId
        )

      if (
        itemsError
      ) {
        const embedded =
          getEmbeddedOrderItems(
            order
          )

        if (
          embedded.length >
          0
        ) {
          setOrderItems(
            embedded
          )
          return
        }

        throw itemsError
      }

      setOrderItems(
        data || []
      )

      if (
        !data ||
        data.length ===
          0
      ) {
        setOrderItemsError(
          'No order items were found for this order.'
        )
      }
    } catch (
      itemsLoadError
    ) {
      console.error(
        'Order items load error:',
        itemsLoadError
      )

      setOrderItems([])

      setOrderItemsError(
        itemsLoadError?.message ||
          'Order items could not be loaded.'
      )
    } finally {
      setOrderItemsLoading(
        false
      )
    }
  }

  /* =========================================
     STATUS GROUP
  ========================================= */

  const getStatusGroup = (
    statusValue
  ) => {
    const status =
      normalizeStatus(
        statusValue
      )

    if (
      [
        'completed',
        'complete',
        'delivered',
      ].includes(status)
    ) {
      return 'completed'
    }

    if (
      [
        'cancelled',
        'canceled',
        'rejected',
      ].includes(status)
    ) {
      return 'cancelled'
    }

    if (
      [
        'processing',
        'preparing',
        'confirmed',
      ].includes(status)
    ) {
      return 'processing'
    }

    if (
      [
        'shipped',
        'shipping',
        'out for delivery',
        'dispatched',
      ].includes(status)
    ) {
      return 'shipped'
    }

    return 'pending'
  }

  const getStatusLabel = (
    statusValue
  ) => {
    const status =
      normalizeStatus(
        statusValue
      )

    if (!status) {
      return 'Pending'
    }

    return status.replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    )
  }

  /* =========================================
     SUMMARY
  ========================================= */

  const stats = useMemo(() => {
    let pending = 0
    let processing = 0
    let shipped = 0
    let completed = 0

    orders.forEach((order) => {
      const group =
        getStatusGroup(
          getOrderStatus(order)
        )

      if (group === 'pending') {
        pending += 1
      }

      if (
        group === 'processing'
      ) {
        processing += 1
      }

      if (group === 'shipped') {
        shipped += 1
      }

      if (
        group === 'completed'
      ) {
        completed += 1
      }
    })

    return {
      total: orders.length,
      pending,
      processing,
      shipped,
      completed,
    }
  }, [orders])

  /* =========================================
     FILTER + SORT
  ========================================= */

  const filteredOrders =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      let result =
        orders.filter(
          (order) => {
            const orderId =
              getOrderId(
                order
              ).toLowerCase()

            const customer =
              String(
                getCustomerName(
                  order
                )
              ).toLowerCase()

            const phone =
              String(
                getCustomerPhone(
                  order
                )
              ).toLowerCase()

            const statusGroup =
              getStatusGroup(
                getOrderStatus(
                  order
                )
              )

            const matchesSearch =
              !query ||
              orderId.includes(
                query
              ) ||
              customer.includes(
                query
              ) ||
              phone.includes(
                query
              )

            const matchesStatus =
              statusFilter ===
                'all' ||
              statusGroup ===
                statusFilter

            return (
              matchesSearch &&
              matchesStatus
            )
          }
        )

      result = [...result]

      result.sort(
        (a, b) => {
          if (
            sortBy ===
            'oldest'
          ) {
            return (
              new Date(
                getOrderDate(a) ||
                  0
              ).getTime() -
              new Date(
                getOrderDate(b) ||
                  0
              ).getTime()
            )
          }

          if (
            sortBy ===
            'amount-high'
          ) {
            return (
              getOrderAmount(b) -
              getOrderAmount(a)
            )
          }

          if (
            sortBy ===
            'amount-low'
          ) {
            return (
              getOrderAmount(a) -
              getOrderAmount(b)
            )
          }

          if (
            sortBy ===
            'customer'
          ) {
            return String(
              getCustomerName(a)
            ).localeCompare(
              String(
                getCustomerName(b)
              )
            )
          }

          return (
            new Date(
              getOrderDate(b) ||
                0
            ).getTime() -
            new Date(
              getOrderDate(a) ||
                0
            ).getTime()
          )
        }
      )

      return result
    }, [
      orders,
      search,
      statusFilter,
      sortBy,
    ])

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length /
        PAGE_SIZE
    )
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [
    search,
    statusFilter,
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

  const paginatedOrders =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE

      return filteredOrders.slice(
        start,
        start + PAGE_SIZE
      )
    }, [
      filteredOrders,
      currentPage,
    ])

  /* =========================================
     FORMATTERS
  ========================================= */

  const formatCurrency = (
    value
  ) => {
    return new Intl.NumberFormat(
      'en-LK',
      {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0,
      }
    ).format(value || 0)
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
        timeZone:
          SRI_LANKA_TIME_ZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(date)
  }

  const formatTime = (
    value
  ) => {
    if (!value) {
      return ''
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-LK',
      {
        timeZone:
          SRI_LANKA_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    ).format(date)
  }

  /* =========================================
     WORKING ORDER ACTIONS
  ========================================= */

  const openOrderView = async (order) => {
    setSelectedOrder(order)
    setOrderModalMode('view')

    setOrderItems([])
    setOrderItemsError('')

    await loadOrderItems(
      order
    )
  }


  /* =========================================
     OPEN ORDER FROM DASHBOARD
     Example:
     /orders?order=<orders.id>
  ========================================= */

  useEffect(() => {
    if (
      !requestedOrder ||
      loading ||
      orders.length === 0 ||
      autoOpenedOrderRef.current ===
        requestedOrder
    ) {
      return
    }

    const cleanRequestedOrder =
      String(requestedOrder)
        .trim()
        .replace(/^#/, '')

    const targetOrder =
      orders.find(
        (order) => {
          const candidates = [
            order.id,
            order.order_id,
            order.order_number,
            order.order_no,
            order.reference,
          ]

          return candidates.some(
            (value) =>
              value !== undefined &&
              value !== null &&
              String(value)
                .trim()
                .replace(/^#/, '') ===
                cleanRequestedOrder
          )
        }
      )

    autoOpenedOrderRef.current =
      requestedOrder

    if (targetOrder) {
      openOrderView(
        targetOrder
      )
    }
  }, [
    requestedOrder,
    loading,
    orders,
  ])

  const openOrderActions = async (order) => {
    setSelectedOrder(order)
    setOrderModalMode('actions')

    setOrderItems([])
    setOrderItemsError('')

    await loadOrderItems(
      order
    )
  }

  const closeOrderModal = () => {
    if (orderActionLoading) return

    setSelectedOrder(null)
    setOrderModalMode(null)
    setOrderItems([])
    setOrderItemsError('')
  }

  const updateOrder = async (order, changes) => {
    if (!order) return

    const idKey = getExistingKey(
      order,
      ['id', 'order_id', 'order_number', 'order_no', 'reference']
    )

    if (!idKey) {
      window.alert('Order ID column could not be detected.')
      return
    }

    setOrderActionLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update(changes)
        .eq(idKey, order[idKey])

      if (updateError) throw updateError

      await loadOrders(true)
      setSelectedOrder(null)
      setOrderModalMode(null)
    } catch (actionError) {
      console.error('Order action error:', actionError)
      window.alert(actionError?.message || 'Order could not be updated.')
    } finally {
      setOrderActionLoading(false)
    }
  }

  const changeOrderStatus = async (order, nextStatus) => {
    const statusKey = getExistingKey(order, ['status', 'order_status'])

    if (!statusKey) {
      window.alert('Order status column could not be detected.')
      return
    }

    await updateOrder(order, { [statusKey]: nextStatus })
  }

  const markOrderPaid = async (order) => {
    const paymentKey = getExistingKey(order, ['payment_status', 'paymentStatus'])

    if (!paymentKey) {
      window.alert('This orders table does not have a payment status column.')
      return
    }

    await updateOrder(order, { [paymentKey]: 'paid' })
  }

  /* =========================================
     EXPORT PDF
  ========================================= */

  const exportOrders = () => {
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
              SRI_LANKA_TIME_ZONE,
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        ).format(new Date())

      const filteredSummary =
        filteredOrders.reduce(
          (result, order) => {
            const group =
              getStatusGroup(
                getOrderStatus(
                  order
                )
              )

            result.totalAmount +=
              getOrderAmount(
                order
              )

            if (
              group === 'pending'
            ) {
              result.pending += 1
            }

            if (
              group === 'processing'
            ) {
              result.processing += 1
            }

            if (
              group === 'completed'
            ) {
              result.completed += 1
            }

            return result
          },
          {
            pending: 0,
            processing: 0,
            completed: 0,
            totalAmount: 0,
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
        'ORDER REPORT',
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
        'Customer Orders Report',
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
          label: 'Filtered Orders',
          value:
            filteredOrders.length,
        },
        {
          label: 'Pending',
          value:
            filteredSummary.pending,
        },
        {
          label: 'Processing',
          value:
            filteredSummary.processing,
        },
        {
          label: 'Order Value',
          value:
            formatCurrency(
              filteredSummary.totalAmount
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

      const statusText =
        statusFilter === 'all'
          ? 'All Order Status'
          : statusFilter
              .charAt(0)
              .toUpperCase() +
            statusFilter.slice(1)

      let filterText =
        `Status: ${statusText}`

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
        filteredOrders.map(
          (order, index) => [
            index + 1,
            getOrderId(
              order
            ),
            getCustomerName(
              order
            ),
            getCustomerPhone(
              order
            ) || '—',
            formatDate(
              getOrderDate(
                order
              )
            ),
            getOrderItemCount(
              order
            ) ?? '—',
            formatCurrency(
              getOrderAmount(
                order
              )
            ),
            getStatusLabel(
              getOrderStatus(
                order
              )
            ),
            getPaymentStatus(
              order
            )
              ? getStatusLabel(
                  getPaymentStatus(
                    order
                  )
                )
              : '—',
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
              'Phone',
              'Date',
              'Items',
              'Amount',
              'Status',
              'Payment',
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
            fontSize: 7.2,
            cellPadding: 2.4,
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
            fontSize: 7.2,
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
              cellWidth: 31,
            },
            2: {
              cellWidth: 41,
            },
            3: {
              cellWidth: 31,
            },
            4: {
              cellWidth: 27,
            },
            5: {
              cellWidth: 17,
              halign: 'center',
            },
            6: {
              cellWidth: 31,
              halign: 'right',
            },
            7: {
              cellWidth: 30,
              halign: 'center',
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
              'Lucky Hub Management Portal - Orders',
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
              SRI_LANKA_TIME_ZONE,
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
        `Lucky-Hub-Orders-${fileDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'Orders PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate orders PDF.'
      )
    }
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="orders-page">

      {/* HEADER */}

      <div className="orders-page-header">

        <div>

          <h1>
            Orders
          </h1>

          <p>
            View and manage customer
            orders from Lucky Hub.
          </p>

        </div>


        <div className="orders-header-actions">

          <div className="orders-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Search orders..."
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
            className="orders-refresh-button"
            onClick={() =>
              loadOrders(true)
            }
            disabled={
              refreshing
            }
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'orders-spin'
                  : ''
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="orders-export-button"
            onClick={
              exportOrders
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
        <div className="orders-error">
          {error}
        </div>
      )}


      {/* SUMMARY */}

      <div className="orders-summary-grid">

        <OrderSummaryCard
          title="Total Orders"
          value={
            loading
              ? '—'
              : stats.total
          }
          icon={ShoppingBag}
          tone="purple"
          note="All customer orders"
        />


        <OrderSummaryCard
          title="Pending"
          value={
            loading
              ? '—'
              : stats.pending
          }
          icon={Clock3}
          tone="orange"
          note="Awaiting processing"
        />


        <OrderSummaryCard
          title="Processing"
          value={
            loading
              ? '—'
              : stats.processing
          }
          icon={PackageCheck}
          tone="blue"
          note="Currently preparing"
        />


        <OrderSummaryCard
          title="Completed"
          value={
            loading
              ? '—'
              : stats.completed
          }
          icon={CheckCircle2}
          tone="green"
          note={`${stats.shipped} currently shipped`}
        />

      </div>


      {/* FILTERS */}

      <div className="orders-filter-row">

        <div className="orders-filters">

          <div className="orders-select">

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Order Status
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="processing">
                Processing
              </option>

              <option value="shipped">
                Shipped
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="cancelled">
                Cancelled
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>


          <div className="orders-select">

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

              <option value="customer">
                Customer Name
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>

        </div>

      </div>


      {/* ORDERS TABLE */}

      <div className="orders-table-card">

        <div className="orders-table-wrapper">

          <table className="orders-management-table">

            <thead>

              <tr>

                <th>
                  Order
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Date
                </th>

                <th>
                  Items
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Status
                </th>

                <th>
                  Payment
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
                    className="orders-empty"
                  >
                    Loading orders...
                  </td>

                </tr>

              ) : paginatedOrders.length === 0 ? (

                <tr>

                  <td
                    colSpan="8"
                    className="orders-empty"
                  >
                    No orders found.
                  </td>

                </tr>

              ) : (

                paginatedOrders.map(
                  (
                    order,
                    index
                  ) => {
                    const status =
                      getOrderStatus(
                        order
                      )

                    const group =
                      getStatusGroup(
                        status
                      )

                    const payment =
                      getPaymentStatus(
                        order
                      )

                    const itemCount =
                      getOrderItemCount(
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

                        {/* ORDER */}

                        <td>

                          <div className="order-number-cell">

                            <strong>
                              {getOrderId(
                                order
                              )}
                            </strong>

                            <span>
                              Online Order
                            </span>

                          </div>

                        </td>


                        {/* CUSTOMER */}

                        <td>

                          <div className="order-customer-cell">

                            <div className="customer-avatar">

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


                        {/* DATE */}

                        <td>

                          <div className="order-date-cell">

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


                        {/* ITEMS */}

                        <td>

                          <span className="order-item-count">

                            {itemCount !==
                            null
                              ? `${itemCount} item${
                                  itemCount ===
                                  1
                                    ? ''
                                    : 's'
                                }`
                              : '—'}

                          </span>

                        </td>


                        {/* AMOUNT */}

                        <td className="order-amount">

                          {formatCurrency(
                            getOrderAmount(
                              order
                            )
                          )}

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`order-management-status order-management-status-${group}`}
                          >

                            {group ===
                              'shipped' && (
                              <Truck
                                size={13}
                              />
                            )}

                            {group ===
                              'cancelled' && (
                              <XCircle
                                size={13}
                              />
                            )}

                            {getStatusLabel(
                              status
                            )}

                          </span>

                        </td>


                        {/* PAYMENT */}

                        <td>

                          {payment ? (

                            <span
                              className={`payment-status ${
                                normalizeStatus(
                                  payment
                                ) ===
                                  'paid'
                                  ? 'payment-paid'
                                  : 'payment-pending'
                              }`}
                            >

                              {getStatusLabel(
                                payment
                              )}

                            </span>

                          ) : (

                            <span className="payment-status payment-unknown">
                              —
                            </span>

                          )}

                        </td>


                        {/* ACTIONS */}

                        <td>

                          <div className="order-row-actions">

                            <button
                              type="button"
                              title="View order"
                              onClick={() => openOrderView(order)}
                            >

                              <Eye
                                size={15}
                              />

                              <span>
                                View
                              </span>

                            </button>


                            <button
                              type="button"
                              className="order-more-button"
                              title="More options"
                              onClick={() => openOrderActions(order)}
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


        {/* FOOTER */}

        <div className="orders-table-footer">

          <span>

            Showing{' '}

            {filteredOrders.length ===
            0
              ? 0
              : (currentPage - 1) *
                  PAGE_SIZE +
                1}

            {' '}to{' '}

            {Math.min(
              currentPage *
                PAGE_SIZE,
              filteredOrders.length
            )}

            {' '}of{' '}

            {filteredOrders.length}

            {' '}orders

          </span>


          <div className="orders-pagination">

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

      {/* ORDER VIEW / ACTION MODAL */}
      {selectedOrder && orderModalMode && (
        <div style={actionUi.overlay} onMouseDown={closeOrderModal}>
          <div style={actionUi.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div style={actionUi.header}>
              <div>
                <h2 style={actionUi.title}>
                  {orderModalMode === 'view' ? 'Order Details' : 'Order Actions'}
                </h2>
                <p style={actionUi.subtitle}>
                  {getOrderId(selectedOrder)} • {getCustomerName(selectedOrder)}
                </p>
              </div>

              <button type="button" style={actionUi.close} onClick={closeOrderModal}>
                <X size={18} />
              </button>
            </div>

            <div style={actionUi.body}>
              <div style={actionUi.grid}>
                <ActionDetail
                  label="Order"
                  value={getOrderId(
                    selectedOrder
                  )}
                />

                <ActionDetail
                  label="Customer"
                  value={getCustomerName(
                    selectedOrder
                  )}
                />

                <ActionDetail
                  label="Phone"
                  value={
                    getCustomerPhone(
                      selectedOrder
                    ) || '—'
                  }
                />

                <ActionDetail
                  label="Date"
                  value={`${formatDate(
                    getOrderDate(
                      selectedOrder
                    )
                  )} ${formatTime(
                    getOrderDate(
                      selectedOrder
                    )
                  )}`}
                />

                <ActionDetail
                  label="Order Status"
                  value={getStatusLabel(
                    getOrderStatus(
                      selectedOrder
                    )
                  )}
                />

                <ActionDetail
                  label="Payment"
                  value={
                    getPaymentStatus(
                      selectedOrder
                    )
                      ? getStatusLabel(
                          getPaymentStatus(
                            selectedOrder
                          )
                        )
                      : '—'
                  }
                />

                <ActionDetail
                  label="Payment Method"
                  value={getStatusLabel(
                    getPaymentMethod(
                      selectedOrder
                    )
                  )}
                />

                <ActionDetail
                  label="Delivery Method"
                  value={getStatusLabel(
                    getDeliveryMethod(
                      selectedOrder
                    )
                  )}
                />
              </div>

              {/* ITEMS TO PACK */}

              <section
                style={
                  actionUi.section
                }
              >
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
                      <Package
                        size={18}
                      />
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
                        These are the
                        products placed by
                        the customer in the
                        mobile app.
                      </p>
                    </div>
                  </div>

                  {!orderItemsLoading &&
                    orderItems.length >
                      0 && (
                      <span
                        style={
                          actionUi.quantityBadge
                        }
                      >
                        {getTotalItemQuantity(
                          orderItems
                        )}{' '}
                        pcs
                      </span>
                    )}
                </div>

                {orderItemsLoading ? (
                  <div
                    style={
                      actionUi.loadingBox
                    }
                  >
                    Loading ordered
                    products from
                    Supabase...
                  </div>
                ) : orderItemsError ? (
                  <div
                    style={
                      actionUi.loadingBox
                    }
                  >
                    {orderItemsError}
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
                        {orderItems.map(
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
                                  color:
                                    '#203c34',
                                  fontWeight:
                                    800,
                                }}
                              >
                                {getItemQuantity(
                                  item
                                )}
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
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {formatCurrency(
                        getOrderSubtotal(
                          selectedOrder
                        ) ||
                          orderItems.reduce(
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
                          selectedOrder
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
                          selectedOrder
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
                          selectedOrder
                        )
                      )}
                    </span>
                  </div>
                </div>

                {/* DELIVERY */}

                <div
                  style={
                    actionUi.deliveryBox
                  }
                >
                  <span
                    style={
                      actionUi.label
                    }
                  >
                    Delivery Address
                  </span>

                  <strong
                    style={{
                      ...actionUi.value,
                      display: 'block',
                      marginTop: 6,
                    }}
                  >
                    {getDeliveryAddress(
                      selectedOrder
                    ) ||
                      'No delivery address recorded.'}
                  </strong>

                  {getOrderNotes(
                    selectedOrder
                  ) && (
                    <>
                      <span
                        style={{
                          ...actionUi.label,
                          display:
                            'block',
                          marginTop:
                            12,
                        }}
                      >
                        Customer Notes
                      </span>

                      <strong
                        style={{
                          ...actionUi.value,
                          display:
                            'block',
                          marginTop: 6,
                        }}
                      >
                        {getOrderNotes(
                          selectedOrder
                        )}
                      </strong>
                    </>
                  )}
                </div>
              </section>
            </div>

            <div style={actionUi.footer}>
              {orderModalMode === 'actions' && (
                <>
                  <button type="button" style={actionUi.button} disabled={orderActionLoading} onClick={() => changeOrderStatus(selectedOrder, 'processing')}>
                    Mark Processing
                  </button>
                  <button type="button" style={actionUi.button} disabled={orderActionLoading} onClick={() => changeOrderStatus(selectedOrder, 'shipped')}>
                    Mark Shipped
                  </button>
                  <button type="button" style={actionUi.primary} disabled={orderActionLoading} onClick={() => changeOrderStatus(selectedOrder, 'completed')}>
                    Mark Completed
                  </button>
                  <button type="button" style={actionUi.button} disabled={orderActionLoading} onClick={() => markOrderPaid(selectedOrder)}>
                    Mark Paid
                  </button>
                  <button type="button" style={actionUi.danger} disabled={orderActionLoading} onClick={() => {
                    if (window.confirm(`Cancel ${getOrderId(selectedOrder)}?`)) {
                      changeOrderStatus(selectedOrder, 'cancelled')
                    }
                  }}>
                    Cancel Order
                  </button>
                </>
              )}

              {orderModalMode === 'view' && (
                <button type="button" style={actionUi.primary} onClick={() => setOrderModalMode('actions')}>
                  Manage Order
                </button>
              )}

              <button type="button" style={actionUi.button} onClick={closeOrderModal}>
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
   SUMMARY CARD
========================================= */

function OrderSummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  note,
}) {
  return (
    <div className="order-summary-card">

      <div
        className={`order-summary-icon order-summary-icon-${tone}`}
      >

        <Icon size={22} />

      </div>


      <div className="order-summary-content">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {note}
        </small>

      </div>

    </div>
  )
}

export default Orders