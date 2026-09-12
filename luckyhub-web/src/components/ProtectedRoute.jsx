import {
  useEffect,
  useState,
} from 'react'

import {
  Navigate,
  Outlet,
} from 'react-router-dom'

import {
  getCurrentStaff,
} from '../services/auth'

function ProtectedRoute() {
  const [loading, setLoading] =
    useState(true)

  const [authorized, setAuthorized] =
    useState(false)

  useEffect(() => {
    let active = true

    async function checkAccess() {
      const result =
        await getCurrentStaff()

      if (!active) return

      setAuthorized(Boolean(result))
      setLoading(false)
    }

    checkAccess()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f8f6',
        }}
      >
        Checking access...
      </div>
    )
  }

  if (!authorized) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute