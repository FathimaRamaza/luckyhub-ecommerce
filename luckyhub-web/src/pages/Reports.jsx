import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Download,
  Package,
  Printer,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { supabase } from '../services/supabase.js'
import './Reports.css'

const TIME_ZONE = 'Asia/Colombo'

function Reports() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [printingRequests, setPrintingRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [period, setPeriod] = useState('30days')

  /* =========================================
     HELPERS
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

  const normalizeStatus = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
  }

  /* =========================================
     LOAD PRINTING TABLE
  ========================================= */

  const loadPrintingTable = async () => {
    const tables = [
      'printing_requests',
      'print_requests',
      'printing_orders',
    ]

    for (const table of tables) {
      const {
        data,
        error: tableError,
      } = await supabase
        .from(table)
        .select('*')

      if (!tableError) {
        return data || []
      }
    }

    return []
  }

  /* =========================================
     LOAD REPORT DATA
  ========================================= */

  const loadReports = async (
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
        orderResult,
        productResult,
        categoryResult,
        printingResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*'),

        supabase
          .from('products')
          .select('*'),

        supabase
          .from('categories')
          .select('*'),

        loadPrintingTable(),
      ])

      if (orderResult.error) {
        throw orderResult.error
      }

      if (productResult.error) {
        throw productResult.error
      }

      setOrders(
        orderResult.data || []
      )

      setProducts(
        productResult.data || []
      )

      setCategories(
        categoryResult.error
          ? []
          : categoryResult.data || []
      )

      setPrintingRequests(
        printingResult || []
      )
    } catch (loadError) {
      console.error(
        'Reports load error:',
        loadError
      )

      setError(
        'Report data could not be loaded. Please check your Supabase connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  /* =========================================
     ORDER HELPERS
  ========================================= */

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

  const getOrderStatus = (order) => {
    return normalizeStatus(
      getValue(
        order,
        [
          'status',
          'order_status',
        ],
        'pending'
      )
    )
  }

  const getPaymentStatus = (order) => {
    return normalizeStatus(
      getValue(
        order,
        [
          'payment_status',
          'paymentStatus',
        ],
        ''
      )
    )
  }

  const isCompletedSale = (order) => {
    const orderStatus =
      getOrderStatus(order)

    const paymentStatus =
      getPaymentStatus(order)

    if (
      [
        'cancelled',
        'canceled',
        'rejected',
      ].includes(orderStatus)
    ) {
      return false
    }

    return (
      [
        'completed',
        'complete',
        'delivered',
      ].includes(orderStatus) ||
      paymentStatus === 'paid'
    )
  }

  /* =========================================
     PRODUCT HELPERS
  ========================================= */

  const getStock = (product) => {
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

  const getMinimumStock = (product) => {
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

  const getProductPrice = (product) => {
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

  /* =========================================
     DATE HELPERS
  ========================================= */

  const isWithinDays = (
    value,
    days
  ) => {
    if (!value) return false

    const date = new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
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

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return false
    }

    const formatter =
      new Intl.DateTimeFormat(
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

  const matchesPeriod = (value) => {
    if (period === 'all') {
      return true
    }

    if (period === '7days') {
      return isWithinDays(
        value,
        7
      )
    }

    if (period === '30days') {
      return isWithinDays(
        value,
        30
      )
    }

    if (period === 'month') {
      return isCurrentMonth(
        value
      )
    }

    return true
  }

  /* =========================================
     FILTERED ORDERS
  ========================================= */

  const reportOrders =
    useMemo(() => {
      return orders.filter(
        (order) =>
          matchesPeriod(
            getOrderDate(order)
          )
      )
    }, [
      orders,
      period,
    ])

  /* =========================================
     MAIN REPORT STATS
  ========================================= */

  const stats = useMemo(() => {
    const completed =
      reportOrders.filter(
        isCompletedSale
      )

    const revenue =
      completed.reduce(
        (total, order) =>
          total +
          getOrderAmount(order),
        0
      )

    const averageOrder =
      completed.length > 0
        ? revenue /
          completed.length
        : 0

    const pendingOrders =
      reportOrders.filter(
        (order) => {
          const status =
            getOrderStatus(order)

          return [
            'pending',
            'new',
            'placed',
            'confirmed',
            'processing',
            'preparing',
          ].includes(status)
        }
      ).length

    let totalStock = 0
    let stockValue = 0
    let lowStock = 0
    let outOfStock = 0

    products.forEach(
      (product) => {
        const stock =
          getStock(product)

        const minimum =
          getMinimumStock(
            product
          )

        totalStock += stock

        stockValue +=
          stock *
          getProductPrice(
            product
          )

        if (stock <= 0) {
          outOfStock += 1
        } else if (
          stock <= minimum
        ) {
          lowStock += 1
        }
      }
    )

    const pendingPrinting =
      printingRequests.filter(
        (request) => {
          const status =
            normalizeStatus(
              getValue(
                request,
                [
                  'status',
                  'printing_status',
                  'request_status',
                ],
                'pending'
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
      ).length

    return {
      revenue,
      completedSales:
        completed.length,

      averageOrder,
      pendingOrders,

      totalProducts:
        products.length,

      totalStock,
      stockValue,
      lowStock,
      outOfStock,

      categories:
        categories.length,

      printingTotal:
        printingRequests.length,

      pendingPrinting,
    }
  }, [
    reportOrders,
    products,
    categories,
    printingRequests,
  ])

  /* =========================================
     ORDER STATUS BREAKDOWN
  ========================================= */

  const orderStatusBreakdown =
    useMemo(() => {
      const groups = {
        Pending: 0,
        Processing: 0,
        Completed: 0,
        Cancelled: 0,
      }

      reportOrders.forEach(
        (order) => {
          const status =
            getOrderStatus(order)

          if (
            [
              'completed',
              'complete',
              'delivered',
            ].includes(status)
          ) {
            groups.Completed += 1
            return
          }

          if (
            [
              'cancelled',
              'canceled',
              'rejected',
            ].includes(status)
          ) {
            groups.Cancelled += 1
            return
          }

          if (
            [
              'processing',
              'preparing',
              'confirmed',
              'shipped',
              'shipping',
              'dispatched',
            ].includes(status)
          ) {
            groups.Processing += 1
            return
          }

          groups.Pending += 1
        }
      )

      return Object.entries(
        groups
      ).map(
        ([label, value]) => ({
          label,
          value,
        })
      )
    }, [reportOrders])

  /* =========================================
     LAST 7 DAYS SALES
  ========================================= */

  const salesTrend =
    useMemo(() => {
      const result = []

      for (
        let index = 6;
        index >= 0;
        index -= 1
      ) {
        const date = new Date()

        date.setDate(
          date.getDate() -
            index
        )

        const dateKey =
          new Intl.DateTimeFormat(
            'en-CA',
            {
              timeZone:
                TIME_ZONE,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }
          ).format(date)

        const label =
          new Intl.DateTimeFormat(
            'en-US',
            {
              timeZone:
                TIME_ZONE,
              weekday: 'short',
            }
          ).format(date)

        const revenue =
          orders
            .filter(
              (order) => {
                if (
                  !isCompletedSale(
                    order
                  )
                ) {
                  return false
                }

                const orderDate =
                  getOrderDate(
                    order
                  )

                if (!orderDate) {
                  return false
                }

                const key =
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
                  ).format(
                    new Date(
                      orderDate
                    )
                  )

                return (
                  key === dateKey
                )
              }
            )
            .reduce(
              (total, order) =>
                total +
                getOrderAmount(
                  order
                ),
              0
            )

        result.push({
          label,
          revenue,
        })
      }

      return result
    }, [orders])

  const maxDailyRevenue =
    Math.max(
      1,
      ...salesTrend.map(
        (item) =>
          item.revenue
      )
    )

  /* =========================================
     INVENTORY HEALTH
  ========================================= */

  const inventoryHealth =
    useMemo(() => {
      let inStock = 0
      let lowStock = 0
      let outOfStock = 0

      products.forEach(
        (product) => {
          const stock =
            getStock(product)

          const minimum =
            getMinimumStock(
              product
            )

          if (stock <= 0) {
            outOfStock += 1
          } else if (
            stock <= minimum
          ) {
            lowStock += 1
          } else {
            inStock += 1
          }
        }
      )

      return [
        {
          label: 'In Stock',
          value: inStock,
          tone: 'green',
        },
        {
          label: 'Low Stock',
          value: lowStock,
          tone: 'orange',
        },
        {
          label: 'Out of Stock',
          value: outOfStock,
          tone: 'red',
        },
      ]
    }, [products])

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
    ).format(
      value || 0
    )
  }

  /* =========================================
     EXPORT PDF
  ========================================= */

  const exportReport = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth =
        doc.internal.pageSize.getWidth()

      const pageHeight =
        doc.internal.pageSize.getHeight()

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

      const periodLabels = {
        '7days': 'Last 7 Days',
        '30days': 'Last 30 Days',
        month: 'This Month',
        all: 'All Time',
      }

      const drawHeader = (
        title
      ) => {
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
          title,
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
      }

      const drawFooter = () => {
        const pageNumber =
          doc.internal
            .getNumberOfPages()

        doc.setFontSize(7.5)

        doc.setTextColor(
          120,
          136,
          131
        )

        doc.text(
          'Lucky Hub Management Portal - Business Report',
          14,
          pageHeight - 8
        )

        doc.text(
          `Page ${pageNumber}`,
          pageWidth - 14,
          pageHeight - 8,
          {
            align: 'right',
          }
        )
      }

      drawHeader(
        'BUSINESS REPORT'
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
        'Business Performance Report',
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
        `Reporting Period: ${
          periodLabels[
            period
          ] ||
          period
        }`,
        14,
        44
      )

      const summaryData = [
        {
          label: 'Total Revenue',
          value:
            formatCurrency(
              stats.revenue
            ),
        },
        {
          label: 'Total Orders',
          value:
            reportOrders.length,
        },
        {
          label: 'Average Order',
          value:
            formatCurrency(
              stats.averageOrder
            ),
        },
        {
          label: 'Inventory Value',
          value:
            formatCurrency(
              stats.stockValue
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

      autoTable(
        doc,
        {
          startY: 78,

          head: [
            [
              'Business Metric',
              'Value',
            ],
          ],

          body: [
            [
              'Completed Sales',
              stats.completedSales,
            ],
            [
              'Pending Orders',
              stats.pendingOrders,
            ],
            [
              'Total Products',
              stats.totalProducts,
            ],
            [
              'Total Stock Units',
              stats.totalStock,
            ],
            [
              'Low Stock Products',
              stats.lowStock,
            ],
            [
              'Out of Stock Products',
              stats.outOfStock,
            ],
            [
              'Categories',
              stats.categories,
            ],
            [
              'Printing Requests',
              stats.printingTotal,
            ],
            [
              'Printing Queue',
              stats.pendingPrinting,
            ],
          ],

          theme: 'grid',

          margin: {
            left: 14,
            right: 150,
          },

          styles: {
            font: 'helvetica',
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
            lineWidth: 0.2,
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
          },
        }
      )

      autoTable(
        doc,
        {
          startY: 78,

          head: [
            [
              'Order Status',
              'Count',
            ],
          ],

          body:
            orderStatusBreakdown.map(
              (item) => [
                item.label,
                item.value,
              ]
            ),

          theme: 'grid',

          margin: {
            left: 160,
            right: 14,
          },

          styles: {
            font: 'helvetica',
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
            lineWidth: 0.2,
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
          },
        }
      )

      autoTable(
        doc,
        {
          startY: 139,

          head: [
            [
              'Inventory Health',
              'Products',
            ],
          ],

          body:
            inventoryHealth.map(
              (item) => [
                item.label,
                item.value,
              ]
            ),

          theme: 'grid',

          margin: {
            left: 14,
            right: 150,
            bottom: 18,
          },

          styles: {
            font: 'helvetica',
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
            lineWidth: 0.2,
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
          },
        }
      )

      autoTable(
        doc,
        {
          startY: 139,

          head: [
            [
              'Last 7 Days',
              'Revenue',
            ],
          ],

          body:
            salesTrend.map(
              (item) => [
                item.label,
                formatCurrency(
                  item.revenue
                ),
              ]
            ),

          theme: 'grid',

          margin: {
            left: 160,
            right: 14,
            bottom: 18,
          },

          styles: {
            font: 'helvetica',
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
            lineWidth: 0.2,
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
          },
        }
      )

      drawFooter()

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
        `Lucky-Hub-Business-Report-${fileDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'Business report PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate business report PDF.'
      )
    }
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="reports-page">

      {/* HEADER */}

      <div className="reports-page-header">

        <div>
          <h1>
            Reports
          </h1>

          <p>
            Monitor Lucky Hub business
            performance and trends.
          </p>
        </div>


        <div className="reports-header-actions">

          <div className="reports-period-select">

            <select
              value={period}
              onChange={(event) =>
                setPeriod(
                  event.target.value
                )
              }
            >
              <option value="7days">
                Last 7 Days
              </option>

              <option value="30days">
                Last 30 Days
              </option>

              <option value="month">
                This Month
              </option>

              <option value="all">
                All Time
              </option>
            </select>

            <ChevronDown
              size={14}
            />

          </div>


          <button
            type="button"
            className="reports-refresh-button"
            onClick={() =>
              loadReports(true)
            }
            disabled={
              refreshing
            }
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'reports-spin'
                  : ''
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="reports-export-button"
            onClick={
              exportReport
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
        <div className="reports-error">
          {error}
        </div>
      )}


      {/* MAIN SUMMARY */}

      <div className="reports-summary-grid">

        <ReportSummaryCard
          title="Total Revenue"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.revenue
                )
          }
          note={`${stats.completedSales} completed sales`}
          icon={Banknote}
          tone="green"
          currency
        />


        <ReportSummaryCard
          title="Total Orders"
          value={
            loading
              ? '—'
              : reportOrders.length
          }
          note={`${stats.pendingOrders} currently pending`}
          icon={ShoppingCart}
          tone="purple"
        />


        <ReportSummaryCard
          title="Average Order"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.averageOrder
                )
          }
          note="Average completed sale"
          icon={TrendingUp}
          tone="blue"
          currency
        />


        <ReportSummaryCard
          title="Inventory Value"
          value={
            loading
              ? '—'
              : formatCurrency(
                  stats.stockValue
                )
          }
          note={`${stats.totalStock} stock units`}
          icon={Boxes}
          tone="orange"
          currency
        />

      </div>


      {/* CHART ROW */}

      <div className="reports-dashboard-grid">

        {/* SALES TREND */}

        <section className="report-panel report-sales-panel">

          <div className="report-panel-header">

            <div>
              <h2>
                Sales Trend
              </h2>

              <p>
                Revenue for the last
                seven days
              </p>
            </div>

            <div className="report-panel-icon">
              <BarChart3
                size={18}
              />
            </div>

          </div>


          <div className="sales-trend-chart">

            {salesTrend.map(
              (item) => {
                const height =
                  Math.max(
                    5,
                    (item.revenue /
                      maxDailyRevenue) *
                      100
                  )

                return (
                  <div
                    className="sales-trend-item"
                    key={
                      item.label
                    }
                  >

                    <div className="sales-bar-area">

                      <div
                        className="sales-bar"
                        style={{
                          height:
                            `${height}%`,
                        }}
                        title={
                          formatCurrency(
                            item.revenue
                          )
                        }
                      />

                    </div>

                    <strong>
                      {item.label}
                    </strong>

                    <span>
                      {item.revenue > 0
                        ? formatCurrency(
                            item.revenue
                          )
                        : 'LKR 0'}
                    </span>

                  </div>
                )
              }
            )}

          </div>

        </section>


        {/* ORDER STATUS */}

        <section className="report-panel">

          <div className="report-panel-header">

            <div>
              <h2>
                Order Status
              </h2>

              <p>
                Current order
                distribution
              </p>
            </div>

            <div className="report-panel-icon">
              <ShoppingCart
                size={18}
              />
            </div>

          </div>


          <div className="report-status-list">

            {orderStatusBreakdown.map(
              (item) => {
                const percentage =
                  reportOrders.length >
                  0
                    ? Math.round(
                        (item.value /
                          reportOrders.length) *
                          100
                      )
                    : 0

                return (
                  <div
                    className="report-status-row"
                    key={
                      item.label
                    }
                  >

                    <div className="report-status-row-top">

                      <span>
                        {item.label}
                      </span>

                      <strong>
                        {item.value}
                      </strong>

                    </div>

                    <div className="report-progress">

                      <div
                        className={`report-progress-bar report-progress-${item.label.toLowerCase()}`}
                        style={{
                          width:
                            `${percentage}%`,
                        }}
                      />

                    </div>

                    <small>
                      {percentage}% of
                      orders
                    </small>

                  </div>
                )
              }
            )}

          </div>

        </section>

      </div>


      {/* BOTTOM ROW */}

      <div className="reports-bottom-grid">

        {/* INVENTORY */}

        <section className="report-panel">

          <div className="report-panel-header">

            <div>
              <h2>
                Inventory Health
              </h2>

              <p>
                Current product stock
                condition
              </p>
            </div>

            <div className="report-panel-icon">
              <Package
                size={18}
              />
            </div>

          </div>


          <div className="inventory-health-list">

            {inventoryHealth.map(
              (item) => (
                <div
                  className="inventory-health-row"
                  key={
                    item.label
                  }
                >

                  <div
                    className={`inventory-health-icon inventory-health-${item.tone}`}
                  >
                    {item.tone ===
                    'green' ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <AlertTriangle
                        size={18}
                      />
                    )}
                  </div>

                  <div>
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.value}
                    </strong>
                  </div>

                </div>
              )
            )}

          </div>

        </section>


        {/* BUSINESS SNAPSHOT */}

        <section className="report-panel">

          <div className="report-panel-header">

            <div>
              <h2>
                Business Snapshot
              </h2>

              <p>
                Overall Lucky Hub
                activity
              </p>
            </div>

            <div className="report-panel-icon">
              <TrendingUp
                size={18}
              />
            </div>

          </div>


          <div className="business-snapshot-grid">

            <SnapshotItem
              icon={Package}
              label="Products"
              value={
                stats.totalProducts
              }
            />

            <SnapshotItem
              icon={Boxes}
              label="Categories"
              value={
                stats.categories
              }
            />

            <SnapshotItem
              icon={Printer}
              label="Print Requests"
              value={
                stats.printingTotal
              }
            />

            <SnapshotItem
              icon={AlertTriangle}
              label="Low Stock"
              value={
                stats.lowStock
              }
            />

            <SnapshotItem
              icon={ShoppingCart}
              label="Pending Orders"
              value={
                stats.pendingOrders
              }
            />

            <SnapshotItem
              icon={Printer}
              label="Printing Queue"
              value={
                stats.pendingPrinting
              }
            />

          </div>

        </section>

      </div>

    </div>
  )
}


/* =========================================
   SUMMARY CARD
========================================= */

function ReportSummaryCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
  currency = false,
}) {
  return (
    <div className="report-summary-card">

      <div
        className={`report-summary-icon report-summary-icon-${tone}`}
      >
        <Icon size={22} />
      </div>

      <div className="report-summary-content">

        <span>
          {title}
        </span>

        <strong
          className={
            currency
              ? 'report-summary-currency'
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


/* =========================================
   SNAPSHOT
========================================= */

function SnapshotItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="snapshot-item">

      <div className="snapshot-icon">
        <Icon size={17} />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

    </div>
  )
}

export default Reports