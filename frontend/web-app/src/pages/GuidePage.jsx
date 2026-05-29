function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Hướng dẫn mua hàng</h1>
      <ol className="list-decimal ml-6 mt-3 text-gray-700 space-y-3">
        <li>Chọn sản phẩm: Duyệt sản phẩm trên trang "Sản phẩm" và thêm vào giỏ bằng nút "Thêm vào giỏ".</li>
        <li>Kiểm tra giỏ hàng: Vào "Giỏ hàng" để kiểm tra số lượng, mã giảm giá (nếu có) và tổng tiền.</li>
        <li>Thanh toán: Nhấn "Thanh toán" để nhập thông tin giao hàng và chọn phương thức (COD, Chuyển khoản, Ví điện tử).</li>
        <li>Xác nhận: Sau khi đặt hàng thành công, bạn sẽ nhận được mã đơn hàng và có thể theo dõi trạng thái trong trang "Đơn hàng".</li>
        <li>Giao nhận: Shipper sẽ liên hệ theo số điện thoại bạn cung cấp để giao hàng. Vui lòng kiểm tra tình trạng và nhận hàng.</li>
      </ol>
      <p className="mt-4 text-gray-700">Nếu cần trợ giúp trong quá trình đặt hàng, vui lòng liên hệ Chăm sóc Khách hàng qua trang "Liên hệ".</p>
    </div>
  )
}

export default GuidePage
