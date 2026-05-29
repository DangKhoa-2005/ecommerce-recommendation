import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, LogOut, Menu, X, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore, useCartStore } from '../store'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()
  const { cart, fetchCart, getItemCount } = useCartStore()
  
  useEffect(() => {
    checkAuth()
  }, [checkAuth])
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart()
    }
  }, [isAuthenticated, fetchCart])
  
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }
  
  const handleLogout = () => {
    logout()
    navigate('/')
  }
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Mini Shop</span>
          </Link>
          
          {/* Search bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </form>
          
          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link
              to="/products"
              className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sản phẩm
            </Link>
            
            {isAuthenticated ? (
              <>
                {user?.role !== 'admin' && (
                  <Link
                    to="/cart"
                    className="relative text-gray-600 hover:text-primary-600 p-2 rounded-md transition-colors"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {getItemCount() > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {getItemCount()}
                      </span>
                    )}
                  </Link>
                )}
                
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 p-2 rounded-md transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-sm font-medium">{user?.full_name?.split(' ')[0]}</span>
                  </button>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Tài khoản
                    </Link>
                    {user?.role !== 'admin' && (
                      <Link
                        to="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Đơn hàng
                      </Link>
                    )}
                    {user?.role === 'admin' && (
                      <>
                        <Link to="/admin/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Bảng tin thống kê</Link>
                        <Link to="/admin/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Quản lý đơn hàng</Link>
                        <Link to="/admin/ship-history" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Lịch sử giao hàng</Link>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </form>
            
            <nav className="space-y-2">
              <Link
                to="/products"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-50"
              >
                Sản phẩm
              </Link>
              
              {isAuthenticated ? (
                <>
                  {user?.role !== 'admin' && (
                    <>
                      <Link
                        to="/cart"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-50"
                      >
                        <span>Giỏ hàng</span>
                        {getItemCount() > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                            {getItemCount()}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-50"
                      >
                        Đơn hàng
                      </Link>
                    </>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-50"
                  >
                    Tài khoản
                  </Link>

                  {user?.role === 'admin' && (
                    <>
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-purple-600 hover:bg-purple-50"
                      >
                        [Admin] Bảng tin thống kê
                      </Link>
                      <Link
                        to="/admin/orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-purple-600 hover:bg-purple-50"
                      >
                        [Admin] Quản lý đơn hàng
                      </Link>
                      <Link
                        to="/admin/ship-history"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-purple-600 hover:bg-purple-50"
                      >
                        [Admin] Lịch sử giao hàng
                      </Link>
                    </>
                  )}

                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center w-full px-3 py-2 rounded-md text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-50"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md bg-primary-600 text-white text-center hover:bg-primary-700"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
