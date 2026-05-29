import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminShippedPage from './pages/AdminShippedPage'
import AdminStatsPage from './pages/AdminStatsPage'
import ReturnPolicyPage from './pages/ReturnPolicyPage'
import WarrantyPolicyPage from './pages/WarrantyPolicyPage'
import GuidePage from './pages/GuidePage'
import ContactPage from './pages/ContactPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="admin/dashboard" element={<AdminStatsPage />} />
            <Route path="admin/orders" element={<AdminOrdersPage />} />
            <Route path="admin/ship-history" element={<AdminShippedPage />} />
          </Route>
        </Route>

        {/* Support pages */}
        <Route path="support/returns" element={<ReturnPolicyPage />} />
        <Route path="support/warranty" element={<WarrantyPolicyPage />} />
        <Route path="support/guide" element={<GuidePage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>
    </Routes>
  )
}

export default App
