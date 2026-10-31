import { NavLink } from 'react-router-dom'

import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ShoppingCart,
  Printer,
  Users,
  CircleDollarSign,
  Megaphone,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react'

import './Sidebar.css'

const menuItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Products',
    path: '/products',
    icon: Package,
  },
  {
    name: 'Categories',
    path: '/categories',
    icon: Tags,
  },
  {
    name: 'Inventory',
    path: '/inventory',
    icon: Boxes,
  },
  {
    name: 'Orders',
    path: '/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Printing Requests',
    path: '/printing',
    icon: Printer,
  },
  {
    name: 'Customers',
    path: '/customers',
    icon: Users,
  },
  {
    name: 'Sales',
    path: '/sales',
    icon: CircleDollarSign,
  },
  {
    name: 'Promotions',
    path: '/promotions',
    icon: Megaphone,
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
  },
]

function Sidebar({ collapsed = false, onNavigate }) {
  return (
    <aside
      className={`admin-sidebar ${
        collapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <img
            src="/assets/luckyhub-logo.png"
            alt="Lucky Hub"
          />
        </div>

        {!collapsed && (
          <div className="sidebar-brand-text">
            <h1>Lucky Hub</h1>
            <span>Management</span>
          </div>
        )}
      </div>

      <nav className="sidebar-navigation">
        {menuItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onNavigate}
              title={
                collapsed
                  ? item.name
                  : undefined
              }
              className={({
                isActive,
              }) =>
                `sidebar-link ${
                  isActive
                    ? 'sidebar-link-active'
                    : ''
                }`
              }
            >
              <div className="sidebar-link-left">
                <Icon
                  size={19}
                  strokeWidth={1.8}
                />

                {!collapsed && (
                  <span>
                    {item.name}
                  </span>
                )}
              </div>

              {!collapsed && (
                <ChevronRight
                  size={14}
                  className="sidebar-arrow"
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-bottom">
          <div className="sidebar-version">
            <strong>
              Lucky Hub v1.0.0
            </strong>

            <span>
              Management Portal
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar