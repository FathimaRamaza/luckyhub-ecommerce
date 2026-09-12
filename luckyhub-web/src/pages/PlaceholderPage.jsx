import { useLocation } from 'react-router-dom'

const pageNames = {
  '/products': 'Products',
  '/categories': 'Categories',
  '/inventory': 'Inventory',
  '/orders': 'Orders',
  '/printing': 'Printing Requests',
  '/customers': 'Customers',
  '/sales': 'Sales',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function PlaceholderPage() {
  const location = useLocation()

  const title =
    pageNames[location.pathname] ||
    'Lucky Hub'

  return (
    <div>

      <div
        style={{
          marginBottom: '28px',
        }}
      >
        <h1
          style={{
            margin: 0,
            color: '#172033',
            fontSize: '28px',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            marginTop: '7px',
            color: '#71817d',
            fontSize: '13px',
          }}
        >
          Lucky Hub management system
        </p>
      </div>


      <div
        style={{
          minHeight: '350px',
          padding: '30px',
          border: '1px solid #e2e9e6',
          borderRadius: '16px',
          background: '#ffffff',
        }}
      >
        <h3
          style={{
            margin: 0,
            color: '#24342f',
          }}
        >
          {title} Page
        </h3>

        <p
          style={{
            color: '#82908c',
            fontSize: '13px',
          }}
        >
          We will build this page next.
        </p>
      </div>

    </div>
  )
}

export default PlaceholderPage