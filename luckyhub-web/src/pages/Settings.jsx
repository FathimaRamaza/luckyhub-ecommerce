import {
  Bell,
  Box,
  Check,
  ChevronRight,
  CircleDollarSign,
  Mail,
  Package,
  Printer,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import { supabase } from '../services/supabase.js'
import './Settings.css'

const DEFAULT_SETTINGS = {
  shopName: 'Lucky Hub',
  shopEmail: '',
  shopPhone: '',
  shopAddress: '',

  currency: 'LKR',
  lowStockThreshold: 5,
  enableLowStockAlert: true,

  autoConfirmOrders: false,
  allowOrderCancellation: true,
  standardDeliveryFee: 200,
  storePickupFee: 0,

  defaultPaperSize: 'A4',
  defaultPrintType: 'Black & White',
  printingNotification: true,

  orderNotification: true,
  lowStockNotification: true,
  printingRequestNotification: true,
  emailNotification: false,
}


const SETTINGS_CONFIG = {
  shopName: {
    dbKey: 'shop_name',
    type: 'string',
  },
  shopEmail: {
    dbKey: 'shop_email',
    type: 'string',
  },
  shopPhone: {
    dbKey: 'shop_phone',
    type: 'string',
  },
  shopAddress: {
    dbKey: 'shop_address',
    type: 'string',
  },
  currency: {
    dbKey: 'currency',
    type: 'string',
  },

  lowStockThreshold: {
    dbKey: 'low_stock_threshold',
    type: 'number',
  },
  enableLowStockAlert: {
    dbKey: 'enable_low_stock_alert',
    type: 'boolean',
  },

  autoConfirmOrders: {
    dbKey: 'auto_confirm_orders',
    type: 'boolean',
  },
  allowOrderCancellation: {
    dbKey: 'allow_order_cancellation',
    type: 'boolean',
  },
  standardDeliveryFee: {
    dbKey: 'standard_delivery_fee',
    type: 'number',
  },
  storePickupFee: {
    dbKey: 'store_pickup_fee',
    type: 'number',
  },

  defaultPaperSize: {
    dbKey: 'default_paper_size',
    type: 'string',
  },
  defaultPrintType: {
    dbKey: 'default_print_type',
    type: 'string',
  },
  printingNotification: {
    dbKey: 'printing_notification',
    type: 'boolean',
  },

  orderNotification: {
    dbKey: 'order_notification',
    type: 'boolean',
  },
  lowStockNotification: {
    dbKey: 'low_stock_notification',
    type: 'boolean',
  },
  printingRequestNotification: {
    dbKey: 'printing_request_notification',
    type: 'boolean',
  },
  emailNotification: {
    dbKey: 'email_notification',
    type: 'boolean',
  },
}

function parseSettingValue(
  value,
  type
) {
  if (type === 'number') {
    const parsed = Number(value)

    return Number.isFinite(parsed)
      ? parsed
      : 0
  }

  if (type === 'boolean') {
    return String(value).toLowerCase() === 'true'
  }

  return value ?? ''
}

function serializeSettingValue(
  value,
  type
) {
  if (type === 'boolean') {
    return value
      ? 'true'
      : 'false'
  }

  if (type === 'number') {
    const parsed = Number(value)

    return String(
      Number.isFinite(parsed)
        ? parsed
        : 0
    )
  }

  return String(
    value ?? ''
  )
}

function buildSettingsFromRows(
  rows
) {
  const nextSettings = {
    ...DEFAULT_SETTINGS,
  }

  const rowMap = new Map(
    (rows || []).map(
      (row) => [
        row.setting_key,
        row.setting_value,
      ]
    )
  )

  Object.entries(
    SETTINGS_CONFIG
  ).forEach(
    ([
      stateKey,
      config,
    ]) => {
      if (
        rowMap.has(
          config.dbKey
        )
      ) {
        nextSettings[
          stateKey
        ] =
          parseSettingValue(
            rowMap.get(
              config.dbKey
            ),
            config.type
          )
      }
    }
  )

  return nextSettings
}

function buildRowsFromSettings(
  settings
) {
  const updatedAt =
    new Date().toISOString()

  return Object.entries(
    SETTINGS_CONFIG
  ).map(
    ([
      stateKey,
      config,
    ]) => ({
      setting_key:
        config.dbKey,

      setting_value:
        serializeSettingValue(
          settings[stateKey],
          config.type
        ),

      updated_at:
        updatedAt,
    })
  )
}

function Settings() {
  const [activeSection, setActiveSection] = useState('general')

  const [settings, setSettings] = useState(
    DEFAULT_SETTINGS
  )

  const [user, setUser] = useState(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [settingsError, setSettingsError] = useState('')

  /* =========================================
     LOAD SETTINGS FROM SUPABASE
  ========================================= */

  useEffect(() => {
    loadSettings()
    loadCurrentUser()
  }, [])

  const loadSettings = async () => {
    setLoadingSettings(true)
    setSettingsError('')

    try {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured.'
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('app_settings')
        .select(`
          setting_key,
          setting_value
        `)

      if (error) {
        throw error
      }

      setSettings(
        buildSettingsFromRows(
          data || []
        )
      )
    } catch (error) {
      console.error(
        'Settings load error:',
        error
      )

      setSettings(
        DEFAULT_SETTINGS
      )

      setSettingsError(
        error?.message ||
          'Unable to load settings from Supabase.'
      )
    } finally {
      setLoadingSettings(false)
    }
  }


  /* =========================================
     CURRENT ADMIN
  ========================================= */

  const loadCurrentUser = async () => {
    try {
      if (!supabase) {
        return
      }

      const {
        data,
      } = await supabase.auth.getUser()

      setUser(
        data?.user || null
      )
    } catch (error) {
      console.error(
        'Unable to load current user:',
        error
      )
    }
  }

  /* =========================================
     UPDATE SETTING
  ========================================= */

  const updateSetting = (
    key,
    value
  ) => {
    setSettings(
      (current) => ({
        ...current,
        [key]: value,
      })
    )

    setSaved(false)
  }

  /* =========================================
     SAVE TO SUPABASE
  ========================================= */

  const saveSettingsToSupabase =
    async (
      settingsToSave
    ) => {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured.'
        )
      }

      const rows =
        buildRowsFromSettings(
          settingsToSave
        )

      const {
        error,
      } = await supabase
        .from('app_settings')
        .upsert(
          rows,
          {
            onConflict:
              'setting_key',
          }
        )

      if (error) {
        throw error
      }
    }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSettingsError('')

    try {
      await saveSettingsToSupabase(
        settings
      )

      setSaved(true)

      window.setTimeout(
        () => {
          setSaved(false)
        },
        2500
      )
    } catch (error) {
      console.error(
        'Settings save error:',
        error
      )

      setSettingsError(
        error?.message ||
          'Unable to save settings to Supabase.'
      )

      window.alert(
        error?.message ||
          'Unable to save settings.'
      )
    } finally {
      setSaving(false)
    }
  }


  /* =========================================
     RESET
  ========================================= */

  const handleReset = async () => {
    const confirmed =
      window.confirm(
        'Reset Lucky Hub settings to default values?'
      )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setSaved(false)
    setSettingsError('')

    try {
      const defaults = {
        ...DEFAULT_SETTINGS,
      }

      await saveSettingsToSupabase(
        defaults
      )

      setSettings(
        defaults
      )

      setSaved(true)

      window.setTimeout(
        () => {
          setSaved(false)
        },
        2500
      )
    } catch (error) {
      console.error(
        'Settings reset error:',
        error
      )

      setSettingsError(
        error?.message ||
          'Unable to reset settings.'
      )

      window.alert(
        error?.message ||
          'Unable to reset settings.'
      )
    } finally {
      setSaving(false)
    }
  }


  /* =========================================
     SIDEBAR SECTIONS
  ========================================= */

  const sections = [
    {
      id: 'general',
      label: 'Shop Profile',
      icon: Store,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingCart,
    },
    {
      id: 'printing',
      label: 'Printing',
      icon: Printer,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      id: 'account',
      label: 'Account & Security',
      icon: ShieldCheck,
    },
  ]

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="settings-page">

      {/* HEADER */}

      <div className="settings-page-header">

        <div>

          <h1>
            Settings
          </h1>

          <p>
            Configure Lucky Hub management
            preferences.
          </p>

        </div>


        <div className="settings-header-actions">

          <button
            type="button"
            className="settings-reset-button"
            onClick={handleReset}
            disabled={
              saving ||
              loadingSettings
            }
          >

            <RefreshCw
              size={15}
            />

            Reset

          </button>


          <button
            type="button"
            className="settings-save-button"
            onClick={handleSave}
            disabled={
              saving ||
              loadingSettings
            }
          >

            {saved ? (
              <Check
                size={16}
              />
            ) : (
              <Save
                size={16}
              />
            )}

            {saving
              ? 'Saving...'
              : saved
                ? 'Saved'
                : 'Save Settings'}

          </button>

        </div>

      </div>


      {loadingSettings && (
        <div
          style={{
            marginBottom: 14,
            padding: '11px 14px',
            border: '1px solid #dce8e4',
            borderRadius: 9,
            background: '#f7fbf9',
            color: '#527068',
            fontSize: 12,
          }}
        >
          Loading shared Lucky Hub settings...
        </div>
      )}


      {settingsError && (
        <div
          style={{
            marginBottom: 14,
            padding: '11px 14px',
            border: '1px solid #f0cfd3',
            borderRadius: 9,
            background: '#fff6f7',
            color: '#b23a46',
            fontSize: 12,
          }}
        >
          {settingsError}
        </div>
      )}


      {/* CONTENT */}

      <div className="settings-layout">

        {/* SETTINGS NAVIGATION */}

        <aside className="settings-navigation">

          <div className="settings-navigation-title">

            <Settings2
              size={16}
            />

            <span>
              System Settings
            </span>

          </div>


          <div className="settings-navigation-list">

            {sections.map(
              (section) => {
                const Icon =
                  section.icon

                return (
                  <button
                    type="button"
                    key={section.id}
                    className={
                      activeSection ===
                      section.id
                        ? 'settings-navigation-item active'
                        : 'settings-navigation-item'
                    }
                    onClick={() =>
                      setActiveSection(
                        section.id
                      )
                    }
                  >

                    <div>

                      <Icon
                        size={17}
                      />

                      <span>
                        {section.label}
                      </span>

                    </div>

                    <ChevronRight
                      size={14}
                    />

                  </button>
                )
              }
            )}

          </div>

        </aside>


        {/* SETTINGS CONTENT */}

        <div className="settings-content">

          {/* ==================================
              GENERAL
          ================================== */}

          {activeSection ===
            'general' && (

            <SettingsPanel
              icon={Store}
              title="Shop Profile"
              description="Basic Lucky Hub business information."
            >

              <div className="settings-form-grid">

                <SettingsField
                  label="Shop Name"
                >
                  <input
                    type="text"
                    value={
                      settings.shopName
                    }
                    onChange={(event) =>
                      updateSetting(
                        'shopName',
                        event.target.value
                      )
                    }
                    placeholder="Lucky Hub"
                  />
                </SettingsField>


                <SettingsField
                  label="Contact Number"
                >
                  <input
                    type="text"
                    value={
                      settings.shopPhone
                    }
                    onChange={(event) =>
                      updateSetting(
                        'shopPhone',
                        event.target.value
                      )
                    }
                    placeholder="07X XXX XXXX"
                  />
                </SettingsField>


                <SettingsField
                  label="Business Email"
                >
                  <input
                    type="email"
                    value={
                      settings.shopEmail
                    }
                    onChange={(event) =>
                      updateSetting(
                        'shopEmail',
                        event.target.value
                      )
                    }
                    placeholder="example@email.com"
                  />
                </SettingsField>


                <SettingsField
                  label="Currency"
                >

                  <select
                    value={
                      settings.currency
                    }
                    onChange={(event) =>
                      updateSetting(
                        'currency',
                        event.target.value
                      )
                    }
                  >
                    <option value="LKR">
                      LKR - Sri Lankan Rupee
                    </option>

                    <option value="USD">
                      USD - US Dollar
                    </option>
                  </select>

                </SettingsField>


                <div className="settings-field settings-field-full">

                  <label>
                    Shop Address
                  </label>

                  <textarea
                    rows="4"
                    value={
                      settings.shopAddress
                    }
                    onChange={(event) =>
                      updateSetting(
                        'shopAddress',
                        event.target.value
                      )
                    }
                    placeholder="Enter Lucky Hub shop address"
                  />

                </div>

              </div>

            </SettingsPanel>

          )}


          {/* ==================================
              INVENTORY
          ================================== */}

          {activeSection ===
            'inventory' && (

            <SettingsPanel
              icon={Box}
              title="Inventory Settings"
              description="Configure stock management preferences."
            >

              <div className="settings-form-grid">

                <SettingsField
                  label="Default Low Stock Level"
                  note="Products at or below this quantity will be treated as low stock."
                >

                  <input
                    type="number"
                    min="0"
                    value={
                      settings.lowStockThreshold
                    }
                    onChange={(event) =>
                      updateSetting(
                        'lowStockThreshold',
                        Number(
                          event.target.value
                        )
                      )
                    }
                  />

                </SettingsField>

              </div>


              <div className="settings-divider" />


              <SettingToggle
                icon={Bell}
                title="Low Stock Alerts"
                description="Show alerts when products reach their minimum stock level."
                checked={
                  settings.enableLowStockAlert
                }
                onChange={(value) =>
                  updateSetting(
                    'enableLowStockAlert',
                    value
                  )
                }
              />

            </SettingsPanel>

          )}


          {/* ==================================
              ORDERS
          ================================== */}

          {activeSection ===
            'orders' && (

            <SettingsPanel
              icon={ShoppingCart}
              title="Order Settings"
              description="Control how customer orders are handled."
            >

              <div className="settings-form-grid">

                <SettingsField
                  label="Standard Delivery Fee (LKR)"
                  note="This amount is shared with the customer mobile checkout."
                >
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      settings.standardDeliveryFee
                    }
                    onChange={(event) =>
                      updateSetting(
                        'standardDeliveryFee',
                        Math.max(
                          0,
                          Number(
                            event.target.value
                          ) || 0
                        )
                      )
                    }
                  />
                </SettingsField>


                <SettingsField
                  label="Store Pickup Fee (LKR)"
                  note="Keep this at 0 if store pickup is free."
                >
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      settings.storePickupFee
                    }
                    onChange={(event) =>
                      updateSetting(
                        'storePickupFee',
                        Math.max(
                          0,
                          Number(
                            event.target.value
                          ) || 0
                        )
                      )
                    }
                  />
                </SettingsField>

              </div>


              <div className="settings-divider" />


              <SettingToggle
                icon={CheckCircleIcon}
                title="Automatic Order Confirmation"
                description="Automatically confirm new customer orders after submission."
                checked={
                  settings.autoConfirmOrders
                }
                onChange={(value) =>
                  updateSetting(
                    'autoConfirmOrders',
                    value
                  )
                }
              />


              <div className="settings-divider" />


              <SettingToggle
                icon={ShoppingCart}
                title="Allow Order Cancellation"
                description="Allow customers to cancel eligible orders before processing."
                checked={
                  settings.allowOrderCancellation
                }
                onChange={(value) =>
                  updateSetting(
                    'allowOrderCancellation',
                    value
                  )
                }
              />

            </SettingsPanel>

          )}


          {/* ==================================
              PRINTING
          ================================== */}

          {activeSection ===
            'printing' && (

            <SettingsPanel
              icon={Printer}
              title="Printing Service Settings"
              description="Configure default printing request preferences."
            >

              <div className="settings-form-grid">

                <SettingsField
                  label="Default Paper Size"
                >

                  <select
                    value={
                      settings.defaultPaperSize
                    }
                    onChange={(event) =>
                      updateSetting(
                        'defaultPaperSize',
                        event.target.value
                      )
                    }
                  >

                    <option value="A4">
                      A4
                    </option>

                    <option value="A3">
                      A3
                    </option>

                    <option value="A5">
                      A5
                    </option>

                    <option value="Letter">
                      Letter
                    </option>

                  </select>

                </SettingsField>


                <SettingsField
                  label="Default Printing Type"
                >

                  <select
                    value={
                      settings.defaultPrintType
                    }
                    onChange={(event) =>
                      updateSetting(
                        'defaultPrintType',
                        event.target.value
                      )
                    }
                  >

                    <option value="Black & White">
                      Black & White
                    </option>

                    <option value="Colour">
                      Colour
                    </option>

                  </select>

                </SettingsField>

              </div>


              <div className="settings-divider" />


              <SettingToggle
                icon={Bell}
                title="Printing Request Alerts"
                description="Notify admin when customers submit new printing requests."
                checked={
                  settings.printingNotification
                }
                onChange={(value) =>
                  updateSetting(
                    'printingNotification',
                    value
                  )
                }
              />

            </SettingsPanel>

          )}


          {/* ==================================
              NOTIFICATIONS
          ================================== */}

          {activeSection ===
            'notifications' && (

            <SettingsPanel
              icon={Bell}
              title="Notification Settings"
              description="Choose which Lucky Hub activities should generate alerts."
            >

              <SettingToggle
                icon={ShoppingCart}
                title="New Order Notifications"
                description="Notify admin when a customer places a new order."
                checked={
                  settings.orderNotification
                }
                onChange={(value) =>
                  updateSetting(
                    'orderNotification',
                    value
                  )
                }
              />


              <div className="settings-divider" />


              <SettingToggle
                icon={Package}
                title="Low Stock Notifications"
                description="Notify admin when a product reaches low stock."
                checked={
                  settings.lowStockNotification
                }
                onChange={(value) =>
                  updateSetting(
                    'lowStockNotification',
                    value
                  )
                }
              />


              <div className="settings-divider" />


              <SettingToggle
                icon={Printer}
                title="Printing Request Notifications"
                description="Notify admin when a printing request is received."
                checked={
                  settings.printingRequestNotification
                }
                onChange={(value) =>
                  updateSetting(
                    'printingRequestNotification',
                    value
                  )
                }
              />


              <div className="settings-divider" />


              <SettingToggle
                icon={Mail}
                title="Email Notifications"
                description="Receive selected system notifications by email."
                checked={
                  settings.emailNotification
                }
                onChange={(value) =>
                  updateSetting(
                    'emailNotification',
                    value
                  )
                }
              />

            </SettingsPanel>

          )}


          {/* ==================================
              ACCOUNT
          ================================== */}

          {activeSection ===
            'account' && (

            <SettingsPanel
              icon={ShieldCheck}
              title="Account & Security"
              description="Information about the currently signed-in Lucky Hub administrator."
            >

              <div className="settings-account-card">

                <div className="settings-account-avatar">

                  <UserRound
                    size={25}
                  />

                </div>


                <div className="settings-account-main">

                  <span>
                    Signed in as
                  </span>

                  <strong>
                    {user?.email ||
                      'Lucky Hub Administrator'}
                  </strong>

                  <small>
                    Administrator Account
                  </small>

                </div>


                <div className="settings-account-status">

                  <span />

                  Active

                </div>

              </div>


              <div className="settings-security-grid">

                <SecurityItem
                  title="Authentication"
                  value="Supabase Auth"
                  icon={ShieldCheck}
                />


                <SecurityItem
                  title="Account Role"
                  value="Administrator"
                  icon={UserRound}
                />


                <SecurityItem
                  title="Account Email"
                  value={
                    user?.email ||
                    'Not available'
                  }
                  icon={Mail}
                />

              </div>


              <div className="settings-security-note">

                <ShieldCheck
                  size={17}
                />

                <div>

                  <strong>
                    Protected administrator account
                  </strong>

                  <span>
                    Access to this management portal is restricted through authenticated staff login.
                  </span>

                </div>

              </div>

            </SettingsPanel>

          )}

        </div>

      </div>

    </div>
  )
}


/* =========================================
   PANEL
========================================= */

function SettingsPanel({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="settings-panel">

      <div className="settings-panel-header">

        <div className="settings-panel-icon">

          <Icon
            size={20}
          />

        </div>


        <div>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>

        </div>

      </div>


      <div className="settings-panel-body">

        {children}

      </div>

    </section>
  )
}


/* =========================================
   FIELD
========================================= */

function SettingsField({
  label,
  note,
  children,
}) {
  return (
    <div className="settings-field">

      <label>
        {label}
      </label>

      {children}

      {note && (
        <small>
          {note}
        </small>
      )}

    </div>
  )
}


/* =========================================
   TOGGLE
========================================= */

function SettingToggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="settings-toggle-row">

      <div className="settings-toggle-info">

        <div className="settings-toggle-icon">

          <Icon
            size={17}
          />

        </div>


        <div>

          <strong>
            {title}
          </strong>

          <span>
            {description}
          </span>

        </div>

      </div>


      <button
        type="button"
        className={
          checked
            ? 'settings-toggle active'
            : 'settings-toggle'
        }
        onClick={() =>
          onChange(!checked)
        }
        aria-pressed={
          checked
        }
      >

        <span />

      </button>

    </div>
  )
}


/* =========================================
   SECURITY ITEM
========================================= */

function SecurityItem({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="settings-security-item">

      <div className="settings-security-item-icon">

        <Icon
          size={17}
        />

      </div>


      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  )
}


/* =========================================
   SMALL ICON COMPONENT
========================================= */

function CheckCircleIcon({
  size = 17,
}) {
  return (
    <CircleDollarSign
      size={size}
    />
  )
}

export default Settings