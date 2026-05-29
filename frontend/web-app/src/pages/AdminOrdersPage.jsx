import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ordersAPI } from '../services/api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const { user } = useAuthStore()

  useEffect(() => {
    loadOrders()
  }, [currentPage])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      // Only load orders that are confirmed and need admin to confirm shipping
      const response = await ordersAPI.adminGetAll({ page: currentPage, per_page: 10, status: 'confirmed' })
      setOrders(response.data.data.orders)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Failed to load admin orders', error)
      toast.error('Không thể tải đơn hàng (admin)')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmShipping = async (orderId) => {
    try {
      await ordersAPI.adminUpdateStatus(orderId, { status: 'shipping' })
      toast.success('Đã xác nhận vận chuyển')
      loadOrders()
    } catch (error) {
      console.error('Confirm shipping failed', error)
      toast.error(error.response?.data?.message || 'Xác nhận vận chuyển thất bại')
    }
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Đơn hàng #{order.id} • {order.item_count} sản phẩm</div>
                <div className="font-medium text-gray-900">{new Date(order.created_at.endsWith('Z') ? order.created_at : `${order.created_at}Z`).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-sm text-gray-600 mt-1">{order.shipping_address}</div>
                <div className="text-sm text-gray-500 mt-1">Người nhận: <span className="font-medium">{order.customer_name || order.user?.full_name || order.user?.email || order.phone || 'Không rõ'}</span></div>
                <div className="text-sm text-gray-500 mt-1">SĐT: {order.user?.phone || order.phone || 'Không có'}</div>
              </div>

              <div className="flex items-center gap-3">
                <Link to={`/orders/${order.id}`} className="px-3 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Xem chi tiết</Link>
                {order.status === 'confirmed' ? (
                  <button onClick={() => handleConfirmShipping(order.id)} className="px-3 py-2 bg-primary-600 text-white rounded-lg">Xác nhận vận chuyển</button>
                ) : (
                  <span className="text-sm text-gray-500">{order.status_display}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination UI (simple) */}
      {pagination.pages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border rounded">Trước</button>
          <span className="px-4 py-2">Trang {currentPage} / {pagination.pages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages} className="px-4 py-2 border rounded">Sau</button>
        </div>
      )}
    </div>
  )
}

export default AdminOrdersPage
