# E-commerce Data Analytics & Recommendation System
**Học phần:** Kiến trúc hướng dịch vụ và Điện toán đám mây

Dự án xây dựng hệ thống thương mại điện tử theo kiến trúc Microservices kết hợp hệ thống Data Pipeline (ETL) trên nền tảng Databricks Lakehouse.

## 👥 Thông tin nhóm
- **Huỳnh Đăng Khoa** - 23703471
- **Mai Văn Quân** - 2370351
- **Nguyễn Hoàng Nam** - 23718591

## 🎯 Mục tiêu hệ thống
- Xây dựng hệ thống Backend E-commerce đáp ứng chuẩn kiến trúc **Microservices / SOA**.
- Áp dụng nền tảng Cloud **Databricks** (Serverless Compute) để quản lý Big Data bằng kiến trúc **Medallion (Bronze, Silver, Gold)** của **Delta Lake**.
- Tích hợp vòng lặp (Close the loop): Mang dữ liệu từ Data Lake cung cấp lại cho Frontend qua quy trình Gọi ý sản phẩm (Recommendation Service).

## 🏗️ Kiến trúc Tổng thể (Architecture)
*(Sơ đồ kiến trúc tổng thể - Đã chốt cho báo cáo cuối kỳ)*
![Sơ đồ kiến trúc](docs/architecture.png)

## 📂 Cấu trúc Repository (Monorepo)
Dự án được tổ chức theo mô hình Monorepo gồm các phân hệ độc lập:

```text
📦 project-root
 ┣ 📂 backend/                     # Chứa source code của các Microservices (Cuối kỳ)
 ┃ ┣ 📂 user-service/              # Quản lý khách hàng (PostgreSQL)
 ┃ ┣ 📂 order-service/             # Quản lý giỏ hàng & Đơn hàng (PostgreSQL + MongoDB)
 ┃ ┗ 📂 recommendation-service/    # Gợi ý sản phẩm (Kết nối Databricks SQL API)
 ┣ 📂 databricks_pipeline/         # Chứa mã nguồn PySpark thực thi ETL trên Databricks
 ┃ ┗ 📜 01_Data_Pipeline_ETL.ipynb # Notebook Ingestion & Transform dữ liệu
 ┣ 📂 docs/                        # Tài liệu dự án
 ┃ ┣ 📜 BaoCaoGiuaKy.pdf           # Slide báo cáo tiến độ giữa kỳ
 ┃ ┗ 🖼️ architecture.png          # Ảnh sơ đồ kiến trúc hệ thống
 ┗ 📜 README.md                    # Tài liệu hướng dẫn (File này)
```

## 🚀 Tiến độ (Giữa kỳ)
- [x] Thiết kế xong sơ đồ kiến trúc hệ thống Microservices & Lakehouse.
- [x] Khởi tạo tài nguyên Serverless Compute và Unity Catalog Volumes trên Databricks.
- [x] Đẩy dữ liệu E-commerce thực tế lên Cloud Data Lake.
- [x] Code xong Pipeline ETL (Bronze & Silver layer) lưu trữ dưới định dạng Delta Table (ACID).
- [ ] Code các backend microservices (Dự kiến hoàn thiện nốt vào cuối kỳ).
- [ ] Tích hợp Recommendation Service và API Gateway.
