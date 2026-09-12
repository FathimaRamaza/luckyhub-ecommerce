import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronRight,
  Eye,
  Package,
  Printer,
  ShoppingCart,
} from 'lucide-react'

import { supabase } from '../services/supabase.js'
import './Dashboard.css'

const SRI_LANKA_TIME_ZONE = 'Asia/Colombo'

function Dashboard() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [printingRequests, setPrintingRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState('')

  /* =========================================
     BASIC HELPERS
  ========================================= */

  const getValue = (object, keys, fallback = null) => {
    if (!object) return fallback

    for (const key of keys) {
      if (
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ''
      ) {
        return object[key]
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

  const normalizeStatus = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' ')
  }

  /* =========================================
     SRI LANKA TIME
  ========================================= */

  const getSriLankaDateParts = (dateValue) => {
    const date =
      dateValue instanceof Date
        ? dateValue
        : new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
      return null
    }

    const parts = new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: SRI_LANKA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).formatToParts(date)

    const result = {}

    for (const part of parts) {
      if (part.type !== 'literal') {
        result[part.type] = part.value
      }
    }

    return {
      year: result.year,
      month: result.month,
      day: result.day,
    }
  }

  const getSriLankaHour = () => {
    const hour = new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: SRI_LANKA_TIME_ZONE,
        hour: '2-digit',
        hourCycle: 'h23',
      }
    ).format(new Date())

    return Number(hour)
  }

  const getGreeting = () => {
    const hour = getSriLankaHour()

    if (hour < 12) {
      return 'Good morning'
    }

    if (hour < 17) {
      return 'Good afternoon'
    }

    return 'Good evening'
  }

  const formattedToday =
    new Intl.DateTimeFormat(
      'en-LK',
      {
        timeZone: SRI_LANKA_TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    ).format(new Date())

  /* =========================================
     SUPABASE
  ========================================= */

  const loadTable = async (tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')

      if (error) {
        return {
          success: false,
          data: [],
          error,
        }
      }

      return {
        success: true,
        data: data || [],
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error,
      }
    }
  }

  const loadPrintingRequests = async () => {
    const tableNames = [
      'printing_requests',
      'print_requests',
      'printing_orders',
    ]

    for (const tableName of tableNames) {
      const result = await loadTable(tableName)

      if (result.success) {
        return result.data
      }
    }

    return []
  }

  const loadDashboard = useCallback(
    async () => {
      setLoading(true)
      setWarning('')

      try {
        const [
          productResult,
          orderResult,
          printingData,
        ] = await Promise.all([
          loadTable('products'),
          loadTable('orders'),
          loadPrintingRequests(),
        ])

        setProducts(productResult.data)
        setOrders(orderResult.data)
        setPrintingRequests(printingData)

        const failed = []

        if (!productResult.success) {
          failed.push('products')
        }

        if (!orderResult.success) {
          failed.push('orders')
        }

        if (failed.length > 0) {
          setWarning(
            `Some data could not be loaded: ${failed.join(', ')}.`
          )
        }
      } catch (error) {
        console.error(
          'Dashboard load error:',
          error
        )

        setWarning(
          'Some dashboard information could not be loaded.'
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  /* =========================================
     DASHBOARD DATA
  ========================================= */

  const dashboardData = useMemo(() => {
    const lowStockProducts = products.filter(
      (product) => {
        const stock = getValue(
          product,
          [
            'stock_quantity',
            'stock',
            'quantity',
            'qty',
            'available_stock',
          ],
          null
        )

        if (stock === null) {
          return false
        }

        const threshold = getValue(
          product,
          [
            'low_stock_threshold',
            'reorder_level',
            'minimum_stock',
            'min_stock',
          ],
          5
        )

        return (
          toNumber(stock) <=
          toNumber(threshold)
        )
      }
    )

    const pendingOrders = orders.filter(
      (order) => {
        const status = normalizeStatus(
          getValue(
            order,
            [
              'status',
              'order_status',
            ],
            ''
          )
        )

        return [
          'pending',
          'new',
          'placed',
          'confirmed',
          'processing',
          'preparing',
        ].includes(status)
      }
    )

    const pendingPrinting =
      printingRequests.filter(
        (request) => {
          const status = normalizeStatus(
            getValue(
              request,
              [
                'status',
                'printing_status',
              ],
              ''
            )
          )

          return ![
            'completed',
            'complete',
            'cancelled',
            'canceled',
            'rejected',
          ].includes(status)
        }
      )

    /* =========================================
       TODAY SALES - SRI LANKA DATE
    ========================================= */

    const sriLankaToday =
      getSriLankaDateParts(
        new Date()
      )

    const todaySales = orders
      .filter((order) => {
        const createdAt = getValue(
          order,
          [
            'created_at',
            'order_date',
            'date',
          ],
          null
        )

        if (!createdAt) {
          return false
        }

        const orderDate =
          new Date(createdAt)

        if (
          Number.isNaN(
            orderDate.getTime()
          )
        ) {
          return false
        }

        const orderSriLankaDate =
          getSriLankaDateParts(
            orderDate
          )

        if (
          !orderSriLankaDate ||
          !sriLankaToday
        ) {
          return false
        }

        const sameDate =
          orderSriLankaDate.year ===
            sriLankaToday.year &&
          orderSriLankaDate.month ===
            sriLankaToday.month &&
          orderSriLankaDate.day ===
            sriLankaToday.day

        const status = normalizeStatus(
          getValue(
            order,
            [
              'status',
              'order_status',
            ],
            ''
          )
        )

        const completed = [
          'completed',
          'complete',
          'delivered',
          'paid',
        ].includes(status)

        return (
          sameDate &&
          completed
        )
      })
      .reduce(
        (total, order) => {
          const amount = getValue(
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

          return (
            total +
            toNumber(amount)
          )
        },
        0
      )

    /* =========================================
       RECENT ORDERS
    ========================================= */

    const recentOrders =
      [...orders]
        .sort(
          (a, b) => {
            const dateA =
              new Date(
                getValue(
                  a,
                  [
                    'created_at',
                    'order_date',
                    'date',
                  ],
                  0
                )
              ).getTime()

            const dateB =
              new Date(
                getValue(
                  b,
                  [
                    'created_at',
                    'order_date',
                    'date',
                  ],
                  0
                )
              ).getTime()

            return dateB - dateA
          }
        )
        .slice(0, 6)

    return {
      totalProducts: products.length,

      pendingOrders:
        pendingOrders.length,

      lowStock:
        lowStockProducts.length,

      printingRequests:
        pendingPrinting.length,

      todaySales,

      recentOrders,

      lowStockProducts:
        lowStockProducts.slice(
          0,
          4
        ),

      pendingPrinting:
        pendingPrinting.slice(
          0,
          3
        ),
    }
  }, [
    products,
    orders,
    printingRequests,
  ])

  /* =========================================
     FORMATTING
  ========================================= */

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(
      'en-LK',
      {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0,
      }
    ).format(amount || 0)
  }

  const formatDate = (value) => {
    if (!value) {
      return '—'
    }

    const date = new Date(value)

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

    if (text.length > 20) {
      return `#${text.slice(0, 12)}`
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
      ],
      'Customer'
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

  /* =========================================
     OPEN EXACT ORDER FROM DASHBOARD
  ========================================= */

  const openExactOrder = (
    order
  ) => {
    const orderTarget =
      getValue(
        order,
        [
          'id',
          'order_id',
          'order_number',
          'order_no',
          'reference',
        ],
        null
      )

    if (
      orderTarget === null ||
      orderTarget === undefined ||
      orderTarget === ''
    ) {
      navigate('/orders')
      return
    }

    navigate(
      `/orders?order=${encodeURIComponent(
        String(orderTarget)
      )}`
    )
  }

  /* =========================================
     PRODUCT HELPERS
  ========================================= */

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
      'Product'
    )
  }

  const getProductStock = (
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

  /* =========================================
     STATUS
  ========================================= */

  const getStatusClass = (
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
        'paid',
      ].includes(status)
    ) {
      return 'status-completed'
    }

    if (
      [
        'cancelled',
        'canceled',
        'rejected',
      ].includes(status)
    ) {
      return 'status-cancelled'
    }

    if (
      [
        'processing',
        'confirmed',
        'preparing',
        'ready',
        'shipped',
      ].includes(status)
    ) {
      return 'status-processing'
    }

    return 'status-pending'
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="dashboard-page">

      {/* =====================================
          LUCKY HUB WELCOME BANNER
      ====================================== */}

      <section
        className="business-welcome"
        style={{
          position: 'relative',
          minHeight: '220px',
          display: 'flex',
          alignItems: 'center',
          marginBottom: '22px',
          padding: '32px 38px',
          overflow: 'hidden',

          border:
            '1px solid #dbe8df',

          borderRadius: '16px',

          backgroundColor:
            '#eef7e7',

          backgroundImage: `
            linear-gradient(
              90deg,
              rgba(244, 250, 235, 0.98) 0%,
              rgba(244, 250, 235, 0.93) 31%,
              rgba(244, 250, 235, 0.45) 48%,
              rgba(244, 250, 235, 0.00) 65%
            ),
            url('/assets/luckyhub-welcome-banner.png')
          `,

          backgroundRepeat:
            'no-repeat',

          backgroundPosition:
            'center',

          backgroundSize:
            'cover',

          boxShadow:
            '0 4px 14px rgba(24, 70, 55, 0.05)',
        }}
      >

        <div
          className="welcome-main"
          style={{
            position: 'relative',
            zIndex: 2,
            width: '48%',
          }}
        >

          <div
            className="welcome-date"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              marginBottom: '14px',
              color: '#335f56',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >

            <CalendarDays size={15} />

            {formattedToday}

          </div>


          <h1
            style={{
              margin: 0,
              color: '#004c44',
              fontSize: '29px',
              lineHeight: 1.16,
              fontWeight: 700,
              letterSpacing: '-0.4px',
            }}
          >

            {getGreeting()},
            <br />
            Lucky Hub Admin

          </h1>


          <p
            style={{
              margin: '11px 0 0',
              color: '#607971',
              fontSize: '13px',
              fontWeight: 400,
            }}
          >

            Here&apos;s what&apos;s happening
            in your shop today.

          </p>

        </div>

      </section>


      {/* =====================================
          WARNING
      ====================================== */}

      {warning && (
        <div className="dashboard-warning">

          <AlertTriangle size={16} />

          <span>
            {warning}
          </span>

        </div>
      )}


      {/* =====================================
          KPI CARDS
      ====================================== */}

      <section className="dashboard-stat-grid">

        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate('/products')
          }
        >

          <div>

            <span className="stat-label">
              Total Products
            </span>

            <strong>
              {loading
                ? '—'
                : dashboardData.totalProducts}
            </strong>

          </div>


          <div className="stat-icon product-icon">

            <Package size={21} />

          </div>

        </button>


        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate('/orders')
          }
        >

          <div>

            <span className="stat-label">
              Pending Orders
            </span>

            <strong>
              {loading
                ? '—'
                : dashboardData.pendingOrders}
            </strong>

          </div>


          <div className="stat-icon order-icon">

            <ShoppingCart size={21} />

          </div>

        </button>


        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate('/inventory')
          }
        >

          <div>

            <span className="stat-label">
              Low Stock
            </span>

            <strong>
              {loading
                ? '—'
                : dashboardData.lowStock}
            </strong>

          </div>


          <div className="stat-icon stock-icon">

            <Boxes size={21} />

          </div>

        </button>


        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate('/printing')
          }
        >

          <div>

            <span className="stat-label">
              Printing Queue
            </span>

            <strong>
              {loading
                ? '—'
                : dashboardData.printingRequests}
            </strong>

          </div>


          <div className="stat-icon print-icon">

            <Printer size={21} />

          </div>

        </button>

      </section>


      {/* =====================================
          MAIN CONTENT
      ====================================== */}

      <section className="dashboard-main-grid">

        {/* RECENT ORDERS */}

        <div className="dashboard-panel orders-panel">

          <div className="panel-header">

            <div>

              <h2>
                Recent Orders
              </h2>

              <p>
                Latest customer purchases
                received by Lucky Hub.
              </p>

            </div>


            <button
              type="button"
              className="view-all-button"
              onClick={() =>
                navigate('/orders')
              }
            >

              View Orders

              <ChevronRight size={14} />

            </button>

          </div>


          <div className="orders-table-wrapper">

            <table className="orders-table">

              <thead>

                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="table-empty"
                    >
                      Loading orders...
                    </td>

                  </tr>

                ) : dashboardData.recentOrders.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="table-empty"
                    >
                      No customer orders yet.
                    </td>

                  </tr>

                ) : (

                  dashboardData.recentOrders.map(
                    (order, index) => {
                      const status =
                        getOrderStatus(order)

                      return (
                        <tr
                          key={
                            order.id ||
                            `order-${index}`
                          }
                        >

                          <td className="order-id-cell">

                            {getOrderId(order)}

                          </td>


                          <td>

                            {getCustomerName(order)}

                          </td>


                          <td>

                            {formatDate(
                              getValue(
                                order,
                                [
                                  'created_at',
                                  'order_date',
                                  'date',
                                ],
                                null
                              )
                            )}

                          </td>


                          <td className="amount-cell">

                            {formatCurrency(
                              getOrderAmount(order)
                            )}

                          </td>


                          <td>

                            <span
                              className={`order-status ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>

                          </td>


                          <td>

                            <button
                              type="button"
                              className="view-order-button"
                              onClick={() =>
                                openExactOrder(
                                  order
                                )
                              }
                            >

                              <Eye size={14} />

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

        </div>


        {/* =================================
            ACTION CENTER
        ================================== */}

        <aside className="dashboard-panel action-center">

          <div className="panel-header">

            <div>

              <h2>
                Action Center
              </h2>

              <p>
                Tasks that may need your attention.
              </p>

            </div>


            <AlertTriangle
              size={18}
              className="action-center-icon"
            />

          </div>


          <div className="attention-list">

            {!loading &&
            dashboardData.lowStockProducts.length === 0 &&
            dashboardData.pendingPrinting.length === 0 ? (

              <div className="attention-empty">

                <div className="attention-empty-icon">
                  ✓
                </div>

                <strong>
                  All caught up
                </strong>

                <span>
                  Nothing urgent right now.
                </span>

              </div>

            ) : (

              <>

                {dashboardData.lowStockProducts.map(
                  (product, index) => (

                    <button
                      key={
                        product.id ||
                        `stock-${index}`
                      }
                      type="button"
                      className="attention-item stock-attention"
                      onClick={() =>
                        navigate('/inventory')
                      }
                    >

                      <div>

                        <strong>

                          {getProductName(product)}

                        </strong>

                        <span>

                          {getProductStock(product)}{' '}
                          remaining in stock

                        </span>

                      </div>


                      <span className="attention-link">
                        Restock
                      </span>

                    </button>

                  )
                )}


                {dashboardData.pendingPrinting.map(
                  (request, index) => (

                    <button
                      key={
                        request.id ||
                        `printing-${index}`
                      }
                      type="button"
                      className="attention-item printing-attention"
                      onClick={() =>
                        navigate('/printing')
                      }
                    >

                      <div>

                        <strong>
                          Printing Request
                        </strong>

                        <span>

                          {getValue(
                            request,
                            [
                              'status',
                              'printing_status',
                            ],
                            'Pending'
                          )}

                        </span>

                      </div>


                      <span className="attention-link">
                        Open
                      </span>

                    </button>

                  )
                )}

              </>

            )}

          </div>

        </aside>

      </section>

    </div>
  )
}

export default Dashboard