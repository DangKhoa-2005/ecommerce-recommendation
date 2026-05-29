import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

function AdminStatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/orders/admin/stats');
      setStats(response.data?.data || response.data);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu thống kê');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center p-8">Không có dữ liệu</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Thống kê & Tổng quan</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Doanh thu */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Tổng doanh thu</h2>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.total_revenue || 0)}
          </p>
        </div>

        {/* Tổng đơn hàng */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Tổng số đơn hàng</h2>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total_orders || 0}</p>
        </div>
      </div>

      {/* Chi tiết trạng thái */}
      <h2 className="text-xl font-bold mb-4">Thống kê theo trạng thái</h2>
      {stats.by_status && Object.keys(stats.by_status).length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(stats.by_status).map(([statusKey, count], index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${statusKey === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
                        statusKey === 'shipping' ? 'bg-indigo-100 text-indigo-800' :
                        statusKey === 'delivered' ? 'bg-green-100 text-green-800' : 
                        statusKey === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {statusKey.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Chưa có dữ liệu trạng thái.</p>
      )}
    </div>
  );
}

export default AdminStatsPage;