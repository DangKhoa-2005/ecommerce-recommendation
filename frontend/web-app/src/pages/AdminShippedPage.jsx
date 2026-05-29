import { useState, useEffect } from 'react'
import { ordersAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store'

function AdminShippedPage() {
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
      const response = await ordersAPI.adminGetAll({ page: currentPage, per_page: 10, status: 'shipping,delivered' })
      setOrders(response.data.data.orders)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Failed to load shipped orders', error)
      toast.error('Không thể tải lịch sử vận chuyển')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFromHistory = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn này khỏi lịch sử vận chuyển?')) return
    try {
      await ordersAPI.adminUpdateStatus(orderId, { status: 'delivered' })
      toast.success('Đã xóa khỏi lịch sử (chuyển sang Đã giao)')
      loadOrders()
    } catch (error) {
      console.error('Remove failed', error)
      toast.error(error.response?.data?.message || 'Không thể xóa khỏi lịch sử')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử đã xác nhận vận chuyển</h1>
        <div>
          <button onClick={() => window.location.href = '/admin/orders'} className="px-3 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Quay về</button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Đơn hàng #{order.id} • {order.item_count} sản phẩm</div>
                <div className="text-xs text-gray-400">Trạng thái: <span className={`font-medium ${order.status === 'delivered' ? 'text-green-600' : 'text-purple-600'}`}>{order.status_display}</span></div>
                <div className="font-medium text-gray-900">{new Date(order.updated_at.endsWith('Z') ? order.updated_at : `${order.updated_at}Z`).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-sm text-gray-600 mt-1">{order.shipping_address}</div>
                <div className="text-sm text-gray-500 mt-1">Người nhận: <span className="font-medium">{order.customer_name || order.user?.full_name || order.user?.email || order.phone || 'Không rõ'}</span></div>
                <div className="text-sm text-gray-500 mt-1">SĐT: {order.user?.phone || order.phone || 'Không có'}</div>
              </div>

              <div className="flex items-center gap-3">
                <a href={`/orders/${order.id}`} className="px-3 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Xem chi tiết</a>
                <button onClick={() => handleRemoveFromHistory(order.id)} className="px-3 py-2 border rounded-md text-sm text-red-600 hover:bg-red-50">Xóa khỏi lịch sử</button>
              </div>
            </div>
          ))}
        </div>
      )}

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

export default AdminShippedPage
