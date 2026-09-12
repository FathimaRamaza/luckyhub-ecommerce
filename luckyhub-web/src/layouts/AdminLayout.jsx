import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  Bell,
  LogOut,
  Menu,
} from 'lucide-react'

import Sidebar from '../components/Sidebar.jsx'
import { logoutStaff } from '../services/auth.js'
import { supabase } from '../services/supabase.js'
import './AdminLayout.css'

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const pageDetails = useMemo(() => {
    const pages = {
      '/dashboard': {
        title: 'DASHBOARD',
        subtitle: 'Your business at a glance',
      },

      '/products': {
        title: 'PRODUCTS',
        subtitle: 'Manage your product catalogue',
      },

      '/categories': {
        title: 'CATEGORIES',
        subtitle: 'Organize product categories',
      },

      '/inventory': {
        title: 'INVENTORY',
        subtitle: 'Monitor and manage stock',
      },

      '/orders': {
        title: 'ORDERS',
        subtitle: 'Manage customer orders',
      },

      '/printing': {
        title: 'PRINTING REQUESTS',
        subtitle: 'Manage printing services',
      },

      '/customers': {
        title: 'CUSTOMERS',
        subtitle: 'Customer information',
      },

      '/sales': {
        title: 'SALES',
        subtitle: 'Monitor shop sales',
      },

      '/reports': {
        title: 'REPORTS',
        subtitle: 'Business insights',
      },

      '/notifications': {
        title: 'NOTIFICATIONS',
        subtitle: 'System alerts and activity',
      },

      '/settings': {
        title: 'SETTINGS',
        subtitle: 'System preferences',
      },
    }

    return (
      pages[location.pathname] || {
        title: 'LUCKY HUB',
        subtitle: 'Management Portal',
      }
    )
  }, [location.pathname])

  const loadUnreadNotificationCount = async () => {
    try {
      if (!supabase) {
        setUnreadNotifications(0)
        return
      }

      const {
        count,
        error,
      } = await supabase
        .from('notifications')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('is_read', false)

      if (error) {
        throw error
      }

      setUnreadNotifications(
        count || 0
      )
    } catch (error) {
      console.error(
        'Unable to load notification count:',
        error
      )

      setUnreadNotifications(0)
    }
  }

  useEffect(() => {
    loadUnreadNotificationCount()

    if (!supabase) {
      return undefined
    }

    const channel = supabase
      .channel(
        'lucky-hub-navbar-notifications'
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadUnreadNotificationCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [])

  useEffect(() => {
    if (
      location.pathname ===
      '/notifications'
    ) {
      loadUnreadNotificationCount()
    }
  }, [location.pathname])

  async function handleLogout() {
    await logoutStaff()

    navigate('/login', {
      replace: true,
    })
  }

  const notificationBadge =
    unreadNotifications > 99
      ? '99+'
      : String(
          unreadNotifications
        )

  return (
    <div className="admin-layout">

      {/* TOP NAVBAR */}

      <header className="lucky-navbar">

        {/* GREEN LEFT SIDE */}

        <div className="navbar-green-section">

          <button
            type="button"
            className="navbar-menu-button"
            onClick={() =>
              setCollapsed(
                (current) => !current
              )
            }
            aria-label="Toggle sidebar"
          >
            <Menu size={19} />
          </button>


          <div className="navbar-brand">

            <div className="navbar-brand-logo">
              <img
                src="/assets/luckyhub-logo.png"
                alt="Lucky Hub"
              />
            </div>

            <div className="navbar-brand-text">

              <strong>
                Lucky Hub
              </strong>

              <span>
                Management
              </span>

            </div>

          </div>


          <div className="navbar-brand-divider" />


          <div className="navbar-page-info">

            <strong>
              {pageDetails.title}
            </strong>

            <span>
              {pageDetails.subtitle}
            </span>

          </div>


          <div className="navbar-decoration" />

        </div>


        {/* WHITE RIGHT SIDE */}

        <div className="navbar-white-section">

          {/* NOTIFICATION */}

          <button
            type="button"
            className="navbar-notification"
            aria-label={
              unreadNotifications > 0
                ? `${unreadNotifications} unread notifications`
                : 'Notifications'
            }
            title="Notifications"
            onClick={() =>
              navigate(
                '/notifications'
              )
            }
            style={{
              position: 'relative',
            }}
          >
            <Bell size={18} />

            {unreadNotifications > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '2px',
                  minWidth: '17px',
                  height: '17px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid #ffffff',
                  borderRadius: '999px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '8px',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {notificationBadge}
              </span>
            )}
          </button>


          <div className="navbar-right-divider" />


          {/* ADMIN */}

          <div className="navbar-user">

            <div className="navbar-user-text">

              <strong>
                Lucky Hub Admin
              </strong>

              <span>
                Administrator
              </span>

            </div>


            <div className="navbar-avatar">
              LH
            </div>

          </div>


          <div className="navbar-right-divider" />


          {/* LOGOUT */}

          <button
            type="button"
            className="navbar-logout"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={19} />
          </button>

        </div>

      </header>


      {/* SIDEBAR */}

      <Sidebar collapsed={collapsed} />


      {/* PAGE */}

      <div
        className={`admin-main ${
          collapsed
            ? 'admin-main-collapsed'
            : ''
        }`}
      >

        <main className="admin-content">
          <Outlet />
        </main>

      </div>

    </div>
  )
}

export default AdminLayout
