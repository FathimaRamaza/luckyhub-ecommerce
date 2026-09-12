import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Mail,
  MoreVertical,
  Phone,
  ReceiptText,
  RefreshCw,
  X,
  Search,
  ShoppingBag,
  UserCheck,
  Users,
  UserRoundCheck,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { supabase } from '../services/supabase.js'
import './Customers.css'

const PAGE_SIZE = 8
const SRI_LANKA_TIME_ZONE = 'Asia/Colombo'

function Customers() {
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [currentPage, setCurrentPage] = useState(1)

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [menuCustomer, setMenuCustomer] = useState(null)
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  })
  const [notice, setNotice] = useState('')

  const searchInputRef = useRef(null)

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

  /* =========================================
     LOAD FIRST EXISTING CUSTOMER TABLE
  ========================================= */

  const loadCustomerTable = async () => {
    const possibleTables = [
      'customers',
      'profiles',
      'customer_profiles',
      'user_profiles',
    ]

    for (const tableName of possibleTables) {
      const {
        data,
        error: tableError,
      } = await supabase
        .from(tableName)
        .select('*')

      if (!tableError) {
        return {
          tableName,
          data: data || [],
        }
      }
    }

    return {
      tableName: null,
      data: [],
    }
  }

  /* =========================================
     LOAD DATA
  ========================================= */

  const loadCustomers = async (
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
        customerResult,
        orderResult,
      ] = await Promise.all([
        loadCustomerTable(),

        supabase
          .from('orders')
          .select('*'),
      ])

      setCustomers(
        customerResult.data || []
      )

      if (!orderResult.error) {
        setOrders(
          orderResult.data || []
        )
      } else {
        setOrders([])
      }

      if (
        customerResult.data.length === 0 &&
        orderResult.error
      ) {
        setError(
          'Customer information could not be loaded.'
        )
      }
    } catch (loadError) {
      console.error(
        'Customers load error:',
        loadError
      )

      setError(
        'Customers could not be loaded. Please check your Supabase connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  /* =========================================
     CUSTOMER HELPERS
  ========================================= */

  const getCustomerId = (
    customer
  ) => {
    return getValue(
      customer,
      [
        'id',
        'user_id',
        'customer_id',
        'profile_id',
      ],
      ''
    )
  }

  const getCustomerName = (
    customer
  ) => {
    return getValue(
      customer,
      [
        'full_name',
        'name',
        'customer_name',
        'display_name',
        'username',
      ],
      'Customer'
    )
  }

  const getCustomerEmail = (
    customer
  ) => {
    return getValue(
      customer,
      [
        'email',
        'customer_email',
      ],
      ''
    )
  }

  const getCustomerPhone = (
    customer
  ) => {
    return getValue(
      customer,
      [
        'phone',
        'phone_number',
        'mobile',
        'customer_phone',
        'contact_number',
      ],
      ''
    )
  }

  const getJoinedDate = (
    customer
  ) => {
    return getValue(
      customer,
      [
        'created_at',
        'joined_at',
        'registered_at',
      ],
      null
    )
  }

  /* =========================================
     ORDER HELPERS
  ========================================= */

  const getOrderCustomerId = (
    order
  ) => {
    return getValue(
      order,
      [
        'customer_id',
        'user_id',
        'profile_id',
      ],
      null
    )
  }

  const getOrderCustomerName = (
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

  const getOrderCustomerEmail = (
    order
  ) => {
    return getValue(
      order,
      [
        'customer_email',
        'email',
      ],
      ''
    )
  }

  const getOrderCustomerPhone = (
    order
  ) => {
    return getValue(
      order,
      [
        'customer_phone',
        'phone',
        'mobile',
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

  /* =========================================
     CUSTOMER KEY
  ========================================= */

  const buildCustomerKey = ({
    id,
    email,
    phone,
    name,
  }) => {
    if (id) {
      return `id:${String(id)}`
    }

    if (email) {
      return `email:${String(email).toLowerCase()}`
    }

    if (phone) {
      return `phone:${String(phone)}`
    }

    return `name:${String(name || 'customer').toLowerCase()}`
  }

  /* =========================================
     BUILD CUSTOMER LIST

     If a customer table exists:
     → use it.

     If not:
     → derive customers from orders.
  ========================================= */

  const customerRecords =
    useMemo(() => {
      const records = new Map()

      customers.forEach(
        (customer) => {
          const id =
            getCustomerId(
              customer
            )

          const name =
            getCustomerName(
              customer
            )

          const email =
            getCustomerEmail(
              customer
            )

          const phone =
            getCustomerPhone(
              customer
            )

          const key =
            buildCustomerKey({
              id,
              email,
              phone,
              name,
            })

          records.set(
            key,
            {
              key,
              id,
              name,
              email,
              phone,

              joinedAt:
                getJoinedDate(
                  customer
                ),

              orderCount: 0,
              totalSpent: 0,
              lastOrderDate: null,

              raw: customer,
            }
          )
        }
      )

      orders.forEach(
        (order) => {
          const id =
            getOrderCustomerId(
              order
            )

          const name =
            getOrderCustomerName(
              order
            )

          const email =
            getOrderCustomerEmail(
              order
            )

          const phone =
            getOrderCustomerPhone(
              order
            )

          let key =
            buildCustomerKey({
              id,
              email,
              phone,
              name,
            })

          let record =
            records.get(key)

          /* Try matching existing customers */

          if (!record) {
            record =
              Array.from(
                records.values()
              ).find(
                (customer) => {
                  if (
                    id &&
                    customer.id &&
                    String(
                      customer.id
                    ) ===
                      String(id)
                  ) {
                    return true
                  }

                  if (
                    email &&
                    customer.email &&
                    customer.email.toLowerCase() ===
                      String(
                        email
                      ).toLowerCase()
                  ) {
                    return true
                  }

                  if (
                    phone &&
                    customer.phone &&
                    String(
                      customer.phone
                    ) ===
                      String(phone)
                  ) {
                    return true
                  }

                  return false
                }
              )

            if (record) {
              key = record.key
            }
          }

          /* Customer exists only through orders */

          if (!record) {
            record = {
              key,
              id,
              name,
              email,
              phone,

              joinedAt:
                getOrderDate(
                  order
                ),

              orderCount: 0,
              totalSpent: 0,
              lastOrderDate: null,

              raw: null,
            }

            records.set(
              key,
              record
            )
          }

          record.orderCount += 1

          record.totalSpent +=
            getOrderAmount(
              order
            )

          const orderDate =
            getOrderDate(
              order
            )

          if (orderDate) {
            const current =
              record.lastOrderDate
                ? new Date(
                    record.lastOrderDate
                  ).getTime()
                : 0

            const incoming =
              new Date(
                orderDate
              ).getTime()

            if (
              incoming >
              current
            ) {
              record.lastOrderDate =
                orderDate
            }
          }
        }
      )

      return Array.from(
        records.values()
      )
    }, [
      customers,
      orders,
    ])

  /* =========================================
     CUSTOMER STATUS
  ========================================= */

  const isActiveCustomer = (
    customer
  ) => {
    if (
      !customer.lastOrderDate
    ) {
      return false
    }

    const lastOrder =
      new Date(
        customer.lastOrderDate
      )

    const ninetyDaysAgo =
      new Date()

    ninetyDaysAgo.setDate(
      ninetyDaysAgo.getDate() -
        90
    )

    return (
      lastOrder >=
      ninetyDaysAgo
    )
  }

  /* =========================================
     SUMMARY
  ========================================= */

  const stats = useMemo(() => {
    const active =
      customerRecords.filter(
        (customer) =>
          isActiveCustomer(
            customer
          )
      ).length

    const repeat =
      customerRecords.filter(
        (customer) =>
          customer.orderCount > 1
      ).length

    const totalOrders =
      customerRecords.reduce(
        (
          total,
          customer
        ) =>
          total +
          customer.orderCount,
        0
      )

    return {
      total:
        customerRecords.length,

      active,

      repeat,

      totalOrders,
    }
  }, [
    customerRecords,
  ])

  /* =========================================
     FILTER + SORT
  ========================================= */

  const filteredCustomers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      let result =
        customerRecords.filter(
          (customer) => {
            const matchesSearch =
              !query ||
              String(
                customer.name
              )
                .toLowerCase()
                .includes(
                  query
                ) ||
              String(
                customer.email
              )
                .toLowerCase()
                .includes(
                  query
                ) ||
              String(
                customer.phone
              )
                .toLowerCase()
                .includes(
                  query
                )

            let matchesFilter = true

            if (
              customerFilter ===
              'active'
            ) {
              matchesFilter =
                isActiveCustomer(
                  customer
                )
            }

            if (
              customerFilter ===
              'repeat'
            ) {
              matchesFilter =
                customer.orderCount >
                1
            }

            if (
              customerFilter ===
              'no-orders'
            ) {
              matchesFilter =
                customer.orderCount ===
                0
            }

            return (
              matchesSearch &&
              matchesFilter
            )
          }
        )

      result = [...result]

      result.sort(
        (a, b) => {
          if (
            sortBy ===
            'name'
          ) {
            return a.name
              .localeCompare(
                b.name
              )
          }

          if (
            sortBy ===
            'orders-high'
          ) {
            return (
              b.orderCount -
              a.orderCount
            )
          }

          if (
            sortBy ===
            'spent-high'
          ) {
            return (
              b.totalSpent -
              a.totalSpent
            )
          }

          if (
            sortBy ===
            'last-order'
          ) {
            return (
              new Date(
                b.lastOrderDate ||
                  0
              ).getTime() -
              new Date(
                a.lastOrderDate ||
                  0
              ).getTime()
            )
          }

          return (
            new Date(
              b.joinedAt ||
                0
            ).getTime() -
            new Date(
              a.joinedAt ||
                0
            ).getTime()
          )
        }
      )

      return result
    }, [
      customerRecords,
      search,
      customerFilter,
      sortBy,
    ])

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCustomers.length /
          PAGE_SIZE
      )
    )

  useEffect(() => {
    setCurrentPage(1)
  }, [
    search,
    customerFilter,
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

  const paginatedCustomers =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE

      return filteredCustomers.slice(
        start,
        start + PAGE_SIZE
      )
    }, [
      filteredCustomers,
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
    ).format(
      value || 0
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
        timeZone:
          SRI_LANKA_TIME_ZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(date)
  }

  /* =========================================
     EXPORT
  ========================================= */

  const exportCustomers = () => {
    const rows = [
      [
        'Customer',
        'Email',
        'Phone',
        'Orders',
        'Total Spent',
        'Last Order',
        'Joined',
      ],

      ...filteredCustomers.map(
        (customer) => [
          customer.name,
          customer.email,
          customer.phone,
          customer.orderCount,
          customer.totalSpent,
          formatDate(
            customer.lastOrderDate
          ),
          formatDate(
            customer.joinedAt
          ),
        ]
      ),
    ]

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value ?? ''
              ).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(',')
      )
      .join('\n')

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      )

    const url =
      URL.createObjectURL(
        blob
      )

    const link =
      document.createElement(
        'a'
      )

    link.href = url

    link.download =
      'lucky-hub-customers.csv'

    document.body.appendChild(
      link
    )

    link.click()
    link.remove()

    URL.revokeObjectURL(
      url
    )
  }

  /* =========================================
     INITIALS
  ========================================= */

  const getInitials = (
    name
  ) => {
    return String(
      name || 'C'
    )
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0)
      )
      .join('')
      .toUpperCase()
  }

  /* =========================================
     CUSTOMER ACTIONS
  ========================================= */

  const getOrdersForCustomer = (
    customer
  ) => {
    if (!customer) {
      return []
    }

    const customerId =
      customer.id !== undefined &&
      customer.id !== null &&
      customer.id !== ''
        ? String(customer.id)
        : ''

    const customerEmail =
      String(customer.email || '')
        .trim()
        .toLowerCase()

    const customerPhone =
      String(customer.phone || '')
        .trim()

    const customerName =
      String(customer.name || '')
        .trim()
        .toLowerCase()

    return orders
      .filter((order) => {
        const orderCustomerId =
          getOrderCustomerId(order)

        if (
          customerId &&
          orderCustomerId !== undefined &&
          orderCustomerId !== null &&
          orderCustomerId !== '' &&
          String(orderCustomerId) ===
            customerId
        ) {
          return true
        }

        const orderEmail =
          String(
            getOrderCustomerEmail(order) ||
              ''
          )
            .trim()
            .toLowerCase()

        if (
          customerEmail &&
          orderEmail &&
          customerEmail ===
            orderEmail
        ) {
          return true
        }

        const orderPhone =
          String(
            getOrderCustomerPhone(order) ||
              ''
          ).trim()

        if (
          customerPhone &&
          orderPhone &&
          customerPhone ===
            orderPhone
        ) {
          return true
        }

        const orderName =
          String(
            getOrderCustomerName(order) ||
              ''
          )
            .trim()
            .toLowerCase()

        return (
          customerName &&
          orderName &&
          customerName === orderName
        )
      })
      .sort(
        (a, b) =>
          new Date(
            getOrderDate(b) || 0
          ).getTime() -
          new Date(
            getOrderDate(a) || 0
          ).getTime()
      )
  }

  const getOrderDisplayId = (
    order
  ) => {
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

    if (
      text === '—' ||
      text.startsWith('#')
    ) {
      return text
    }

    if (text.length > 22) {
      return `#${text.slice(0, 12)}`
    }

    return `#${text}`
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

  const showNotice = (
    message
  ) => {
    setNotice(message)

    window.setTimeout(() => {
      setNotice('')
    }, 2200)
  }

  const copyText = async (
    value,
    label
  ) => {
    const textValue =
      String(value || '').trim()

    if (!textValue) {
      showNotice(
        `${label} is not available.`
      )
      return
    }

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          textValue
        )
      } else {
        const textarea =
          document.createElement(
            'textarea'
          )

        textarea.value =
          textValue

        textarea.style.position =
          'fixed'
        textarea.style.opacity =
          '0'

        document.body.appendChild(
          textarea
        )

        textarea.focus()
        textarea.select()

        document.execCommand(
          'copy'
        )

        textarea.remove()
      }

      showNotice(
        `${label} copied.`
      )
    } catch (copyError) {
      console.error(
        'Copy error:',
        copyError
      )

      showNotice(
        `Could not copy ${label.toLowerCase()}.`
      )
    }
  }

  const openCustomer = (
    customer
  ) => {
    setSelectedCustomer(
      customer
    )
    setMenuCustomer(null)
  }

  const closeCustomer = () => {
    setSelectedCustomer(null)
  }

  const openMoreMenu = (
    event,
    customer
  ) => {
    event.stopPropagation()

    const rect =
      event.currentTarget.getBoundingClientRect()

    const menuWidth = 210
    const menuHeight = 190

    let left =
      rect.right -
      menuWidth

    let top =
      rect.bottom + 7

    if (left < 10) {
      left = 10
    }

    if (
      left + menuWidth >
      window.innerWidth - 10
    ) {
      left =
        window.innerWidth -
        menuWidth -
        10
    }

    if (
      top + menuHeight >
      window.innerHeight - 10
    ) {
      top =
        Math.max(
          10,
          rect.top -
            menuHeight -
            7
        )
    }

    setMenuPosition({
      top,
      left,
    })

    setMenuCustomer(
      customer
    )
  }

  useEffect(() => {
    const closeMenu = () => {
      setMenuCustomer(null)
    }

    const handleKeyDown = (
      event
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          'k'
      ) {
        event.preventDefault()

        searchInputRef.current?.focus()
      }

      if (
        event.key === 'Escape'
      ) {
        setMenuCustomer(null)
        setSelectedCustomer(null)
      }
    }

    document.addEventListener(
      'click',
      closeMenu
    )

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'click',
        closeMenu
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [])

  const selectedCustomerOrders =
    useMemo(
      () =>
        getOrdersForCustomer(
          selectedCustomer
        ),
      [
        selectedCustomer,
        orders,
      ]
    )

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="customers-page">

      {/* HEADER */}

      <div className="customers-page-header">

        <div>

          <h1>
            Customers
          </h1>

          <p>
            View customer information
            and purchase activity.
          </p>

        </div>


        <div className="customers-header-actions">

          <div className="customers-search">

            <Search size={16} />

            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search customers..."
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
            className="customers-refresh-button"
            onClick={() =>
              loadCustomers(true)
            }
            disabled={
              refreshing
            }
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'customers-spin'
                  : ''
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="customers-export-button"
            onClick={
              exportCustomers
            }
          >

            <Download
              size={16}
            />

            Export

          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="customers-error">
          {error}
        </div>
      )}


      {/* SUMMARY */}

      <div className="customers-summary-grid">

        <CustomerSummaryCard
          title="Total Customers"
          value={
            loading
              ? '—'
              : stats.total
          }
          icon={Users}
          tone="purple"
          note="Registered customers"
        />


        <CustomerSummaryCard
          title="Active Customers"
          value={
            loading
              ? '—'
              : stats.active
          }
          icon={UserCheck}
          tone="green"
          note="Ordered in last 90 days"
        />


        <CustomerSummaryCard
          title="Repeat Customers"
          value={
            loading
              ? '—'
              : stats.repeat
          }
          icon={UserRoundCheck}
          tone="blue"
          note="More than one order"
        />


        <CustomerSummaryCard
          title="Customer Orders"
          value={
            loading
              ? '—'
              : stats.totalOrders
          }
          icon={ShoppingBag}
          tone="orange"
          note="Total linked orders"
        />

      </div>


      {/* FILTERS */}

      <div className="customers-filter-row">

        <div className="customers-filters">

          <div className="customers-select">

            <select
              value={
                customerFilter
              }
              onChange={(event) =>
                setCustomerFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Customers
              </option>

              <option value="active">
                Active Customers
              </option>

              <option value="repeat">
                Repeat Customers
              </option>

              <option value="no-orders">
                No Orders
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>


          <div className="customers-select">

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
                Name A-Z
              </option>

              <option value="orders-high">
                Most Orders
              </option>

              <option value="spent-high">
                Highest Spending
              </option>

              <option value="last-order">
                Latest Order
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>

        </div>

      </div>


      {/* TABLE */}

      <div className="customers-table-card">

        <div className="customers-table-wrapper">

          <table className="customers-table">

            <thead>

              <tr>

                <th>
                  Customer
                </th>

                <th>
                  Contact
                </th>

                <th>
                  Orders
                </th>

                <th>
                  Total Spent
                </th>

                <th>
                  Last Order
                </th>

                <th>
                  Joined
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
                    className="customers-empty"
                  >
                    Loading customers...
                  </td>

                </tr>

              ) : paginatedCustomers.length === 0 ? (

                <tr>

                  <td
                    colSpan="8"
                    className="customers-empty"
                  >
                    No customers found.
                  </td>

                </tr>

              ) : (

                paginatedCustomers.map(
                  (
                    customer,
                    index
                  ) => {
                    const active =
                      isActiveCustomer(
                        customer
                      )

                    return (
                      <tr
                        key={
                          customer.key ||
                          `${customer.name}-${index}`
                        }
                      >

                        {/* CUSTOMER */}

                        <td>

                          <div className="customer-main-cell">

                            <div className="customer-profile-avatar">

                              {getInitials(
                                customer.name
                              )}

                            </div>


                            <div>

                              <strong>

                                {customer.name}

                              </strong>

                              <span>

                                Customer

                              </span>

                            </div>

                          </div>

                        </td>


                        {/* CONTACT */}

                        <td>

                          <div className="customer-contact">

                            {customer.email ? (
                              <span>

                                <Mail
                                  size={13}
                                />

                                {customer.email}

                              </span>
                            ) : (
                              <span>
                                No email
                              </span>
                            )}

                            <small>

                              {customer.phone ||
                                'No phone'}

                            </small>

                          </div>

                        </td>


                        {/* ORDERS */}

                        <td>

                          <span className="customer-order-count">

                            {customer.orderCount}

                          </span>

                        </td>


                        {/* TOTAL SPENT */}

                        <td className="customer-spent">

                          {formatCurrency(
                            customer.totalSpent
                          )}

                        </td>


                        {/* LAST ORDER */}

                        <td className="customer-date">

                          {formatDate(
                            customer.lastOrderDate
                          )}

                        </td>


                        {/* JOINED */}

                        <td className="customer-date">

                          {formatDate(
                            customer.joinedAt
                          )}

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={
                              active
                                ? 'customer-status customer-status-active'
                                : 'customer-status customer-status-inactive'
                            }
                          >

                            <span />

                            {active
                              ? 'Active'
                              : 'Inactive'}

                          </span>

                        </td>


                        {/* ACTION */}

                        <td>

                          <div className="customer-row-actions">

                            <button
                              type="button"
                              className="customer-view-button"
                              title="View customer"
                              onClick={() =>
                                openCustomer(
                                  customer
                                )
                              }
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
                              className="customer-more-button"
                              title="More options"
                              onClick={(event) =>
                                openMoreMenu(
                                  event,
                                  customer
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


        {/* FOOTER */}

        <div className="customers-table-footer">

          <span>

            Showing{' '}

            {filteredCustomers.length ===
            0
              ? 0
              : (currentPage - 1) *
                  PAGE_SIZE +
                1}

            {' '}to{' '}

            {Math.min(
              currentPage *
                PAGE_SIZE,
              filteredCustomers.length
            )}

            {' '}of{' '}

            {filteredCustomers.length}

            {' '}customers

          </span>


          <div className="customers-pagination">

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


      {/* MORE ACTIONS MENU */}

      {menuCustomer && (
        <div
          onClick={(event) =>
            event.stopPropagation()
          }
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            width: 210,
            zIndex: 1200,
            overflow: 'hidden',
            border:
              '1px solid #dce7e3',
            borderRadius: 10,
            background: '#ffffff',
            boxShadow:
              '0 12px 32px rgba(18, 55, 47, 0.16)',
          }}
        >
          <button
            type="button"
            onClick={() =>
              openCustomer(
                menuCustomer
              )
            }
            style={customerMenuButtonStyle}
          >
            <Eye size={15} />
            View Details
          </button>

          <button
            type="button"
            onClick={() =>
              openCustomer(
                menuCustomer
              )
            }
            style={customerMenuButtonStyle}
          >
            <ReceiptText size={15} />
            View Orders
          </button>

          <button
            type="button"
            onClick={() => {
              copyText(
                menuCustomer.email,
                'Email'
              )
              setMenuCustomer(null)
            }}
            style={{
              ...customerMenuButtonStyle,
              opacity:
                menuCustomer.email
                  ? 1
                  : 0.45,
            }}
            disabled={
              !menuCustomer.email
            }
          >
            <Copy size={15} />
            Copy Email
          </button>

          <button
            type="button"
            onClick={() => {
              copyText(
                menuCustomer.phone,
                'Phone'
              )
              setMenuCustomer(null)
            }}
            style={{
              ...customerMenuButtonStyle,
              opacity:
                menuCustomer.phone
                  ? 1
                  : 0.45,
            }}
            disabled={
              !menuCustomer.phone
            }
          >
            <Phone size={15} />
            Copy Phone
          </button>
        </div>
      )}


      {/* CUSTOMER DETAILS MODAL */}

      {selectedCustomer && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCustomer()
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background:
              'rgba(13, 40, 34, 0.46)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Customer details"
            style={{
              width: 'min(760px, 96vw)',
              maxHeight: '88vh',
              overflowY: 'auto',
              borderRadius: 16,
              background: '#ffffff',
              boxShadow:
                '0 20px 60px rgba(8, 33, 28, 0.25)',
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 16,
                padding:
                  '18px 20px',
                borderBottom:
                  '1px solid #e4ece9',
                background:
                  '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    borderRadius: 12,
                    background:
                      '#e6f5f1',
                    color: '#00796b',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {getInitials(
                    selectedCustomer.name
                  )}
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: '#172033',
                      fontSize: 19,
                    }}
                  >
                    {
                      selectedCustomer.name
                    }
                  </h2>

                  <span
                    style={{
                      color: '#7a8d87',
                      fontSize: 12,
                    }}
                  >
                    Customer details
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeCustomer
                }
                aria-label="Close"
                style={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  border:
                    '1px solid #dce6e2',
                  borderRadius: 9,
                  background:
                    '#ffffff',
                  color: '#526a63',
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                <CustomerDetailBox
                  label="Email"
                  value={
                    selectedCustomer.email ||
                    'Not available'
                  }
                />

                <CustomerDetailBox
                  label="Phone"
                  value={
                    selectedCustomer.phone ||
                    'Not available'
                  }
                />

                <CustomerDetailBox
                  label="Total Orders"
                  value={
                    selectedCustomer.orderCount
                  }
                />

                <CustomerDetailBox
                  label="Total Spent"
                  value={formatCurrency(
                    selectedCustomer.totalSpent
                  )}
                />

                <CustomerDetailBox
                  label="Last Order"
                  value={formatDate(
                    selectedCustomer.lastOrderDate
                  )}
                />

                <CustomerDetailBox
                  label="Joined"
                  value={formatDate(
                    selectedCustomer.joinedAt
                  )}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 9,
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      selectedCustomer.email,
                      'Email'
                    )
                  }
                  disabled={
                    !selectedCustomer.email
                  }
                  style={{
                    ...customerSecondaryButtonStyle,
                    opacity:
                      selectedCustomer.email
                        ? 1
                        : 0.45,
                  }}
                >
                  <Copy size={15} />
                  Copy Email
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      selectedCustomer.phone,
                      'Phone'
                    )
                  }
                  disabled={
                    !selectedCustomer.phone
                  }
                  style={{
                    ...customerSecondaryButtonStyle,
                    opacity:
                      selectedCustomer.phone
                        ? 1
                        : 0.45,
                  }}
                >
                  <Phone size={15} />
                  Copy Phone
                </button>
              </div>

              <div
                style={{
                  marginTop: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color:
                          '#1d302b',
                        fontSize: 15,
                      }}
                    >
                      Order History
                    </h3>

                    <p
                      style={{
                        margin:
                          '4px 0 0',
                        color:
                          '#82918d',
                        fontSize: 11.5,
                      }}
                    >
                      {
                        selectedCustomerOrders.length
                      } linked order
                      {
                        selectedCustomerOrders.length ===
                        1
                          ? ''
                          : 's'
                      }
                    </p>
                  </div>

                  <ReceiptText
                    size={18}
                    color="#087a6b"
                  />
                </div>

                <div
                  style={{
                    overflowX: 'auto',
                    border:
                      '1px solid #e1e9e6',
                    borderRadius: 11,
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      minWidth: 560,
                      borderCollapse:
                        'collapse',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            '#f5f8f7',
                        }}
                      >
                        <th
                          style={
                            customerModalThStyle
                          }
                        >
                          Order
                        </th>
                        <th
                          style={
                            customerModalThStyle
                          }
                        >
                          Date
                        </th>
                        <th
                          style={
                            customerModalThStyle
                          }
                        >
                          Amount
                        </th>
                        <th
                          style={
                            customerModalThStyle
                          }
                        >
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedCustomerOrders.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              padding:
                                '28px 12px',
                              textAlign:
                                'center',
                              color:
                                '#82918d',
                              fontSize:
                                12.5,
                            }}
                          >
                            No linked
                            orders found.
                          </td>
                        </tr>
                      ) : (
                        selectedCustomerOrders
                          .slice(
                            0,
                            10
                          )
                          .map(
                            (
                              order,
                              index
                            ) => (
                              <tr
                                key={
                                  getValue(
                                    order,
                                    [
                                      'id',
                                    ],
                                    `${getOrderDisplayId(
                                      order
                                    )}-${index}`
                                  )
                                }
                              >
                                <td
                                  style={
                                    customerModalTdStyle
                                  }
                                >
                                  <strong
                                    style={{
                                      color:
                                        '#203b34',
                                    }}
                                  >
                                    {getOrderDisplayId(
                                      order
                                    )}
                                  </strong>
                                </td>

                                <td
                                  style={
                                    customerModalTdStyle
                                  }
                                >
                                  {formatDate(
                                    getOrderDate(
                                      order
                                    )
                                  )}
                                </td>

                                <td
                                  style={
                                    customerModalTdStyle
                                  }
                                >
                                  {formatCurrency(
                                    getOrderAmount(
                                      order
                                    )
                                  )}
                                </td>

                                <td
                                  style={
                                    customerModalTdStyle
                                  }
                                >
                                  <span
                                    style={{
                                      display:
                                        'inline-flex',
                                      padding:
                                        '5px 8px',
                                      borderRadius:
                                        999,
                                      background:
                                        '#eef7f4',
                                      color:
                                        '#087a6b',
                                      fontSize:
                                        10.5,
                                      fontWeight:
                                        650,
                                    }}
                                  >
                                    {String(
                                      getOrderStatus(
                                        order
                                      )
                                    )
                                      .replaceAll(
                                        '_',
                                        ' '
                                      )
                                      .replace(
                                        /\b\w/g,
                                        (
                                          character
                                        ) =>
                                          character.toUpperCase()
                                      )}
                                  </span>
                                </td>
                              </tr>
                            )
                          )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* SMALL ACTION NOTICE */}

      {notice && (
        <div
          style={{
            position: 'fixed',
            right: 22,
            bottom: 22,
            zIndex: 1500,
            padding:
              '11px 15px',
            borderRadius: 9,
            background: '#004c44',
            color: '#ffffff',
            boxShadow:
              '0 10px 25px rgba(0, 58, 53, 0.22)',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

    </div>
  )
}


const customerMenuButtonStyle = {
  width: '100%',
  height: 43,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 13px',
  border: 'none',
  borderBottom: '1px solid #edf2f0',
  background: '#ffffff',
  color: '#3d5b53',
  fontFamily:
    '"Segoe UI", Arial, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
  cursor: 'pointer',
}

const customerSecondaryButtonStyle = {
  minHeight: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '0 12px',
  border: '1px solid #d5e2de',
  borderRadius: 8,
  background: '#ffffff',
  color: '#087a6b',
  fontFamily:
    '"Segoe UI", Arial, sans-serif',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
}

const customerModalThStyle = {
  padding: '11px 12px',
  borderBottom:
    '1px solid #e1e9e6',
  color: '#49635c',
  fontSize: 11,
  fontWeight: 650,
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const customerModalTdStyle = {
  padding: '11px 12px',
  borderBottom:
    '1px solid #edf1ef',
  color: '#5b706a',
  fontSize: 11.5,
  textAlign: 'left',
  verticalAlign: 'middle',
}

function CustomerDetailBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: 13,
        border:
          '1px solid #e2eae7',
        borderRadius: 10,
        background:
          '#fbfdfc',
      }}
    >
      <span
        style={{
          display: 'block',
          marginBottom: 5,
          color: '#899892',
          fontSize: 10.5,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: 'block',
          overflowWrap:
            'anywhere',
          color: '#263c36',
          fontSize: 12.5,
          fontWeight: 650,
        }}
      >
        {value}
      </strong>
    </div>
  )
}


/* =========================================
   SUMMARY CARD
========================================= */

function CustomerSummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  note,
}) {
  return (
    <div className="customer-summary-card">

      <div
        className={`customer-summary-icon customer-summary-icon-${tone}`}
      >
        <Icon size={22} />
      </div>


      <div className="customer-summary-content">

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

export default Customers