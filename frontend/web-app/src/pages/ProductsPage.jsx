import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, X } from 'lucide-react'
import { productsAPI, categoriesAPI } from '../services/api'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 12

const sortProducts = (list, sortBy) => {
  const items = [...list]
  if (sortBy === 'price_asc') {
    return items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  }
  if (sortBy === 'price_desc') {
    return items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  }
  if (sortBy === 'name') {
    return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'))
  }
  return items.sort((a, b) => {
    const t1 = new Date(a.created_at || 0).getTime()
    const t2 = new Date(b.created_at || 0).getTime()
    return t2 - t1
  })
}

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category_id') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || searchParams.get('sort') || 'newest')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1)
  
  useEffect(() => {
    loadCategories()
  }, [])
  
  useEffect(() => {
    loadProducts()
  }, [selectedCategory, searchQuery, sortBy, currentPage])
  
  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll()
      setCategories(response.data.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }
  
  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const params = {
        per_page: 200,
      }
      
      // Update URL
      const newParams = new URLSearchParams()
      if (selectedCategory) newParams.set('category_id', selectedCategory)
      if (searchQuery) newParams.set('search', searchQuery)
      if (sortBy !== 'newest') newParams.set('sort_by', sortBy)
      if (currentPage > 1) newParams.set('page', currentPage)
      setSearchParams(newParams)
      
      const response = await productsAPI.getAll(params)
      const productsData = response.data?.products || response.data?.data?.products || []
      let filtered = productsData

      if (selectedCategory) {
        filtered = filtered.filter(
          (product) => String(product.category || '').toLowerCase() === String(selectedCategory).toLowerCase()
        )
      }

      if (searchQuery) {
        const q = String(searchQuery).toLowerCase().trim()
        filtered = filtered.filter((product) => {
          const name = String(product.name || '').toLowerCase()
          const category = String(product.category || '').toLowerCase()
          return name.includes(q) || category.includes(q)
        })
      }

      filtered = sortProducts(filtered, sortBy)

      const total = filtered.length
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
      const safePage = Math.min(currentPage, pages)
      const start = (safePage - 1) * PAGE_SIZE
      const end = start + PAGE_SIZE

      if (safePage !== currentPage) {
        setCurrentPage(safePage)
      }

      setProducts(filtered.slice(start, end))
      setPagination({
        total,
        pages,
        has_prev: safePage > 1,
        has_next: safePage < pages,
      })
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId)
    setCurrentPage(1)
  }
  
  const handleSortChange = (e) => {
    setSortBy(e.target.value)
    setCurrentPage(1)
  }
  
  const handleClearFilters = () => {
    setSelectedCategory('')
    setSearchQuery('')
    setSortBy('newest')
    setCurrentPage(1)
  }
  
  const hasActiveFilters = selectedCategory || searchQuery || sortBy !== 'newest'
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
            
            {/* Categories */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Danh mục</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={!selectedCategory}
                    onChange={() => handleCategoryChange('')}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Tất cả</span>
                </label>
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === String(category.id)}
                      onChange={() => handleCategoryChange(String(category.id))}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {category.name} ({category.product_count})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 'Tất cả sản phẩm'}
              </h1>
              <p className="text-gray-500 mt-1">
                {pagination.total || 0} sản phẩm
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mobile filter button */}
              <button
                onClick={() => setIsFilterOpen(true)}
                className="md:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                <Filter className="w-5 h-5" />
                Bộ lọc
              </button>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="name">Theo tên</option>
              </select>
            </div>
          </div>
          
          {/* Active filters tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  {categories.find(c => String(c.id) === selectedCategory)?.name}
                  <button onClick={() => handleCategoryChange('')}>
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  Tìm: {searchQuery}
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </div>
          )}
          
          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded mt-4"></div>
                  <div className="h-4 bg-gray-200 rounded mt-2 w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded mt-4"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
              </div>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!pagination.has_prev}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === i + 1
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={!pagination.has_next}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">Không tìm thấy sản phẩm nào</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 text-primary-600 hover:text-primary-700"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden">
          <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Bộ lọc</h3>
              <button onClick={() => setIsFilterOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Danh mục</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="category-mobile"
                    checked={!selectedCategory}
                    onChange={() => {
                      handleCategoryChange('')
                      setIsFilterOpen(false)
                    }}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="ml-2 text-gray-600">Tất cả</span>
                </label>
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category-mobile"
                      checked={selectedCategory === String(category.id)}
                      onChange={() => {
                        handleCategoryChange(String(category.id))
                        setIsFilterOpen(false)
                      }}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="ml-2 text-gray-600">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => {
                handleClearFilters()
                setIsFilterOpen(false)
              }}
              className="w-full py-2 border border-gray-300 rounded-lg text-gray-700"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
