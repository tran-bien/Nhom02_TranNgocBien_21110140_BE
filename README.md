# Backend - Website Kinh Doanh Sản Phẩm Giày

## 👨‍🎓 Thông tin sinh viên

**Sinh viên thực hiện:** Trần Ngọc Biên - 21110140  
**Tên đề tài:** XÂY DỰNG WEBSITE KINH DOANH SẢN PHẨM GIÀY

## 📋 Mô tả dự án

Đây là phần Backend của website thương mại điện tử chuyên kinh doanh sản phẩm giày, được xây dựng với Node.js, Express và MongoDB. Hệ thống cung cấp các tính năng quản lý sản phẩm, đơn hàng, người dùng, thanh toán, Blog, chat trực tuyến và các tính năng khác.

## 🚀 Công nghệ sử dụng

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (JSON Web Token)
- **File Upload:** Cloudinary, Multer
- **Real-time:** Socket.IO
- **Payment Gateway:** VNPAY
- **AI Integration:** Google Gemini AI
- **Email Service:** Nodemailer
- **Caching:** Node-Cache
- **Security:** Helmet, CORS, Bcrypt
- **Excel Processing:** ExcelJS, XLSX

## 📁 Cấu trúc dự án

```
Backend_ShoeShop_KLTN/
├── src/
│   ├── api/
│   │   ├── controllers/      # Xử lý logic nghiệp vụ
│   │   │   ├── admin/         # Controllers cho admin
│   │   │   ├── public/        # Controllers công khai
│   │   │   ├── shipper/       # Controllers cho shipper
│   │   │   └── user/          # Controllers cho user
│   │   ├── middlewares/       # Middleware xác thực, xử lý lỗi
│   │   ├── routes/            # Định nghĩa API endpoints
│   │   └── validators/        # Validate dữ liệu đầu vào
│   ├── config/                # Cấu hình database, socket, cloudinary
│   ├── models/                # Mongoose schemas
│   ├── services/              # Business logic services
│   ├── sockets/               # WebSocket handlers
│   ├── utils/                 # Utility functions
│   ├── plugins/               # Mongoose plugins
│   └── server.js              # Entry point
├── .env                       # Biến môi trường
├── package.json               # Dependencies
└── README.md
```

## 🔧 Cài đặt và triển khai

### Yêu cầu hệ thống

- Node.js >= 14.x
- MongoDB
- Git
- npm hoặc yarn

### Bước 1: Clone repository

```bash
git clone https://github.com/tran-bien/Backend_ShoeShop.git
```

### Bước 2: Di chuyển vào thư mục dự án

```bash
cd Backend_ShoeShop_KLTN
```

### Bước 3: Cài đặt dependencies

```bash
npm install
```

### Bước 4: Thiết lập biến môi trường

Tạo file `.env` trong thư mục gốc của dự án và cấu hình các biến sau:

```env
# Server Configuration
PORT=5005
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/shoeshop?retryWrites=true&w=majority

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=10d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=30d

# Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# VNPAY Payment Gateway
VNP_TMN_CODE=your_vnpay_tmn_code
VNP_HASH_SECRET=your_vnpay_hash_secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/payment/status
VNP_IPN_URL=http://localhost:5005/api/v1/orders/vnpay/ipn

# Gemini AI (Optional)
GEMINI_API_KEY=your_gemini_api_key


### Bước 5: Chạy ứng dụng

**Development mode (với nodemon):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:5005`

## 📚 API Documentation

### Base URL

```
http://localhost:5005/api/v1
```

### Phân quyền Routes

- **Public Routes:** `/api/v1/public/*` - Không yêu cầu authentication
- **User Routes:** `/api/v1/user/*` - Yêu cầu user authentication
- **Admin Routes:** `/api/v1/admin/*` - Yêu cầu admin authentication
- **Shipper Routes:** `/api/v1/shipper/*` - Yêu cầu shipper authentication

### Các module chính

- **Authentication:** Đăng ký, đăng nhập, quên mật khẩu
- **Products:** Quản lý sản phẩm, biến thể, màu sắc, kích cỡ
- **Categories & Brands:** Quản lý danh mục và thương hiệu
- **Cart & Orders:** Giỏ hàng và đơn hàng
- **Payment:** Tích hợp VNPAY
- **Reviews & Ratings:** Đánh giá sản phẩm
- **Inventory:** Quản lý kho hàng
- **Loyalty Program:** Chương trình khách hàng thân thiết
- **Chat:** Chat trực tuyến với Socket.IO
- **Blog:** Quản lý bài viết
- **Notifications:** Thông báo real-time
- **Dashboard:** Thống kê và báo cáo
- **AI Recommendations:** Gợi ý sản phẩm thông minh

## 🔑 Tính năng nổi bật

### 1. Authentication & Authorization

- JWT-based authentication
- Role-based access control (Admin, User, Shipper)
- Refresh token mechanism
- Session management

### 2. Product Management

- Multi-variant products (size, color)
- SKU auto-generation
- Image upload với Cloudinary
- Product filtering & search
- View history tracking

### 3. Order Processing

- Complete order workflow
- Order status tracking
- Cancel & return request handling
- VNPAY payment integration
- Email notifications

### 4. Real-time Features

- Socket.IO for live chat
- Real-time notifications
- Order status updates

### 5. AI Integration

- Gemini AI for product recommendations
- Smart chatbot support
- Personalized suggestions

### 6. Inventory Management

- Stock tracking
- Transaction history
- Low stock alerts
- Batch operations với Excel

### 7. Loyalty Program

- Tier-based rewards
- Point accumulation
- Loyalty transactions

### 8. Analytics & Reports

- Dashboard statistics
- Sales reports
- Revenue analytics
- Export to Excel

## 🛡️ Bảo mật

- Helmet.js cho HTTP headers security
- CORS configuration
- Password hashing với Bcrypt
- JWT token validation
- Request validation với express-validator
- SQL injection protection
- XSS protection
```

## 🔄 Scripts

- `npm start` - Chạy production server
- `npm run dev` - Chạy development server với nodemon

## 📝 Lưu ý

- Đảm bảo MongoDB đang chạy trước khi start server
- Cấu hình CORS trong `server.js` để match với frontend URL
- Sử dụng HTTPS trong production
- Backup database thường xuyên

