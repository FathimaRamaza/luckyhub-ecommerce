import { updateSingleRow, safeDocumentUrl } from '../services/adminData.js'
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { supabase } from '../services/supabase.js'
import './PrintingRequests.css'

const PAGE_SIZE = 7
const SRI_LANKA_TIME_ZONE = 'Asia/Colombo'


const actionUi = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 6000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, background: 'rgba(5, 27, 22, 0.52)', backdropFilter: 'blur(2px)',
  },
  modal: {
    width: '100%', maxWidth: 650, maxHeight: '88vh', overflowY: 'auto',
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


function PrintingRequests() {
  const [requests, setRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [currentPage, setCurrentPage] = useState(1)

  const [activeTableName, setActiveTableName] = useState('printing_requests')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestModalMode, setRequestModalMode] = useState(null)
  const [requestActionLoading, setRequestActionLoading] = useState(false)

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

  const getExistingKey = (object, keys) => {
    if (!object) return null
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(object, key)) return key
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
     LOAD PRINTING REQUESTS
  ========================================= */

  const loadPrintingRequests = async (
    showRefresh = false
  ) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const possibleTables = [
        'printing_requests',
        'print_requests',
        'printing_orders',
      ]

      let loaded = false

      for (const tableName of possibleTables) {
        const {
          data,
          error: requestError,
        } = await supabase
          .from(tableName)
          .select('*')

        if (!requestError) {
          setActiveTableName(tableName)
          setRequests(data || [])
          loaded = true
          break
        }
      }

      if (!loaded) {
        throw new Error(
          'No printing request table could be accessed.'
        )
      }
    } catch (loadError) {
      console.error(
        'Printing requests load error:',
        loadError
      )

      setError(
        'Printing requests could not be loaded. Please check your Supabase table and permissions.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadPrintingRequests()
  }, [])

  /* =========================================
     REQUEST HELPERS
  ========================================= */

  const getRequestId = (request) => {
    const value = getValue(
      request,
      [
        'request_number',
        'request_no',
        'print_request_number',
        'reference',
        'id',
      ],
      '—'
    )

    const text = String(value)

    if (text === '—') {
      return text
    }

    if (text.startsWith('#')) {
      return text
    }

    if (text.length > 18) {
      return `#PR-${text.slice(0, 8)}`
    }

    return `#${text}`
  }

  const getCustomerName = (
    request
  ) => {
    return getValue(
      request,
      [
        'customer_name',
        'full_name',
        'name',
        'user_name',
      ],
      'Customer'
    )
  }

  const getCustomerPhone = (
    request
  ) => {
    return getValue(
      request,
      [
        'customer_phone',
        'phone',
        'mobile',
        'contact_number',
      ],
      ''
    )
  }

  const getDocumentName = (
    request
  ) => {
    return getValue(
      request,
      [
        'file_name',
        'document_name',
        'document',
        'title',
        'service_name',
      ],
      'Printing Document'
    )
  }

  const getPrintType = (
    request
  ) => {
    const value = getValue(
      request,
      [
        'print_type',
        'printing_type',
        'color_mode',
        'colour_mode',
        'type',
      ],
      'Standard'
    )

    return String(value)
  }

  const getPaperSize = (
    request
  ) => {
    return getValue(
      request,
      [
        'paper_size',
        'size',
        'page_size',
      ],
      'A4'
    )
  }

  const getPages = (
    request
  ) => {
    return toNumber(
      getValue(
        request,
        [
          'pages',
          'page_count',
          'total_pages',
          'number_of_pages',
        ],
        0
      )
    )
  }

  const getCopies = (
    request
  ) => {
    return toNumber(
      getValue(
        request,
        [
          'copies',
          'copy_count',
          'quantity',
          'number_of_copies',
        ],
        1
      )
    )
  }

  const getAmount = (
    request
  ) => {
    return toNumber(
      getValue(
        request,
        [
          'total_amount',
          'price',
          'amount',
          'final_total',
          'estimated_price',
        ],
        0
      )
    )
  }

  const getRequestDate = (
    request
  ) => {
    return getValue(
      request,
      [
        'created_at',
        'requested_at',
        'request_date',
        'date',
      ],
      null
    )
  }

  const getStatus = (
    request
  ) => {
    return getValue(
      request,
      [
        'status',
        'printing_status',
        'request_status',
      ],
      'Pending'
    )
  }

  /* =========================================
     STATUS GROUP
  ========================================= */

  const getStatusGroup = (
    value
  ) => {
    const status =
      normalizeStatus(value)

    if (
      [
        'completed',
        'complete',
        'ready',
        'finished',
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
        'printing',
        'in progress',
        'approved',
      ].includes(status)
    ) {
      return 'processing'
    }

    if (
      [
        'reviewing',
        'review',
        'under review',
      ].includes(status)
    ) {
      return 'reviewing'
    }

    return 'pending'
  }

  const getStatusLabel = (
    value
  ) => {
    const status =
      normalizeStatus(value)

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
    let reviewing = 0
    let processing = 0
    let completed = 0

    requests.forEach(
      (request) => {
        const group =
          getStatusGroup(
            getStatus(request)
          )

        if (group === 'pending') {
          pending += 1
        }

        if (group === 'reviewing') {
          reviewing += 1
        }

        if (group === 'processing') {
          processing += 1
        }

        if (group === 'completed') {
          completed += 1
        }
      }
    )

    return {
      total: requests.length,
      pending,
      reviewing,
      processing,
      completed,
    }
  }, [requests])

  /* =========================================
     FILTER + SORT
  ========================================= */

  const filteredRequests =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      let result =
        requests.filter(
          (request) => {
            const requestId =
              getRequestId(
                request
              ).toLowerCase()

            const customer =
              String(
                getCustomerName(
                  request
                )
              ).toLowerCase()

            const document =
              String(
                getDocumentName(
                  request
                )
              ).toLowerCase()

            const phone =
              String(
                getCustomerPhone(
                  request
                )
              ).toLowerCase()

            const group =
              getStatusGroup(
                getStatus(
                  request
                )
              )

            const matchesSearch =
              !query ||
              requestId.includes(query) ||
              customer.includes(query) ||
              document.includes(query) ||
              phone.includes(query)

            const matchesStatus =
              statusFilter === 'all' ||
              group ===
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
            sortBy === 'oldest'
          ) {
            return (
              new Date(
                getRequestDate(a) ||
                  0
              ).getTime() -
              new Date(
                getRequestDate(b) ||
                  0
              ).getTime()
            )
          }

          if (
            sortBy === 'amount-high'
          ) {
            return (
              getAmount(b) -
              getAmount(a)
            )
          }

          if (
            sortBy === 'amount-low'
          ) {
            return (
              getAmount(a) -
              getAmount(b)
            )
          }

          if (
            sortBy === 'customer'
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
              getRequestDate(b) ||
                0
            ).getTime() -
            new Date(
              getRequestDate(a) ||
                0
            ).getTime()
          )
        }
      )

      return result
    }, [
      requests,
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
      filteredRequests.length /
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

  const paginatedRequests =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE

      return filteredRequests.slice(
        start,
        start + PAGE_SIZE
      )
    }, [
      filteredRequests,
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
     WORKING PRINTING ACTIONS
  ========================================= */

  const openRequestView = (request) => {
    setSelectedRequest(request)
    setRequestModalMode('view')
  }

  const openRequestActions = (request) => {
    setSelectedRequest(request)
    setRequestModalMode('actions')
  }

  const closeRequestModal = () => {
    if (requestActionLoading) return
    setSelectedRequest(null)
    setRequestModalMode(null)
  }

  const updateRequestStatus = async (request, nextStatus) => {
    if (!request || requestActionLoading) return

    const idKey = getExistingKey(
      request,
      ['id', 'request_id', 'printing_request_id', 'print_request_id', 'request_number', 'request_no', 'print_request_number', 'reference']
    )
    const statusKey = getExistingKey(request, ['status', 'printing_status', 'request_status'])

    if (!idKey) {
      window.alert('Printing request ID column could not be detected.')
      return
    }

    if (!statusKey) {
      window.alert('Printing request status column could not be detected.')
      return
    }

    setRequestActionLoading(true)

    try {
      await updateSingleRow(supabase, activeTableName, request, { [statusKey]: nextStatus }, idKey, { [statusKey]: request[statusKey] })

      await loadPrintingRequests(true)
      setSelectedRequest(null)
      setRequestModalMode(null)
    } catch (actionError) {
      console.error('Printing request action error:', actionError)
      setError(actionError?.message || 'Printing request could not be updated.')
      window.alert(actionError?.message || 'Printing request could not be updated.')
    } finally {
      setRequestActionLoading(false)
    }
  }

  /* =========================================
     EXPORT PDF
  ========================================= */

  const exportRequests = () => {
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
        filteredRequests.reduce(
          (result, request) => {
            const group =
              getStatusGroup(
                getStatus(
                  request
                )
              )

            result.totalAmount +=
              getAmount(
                request
              )

            if (
              group === 'pending'
            ) {
              result.pending += 1
            }

            if (
              group === 'processing' ||
              group === 'reviewing'
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
        'PRINTING REQUEST REPORT',
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
        'Printing Service Requests',
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
          label: 'Filtered Requests',
          value:
            filteredRequests.length,
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
          label: 'Request Value',
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
          ? 'All Request Status'
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
        filteredRequests.map(
          (request, index) => [
            index + 1,
            getRequestId(
              request
            ),
            getCustomerName(
              request
            ),
            getDocumentName(
              request
            ),
            getPrintType(
              request
            ),
            getPaperSize(
              request
            ),
            getPages(
              request
            ),
            getCopies(
              request
            ),
            formatCurrency(
              getAmount(
                request
              )
            ),
            getStatusLabel(
              getStatus(
                request
              )
            ),
            formatDate(
              getRequestDate(
                request
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
              'Request ID',
              'Customer',
              'Document',
              'Print Type',
              'Paper',
              'Pages',
              'Copies',
              'Amount',
              'Status',
              'Requested',
            ],
          ],

          body: tableRows,

          theme: 'grid',

          margin: {
            left: 7,
            right: 7,
            bottom: 18,
          },

          styles: {
            font: 'helvetica',
            fontSize: 6.5,
            cellPadding: 2,
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
            fontSize: 6.5,
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
              cellWidth: 9,
              halign: 'center',
            },
            1: {
              cellWidth: 27,
            },
            2: {
              cellWidth: 34,
            },
            3: {
              cellWidth: 47,
            },
            4: {
              cellWidth: 29,
            },
            5: {
              cellWidth: 17,
              halign: 'center',
            },
            6: {
              cellWidth: 15,
              halign: 'center',
            },
            7: {
              cellWidth: 16,
              halign: 'center',
            },
            8: {
              cellWidth: 27,
              halign: 'right',
            },
            9: {
              cellWidth: 25,
              halign: 'center',
            },
            10: {
              cellWidth: 26,
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
              'Lucky Hub Management Portal - Printing Requests',
              7,
              pageHeight - 8
            )

            doc.text(
              `Page ${pageNumber}`,
              pageWidth - 7,
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
        `Lucky-Hub-Printing-Requests-${fileDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'Printing requests PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate printing requests PDF.'
      )
    }
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="printing-page">

      {/* HEADER */}

      <div className="printing-page-header">

        <div>

          <h1>
            Printing Requests
          </h1>

          <p>
            Review and manage customer
            printing service requests.
          </p>

        </div>


        <div className="printing-header-actions">

          <div className="printing-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Search requests..."
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
            className="printing-refresh-button"
            onClick={() =>
              loadPrintingRequests(
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
                  ? 'printing-spin'
                  : ''
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="printing-export-button"
            onClick={
              exportRequests
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
        <div className="printing-error">
          {error}
        </div>
      )}


      {/* SUMMARY */}

      <div className="printing-summary-grid">

        <PrintingSummaryCard
          title="Total Requests"
          value={
            loading
              ? '—'
              : stats.total
          }
          icon={Printer}
          tone="purple"
          note="All printing requests"
        />


        <PrintingSummaryCard
          title="Pending"
          value={
            loading
              ? '—'
              : stats.pending
          }
          icon={Clock3}
          tone="orange"
          note="Awaiting review"
        />


        <PrintingSummaryCard
          title="Processing"
          value={
            loading
              ? '—'
              : stats.processing +
                stats.reviewing
          }
          icon={FileText}
          tone="blue"
          note="In progress"
        />


        <PrintingSummaryCard
          title="Completed"
          value={
            loading
              ? '—'
              : stats.completed
          }
          icon={CheckCircle2}
          tone="green"
          note="Finished requests"
        />

      </div>


      {/* FILTERS */}

      <div className="printing-filter-row">

        <div className="printing-filters">

          <div className="printing-select">

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
                All Request Status
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="reviewing">
                Reviewing
              </option>

              <option value="processing">
                Processing
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


          <div className="printing-select">

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


      {/* TABLE */}

      <div className="printing-table-card">

        <div className="printing-table-wrapper">

          <table className="printing-table">

            <thead>

              <tr>

                <th>
                  Request
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Document
                </th>

                <th>
                  Print Details
                </th>

                <th>
                  Copies
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Status
                </th>

                <th>
                  Requested
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
                    colSpan="9"
                    className="printing-empty"
                  >
                    Loading printing requests...
                  </td>

                </tr>

              ) : paginatedRequests.length === 0 ? (

                <tr>

                  <td
                    colSpan="9"
                    className="printing-empty"
                  >
                    No printing requests found.
                  </td>

                </tr>

              ) : (

                paginatedRequests.map(
                  (
                    request,
                    index
                  ) => {
                    const status =
                      getStatus(
                        request
                      )

                    const group =
                      getStatusGroup(
                        status
                      )

                    const pages =
                      getPages(
                        request
                      )

                    return (
                      <tr
                        key={
                          getValue(
                            request,
                            ['id'],
                            null
                          ) ||
                          `${getRequestId(
                            request
                          )}-${index}`
                        }
                      >

                        {/* REQUEST */}

                        <td>

                          <div className="printing-request-id">

                            <strong>
                              {getRequestId(
                                request
                              )}
                            </strong>

                            <span>
                              Printing Service
                            </span>

                          </div>

                        </td>


                        {/* CUSTOMER */}

                        <td>

                          <div className="printing-customer">

                            <div className="printing-customer-avatar">

                              {String(
                                getCustomerName(
                                  request
                                )
                              )
                                .charAt(0)
                                .toUpperCase()}

                            </div>


                            <div>

                              <strong>

                                {getCustomerName(
                                  request
                                )}

                              </strong>

                              {getCustomerPhone(
                                request
                              ) && (
                                <span>

                                  {getCustomerPhone(
                                    request
                                  )}

                                </span>
                              )}

                            </div>

                          </div>

                        </td>


                        {/* DOCUMENT */}

                        <td>

                          <div className="printing-document">

                            <div className="printing-document-icon">

                              <FileText
                                size={17}
                              />

                            </div>


                            <div>

                              <strong>

                                {getDocumentName(
                                  request
                                )}

                              </strong>

                              <span>

                                {pages > 0
                                  ? `${pages} page${
                                      pages === 1
                                        ? ''
                                        : 's'
                                    }`
                                  : 'Document'}

                              </span>

                            </div>

                          </div>

                        </td>


                        {/* PRINT DETAILS */}

                        <td>

                          <div className="printing-details">

                            <strong>

                              {getPrintType(
                                request
                              )}

                            </strong>

                            <span>

                              {getPaperSize(
                                request
                              )}

                            </span>

                          </div>

                        </td>


                        {/* COPIES */}

                        <td>

                          <span className="printing-copy-count">

                            {getCopies(
                              request
                            )}

                          </span>

                        </td>


                        {/* AMOUNT */}

                        <td className="printing-amount">

                          {formatCurrency(
                            getAmount(
                              request
                            )
                          )}

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`printing-status printing-status-${group}`}
                          >

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


                        {/* DATE */}

                        <td>

                          <div className="printing-date">

                            <strong>

                              {formatDate(
                                getRequestDate(
                                  request
                                )
                              )}

                            </strong>

                            <span>

                              {formatTime(
                                getRequestDate(
                                  request
                                )
                              )}

                            </span>

                          </div>

                        </td>


                        {/* ACTION */}

                        <td>

                          <div className="printing-row-actions">

                            <button
                              type="button"
                              className="printing-view-button"
                              title="View printing request"
                              onClick={() => openRequestView(request)}
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
                              className="printing-more-button"
                              title="More options"
                              onClick={() => openRequestActions(request)}
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

        <div className="printing-table-footer">

          <span>

            Showing{' '}

            {filteredRequests.length ===
            0
              ? 0
              : (currentPage - 1) *
                  PAGE_SIZE +
                1}

            {' '}to{' '}

            {Math.min(
              currentPage *
                PAGE_SIZE,
              filteredRequests.length
            )}

            {' '}of{' '}

            {filteredRequests.length}

            {' '}requests

          </span>


          <div className="printing-pagination">

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

      {/* PRINTING REQUEST VIEW / ACTION MODAL */}
      {selectedRequest && requestModalMode && (
        <div style={actionUi.overlay} onMouseDown={closeRequestModal}>
          <div style={actionUi.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div style={actionUi.header}>
              <div>
                <h2 style={actionUi.title}>
                  {requestModalMode === 'view' ? 'Printing Request Details' : 'Printing Request Actions'}
                </h2>
                <p style={actionUi.subtitle}>
                  {getRequestId(selectedRequest)} • {getCustomerName(selectedRequest)}
                </p>
              </div>
              <button type="button" style={actionUi.close} onClick={closeRequestModal}>
                <X size={18} />
              </button>
            </div>

            <div style={actionUi.body}>
              <div style={actionUi.grid}>
                <ActionDetail label="Request" value={getRequestId(selectedRequest)} />
                <ActionDetail label="Customer" value={getCustomerName(selectedRequest)} />
                <ActionDetail label="Phone" value={getCustomerPhone(selectedRequest) || '—'} />
                <ActionDetail label="Document" value={getDocumentName(selectedRequest)} />
                <ActionDetail label="Print Type" value={getPrintType(selectedRequest)} />
                <ActionDetail label="Paper Size" value={getPaperSize(selectedRequest)} />
                <ActionDetail label="Pages" value={getPages(selectedRequest)} />
                <ActionDetail label="Copies" value={getCopies(selectedRequest)} />
                <ActionDetail label="Amount" value={formatCurrency(getAmount(selectedRequest))} />
                <ActionDetail label="Status" value={getStatusLabel(getStatus(selectedRequest))} />
                <ActionDetail label="Requested" value={`${formatDate(getRequestDate(selectedRequest))} ${formatTime(getRequestDate(selectedRequest))}`} />
              </div>
            </div>

            <div style={actionUi.footer}>
              {safeDocumentUrl(selectedRequest) && <a style={actionUi.button} href={safeDocumentUrl(selectedRequest)} target="_blank" rel="noopener noreferrer">Open print file</a>}

              {requestModalMode === 'actions' && (
                <>
                  <button type="button" style={actionUi.button} disabled={requestActionLoading} onClick={() => updateRequestStatus(selectedRequest, 'reviewing')}>
                    Mark Reviewing
                  </button>
                  <button type="button" style={actionUi.button} disabled={requestActionLoading} onClick={() => updateRequestStatus(selectedRequest, 'processing')}>
                    Mark Processing
                  </button>
                  <button type="button" style={actionUi.primary} disabled={requestActionLoading} onClick={() => updateRequestStatus(selectedRequest, 'completed')}>
                    Mark Completed
                  </button>
                  <button type="button" style={actionUi.danger} disabled={requestActionLoading} onClick={() => {
                    if (window.confirm(`Cancel ${getRequestId(selectedRequest)}?`)) {
                      updateRequestStatus(selectedRequest, 'cancelled')
                    }
                  }}>
                    Cancel Request
                  </button>
                </>
              )}

              {requestModalMode === 'view' && (
                <button type="button" style={actionUi.primary} onClick={() => setRequestModalMode('actions')}>
                  Manage Request
                </button>
              )}

              <button type="button" style={actionUi.button} onClick={closeRequestModal}>
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

function PrintingSummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  note,
}) {
  return (
    <div className="printing-summary-card">

      <div
        className={`printing-summary-icon printing-summary-icon-${tone}`}
      >

        <Icon size={22} />

      </div>


      <div className="printing-summary-content">

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

export default PrintingRequests