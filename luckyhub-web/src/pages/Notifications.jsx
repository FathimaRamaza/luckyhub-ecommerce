import { updateSingleRow } from '../services/adminData.js'
import {
  Bell,
  Boxes,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Package,
  Printer,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase.js'
import './Notifications.css'

const TIME_ZONE = 'Asia/Colombo'

function Notifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [markingAll, setMarkingAll] = useState(false)

  const loadNotifications = useCallback(
    async (
      showRefresh = false
    ) => {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      try {
        if (!supabase) {
          throw new Error(
            'Supabase is not configured.'
          )
        }

        const {
          data,
          error:
            notificationError,
        } = await supabase
          .from('notifications')
          .select('*')
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(200)

        if (
          notificationError
        ) {
          throw notificationError
        }

        setNotifications(
          data || []
        )
      } catch (loadError) {
        console.error(
          'Notification load error:',
          loadError
        )

        setError(
          loadError?.message ||
            'Unable to load notifications.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    loadNotifications()

    if (!supabase) {
      return undefined
    }

    const channel = supabase
      .channel(
        'lucky-hub-notification-inbox'
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [loadNotifications])

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !notification.is_read
        ).length,
      [notifications]
    )

  const visibleNotifications =
    useMemo(
      () => {
        if (
          filter === 'unread'
        ) {
          return notifications.filter(
            (notification) =>
              !notification.is_read
          )
        }

        return notifications
      },
      [
        notifications,
        filter,
      ]
    )

  const formatDateTime = (
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
          TIME_ZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }
    ).format(date)
  }

  const getNotificationMeta = (
    notification
  ) => {
    switch (
      notification.type
    ) {
      case 'new_order':
        return {
          icon: ShoppingCart,
          tone: 'order',
          label: 'Order',
        }

      case 'low_stock':
        return {
          icon: Boxes,
          tone: 'stock',
          label: 'Inventory',
        }

      case 'printing_request':
        return {
          icon: Printer,
          tone: 'printing',
          label: 'Printing',
        }

      default:
        return {
          icon: Bell,
          tone: 'general',
          label: 'System',
        }
    }
  }

  const markAsRead = async (
    notification
  ) => {
    if (
      !notification ||
      notification.is_read
    ) {
      return
    }

    try {
      await updateSingleRow(supabase, 'notifications', notification, { is_read: true, read_at: new Date().toISOString() })
      window.dispatchEvent(new Event('luckyhub:notifications-updated'))

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    is_read: true,
                    read_at:
                      new Date().toISOString(),
                  }
                : item
          )
      )
    } catch (updateError) {
      console.error(
        'Mark notification read error:',
        updateError
      )
      setError(updateError.message || 'Notification could not be marked read.')
    }
  }

  const openNotification = async (
    notification
  ) => {
    await markAsRead(
      notification
    )

    const targetPath =
      notification.target_path

    if (targetPath) {
      navigate(targetPath)
      return
    }

    if (
      notification.entity_type ===
      'order' &&
      notification.entity_id
    ) {
      navigate(
        `/orders?order=${encodeURIComponent(
          notification.entity_id
        )}`
      )
      return
    }

    if (
      notification.entity_type ===
      'product'
    ) {
      navigate('/inventory')
      return
    }

    if (
      notification.entity_type ===
      'printing_request'
    ) {
      navigate('/printing')
    }
  }

  const markAllAsRead =
    async () => {
      if (
        unreadCount === 0
      ) {
        return
      }

      setMarkingAll(true)
      setError('')

      try {
        const {
          data: updatedNotifications,
          error:
            updateError,
        } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at:
              new Date().toISOString(),
          })
          .eq(
            'is_read',
            false
          )
          .select('id, is_read')

        if (updateError) {
          throw updateError
        }

        const ids = new Set((updatedNotifications || []).filter((item) => item.is_read === true).map((item) => item.id))
        if (!ids.size) throw new Error('No notifications were confirmed read. Refresh and check access.')
        setNotifications((current) => current.map((item) => ids.has(item.id) ? { ...item, is_read: true } : item))
        window.dispatchEvent(new Event('luckyhub:notifications-updated'))
        await loadNotifications(true)
      } catch (updateError) {
        console.error(
          'Mark all notifications read error:',
          updateError
        )

        setError(
          updateError?.message ||
            'Unable to mark notifications as read.'
        )
      } finally {
        setMarkingAll(false)
      }
    }

  return (
    <div className="notifications-page">

      <div className="notifications-page-header">

        <div>
          <h1>
            Notifications
          </h1>

          <p>
            Orders, stock alerts and printing activity from Lucky Hub.
          </p>
        </div>


        <div className="notifications-header-actions">

          <button
            type="button"
            className="notifications-refresh-button"
            onClick={() =>
              loadNotifications(
                true
              )
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? 'notifications-spinning'
                  : ''
              }
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>


          <button
            type="button"
            className="notifications-read-all-button"
            onClick={
              markAllAsRead
            }
            disabled={
              markingAll ||
              unreadCount === 0
            }
          >
            <CheckCheck size={16} />

            {markingAll
              ? 'Updating...'
              : 'Mark All Read'}
          </button>

        </div>

      </div>


      <section className="notifications-summary-grid">

        <NotificationSummary
          title="All Notifications"
          value={
            notifications.length
          }
          icon={Bell}
          tone="all"
        />

        <NotificationSummary
          title="Unread"
          value={
            unreadCount
          }
          icon={CircleAlert}
          tone="unread"
        />

        <NotificationSummary
          title="Order Alerts"
          value={
            notifications.filter(
              (item) =>
                item.type ===
                'new_order'
            ).length
          }
          icon={Package}
          tone="order"
        />

      </section>


      <div className="notifications-toolbar">

        <div className="notifications-filter-tabs">

          <button
            type="button"
            className={
              filter === 'all'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('all')
            }
          >
            All
            <span>
              {notifications.length}
            </span>
          </button>


          <button
            type="button"
            className={
              filter === 'unread'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter(
                'unread'
              )
            }
          >
            Unread
            <span>
              {unreadCount}
            </span>
          </button>

        </div>

      </div>


      {error && (
        <div className="notifications-error">
          <CircleAlert size={16} />
          <span>{error}</span>
        </div>
      )}


      <section className="notifications-card">

        {loading ? (
          <div className="notifications-empty">
            Loading notifications...
          </div>
        ) : visibleNotifications.length ===
          0 ? (
          <div className="notifications-empty">

            <Bell size={27} />

            <strong>
              {filter ===
              'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </strong>

            <span>
              New Lucky Hub activity will appear here automatically.
            </span>

          </div>
        ) : (
          <div className="notifications-list">

            {visibleNotifications.map(
              (notification) => {
                const meta =
                  getNotificationMeta(
                    notification
                  )

                const Icon =
                  meta.icon

                return (
                  <article
                    key={
                      notification.id
                    }
                    className={`notification-row ${
                      notification.is_read
                        ? 'notification-read'
                        : 'notification-unread'
                    }`}
                  >

                    <div
                      className={`notification-icon notification-icon-${meta.tone}`}
                    >
                      <Icon
                        size={18}
                      />
                    </div>


                    <div className="notification-content">

                      <div className="notification-title-row">

                        <div>
                          <span className="notification-category">
                            {meta.label}
                          </span>

                          <h3>
                            {notification.title}
                          </h3>
                        </div>


                        {!notification.is_read && (
                          <span
                            className="notification-new-dot"
                            title="Unread"
                          />
                        )}

                      </div>


                      <p>
                        {notification.message}
                      </p>


                      <div className="notification-meta">

                        <span>
                          {formatDateTime(
                            notification.created_at
                          )}
                        </span>

                        {notification.entity_id && (
                          <span>
                            Ref:{' '}
                            {notification.entity_id}
                          </span>
                        )}

                      </div>

                    </div>


                    <div className="notification-actions">

                      {!notification.is_read && (
                        <button
                          type="button"
                          className="notification-read-button"
                          onClick={() =>
                            markAsRead(
                              notification
                            )
                          }
                        >
                          Mark Read
                        </button>
                      )}


                      {(notification.target_path ||
                        notification.entity_type) && (
                        <button
                          type="button"
                          className="notification-open-button"
                          onClick={() =>
                            openNotification(
                              notification
                            )
                          }
                        >
                          Open
                          <ChevronRight
                            size={14}
                          />
                        </button>
                      )}

                    </div>

                  </article>
                )
              }
            )}

          </div>
        )}

      </section>

    </div>
  )
}


function NotificationSummary({
  title,
  value,
  icon: Icon,
  tone,
}) {
  return (
    <div className="notification-summary-card">

      <div
        className={`notification-summary-icon notification-summary-icon-${tone}`}
      >
        <Icon size={19} />
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


export default Notifications
