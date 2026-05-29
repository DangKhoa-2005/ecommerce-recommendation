import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="font-bold text-xl">Mini Shop</span>
            </div>
            <p className="text-gray-400 text-sm">
              Cửa hàng điện tử trực tuyến với đa dạng sản phẩm chất lượng cao và dịch vụ tận tâm.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Giỏ hàng
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Đơn hàng
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Hỗ trợ</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/support/returns" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link to="/support/warranty" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link to="/support/guide" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Hướng dẫn mua hàng
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Liên hệ</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>📍 123 Đường ABC, Quận 1, TP.HCM</li>
              <li>📞 0901 234 567</li>
              <li>✉️ contact@minishop.com</li>
              <li>🕐 8:00 - 21:00 (Thứ 2 - CN)</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2024 Mini Shop. All rights reserved. | Đề tài môn học - PTGD Web</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
