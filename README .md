# 🛒 E-Commerce Backend API

A secure, production-ready RESTful API for an e-commerce platform built with **Node.js**, **Express**, **MongoDB**, and **JWT** authentication.

---

## 🚀 Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + Express.js | Server & REST API framework |
| MongoDB + Mongoose | Database & ODM |
| JWT (Access + Refresh) | Stateless authentication |
| bcryptjs | Password hashing (salt rounds: 12) |
| Zod | Input validation & sanitization |
| express-rate-limit | Brute-force protection |
| cookie-parser | Secure refresh token cookies |
| cors | Cross-origin request handling |

---

## 📁 Project Structure

```
ecommerce-api/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   └── order.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── product.model.js
│   │   └── order.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   └── order.routes.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── product.validator.js
│   │   └── order.validator.js
│   └── utils/
│       └── jwt.utils.js
├── .env
├── .gitignore
├── server.js
└── package.json
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ecommerce-api.git
cd ecommerce-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=your-app
JWT_ACCESS_SECRET=your_64_char_random_hex
JWT_REFRESH_SECRET=your_64_char_random_hex
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
NODE_ENV=development
```

> Generate secure secrets:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4. Run the server
```bash
npm run dev    # Development
npm start      # Production
```

Server runs at: `http://localhost:5000`

---

## 🔐 Authentication API

Base URL: `/api/auth`

---

### POST `/api/auth/register`
Register a new user.

**Access:** Public

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "123456",
  "role": "customer"
}
```

**Response `201`:**
```json
{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "customer" }
}
```

| Code | Reason |
|------|--------|
| `201` | Registered successfully |
| `400` | Validation error |
| `409` | Email already in use |

---

### POST `/api/auth/login`
Login and receive tokens.

**Access:** Public

**Body:**
```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

**Response `200`:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "customer" }
}
```

> Refresh token is automatically set as an `httpOnly` cookie.

| Code | Reason |
|------|--------|
| `200` | Login successful |
| `401` | Invalid email or password |

---

### POST `/api/auth/refresh`
Get a new access token using refresh token cookie.

**Access:** Public (requires `refreshToken` cookie)

**Body:** None

**Response `200`:**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

| Code | Reason |
|------|--------|
| `200` | New access token issued |
| `401` | No refresh token |
| `403` | Invalid or expired token |

---

### POST `/api/auth/logout`
Logout and clear refresh token.

**Access:** Public

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### POST `/api/auth/forgot-password`
Request a password reset token.

**Access:** Public

**Body:**
```json
{ "email": "john@example.com" }
```

**Response `200`:**
```json
{
  "message": "Reset token sent (check console for simulation)",
  "resetToken": "abc123def456..."
}
```

| Code | Reason |
|------|--------|
| `200` | Token sent |
| `404` | Email not found |

---

### POST `/api/auth/reset-password/:token`
Reset password using the token.

**Access:** Public

**URL Param:** `token` from forgot-password response

**Body:**
```json
{ "password": "newpassword123" }
```

**Response `200`:**
```json
{ "message": "Password reset successful" }
```

| Code | Reason |
|------|--------|
| `200` | Password updated |
| `400` | Token invalid or expired (10 min expiry) |

---

## 📦 Product API

Base URL: `/api/products`

---

### POST `/api/products`
Create a new product.

**Access:** Admin only

**Headers:** `Authorization: Bearer <adminToken>`

**Body:**
```json
{
  "name": "iPhone 14",
  "description": "Apple smartphone with A15 Bionic chip",
  "price": 80000,
  "category": "mobile",
  "stock": 10,
  "images": ["iphone14.jpg"]
}
```

**Response `201`:**
```json
{
  "message": "Product created",
  "product": { "_id": "69c274b0b6192c5548b04ca4", "name": "iPhone 14", ... }
}
```

---

### GET `/api/products`
Get all products with filtering, sorting, pagination and search.

**Access:** Public

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Number | `1` | Page number |
| `limit` | Number | `10` | Items per page |
| `category` | String | — | Filter by category |
| `minPrice` | Number | — | Minimum price |
| `maxPrice` | Number | — | Maximum price |
| `sortBy` | String | `createdAt` | `price` or `createdAt` |
| `order` | String | `desc` | `asc` or `desc` |
| `search` | String | — | Search in name + description |

**Example Requests:**
```
GET /api/products
GET /api/products?category=mobile
GET /api/products?minPrice=50000&maxPrice=100000
GET /api/products?sortBy=price&order=asc
GET /api/products?search=iPhone
GET /api/products?page=1&limit=5
```

**Response `200`:**
```json
{
  "total": 4,
  "page": 1,
  "totalPages": 1,
  "count": 4,
  "products": [
    {
      "_id": "69c274b0b6192c5548b04ca4",
      "name": "iPhone 14",
      "price": 80000,
      "category": "mobile",
      "stock": 10,
      "averageRating": 0,
      "numReviews": 0
    }
  ]
}
```

---

### GET `/api/products/:id`
Get a single product.

**Access:** Public

**Response `200`:**
```json
{
  "product": {
    "_id": "69c274b0b6192c5548b04ca4",
    "name": "iPhone 14",
    "description": "Apple smartphone with A15 Bionic chip",
    "price": 80000,
    "category": "mobile",
    "stock": 10,
    "images": ["iphone14.jpg"],
    "reviews": [],
    "averageRating": 0,
    "numReviews": 0
  }
}
```

| Code | Reason |
|------|--------|
| `200` | Product found |
| `404` | Product not found |

---

### PUT `/api/products/:id`
Update a product.

**Access:** Admin only

**Headers:** `Authorization: Bearer <adminToken>`

**Body** (any fields to update):
```json
{ "price": 75000, "stock": 15 }
```

**Response `200`:**
```json
{ "message": "Product updated", "product": { ... } }
```

---

### DELETE `/api/products/:id`
Delete a product.

**Access:** Admin only

**Headers:** `Authorization: Bearer <adminToken>`

**Response `200`:**
```json
{ "message": "Product deleted successfully" }
```

---

### POST `/api/products/:id/reviews`
Add a review to a product.

**Access:** Customer (authenticated)

**Headers:** `Authorization: Bearer <customerToken>`

**Body:**
```json
{
  "rating": 5,
  "comment": "Excellent product! Highly recommended."
}
```

**Response `201`:**
```json
{ "message": "Review added" }
```

| Code | Reason |
|------|--------|
| `201` | Review added, averageRating auto-updated |
| `400` | Already reviewed this product |
| `404` | Product not found |

---

## 🛍️ Order API

Base URL: `/api/orders`

> All order routes require `Authorization: Bearer <token>`

---

### POST `/api/orders`
Place a new order.

**Access:** Customer

**Headers:** `Authorization: Bearer <customerToken>`

**Body:**
```json
{
  "items": [
    { "product": "69c274b0b6192c5548b04ca4", "quantity": 1 },
    { "product": "69c274f1b6192c5548b04ca7", "quantity": 2 }
  ],
  "shippingAddress": {
    "street": "123 MG Road",
    "city": "Jaipur",
    "state": "Rajasthan",
    "zip": "302001",
    "country": "India"
  },
  "paymentMethod": "cod"
}
```

> `paymentMethod`: `cod` | `card` | `upi`

**Response `201`:**
```json
{
  "message": "Order placed successfully",
  "order": {
    "_id": "64f9a1b2c3d4e5f6a7b8c9d0",
    "itemsPrice": 88000,
    "taxPrice": 15840,
    "shippingPrice": 0,
    "totalPrice": 103840,
    "status": "pending"
  }
}
```

**Auto-calculated:**

| Field | Formula |
|-------|---------|
| `itemsPrice` | Real price fetched from DB |
| `taxPrice` | itemsPrice × 18% GST |
| `shippingPrice` | ₹0 above ₹500, else ₹50 |
| `totalPrice` | All three combined |

| Code | Reason |
|------|--------|
| `201` | Order placed |
| `400` | Insufficient stock |
| `404` | Product not found |

---

### GET `/api/orders`
Get orders.

**Access:** Admin (all orders) / Customer (own orders only)

**Headers:** `Authorization: Bearer <token>`

**Query Params:** `page`, `limit`

**Response `200`:**
```json
{
  "total": 3,
  "page": 1,
  "totalPages": 1,
  "orders": [
    {
      "_id": "64f9a1b2c3d4e5f6a7b8c9d0",
      "user": { "name": "John Doe", "email": "john@example.com" },
      "totalPrice": 103840,
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### GET `/api/orders/:id`
Get a single order.

**Access:** Admin (any) / Customer (own only)

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "order": {
    "_id": "...",
    "user": { "name": "John Doe", "email": "john@example.com" },
    "items": [
      { "name": "iPhone 14", "price": 80000, "quantity": 1 }
    ],
    "itemsPrice": 88000,
    "taxPrice": 15840,
    "shippingPrice": 0,
    "totalPrice": 103840,
    "status": "pending",
    "isPaid": false,
    "isDelivered": false
  }
}
```

| Code | Reason |
|------|--------|
| `200` | Order found |
| `403` | Not your order |
| `404` | Order not found |

---

### PUT `/api/orders/:id/status`
Update order status.

**Access:** Admin only

**Headers:** `Authorization: Bearer <adminToken>`

**Body:**
```json
{ "status": "shipped" }
```

**Status flow:**
```
pending → processing → shipped → delivered → cancelled
```

**Response `200`:**
```json
{ "message": "Order status updated", "order": { "status": "shipped" } }
```

> Setting `delivered` auto-sets `isDelivered: true` and `deliveredAt`.
> Setting `cancelled` auto-restores product stock.

---

### DELETE `/api/orders/:id`
Cancel an order.

**Access:** Customer (own pending orders only)

**Headers:** `Authorization: Bearer <customerToken>`

**Response `200`:**
```json
{ "message": "Order cancelled successfully" }
```

| Code | Reason |
|------|--------|
| `200` | Cancelled, stock restored |
| `400` | Only pending orders can be cancelled |
| `403` | Not your order |

---

## 🗄️ Database Models

### User
```
name                 String, required
email                String, unique, required
password             String, hashed (bcrypt 12), hidden
role                 Enum: customer | admin
address              { street, city, state, zip, country }
refreshToken         String, hidden
passwordResetToken   String, SHA256 hashed, hidden
passwordResetExpires Date, 10min expiry
createdAt / updatedAt  Auto timestamps
```

### Product
```
name           String, required
description    String, required
price          Number, required, min 0
category       String, auto-lowercased
stock          Number, default 0
images         [String]
reviews        [{ user, name, rating, comment, createdAt }]
averageRating  Number, auto-calculated
numReviews     Number, auto-calculated
createdBy      ObjectId → User
```

### Order
```
user             ObjectId → User
items            [{ product, name, price, quantity, image }]
shippingAddress  { street, city, state, zip, country }
paymentMethod    Enum: cod | card | upi
itemsPrice       Number
taxPrice         Number (18% GST)
shippingPrice    Number (free > ₹500)
totalPrice       Number
status           Enum: pending | processing | shipped | delivered | cancelled
isPaid           Boolean, default false
isDelivered      Boolean, default false
deliveredAt      Date
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcryptjs, 12 salt rounds |
| Access token | JWT, 15 min expiry |
| Refresh token | JWT, 7 days, httpOnly cookie |
| Token rotation | New refresh token on every refresh call |
| Rate limiting | 100 req / 15 min per IP |
| Input validation | Zod schemas on all routes |
| CORS | Configured allowed origins |
| Role middleware | `protect` + `adminOnly` on all sensitive routes |
| Price integrity | Price always fetched from DB |
| Stock protection | Validated before order, restored on cancel |
| Reset token | SHA256 hashed, 10 min expiry |

---

## 📊 HTTP Response Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Validation / bad request |
| `401` | Not authenticated |
| `403` | Not authorized (wrong role) |
| `404` | Not found |
| `409` | Conflict (duplicate email) |
| `429` | Rate limit exceeded |
| `500` | Server error |

---

## 🌟 All Features Implemented

| Feature | Status |
|---------|--------|
| User register + login | ✅ |
| JWT access + refresh tokens | ✅ |
| Role-based access (Admin/Customer) | ✅ |
| Password reset with expiring token | ✅ |
| Product CRUD | ✅ |
| Pagination | ✅ |
| Filtering (category, price range) | ✅ |
| Sorting (price, date) | ✅ |
| Search (name, description) | ✅ |
| Product reviews + ratings | ✅ |
| Order placement with stock check | ✅ |
| Auto GST + shipping calculation | ✅ |
| Order status management | ✅ |
| Stock restore on cancellation | ✅ |
| Input validation (Zod) | ✅ |
| Rate limiting | ✅ |
| CORS | ✅ |
| Global error handler | ✅ |

---

## 👨‍💻 Author

Built as part of Backend Developer assessment.
**Stack:** Node.js + Express + MongoDB + JWT