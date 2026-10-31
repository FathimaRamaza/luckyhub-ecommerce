import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import Login from './pages/Login.jsx'

import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import Categories from './pages/Categories.jsx'
import Inventory from './pages/Inventory.jsx'
import Orders from './pages/Orders.jsx'
import PrintingRequests from './pages/PrintingRequests.jsx'
import Customers from './pages/Customers.jsx'
import Sales from './pages/Sales.jsx'
import Promotions from './pages/Promotions.jsx'
import Reports from './pages/Reports.jsx'
import Notifications from './pages/Notifications.jsx'
import Settings from './pages/Settings.jsx'

import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================
            LOGIN
        ====================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =====================================
            PROTECTED ADMIN AREA
        ====================================== */}

        <Route
          element={<ProtectedRoute />}
        >

          <Route
            element={<AdminLayout />}
          >

            {/* DASHBOARD */}

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />


            {/* PRODUCTS */}

            <Route
              path="/products"
              element={<Products />}
            />


            {/* CATEGORIES */}

            <Route
              path="/categories"
              element={<Categories />}
            />


            {/* INVENTORY */}

            <Route
              path="/inventory"
              element={<Inventory />}
            />


            {/* ORDERS */}

            <Route
              path="/orders"
              element={<Orders />}
            />


            {/* PRINTING REQUESTS */}

            <Route
              path="/printing"
              element={
                <PrintingRequests />
              }
            />


            {/* CUSTOMERS */}

            <Route
              path="/customers"
              element={<Customers />}
            />


            {/* SALES */}

            <Route
              path="/sales"
              element={<Sales />}
            />


            {/* PROMOTIONS */}

            <Route
              path="/promotions"
              element={
                <Promotions />
              }
            />


            {/* REPORTS */}

            <Route
              path="/reports"
              element={<Reports />}
            />


            {/* NOTIFICATIONS */}

            <Route
              path="/notifications"
              element={
                <Notifications />
              }
            />


            {/* SETTINGS */}

            <Route
              path="/settings"
              element={<Settings />}
            />

          </Route>

        </Route>


        {/* =====================================
            DEFAULT ROUTES
        ====================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />


        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App