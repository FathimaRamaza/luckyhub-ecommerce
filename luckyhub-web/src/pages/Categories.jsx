import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { supabase } from '../services/supabase.js'
import './Categories.css'

const PAGE_SIZE = 8
const TIME_ZONE = 'Asia/Colombo'

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
}

function Categories() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  const [currentPage, setCurrentPage] = useState(1)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)

  const [saving, setSaving] = useState(false)

  const [
    productModalCategory,
    setProductModalCategory,
  ] = useState(null)

  const [openMenuId, setOpenMenuId] = useState(null)

  const menuRef = useRef(null)

  /* =========================================
     HELPERS
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

  const getCategoryId = (
    category
  ) => {
    return getValue(
      category,
      [
        'id',
        'category_id',
      ],
      ''
    )
  }

  const getCategoryName = (
    category
  ) => {
    return getValue(
      category,
      [
        'name',
        'category_name',
        'title',
      ],
      'Unnamed Category'
    )
  }

  const getCategoryDescription = (
    category
  ) => {
    return getValue(
      category,
      [
        'description',
        'category_description',
        'details',
      ],
      ''
    )
  }

  const getCategorySlug = (
    category
  ) => {
    return getValue(
      category,
      [
        'slug',
      ],
      ''
    )
  }

  const isCategoryActive = (
    category
  ) => {
    if (
      category.is_active !== undefined &&
      category.is_active !== null
    ) {
      return Boolean(
        category.is_active
      )
    }

    if (
      category.active !== undefined &&
      category.active !== null
    ) {
      return Boolean(
        category.active
      )
    }

    const status =
      String(
        getValue(
          category,
          [
            'status',
          ],
          'active'
        )
      ).toLowerCase()

    return ![
      'inactive',
      'disabled',
      'archived',
    ].includes(status)
  }

  const createSlug = (
    name
  ) => {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const getProductCategoryId = (
    product
  ) => {
    return getValue(
      product,
      [
        'category_id',
        'categoryId',
      ],
      null
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

  const getProductSku = (
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
        categoryResult,
        productResult,
      ] = await Promise.all([
        supabase
          .from('categories')
          .select('*'),

        supabase
          .from('products')
          .select('*'),
      ])

      if (categoryResult.error) {
        throw categoryResult.error
      }

      if (productResult.error) {
        throw productResult.error
      }

      setCategories(
        categoryResult.data || []
      )

      setProducts(
        productResult.data || []
      )
    } catch (loadError) {
      console.error(
        'Categories load error:',
        loadError
      )

      setError(
        loadError?.message ||
        'Categories could not be loaded.'
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
     CLOSE MORE MENU
  ========================================= */

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  /* =========================================
     PRODUCT COUNT
  ========================================= */

  const getProductsForCategory = (
    category
  ) => {
    const categoryId =
      String(
        getCategoryId(
          category
        )
      )

    return products.filter(
      (product) =>
        String(
          getProductCategoryId(
            product
          )
        ) === categoryId
    )
  }

  const getProductCount = (
    category
  ) => {
    return getProductsForCategory(
      category
    ).length
  }

  /* =========================================
     SUMMARY
  ========================================= */

  const stats = useMemo(() => {
    const active =
      categories.filter(
        isCategoryActive
      ).length

    const productsInCategories =
      products.filter(
        (product) => {
          const categoryId =
            getProductCategoryId(
              product
            )

          return (
            categoryId !== null &&
            categoryId !== undefined &&
            categoryId !== ''
          )
        }
      ).length

    const uncategorized =
      products.length -
      productsInCategories

    return {
      total:
        categories.length,

      active,

      productsInCategories,

      uncategorized,
    }
  }, [
    categories,
    products,
  ])

  /* =========================================
     FILTER + SORT
  ========================================= */

  const filteredCategories =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      let result =
        categories.filter(
          (category) => {
            const name =
              getCategoryName(
                category
              ).toLowerCase()

            const description =
              getCategoryDescription(
                category
              ).toLowerCase()

            const matchesSearch =
              !query ||
              name.includes(
                query
              ) ||
              description.includes(
                query
              )

            const active =
              isCategoryActive(
                category
              )

            const matchesStatus =
              statusFilter ===
                'all' ||
              (
                statusFilter ===
                  'active' &&
                active
              ) ||
              (
                statusFilter ===
                  'inactive' &&
                !active
              )

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
            'products-high'
          ) {
            return (
              getProductCount(b) -
              getProductCount(a)
            )
          }

          if (
            sortBy ===
            'products-low'
          ) {
            return (
              getProductCount(a) -
              getProductCount(b)
            )
          }

          if (
            sortBy ===
            'newest'
          ) {
            return (
              new Date(
                b.created_at ||
                  0
              ).getTime() -
              new Date(
                a.created_at ||
                  0
              ).getTime()
            )
          }

          return getCategoryName(
            a
          ).localeCompare(
            getCategoryName(
              b
            )
          )
        }
      )

      return result
    }, [
      categories,
      products,
      search,
      statusFilter,
      sortBy,
    ])

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCategories.length /
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

  const paginatedCategories =
    useMemo(() => {
      const start =
        (
          currentPage -
          1
        ) *
        PAGE_SIZE

      return filteredCategories.slice(
        start,
        start +
          PAGE_SIZE
      )
    }, [
      filteredCategories,
      currentPage,
    ])

  /* =========================================
     ADD
  ========================================= */

  const openAddModal = () => {
    setEditingCategory(
      null
    )

    setForm({
      ...EMPTY_FORM,
    })

    setFormModalOpen(
      true
    )
  }

  /* =========================================
     EDIT
  ========================================= */

  const openEditModal = (
    category
  ) => {
    setEditingCategory(
      category
    )

    setForm({
      name:
        getCategoryName(
          category
        ),

      slug:
        getCategorySlug(
          category
        ) ||
        createSlug(
          getCategoryName(
            category
          )
        ),

      description:
        getCategoryDescription(
          category
        ),

      is_active:
        isCategoryActive(
          category
        ),
    })

    setFormModalOpen(
      true
    )

    setOpenMenuId(
      null
    )
  }

  /* =========================================
     NAME CHANGE
  ========================================= */

  const handleNameChange = (
    value
  ) => {
    setForm(
      (current) => ({
        ...current,

        name:
          value,

        slug:
          !editingCategory ||
          current.slug ===
            createSlug(
              current.name
            )
            ? createSlug(
                value
              )
            : current.slug,
      })
    )
  }

  /* =========================================
     SAVE CATEGORY
  ========================================= */

  const handleSaveCategory =
    async (
      event
    ) => {
      event.preventDefault()

      const name =
        form.name.trim()

      if (!name) {
        window.alert(
          'Category name is required.'
        )

        return
      }

      const slug =
        form.slug.trim() ||
        createSlug(name)

      if (!slug) {
        window.alert(
          'Category slug is required.'
        )

        return
      }

      setSaving(true)
      setError('')

      try {
        const categoryData = {
          name,

          slug,

          description:
            form.description.trim() ||
            null,

          is_active:
            Boolean(
              form.is_active
            ),
        }

        if (
          editingCategory
        ) {
          const categoryId =
            getCategoryId(
              editingCategory
            )

          const {
            error:
              updateError,
          } = await supabase
            .from(
              'categories'
            )
            .update(
              categoryData
            )
            .eq(
              'id',
              categoryId
            )

          if (updateError) {
            throw updateError
          }
        } else {
          const {
            error:
              insertError,
          } = await supabase
            .from(
              'categories'
            )
            .insert([
              categoryData,
            ])

          if (insertError) {
            throw insertError
          }
        }

        setFormModalOpen(
          false
        )

        setEditingCategory(
          null
        )

        setForm(
          EMPTY_FORM
        )

        await loadData(
          true
        )
      } catch (saveError) {
        console.error(
          'Category save error:',
          saveError
        )

        if (
          saveError?.code ===
          '23505'
        ) {
          window.alert(
            'A category with this name or slug already exists.'
          )
        } else {
          window.alert(
            saveError?.message ||
            'Category could not be saved.'
          )
        }
      } finally {
        setSaving(false)
      }
    }

  /* =========================================
     DELETE CATEGORY
  ========================================= */

  const handleDeleteCategory =
    async (
      category
    ) => {
      setOpenMenuId(
        null
      )

      const productCount =
        getProductCount(
          category
        )

      const categoryName =
        getCategoryName(
          category
        )

      if (
        productCount >
        0
      ) {
        window.alert(
          `"${categoryName}" cannot be deleted because ${productCount} product${
            productCount === 1
              ? ' is'
              : 's are'
          } linked to it.\n\nMove those products to another category first.`
        )

        return
      }

      const confirmed =
        window.confirm(
          `Delete "${categoryName}"?\n\nThis action cannot be undone.`
        )

      if (!confirmed) {
        return
      }

      try {
        const {
          error:
            deleteError,
        } = await supabase
          .from(
            'categories'
          )
          .delete()
          .eq(
            'id',
            getCategoryId(
              category
            )
          )

        if (deleteError) {
          throw deleteError
        }

        await loadData(
          true
        )
      } catch (deleteError) {
        console.error(
          'Category delete error:',
          deleteError
        )

        window.alert(
          deleteError?.message ||
          'Category could not be deleted.'
        )
      }
    }

  /* =========================================
     ACTIVATE / DEACTIVATE
  ========================================= */

  const handleToggleStatus =
    async (
      category
    ) => {
      setOpenMenuId(
        null
      )

      const newStatus =
        !isCategoryActive(
          category
        )

      try {
        const {
          error:
            updateError,
        } = await supabase
          .from(
            'categories'
          )
          .update({
            is_active:
              newStatus,
          })
          .eq(
            'id',
            getCategoryId(
              category
            )
          )

        if (updateError) {
          throw updateError
        }

        setCategories(
          (current) =>
            current.map(
              (item) =>
                String(
                  getCategoryId(
                    item
                  )
                ) ===
                String(
                  getCategoryId(
                    category
                  )
                )
                  ? {
                      ...item,

                      is_active:
                        newStatus,
                    }
                  : item
            )
        )
      } catch (statusError) {
        console.error(
          'Category status error:',
          statusError
        )

        window.alert(
          statusError?.message ||
          'Category status could not be updated.'
        )
      }
    }

  /* =========================================
     VIEW PRODUCTS
  ========================================= */

  const openProductsModal = (
    category
  ) => {
    setProductModalCategory(
      category
    )

    setOpenMenuId(
      null
    )
  }

  /* =========================================
     EXPORT PDF
  ========================================= */

  const exportCategories = () => {
    try {
      const doc =
        new jsPDF({
          orientation:
            'landscape',

          unit:
            'mm',

          format:
            'a4',
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
         PDF HEADER
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
        'CATEGORY REPORT',
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
        'Product Categories Report',
        14,
        38
      )

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(
        9
      )

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

      /* =====================================
         SUMMARY BOXES
      ====================================== */

      const summaryData = [
        {
          label:
            'Total Categories',

          value:
            stats.total,
        },

        {
          label:
            'Active Categories',

          value:
            stats.active,
        },

        {
          label:
            'Products in Categories',

          value:
            stats.productsInCategories,
        },

        {
          label:
            'Uncategorized Products',

          value:
            stats.uncategorized,
        },
      ]

      const boxWidth =
        57

      const boxHeight =
        18

      const gap =
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
                gap
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
         FILTER INFO
      ====================================== */

      let filterText =
        'Status: '

      if (
        statusFilter ===
        'active'
      ) {
        filterText +=
          'Active'
      } else if (
        statusFilter ===
        'inactive'
      ) {
        filterText +=
          'Inactive'
      } else {
        filterText +=
          'All Status'
      }

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
         CATEGORY TABLE
      ====================================== */

      const tableRows =
        filteredCategories.map(
          (
            category,
            index
          ) => [
            index + 1,

            getCategoryName(
              category
            ),

            getCategorySlug(
              category
            ) || '—',

            getCategoryDescription(
              category
            ) ||
              'No description',

            getProductCount(
              category
            ),

            isCategoryActive(
              category
            )
              ? 'Active'
              : 'Inactive',
          ]
        )

      autoTable(
        doc,
        {
          startY:
            82,

          head: [
            [
              'No.',
              'Category Name',
              'Slug',
              'Description',
              'Products',
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

            fontSize:
              8,

            cellPadding:
              3,

            valign:
              'middle',

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
                46,
            },

            3: {
              cellWidth:
                85,
            },

            4: {
              cellWidth:
                26,

              halign:
                'center',
            },

            5: {
              cellWidth:
                30,

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
              'Lucky Hub Management Portal - Categories',
              14,
              pageHeight -
                8
            )

            doc.text(
              `Page ${pageNumber}`,
              pageWidth -
                14,
              pageHeight -
                8,
              {
                align:
                  'right',
              }
            )
          },
        }
      )

      /* =====================================
         FILE NAME
      ====================================== */

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
        `Lucky-Hub-Categories-${fileDate}.pdf`
      )
    } catch (pdfError) {
      console.error(
        'Category PDF export error:',
        pdfError
      )

      window.alert(
        'Unable to generate categories PDF.'
      )
    }
  }

  /* =========================================
     MODAL PRODUCTS
  ========================================= */

  const modalProducts =
    productModalCategory
      ? getProductsForCategory(
          productModalCategory
        )
      : []

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="categories-page">

      {/* HEADER */}

      <div className="categories-page-header">

        <div>

          <h1>
            Categories
          </h1>

          <p>
            Organize and manage Lucky Hub product categories.
          </p>

        </div>


        <div className="categories-header-actions">

          <div className="categories-search">

            <Search
              size={16}
            />

            <input
              type="text"
              placeholder="Search categories..."
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
            className="category-add-button"
            onClick={
              openAddModal
            }
          >
            <Plus
              size={16}
            />

            Add Category
          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="categories-error">
          {error}
        </div>
      )}


      {/* SUMMARY */}

      <div className="categories-summary-grid">

        <SummaryCard
          title="Total Categories"
          value={
            loading
              ? '—'
              : stats.total
          }
          note="All product categories"
          tone="purple"
          icon={Tag}
        />


        <SummaryCard
          title="Active Categories"
          value={
            loading
              ? '—'
              : stats.active
          }
          note="Available for products"
          tone="green"
          icon={CheckCircle2}
        />


        <SummaryCard
          title="Products in Categories"
          value={
            loading
              ? '—'
              : stats.productsInCategories
          }
          note="Categorized products"
          tone="blue"
          icon={Package}
        />


        <SummaryCard
          title="Uncategorized"
          value={
            loading
              ? '—'
              : stats.uncategorized
          }
          note="Products needing category"
          tone="orange"
          icon={Package}
        />

      </div>


      {/* FILTER */}

      <div className="categories-filter-row">

        <div className="categories-filters">

          <div className="categories-select">

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
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>


          <div className="categories-select">

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
            >

              <option value="name">
                Sort by: Name
              </option>

              <option value="newest">
                Sort by: Newest
              </option>

              <option value="products-high">
                Most Products
              </option>

              <option value="products-low">
                Least Products
              </option>

            </select>

            <ChevronDown
              size={14}
            />

          </div>

        </div>


        <div className="categories-right-actions">

          <button
            type="button"
            className="category-refresh-button"
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
                  ? 'categories-spin'
                  : ''
              }
            />
          </button>


          <button
            type="button"
            className="category-export-button"
            onClick={
              exportCategories
            }
          >
            <Download
              size={16}
            />

            Export PDF
          </button>

        </div>

      </div>


      {/* TABLE */}

      <div className="categories-table-card">

        <div className="categories-table-wrapper">

          <table className="categories-table">

            <thead>

              <tr>

                <th className="category-checkbox-column">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                  />
                </th>

                <th>
                  Category Name
                </th>

                <th>
                  Description
                </th>

                <th>
                  Products
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
                    colSpan="6"
                    className="categories-empty"
                  >
                    Loading categories...
                  </td>

                </tr>

              ) : paginatedCategories.length === 0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="categories-empty"
                  >
                    No categories found.
                  </td>

                </tr>

              ) : (

                paginatedCategories.map(
                  (
                    category,
                    index
                  ) => {
                    const categoryId =
                      getCategoryId(
                        category
                      )

                    const productCount =
                      getProductCount(
                        category
                      )

                    const active =
                      isCategoryActive(
                        category
                      )

                    return (
                      <tr
                        key={
                          categoryId ||
                          index
                        }
                      >

                        <td className="category-checkbox-column">

                          <input
                            type="checkbox"
                            aria-label={`Select ${getCategoryName(
                              category
                            )}`}
                          />

                        </td>


                        <td>

                          <div className="category-name-cell">

                            <div
                              className={`category-icon category-icon-${
                                index %
                                4
                              }`}
                            >
                              <Tag
                                size={18}
                              />
                            </div>


                            <strong>
                              {getCategoryName(
                                category
                              )}
                            </strong>

                          </div>

                        </td>


                        <td className="category-description">

                          {getCategoryDescription(
                            category
                          ) ||
                            'No description'}

                        </td>


                        <td>

                          <button
                            type="button"
                            className="category-product-count"
                            onClick={() =>
                              openProductsModal(
                                category
                              )
                            }
                            title="View products"
                          >
                            {productCount}
                          </button>

                        </td>


                        <td>

                          <span
                            className={
                              active
                                ? 'category-status category-status-active'
                                : 'category-status category-status-inactive'
                            }
                          >

                            <span />

                            {active
                              ? 'Active'
                              : 'Inactive'}

                          </span>

                        </td>


                        <td>

                          <div className="category-actions">

                            <button
                              type="button"
                              title="Edit category"
                              onClick={() =>
                                openEditModal(
                                  category
                                )
                              }
                            >
                              <Edit3
                                size={15}
                              />
                            </button>


                            <button
                              type="button"
                              className="category-delete-button"
                              title={
                                productCount >
                                0
                                  ? `${productCount} products linked`
                                  : 'Delete category'
                              }
                              onClick={() =>
                                handleDeleteCategory(
                                  category
                                )
                              }
                            >
                              <Trash2
                                size={15}
                              />
                            </button>


                            <div
                              className="category-more-wrapper"
                              ref={
                                openMenuId ===
                                categoryId
                                  ? menuRef
                                  : null
                              }
                            >

                              <button
                                type="button"
                                title="More options"
                                onClick={() =>
                                  setOpenMenuId(
                                    openMenuId ===
                                      categoryId
                                      ? null
                                      : categoryId
                                  )
                                }
                              >
                                <MoreVertical
                                  size={15}
                                />
                              </button>


                              {openMenuId ===
                                categoryId && (

                                <div className="category-more-menu">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openProductsModal(
                                        category
                                      )
                                    }
                                  >
                                    <Eye
                                      size={15}
                                    />

                                    View Products
                                  </button>


                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(
                                        category
                                      )
                                    }
                                  >
                                    <Edit3
                                      size={15}
                                    />

                                    Edit Category
                                  </button>


                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleStatus(
                                        category
                                      )
                                    }
                                  >
                                    <CheckCircle2
                                      size={15}
                                    />

                                    {active
                                      ? 'Deactivate Category'
                                      : 'Activate Category'}
                                  </button>


                                  <button
                                    type="button"
                                    className="category-menu-delete"
                                    onClick={() =>
                                      handleDeleteCategory(
                                        category
                                      )
                                    }
                                  >
                                    <Trash2
                                      size={15}
                                    />

                                    Delete Category
                                  </button>

                                </div>

                              )}

                            </div>

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

        <div className="categories-table-footer">

          <span>

            Showing{' '}

            {filteredCategories.length ===
            0
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
              filteredCategories.length
            )}

            {' '}of{' '}

            {filteredCategories.length}

            {' '}categories

          </span>


          <div className="categories-pagination">

            <button
              type="button"
              disabled={
                currentPage ===
                1
              }
              onClick={() =>
                setCurrentPage(
                  (
                    page
                  ) =>
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
              (
                _,
                index
              ) =>
                index + 1
            ).map(
              (page) => (

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

              )
            )}


            <button
              type="button"
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (
                    page
                  ) =>
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


      {/* =====================================
          ADD / EDIT MODAL
      ====================================== */}

      {formModalOpen && (

        <div className="category-modal-overlay">

          <div className="category-modal">

            <div className="category-modal-header">

              <div>

                <h2>
                  {editingCategory
                    ? 'Edit Category'
                    : 'Add Category'}
                </h2>

                <p>
                  {editingCategory
                    ? 'Update category information.'
                    : 'Create a new Lucky Hub product category.'}
                </p>

              </div>


              <button
                type="button"
                className="category-modal-close"
                onClick={() =>
                  setFormModalOpen(
                    false
                  )
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>


            <form
              onSubmit={
                handleSaveCategory
              }
            >

              <div className="category-modal-body">

                <div className="category-form-field">

                  <label>
                    Category Name
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={
                      form.name
                    }
                    onChange={(event) =>
                      handleNameChange(
                        event.target.value
                      )
                    }
                    placeholder="Example: CR Books"
                    autoFocus
                  />

                </div>


                <div className="category-form-field">

                  <label>
                    Slug
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={
                      form.slug
                    }
                    onChange={(event) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,

                          slug:
                            createSlug(
                              event.target.value
                            ),
                        })
                      )
                    }
                    placeholder="cr-books"
                  />

                  <small>
                    Used as the category identifier.
                  </small>

                </div>


                <div className="category-form-field">

                  <label>
                    Description
                  </label>

                  <textarea
                    rows="4"
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,

                          description:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Short category description..."
                  />

                </div>


                <div className="category-form-field">

                  <label>
                    Status
                  </label>

                  <select
                    value={
                      form.is_active
                        ? 'active'
                        : 'inactive'
                    }
                    onChange={(event) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,

                          is_active:
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

                </div>

              </div>


              <div className="category-modal-footer">

                <button
                  type="button"
                  className="category-modal-cancel"
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
                  className="category-modal-save"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingCategory
                      ? 'Save Changes'
                      : 'Add Category'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================
          VIEW PRODUCTS MODAL
      ====================================== */}

      {productModalCategory && (

        <div className="category-modal-overlay">

          <div className="category-modal category-products-modal">

            <div className="category-modal-header">

              <div>

                <h2>
                  {getCategoryName(
                    productModalCategory
                  )}
                </h2>

                <p>
                  {modalProducts.length}{' '}
                  product
                  {modalProducts.length ===
                  1
                    ? ''
                    : 's'}{' '}
                  assigned to this category.
                </p>

              </div>


              <button
                type="button"
                className="category-modal-close"
                onClick={() =>
                  setProductModalCategory(
                    null
                  )
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>


            <div className="category-products-list">

              {modalProducts.length ===
              0 ? (

                <div className="category-products-empty">

                  <Package
                    size={28}
                  />

                  <strong>
                    No products
                  </strong>

                  <span>
                    No products are currently assigned to this category.
                  </span>

                </div>

              ) : (

                modalProducts.map(
                  (
                    product,
                    index
                  ) => (

                    <div
                      className="category-product-row"
                      key={
                        product.id ||
                        index
                      }
                    >

                      <div className="category-product-row-icon">

                        <Package
                          size={17}
                        />

                      </div>


                      <div className="category-product-row-main">

                        <strong>
                          {getProductName(
                            product
                          )}
                        </strong>

                        <span>
                          SKU:{' '}
                          {getProductSku(
                            product
                          )}
                        </span>

                      </div>

                    </div>

                  )
                )

              )}

            </div>


            <div className="category-modal-footer">

              <button
                type="button"
                className="category-modal-save"
                onClick={() =>
                  setProductModalCategory(
                    null
                  )
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


/* =========================================
   SUMMARY CARD
========================================= */

function SummaryCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}) {
  return (
    <div className="category-summary-card">

      <div
        className={`category-summary-icon category-summary-icon-${tone}`}
      >
        <Icon
          size={22}
        />
      </div>


      <div className="category-summary-content">

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

export default Categories