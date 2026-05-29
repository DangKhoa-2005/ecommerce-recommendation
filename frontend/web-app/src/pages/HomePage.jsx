import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Shield, Headphones, CreditCard, Sparkles } from 'lucide-react'
import { productsAPI, categoriesAPI, recommendationsAPI } from '../services/api'
import ProductCard from '../components/ProductCard'
import { useAuthStore } from '../store'

const categoryIconMap = {
  cool_stuff: '✨',
  relogios_presentes: '⌚',
  brinquedos: '🧸',
  bebes: '👶',
  moveis_decoracao: '🛋️',
  telefonia: '📱',
  ferramentas_jardim: '🌿',
  fashion_bolsas_e_acessorios: '👜',
  informatica_acessorios: '🖱️',
  papelaria: '📝',
  esporte_lazer: '🏃'
}

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadRecommendations(user.id)
    }
  }, [isAuthenticated, user])
  
  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsAPI.getAll({ per_page: 8 }),
        categoriesAPI.getAll()
      ])

      const productList = productsRes.data?.products || productsRes.data?.data?.products || []
      setFeaturedProducts(productList.slice(0, 8))
      setCategories(categoriesRes.data.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecommendations = async (userId) => {
    try {
      setIsLoadingRecommendations(true)
      const res = await recommendationsAPI.getPersonalized(userId)
      const recRows = res.data?.data || []

      const enriched = await Promise.all(
        recRows.map(async (row) => {
          const targetId = row.id || row.product_id
          if (!targetId) return null

          try {
            const detail = await productsAPI.getById(targetId)
            const product = detail.data?.product || detail.data?.data || null
            if (!product) return null
            return {
              ...product,
              id: product.id || product._id || targetId,
              predicted_rating: row.predicted_rating,
              recommendation_type: row.recommendation_type,
              recommendation_score: row.score
            }
          } catch (_error) {
            return null
          }
        })
      )

      setRecommendedProducts(enriched.filter(Boolean))
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }
  
  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(11, 19, 43, 0.78), rgba(15, 118, 110, 0.58)), url('https://images.unsplash.com/photo-1556742205-9f09e4e01f3b?q=80&w=1600&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Cửa hàng điện tử chọn lọc từ dữ liệu Olist
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
                Mua sắm thông minh
                <br />
                <span className="text-cyan-200">với Mini Shop</span>
              </h1>
              <p className="mt-6 text-lg text-white/90 max-w-xl">
                Khám phá sản phẩm công nghệ, đồ chơi, gia dụng và phụ kiện với giao diện rõ ràng, ảnh đẹp và trải nghiệm mua sắm mượt mà.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-cyan-50 transition-colors shadow-lg shadow-black/10"
                >
                  Xem sản phẩm
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/register"
                    className="inline-flex items-center px-6 py-3 border-2 border-white/80 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors backdrop-blur-sm"
                  >
                    Đăng ký ngay
                  </Link>
                )}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-md border border-white/20 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1000&auto=format&fit=crop"
                  alt="Shopping"
                  className="w-full rounded-2xl shadow-2xl object-cover aspect-[4/3]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                <Truck className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Giao hàng nhanh</h3>
              <p className="mt-2 text-sm text-gray-500">Miễn phí đơn từ 500K</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Bảo hành chính hãng</h3>
              <p className="mt-2 text-sm text-gray-500">100% sản phẩm chính hãng</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Headphones className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Hỗ trợ 24/7</h3>
              <p className="mt-2 text-sm text-gray-500">Tư vấn AI thông minh</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Thanh toán dễ dàng</h3>
              <p className="mt-2 text-sm text-gray-500">COD toàn quốc</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Danh mục từ Olist</h2>
            <Link
              to="/products"
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
            >
              Xem tất cả
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category_id=${category.id}`}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-center group border border-gray-100 hover:border-primary-200"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <span className="text-3xl">
                    {categoryIconMap[category.id] || '📦'}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 leading-snug">{category.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{category.product_count} sản phẩm</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Recommendations */}
      {isAuthenticated && (
        <section className="py-16 bg-blue-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Gợi ý dành riêng cho bạn</h2>
              </div>
            </div>
            
            {isLoadingRecommendations ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="h-4 bg-gray-200 rounded mt-4"></div>
                    <div className="h-4 bg-gray-200 rounded mt-2 w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : recommendedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {recommendedProducts.slice(0, 4).map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Đang phân tích sở thích để đưa ra gợi ý tốt nhất...</p>
            )}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
            <Link
              to="/products"
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
            >
              Xem tất cả
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded mt-4"></div>
                  <div className="h-4 bg-gray-200 rounded mt-2 w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded mt-4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id || product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* CTA Section (guest only) */}
      {!isAuthenticated && (
        <section className="bg-gray-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold">Bắt đầu mua sắm ngay hôm nay</h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Đăng ký tài khoản để nhận thông tin khuyến mãi và tận hưởng trải nghiệm mua sắm tuyệt vời cùng Mini Shop.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Đăng ký miễn phí
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

export default HomePage
