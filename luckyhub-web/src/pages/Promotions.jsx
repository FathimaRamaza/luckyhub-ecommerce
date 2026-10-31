import { updateSingleRow, deleteSingleRow } from '../services/adminData.js'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  ImagePlus,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { supabase } from '../services/supabase'
import './Promotions.css'

const BANNER_BUCKET = 'promotion-banners'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const TITLE_OPTIONS = [
  'MEGA SALE',
  'SPECIAL OFFER',
  'BACK TO SCHOOL SALE',
  'BEST DEAL',
  'LIMITED TIME OFFER',
  'WEEKEND SALE',
  'STATIONERY SALE',
  'FLASH SALE',
]

const SUBTITLE_OPTIONS = [
  '',
  'Back to School Essentials',
  'Office & School Supplies',
  'Stationery Essentials',
  'Best Deals for You',
  'Quality Products at Better Prices',
  'Limited Time Deals',
]

const OFFER_TEXT_OPTIONS = [
  '',
  '10% OFF',
  '20% OFF',
  '25% OFF',
  '30% OFF',
  '40% OFF',
  '50% OFF',
  'UP TO 20% OFF',
  'UP TO 30% OFF',
  'UP TO 40% OFF',
  'UP TO 50% OFF',
]

const BUTTON_TEXT_OPTIONS = [
  'SHOP NOW',
  'VIEW DEAL',
  'BUY NOW',
  'SEE OFFERS',
  'EXPLORE',
]

const EMPTY_FORM = {
  bannerMode: 'image',
  title: '',
  subtitle: '',
  discountText: '',
  buttonText: 'SHOP NOW',
  targetType: 'none',
  targetValue: '',
  startAt: '',
  endAt: '',
  isActive: true,
  sortOrder: '0',
  imageUrl: '',
}

function formatDateTimeForInput(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (number) => String(number).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getLocalDateTimeMin() {
  const now = new Date()
  const pad = (number) => String(number).padStart(2, '0')

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function formatDisplayDate(value) {
  if (!value) return 'No limit'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getBannerStatus(banner) {
  if (!banner.is_active) {
    return {
      label: 'Inactive',
      className: 'promotion-status-inactive',
    }
  }

  const now = Date.now()
  const start = banner.start_at
    ? new Date(banner.start_at).getTime()
    : null
  const end = banner.end_at
    ? new Date(banner.end_at).getTime()
    : null

  if (start && start > now) {
    return {
      label: 'Scheduled',
      className: 'promotion-status-scheduled',
    }
  }

  if (end && end < now) {
    return {
      label: 'Expired',
      className: 'promotion-status-expired',
    }
  }

  return {
    label: 'Live',
    className: 'promotion-status-live',
  }
}

function safeStoragePathFromPublicUrl(url) {
  if (!url) return null

  const marker = `/storage/v1/object/public/${BANNER_BUCKET}/`
  const markerIndex = url.indexOf(marker)

  if (markerIndex === -1) return null

  return decodeURIComponent(
    url.slice(markerIndex + marker.length)
  )
}

function Promotions() {
  const [banners, setBanners] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [selectedBanner, setSelectedBanner] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [productPickerSearch, setProductPickerSearch] = useState('')
  const [productDiscountFilter, setProductDiscountFilter] = useState('all')
  const [bannerProductMap, setBannerProductMap] = useState({})

  const imageInputRef = useRef(null)

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      const [
        bannerResult,
        productResult,
        categoryResult,
        bannerProductResult,
      ] = await Promise.all([
        supabase
          .from('home_banners')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),

        supabase
          .from('products')
          .select(
            'id, name, is_active, base_price, compare_at_price'
          )
          .eq('is_active', true)
          .order('name', { ascending: true }),

        supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true }),

        supabase
          .from('home_banner_products')
          .select('banner_id, product_id, sort_order')
          .order('sort_order', { ascending: true }),
      ])

      if (bannerResult.error) throw bannerResult.error

      if (productResult.error) {
        console.warn(
          'Promotion product list error:',
          productResult.error
        )
      }

      if (categoryResult.error) {
        console.warn(
          'Promotion category list error:',
          categoryResult.error
        )
      }

      if (bannerProductResult.error) {
        console.warn(
          'Promotion product links error:',
          bannerProductResult.error
        )
      }

      const nextBannerProductMap = {}

      ;(bannerProductResult.data ?? []).forEach((link) => {
        if (!nextBannerProductMap[link.banner_id]) {
          nextBannerProductMap[link.banner_id] = []
        }

        nextBannerProductMap[link.banner_id].push(
          link.product_id
        )
      })

      setBanners(bannerResult.data ?? [])
      setProducts(productResult.data ?? [])
      setCategories(categoryResult.data ?? [])
      setBannerProductMap(nextBannerProductMap)
    } catch (loadError) {
      console.error('Promotions load error:', loadError)
      setError(
        loadError?.message || 'Promotions could not be loaded.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredBanners = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return banners.filter((banner) => {
      const status = getBannerStatus(banner).label.toLowerCase()

      const matchesSearch =
        !query ||
        banner.title?.toLowerCase().includes(query) ||
        banner.subtitle?.toLowerCase().includes(query) ||
        banner.discount_text?.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' || status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [banners, searchText, statusFilter])

  const filteredPickerProducts = useMemo(() => {
    const query = productPickerSearch
      .trim()
      .toLowerCase()

    return products.filter((product) => {
      const basePrice = Number(product.base_price ?? 0)
      const compareAtPrice = Number(
        product.compare_at_price ?? 0
      )

      const isDiscounted =
        compareAtPrice > basePrice

      const matchesSearch =
        !query ||
        product.name
          ?.toLowerCase()
          .includes(query)

      const matchesDiscount =
        productDiscountFilter === 'all' ||
        (productDiscountFilter === 'discounted' &&
          isDiscounted) ||
        (productDiscountFilter === 'regular' &&
          !isDiscounted)

      return matchesSearch && matchesDiscount
    })
  }, [
    products,
    productPickerSearch,
    productDiscountFilter,
  ])

  const summary = useMemo(() => {
    let live = 0
    let scheduled = 0
    let inactive = 0

    banners.forEach((banner) => {
      const status = getBannerStatus(banner).label

      if (status === 'Live') live += 1
      if (status === 'Scheduled') scheduled += 1
      if (status === 'Inactive' || status === 'Expired') {
        inactive += 1
      }
    })

    return {
      total: banners.length,
      live,
      scheduled,
      inactive,
    }
  }, [banners])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingBanner(null)
    setImageFile(null)
    setImagePreview('')
    setSelectedProductIds([])
    setProductPickerSearch('')
    setProductDiscountFilter('all')

    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = (banner) => {
    setEditingBanner(banner)

    setForm({
      bannerMode: banner.image_url ? 'image' : 'text',
      title: banner.title ?? '',
      subtitle: banner.subtitle ?? '',
      discountText: banner.discount_text ?? '',
      buttonText: banner.button_text ?? 'SHOP NOW',
      targetType: banner.target_type ?? 'none',
      targetValue: banner.target_value ?? '',
      startAt: formatDateTimeForInput(banner.start_at),
      endAt: formatDateTimeForInput(banner.end_at),
      isActive: Boolean(banner.is_active),
      sortOrder: String(banner.sort_order ?? 0),
      imageUrl: banner.image_url ?? '',
    })

    setImageFile(null)
    setImagePreview(banner.image_url ?? '')
    setSelectedProductIds(
      bannerProductMap[banner.id] ?? []
    )
    setProductPickerSearch('')
    setProductDiscountFilter('all')
    setFormOpen(true)
  }

  const openView = (banner) => {
    setSelectedBanner(banner)
    setViewOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    resetForm()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setImageFile(null)
      return
    }

    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedImageTypes.includes(file.type)) {
      window.alert('Please select a JPG, PNG or WEBP image.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      window.alert('Banner image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    setImageFile(file)

    const objectUrl = URL.createObjectURL(file)

    setImagePreview((current) => {
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }
      return objectUrl
    })
  }

  const clearImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(null)
    setImagePreview('')
    setForm((current) => ({
      ...current,
      imageUrl: '',
    }))

    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const toggleSelectedProduct = (productId) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    )
  }

  const uploadBannerImage = async () => {
    if (form.bannerMode !== 'image') {
      return {
        publicUrl: null,
        path: null,
      }
    }

    if (!imageFile) {
      return {
        publicUrl: form.imageUrl || null,
        path: null,
      }
    }

    const extension =
      imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'

    const fileName = `${crypto.randomUUID()}.${extension}`
    const path = `home/${fileName}`

    const uploadResult = await supabase.storage
      .from(BANNER_BUCKET)
      .upload(path, imageFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: imageFile.type,
      })

    if (uploadResult.error) throw uploadResult.error

    const publicUrlResult = supabase.storage
      .from(BANNER_BUCKET)
      .getPublicUrl(path)

    const publicUrl = publicUrlResult.data?.publicUrl

    if (!publicUrl) {
      await supabase.storage.from(BANNER_BUCKET).remove([path])
      throw new Error(
        'Banner image public URL could not be generated.'
      )
    }

    return {
      publicUrl,
      path,
    }
  }

  const validateForm = () => {
    if (form.bannerMode === 'image') {
      const hasImage = Boolean(imageFile || form.imageUrl)

      if (!hasImage) {
        return 'Please upload a banner image.'
      }
    }

    if (form.bannerMode === 'text' && !form.title.trim()) {
      return 'Promotion title is required for a text banner.'
    }

    if (!form.startAt) {
      return 'Start date and time are required.'
    }

    if (!form.endAt) {
      return 'End date and time are required.'
    }

    const startTime = new Date(form.startAt).getTime()
    const endTime = new Date(form.endAt).getTime()

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return 'Please enter valid start and end dates.'
    }

    const originalStartValue = editingBanner?.start_at
      ? formatDateTimeForInput(editingBanner.start_at)
      : ''

    const startWasNotChanged =
      Boolean(editingBanner) &&
      originalStartValue === form.startAt

    if (
      !startWasNotChanged &&
      startTime < Date.now() - 60 * 1000
    ) {
      return 'Start date and time cannot be in the past.'
    }

    if (endTime <= startTime) {
      return 'End date and time must be after the start date and time.'
    }

    if (endTime <= Date.now()) {
      return 'End date and time must be in the future.'
    }

    if (form.targetType === 'product' && !form.targetValue) {
      return 'Please select the product this banner should open.'
    }

    if (form.targetType === 'category' && !form.targetValue) {
      return 'Please select the category this banner should open.'
    }

    if (
      form.targetType === 'sale' &&
      selectedProductIds.length === 0
    ) {
      return 'Please select at least one product for this promotion.'
    }

    const sortOrder = Number(form.sortOrder)

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return 'Sort order must be a whole number of 0 or more.'
    }

    return ''
  }

  const savePromotion = async (event) => {
    event.preventDefault()

    const validationMessage = validateForm()

    if (validationMessage) {
      window.alert(validationMessage)
      return
    }

    let uploadedImagePath = null
    let bannerWriteAttempted = false

    try {
      setSaving(true)

      const oldImageUrl = editingBanner?.image_url ?? ''
      const imageResult = await uploadBannerImage()

      uploadedImagePath = imageResult.path

      const selectedProduct = products.find(
        (product) => product.id === form.targetValue
      )

      const selectedCategory = categories.find(
        (category) => category.id === form.targetValue
      )

      const automaticTitle =
        form.targetType === 'product'
          ? selectedProduct?.name || 'Product Promotion'
          : form.targetType === 'sale'
            ? `${selectedProductIds.length} Product Promotion`
            : form.targetType === 'category'
              ? `${selectedCategory?.name || 'Category'} Promotion`
              : editingBanner?.title || 'Home Promotion'

      const isImageBanner = form.bannerMode === 'image'

      const payload = {
        title: isImageBanner
          ? automaticTitle
          : form.title.trim(),
        subtitle: isImageBanner
          ? null
          : form.subtitle.trim() || null,
        discount_text: isImageBanner
          ? null
          : form.discountText.trim() || null,
        image_url: isImageBanner
          ? imageResult.publicUrl || null
          : null,
        button_text: isImageBanner
          ? 'SHOP NOW'
          : form.buttonText.trim() || 'SHOP NOW',
        target_type: form.targetType,
        target_value:
          ['product', 'category'].includes(form.targetType)
            ? form.targetValue.trim() || null
            : null,
        start_at: new Date(form.startAt).toISOString(),
        end_at: new Date(form.endAt).toISOString(),
        is_active: Boolean(form.isActive),
        sort_order: Number(form.sortOrder || 0),
      }

      let databaseResult
      bannerWriteAttempted = true

      if (editingBanner) {
        databaseResult = await supabase
          .from('home_banners')
          .update(payload)
          .eq('id', editingBanner.id)
          .select('*')
          .single()
      } else {
        databaseResult = await supabase
          .from('home_banners')
          .insert(payload)
          .select('*')
          .single()
      }

      if (databaseResult.error) {
        throw databaseResult.error
      }

      const savedBannerId = databaseResult.data.id

      const deleteLinksResult = await supabase
        .from('home_banner_products')
        .delete()
        .eq('banner_id', savedBannerId)

      if (deleteLinksResult.error) {
        throw deleteLinksResult.error
      }

      if (
        form.targetType === 'sale' &&
        selectedProductIds.length > 0
      ) {
        const linkRows = selectedProductIds.map(
          (productId, index) => ({
            banner_id: savedBannerId,
            product_id: productId,
            sort_order: index,
          })
        )

        const insertLinksResult = await supabase
          .from('home_banner_products')
          .insert(linkRows)

        if (insertLinksResult.error) {
          throw insertLinksResult.error
        }
      }

      if (
        editingBanner &&
        oldImageUrl &&
        oldImageUrl !== databaseResult.data.image_url
      ) {
        const oldPath = safeStoragePathFromPublicUrl(oldImageUrl)

        if (oldPath) {
          const removeResult = await supabase.storage
            .from(BANNER_BUCKET)
            .remove([oldPath])

          if (removeResult.error) {
            console.warn(
              'Old banner image cleanup error:',
              removeResult.error
            )
          }
        }
      }

      setFormOpen(false)
      resetForm()
      await loadData(true)
    } catch (saveError) {
      console.error('Promotion save error:', saveError)

      if (uploadedImagePath && !bannerWriteAttempted) {
        await supabase.storage
          .from(BANNER_BUCKET)
          .remove([uploadedImagePath])
      }

      window.alert(
        saveError?.message || 'Promotion could not be saved.'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (banner) => {
    try {
      await updateSingleRow(supabase, 'home_banners', banner, { is_active: !banner.is_active }, 'id', { is_active: banner.is_active })

      await loadData(true)
    } catch (statusError) {
      console.error('Promotion status error:', statusError)
      window.alert(
        statusError?.message ||
          'Promotion status could not be updated.'
      )
    }
  }

  const deletePromotion = async (banner) => {
    const confirmed = window.confirm(
      `Delete "${banner.title}"?\n\nThis cannot be undone.`
    )

    if (!confirmed) return

    try {
      await deleteSingleRow(supabase, 'home_banners', banner)

      const storagePath = safeStoragePathFromPublicUrl(
        banner.image_url
      )

      if (storagePath) {
        const removeResult = await supabase.storage
          .from(BANNER_BUCKET)
          .remove([storagePath])

        if (removeResult.error) {
          console.warn(
            'Promotion image cleanup error:',
            removeResult.error
          )
        }
      }

      await loadData(true)
    } catch (deleteError) {
      console.error('Promotion delete error:', deleteError)
      window.alert(
        deleteError?.message || 'Promotion could not be deleted.'
      )
    }
  }

  const getTargetLabel = (banner) => {
    if (banner.target_type === 'product') {
      return (
        products.find(
          (product) => product.id === banner.target_value
        )?.name || 'Product'
      )
    }

    if (banner.target_type === 'category') {
      return (
        categories.find(
          (category) => category.id === banner.target_value
        )?.name || 'Category'
      )
    }

    if (banner.target_type === 'sale') {
      const count =
        bannerProductMap[banner.id]?.length ?? 0

      return count > 0
        ? `${count} selected product${count === 1 ? '' : 's'}`
        : 'No products selected'
    }

    if (banner.target_type === 'search') {
      return banner.target_value
        ? `Search: ${banner.target_value}`
        : 'Search'
    }

    return 'No Link'
  }

  return (
    <div className="promotions-page">
      <div className="promotions-header">
        <div>
          <h1>Promotions</h1>
          <p>
            Manage mobile home sale banners and campaign visibility.
          </p>
        </div>

        <div className="promotions-header-actions">
          <button
            type="button"
            className="promotions-refresh-button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw
              size={17}
              className={refreshing ? 'promotions-spin' : ''}
            />
          </button>

          <button
            type="button"
            className="promotions-add-button"
            onClick={openCreate}
          >
            <Plus size={17} />
            Create Promotion
          </button>
        </div>
      </div>

      {error && (
        <div className="promotions-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <div className="promotions-summary-grid">
        <SummaryCard
          label="Total Promotions"
          value={summary.total}
          tone="purple"
        />
        <SummaryCard
          label="Live Now"
          value={summary.live}
          tone="green"
        />
        <SummaryCard
          label="Scheduled"
          value={summary.scheduled}
          tone="orange"
        />
        <SummaryCard
          label="Inactive / Expired"
          value={summary.inactive}
          tone="red"
        />
      </div>

      <div className="promotions-toolbar">
        <div className="promotions-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search promotions..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <select
          className="promotions-status-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="all">All Status</option>
          <option value="live">Live</option>
          <option value="scheduled">Scheduled</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="promotions-card">
        {loading ? (
          <div className="promotions-loading">
            <RefreshCw size={22} className="promotions-spin" />
            Loading promotions...
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="promotions-empty">
            <Megaphone size={40} />
            <strong>No promotions found</strong>
            <span>
              Create a promotion to show a moving banner in the
              Lucky Hub mobile app.
            </span>
          </div>
        ) : (
          <div className="promotions-table-wrapper">
            <table className="promotions-table">
              <thead>
                <tr>
                  <th>Banner</th>
                  <th>Promotion</th>
                  <th>Target</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBanners.map((banner) => {
                  const status = getBannerStatus(banner)

                  return (
                    <tr key={banner.id}>
                      <td>
                        <div className="promotion-thumb">
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title}
                            />
                          ) : (
                            <ImagePlus size={20} />
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="promotion-main-cell">
                          <strong>{banner.title}</strong>
                          {banner.discount_text && (
                            <span>{banner.discount_text}</span>
                          )}
                          {banner.subtitle && (
                            <small>{banner.subtitle}</small>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="promotion-target">
                          <span>{banner.target_type}</span>
                          <small>{getTargetLabel(banner)}</small>
                        </div>
                      </td>

                      <td>
                        <div className="promotion-schedule">
                          <span>
                            Start:{' '}
                            {formatDisplayDate(banner.start_at)}
                          </span>
                          <span>
                            End: {formatDisplayDate(banner.end_at)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`promotion-status ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td>
                        <strong className="promotion-order">
                          {banner.sort_order}
                        </strong>
                      </td>

                      <td>
                        <div className="promotion-actions">
                          <button
                            type="button"
                            title="View"
                            onClick={() => openView(banner)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(banner)}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            className={
                              banner.is_active
                                ? 'promotion-toggle-active'
                                : ''
                            }
                            title={
                              banner.is_active
                                ? 'Deactivate'
                                : 'Activate'
                            }
                            onClick={() => toggleStatus(banner)}
                          >
                            <CheckCircle2 size={15} />
                          </button>

                          <button
                            type="button"
                            className="promotion-delete-button"
                            title="Delete"
                            onClick={() => deletePromotion(banner)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="promotion-modal-overlay">
          <div className="promotion-modal">
            <div className="promotion-modal-header">
              <div>
                <h2>
                  {editingBanner
                    ? 'Edit Promotion'
                    : 'Create Promotion'}
                </h2>
                <p>
                  This promotion can appear as a moving banner on
                  the mobile Home screen.
                </p>
              </div>

              <button
                type="button"
                className="promotion-modal-close"
                onClick={closeForm}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="promotion-modal-form"
              onSubmit={savePromotion}
            >
              <div className="promotion-form-scroll">
                <div className="promotion-form-grid">
                  <FormField label="Banner Type" required>
                    <select
                      value={form.bannerMode}
                      onChange={(event) => {
                        const nextMode = event.target.value

                        setForm((current) => ({
                          ...current,
                          bannerMode: nextMode,
                        }))
                      }}
                    >
                      <option value="image">Image Banner</option>
                      <option value="text">Text Banner</option>
                    </select>
                  </FormField>

                  <FormField label="When Banner Is Clicked" required>
                    <select
                      value={form.targetType}
                      onChange={(event) => {
                        const nextTargetType = event.target.value

                        setForm((current) => ({
                          ...current,
                          targetType: nextTargetType,
                          targetValue: '',
                        }))

                        if (nextTargetType !== 'sale') {
                          setSelectedProductIds([])
                          setProductPickerSearch('')
                          setProductDiscountFilter('all')
                        }
                      }}
                    >
                      <option value="none">No Link</option>
                      <option value="product">One Product</option>
                      <option value="sale">Selected Products</option>
                      <option value="category">Category</option>
                    </select>
                  </FormField>

                  {form.bannerMode === 'image' ? (
                    <div className="promotion-form-field promotion-form-full">
                      <label>Banner Image *</label>

                      <div className="promotion-image-input">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                        />

                        <small>
                          JPG, PNG or WEBP. Maximum 5 MB. The image itself
                          can contain the promotion title, offer and Shop Now text.
                        </small>

                        {imagePreview && (
                          <div className="promotion-image-preview">
                            <img
                              src={imagePreview}
                              alt="Promotion preview"
                            />

                            <div>
                              <strong>
                                {imageFile
                                  ? imageFile.name
                                  : 'Current banner image'}
                              </strong>

                              <button
                                type="button"
                                onClick={clearImage}
                              >
                                Remove image
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <FormField label="Promotion Title" required>
                        <select
                          value={form.title}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select promotion title</option>
                          {TITLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Subtitle">
                        <select
                          value={form.subtitle}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              subtitle: event.target.value,
                            }))
                          }
                        >
                          <option value="">No subtitle</option>
                          {SUBTITLE_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Offer Text">
                        <select
                          value={form.discountText}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              discountText: event.target.value,
                            }))
                          }
                        >
                          <option value="">No offer text</option>
                          {OFFER_TEXT_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Button Text">
                        <select
                          value={form.buttonText}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              buttonText: event.target.value,
                            }))
                          }
                        >
                          {BUTTON_TEXT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </>
                  )}

                  {form.targetType === 'product' && (
                    <div className="promotion-form-field promotion-form-full">
                      <label>Select Product *</label>
                      <select
                        value={form.targetValue}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            targetValue: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.targetType === 'category' && (
                    <div className="promotion-form-field promotion-form-full">
                      <label>Select Category *</label>
                      <select
                        value={form.targetValue}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            targetValue: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.targetType === 'sale' && (
                    <div className="promotion-form-field promotion-form-full">
                      <label>Select Products *</label>

                      <div className="promotion-product-picker">
                        <div className="promotion-product-picker-header">
                          <div className="promotion-product-search">
                            <Search size={15} />
                            <input
                              type="text"
                              placeholder="Search product name..."
                              value={productPickerSearch}
                              onChange={(event) =>
                                setProductPickerSearch(
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <select
                            className="promotion-product-filter"
                            value={productDiscountFilter}
                            onChange={(event) =>
                              setProductDiscountFilter(
                                event.target.value
                              )
                            }
                          >
                            <option value="all">All Products</option>
                            <option value="discounted">Discounted</option>
                            <option value="regular">Not Discounted</option>
                          </select>

                          <span className="promotion-product-count">
                            {selectedProductIds.length} selected
                          </span>
                        </div>

                        <div className="promotion-product-list">
                          {filteredPickerProducts.length === 0 ? (
                            <div className="promotion-product-empty">
                              No products found.
                            </div>
                          ) : (
                            filteredPickerProducts.map(
                              (product) => {
                                const checked =
                                  selectedProductIds.includes(
                                    product.id
                                  )

                                const basePrice = Number(
                                  product.base_price ?? 0
                                )

                                return (
                                  <label
                                    key={product.id}
                                    className={`promotion-product-option ${
                                      checked
                                        ? 'promotion-product-option-selected'
                                        : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        toggleSelectedProduct(
                                          product.id
                                        )
                                      }
                                    />

                                    <strong>{product.name}</strong>

                                    <span className="promotion-product-price">
                                      Rs. {basePrice.toLocaleString()}
                                    </span>
                                  </label>
                                )
                              }
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField label="Start Date & Time">
                    <input
                      type="datetime-local"
                      value={form.startAt}
                      min={getLocalDateTimeMin()}
                      disabled={
                        Boolean(editingBanner?.start_at) &&
                        new Date(editingBanner.start_at).getTime() <=
                          Date.now()
                      }
                      title={
                        Boolean(editingBanner?.start_at) &&
                        new Date(editingBanner.start_at).getTime() <=
                          Date.now()
                          ? 'This promotion has already started, so the start time cannot be changed.'
                          : undefined
                      }
                      onChange={(event) => {
                        const nextStartAt = event.target.value

                        setForm((current) => ({
                          ...current,
                          startAt: nextStartAt,
                          endAt:
                            current.endAt &&
                            new Date(current.endAt).getTime() <=
                              new Date(nextStartAt).getTime()
                              ? ''
                              : current.endAt,
                        }))
                      }}
                      required
                    />
                  </FormField>

                  <FormField label="End Date & Time">
                    <input
                      type="datetime-local"
                      value={form.endAt}
                      min={
                        form.startAt &&
                        form.startAt > getLocalDateTimeMin()
                          ? form.startAt
                          : getLocalDateTimeMin()
                      }
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          endAt: event.target.value,
                        }))
                      }
                      required
                    />
                  </FormField>

                  <FormField label="Sort Order">
                    <input
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  <FormField label="Status">
                    <select
                      value={form.isActive ? 'active' : 'inactive'}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isActive:
                            event.target.value === 'active',
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </FormField>

                </div>
              </div>

              <div className="promotion-modal-footer">
                <button
                  type="button"
                  className="promotion-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="promotion-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingBanner
                      ? 'Save Changes'
                      : 'Create Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewOpen && selectedBanner && (
        <div className="promotion-modal-overlay">
          <div className="promotion-modal promotion-view-modal">
            <div className="promotion-modal-header">
              <div>
                <h2>Promotion Details</h2>
                <p>
                  Preview the banner information saved in Supabase.
                </p>
              </div>

              <button
                type="button"
                className="promotion-modal-close"
                onClick={() => setViewOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="promotion-view-body">
              {selectedBanner.image_url && (
                <img
                  className="promotion-view-image"
                  src={selectedBanner.image_url}
                  alt={selectedBanner.title}
                />
              )}

              <div className="promotion-view-copy">
                <span>{selectedBanner.discount_text}</span>
                <h3>{selectedBanner.title}</h3>
                <p>{selectedBanner.subtitle}</p>
              </div>

              <div className="promotion-detail-grid">
                <Detail
                  label="Button"
                  value={selectedBanner.button_text || 'SHOP NOW'}
                />
                <Detail
                  label="Target"
                  value={getTargetLabel(selectedBanner)}
                />
                <Detail
                  label="Start"
                  value={formatDisplayDate(
                    selectedBanner.start_at
                  )}
                />
                <Detail
                  label="End"
                  value={formatDisplayDate(selectedBanner.end_at)}
                />
                <Detail
                  label="Sort Order"
                  value={String(selectedBanner.sort_order ?? 0)}
                />
                <Detail
                  label="Status"
                  value={getBannerStatus(selectedBanner).label}
                />
              </div>

              {selectedBanner.target_type === 'sale' && (
                <div className="promotion-view-products">
                  <span>Selected Sale Products</span>

                  <div className="promotion-view-product-chips">
                    {(bannerProductMap[selectedBanner.id] ?? []).length > 0 ? (
                      (bannerProductMap[selectedBanner.id] ?? []).map(
                        (productId) => {
                          const product = products.find(
                            (item) => item.id === productId
                          )

                          return (
                            <span key={productId}>
                              {product?.name ?? 'Product'}
                            </span>
                          )
                        }
                      )
                    ) : (
                      <small>No products selected.</small>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="promotion-modal-footer">
              <button
                type="button"
                className="promotion-secondary-button"
                onClick={() => setViewOpen(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="promotion-primary-button"
                onClick={() => {
                  setViewOpen(false)
                  openEdit(selectedBanner)
                }}
              >
                <Edit3 size={15} />
                Edit Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone }) {
  return (
    <div
      className={`promotion-summary-card promotion-summary-${tone}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function FormField({
  label,
  required = false,
  children,
}) {
  return (
    <div className="promotion-form-field">
      <label>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="promotion-detail-item">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

export default Promotions
