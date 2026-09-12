import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCurrentStaff,
  loginStaff,
} from '../services/auth.js'

import {
  supabaseConfigured,
} from '../services/supabase.js'

import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const staff = await getCurrentStaff()

        if (!active) return

        if (staff) {
          navigate('/dashboard', {
            replace: true,
          })
          return
        }
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        if (active) {
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    if (!supabaseConfigured) {
      setErrorMessage(
        'Supabase is not configured. Please check your .env file.'
      )
      return
    }

    setLoading(true)

    try {
      const result = await loginStaff(
        email.trim(),
        password
      )

      if (!result.success) {
        setErrorMessage(result.message)
        return
      }

      navigate('/dashboard', {
        replace: true,
      })
    } catch (error) {
      console.error('Login error:', error)

      setErrorMessage(
        'Something went wrong while signing in.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="login-loading">
        <div className="loading-spinner" />
        <span>Loading Lucky Hub...</span>
      </div>
    )
  }

  return (
    <main className="login-page">

      <div className="login-card">

        {/* =========================
            LEFT BRAND PANEL
        ========================== */}

        <section className="brand-panel">

          <div className="brand-decoration decoration-one" />
          <div className="brand-decoration decoration-two" />

          <div className="brand-content">

            {/* Logo */}
            <div className="logo-container">
              <img
                src="/assets/luckyhub-logo.png"
                alt="Lucky Hub"
                className="brand-logo"
              />
            </div>

            {/* Welcome Content */}
            <div className="welcome-area">

              <div className="welcome-label">
                MANAGEMENT PORTAL
              </div>

              <h1>
                WELCOME
                <br />
                BACK
              </h1>

              <p>
                Manage your products, stock,
                customer orders and printing
                requests from one secure place.
              </p>

              <div className="system-status">
                <span className="status-dot" />

                <span>
                  System Online
                </span>
              </div>

            </div>

          </div>


          {/* Stationery crop */}
          <div className="stationery-window">

            <img
              src="/assets/luckyhub-login-art.png"
              alt=""
              className="stationery-image"
            />

            <div className="stationery-gradient" />

          </div>

        </section>


        {/* =========================
            RIGHT LOGIN PANEL
        ========================== */}

        <section className="login-panel">

          <div className="login-container">

            <div className="login-heading">

              <span className="staff-access">
                STAFF ACCESS
              </span>

              <h2>
                Sign In
              </h2>

              <p>
                Enter your authorized Lucky Hub
                staff credentials to continue.
              </p>

            </div>


            {!supabaseConfigured && (
              <div className="warning-message">

                Supabase configuration is missing.
                Check your <strong>.env</strong> file.

              </div>
            )}


            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}


            <form
              onSubmit={handleSubmit}
              className="login-form"
            >

              {/* Email */}
              <div className="form-group">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="input-wrapper">

                  <div className="input-icon">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M4 6H20V18H4V6Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />

                      <path
                        d="M4 7L12 13L20 7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="admin@luckyhub.lk"
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* Password */}
              <div className="form-group">

                <label htmlFor="password">
                  Password
                </label>

                <div className="input-wrapper">

                  <div className="input-icon">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />

                      <path
                        d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>

                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>

                </div>

              </div>


              <button
                type="submit"
                className="submit-button"
                disabled={
                  loading ||
                  !supabaseConfigured
                }
              >

                {loading ? (
                  <>
                    <span className="button-spinner" />
                    Checking...
                  </>
                ) : (
                  'Sign In'
                )}

              </button>

            </form>


            <p className="forgot-message">
              Forgot your credentials?
              Contact your system administrator.
            </p>


            <div className="secure-message">

              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <path
                  d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>

              Authorized staff only

            </div>

          </div>

        </section>

      </div>

    </main>
  )
}

export default Login