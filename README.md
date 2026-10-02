# ⚽ SportBookVN - Nền Tảng Đặt Sân Thể Thao

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

SportBookVN là một nền tảng website hỗ trợ người dùng tìm kiếm, so sánh và đặt sân thể thao (Bóng đá, Cầu lông, Tennis, Pickleball,...) một cách nhanh chóng. Đồng thời, nền tảng cung cấp bộ công cụ quản lý chuyên nghiệp dành cho các Chủ sân và Quản trị viên (Admin).

Đây là sản phẩm của Đồ án môn học **Quy trình Phần mềm (SEP)**.

---

## 👥 Nhóm Phát Triển (Nhóm 06)
- **Nguyễn Đình Lực** 
- **Phạm Khánh Duy** 
- **Trần Mạnh Hùng** 

**Lớp:** 22DHT6  
**Giảng viên hướng dẫn (Mentor):** T.S Nguyễn Minh Tân  
**Thời gian thực hiện:** 09/2026 - 11/2026  

---

## 🌟 Chức Năng Nổi Bật

Hệ thống được thiết kế linh hoạt với 3 phân quyền chính:

### 1. Phân hệ Khách hàng (Customer)
- Tìm kiếm sân theo môn thể thao, vị trí, giá tiền.
- Xem chi tiết sân, hình ảnh, đánh giá.
- Đặt lịch, chọn khung giờ trống theo thời gian thực.
- Thanh toán trực tuyến và quản lý lịch sử đặt sân.

### 2. Phân hệ Chủ sân (Owner)
- Đăng ký đối tác để đưa sân lên nền tảng.
- Quản lý danh sách sân (thêm, sửa, xóa, khóa sân tạm thời).
- Quản lý lịch đặt (Booking) của khách hàng (Xác nhận, Từ chối).
- Xem báo cáo doanh thu theo tuần/tháng.

### 3. Phân hệ Quản trị viên (Admin)
- Quản lý và phê duyệt tài khoản Chủ sân.
- Quản lý toàn bộ danh sách sân trên hệ thống.
- Cấu hình phí dịch vụ, tài khoản, giám sát hoạt động hệ thống.

---

## 🛠 Kiến Trúc Kỹ Thuật

Dự án áp dụng kiến trúc Client-Server kết hợp Backend API:

- **Frontend:** React.js, TypeScript, Vite, Tailwind CSS, React Router v6.
- **Backend API:** Node.js, Express.js.
- **Database & Auth:** Firebase (Cloud Firestore & Firebase Authentication).
- **Thiết kế UI/UX:** Figma.

---

## ⚙️ Hướng Dẫn Cài Đặt (Local Development)

### Yêu cầu hệ thống
- [Node.js](https://nodejs.org/en/) (v18.x trở lên)
- [Git](https://git-scm.com/)

### 1. Cài đặt Backend
```bash
# Di chuyển vào thư mục backend
cd code/backend

# Cài đặt dependencies
npm install

# Khởi chạy server (Port 5000)
npm start
```
*(Lưu ý: Bạn cần đưa file `serviceAccountKey.json` sinh ra từ Firebase Console vào thư mục `code/backend/config/` để Backend có quyền ghi vào Firestore)*

### 2. Cài đặt Frontend
```bash
# Di chuyển vào thư mục frontend
cd code/frontend

# Cài đặt dependencies
npm install

# Khởi chạy Vite server (Port 5173)
npm run dev
```
*(Lưu ý: Bạn cần cấu hình `firebaseConfig` trong `code/frontend/src/config/firebase.ts` để Frontend gọi được tính năng đăng nhập Auth)*

Sau khi chạy thành công, truy cập vào `http://localhost:5173` để trải nghiệm ứng dụng.

---

## 📄 Hệ Thống Tài Liệu Kỹ Thuật (SEP Documents)
Toàn bộ tài liệu Đặc tả yêu cầu (SRS), Sơ đồ kiến trúc (Architecture Design), Thiết kế cơ sở dữ liệu và Kịch bản kiểm thử (Test Cases) được đặt trong các thư mục gốc của repository nhằm tuân thủ tuyệt đối quy trình quản lý phần mềm SEP.

```text
SEP_NoiDung_DatSanTheThao
├── 1. PROJECT MANAGEMENT/            # Kế hoạch dự án, rủi ro, phân chia công việc
├── 2. CONTEXT AND SYSTEM REQUIREMENT/# Danh sách chức năng, ma trận truy vết
├── 3. SOFTWARE ARCHITECTURE & DESIGN/# Kiến trúc phần mềm & Cấu trúc Database Firestore
├── 4. TESTING/                       # Kế hoạch và Báo cáo kiểm thử, Test Case
└── code/                             # Mã nguồn hệ thống (Frontend & Backend)
```

