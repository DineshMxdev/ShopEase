# ShopEase - Full-Featured E-Commerce Platform

A comprehensive e-commerce platform built with Express.js and SQLite, featuring user authentication, payment processing, admin dashboard, and modern UX.

## ✨ New Features (v2.0)

### 1. **User Authentication** 🔐
- User registration and login
- JWT-based authentication
- Persistent user profiles
- Password hashing with bcryptjs
- User roles (customer, admin)

**Endpoints:**
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/profile` - Get logged-in user profile

### 2. **Product Reviews & Ratings** ⭐
- Submit product reviews with ratings (1-5 stars)
- View all reviews for each product
- Automatic rating calculation
- Review history tied to user accounts

**Endpoints:**
- `GET /api/products/:id/reviews` - Get all reviews
- `POST /api/products/:id/reviews` - Submit new review

### 3. **Wishlist Feature** ❤️
- Save favorite products for later
- Wishlist persists across sessions
- Quick removal from wishlist
- Visual indicators on product cards

**Endpoints:**
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist/:productId` - Add to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist

### 4. **Inventory Management** 📦
- Track product stock levels
- Prevent overselling
- Display inventory status on product cards
- Real-time inventory updates after orders

**Features:**
- Stock quantity displayed per product
- Color-coded inventory status
- Automatic inventory reduction on order

### 5. **Advanced Search** 🔍
- Real-time product search
- Search across name, description, and category
- Autocomplete suggestions
- Optimized search algorithm

**Endpoint:**
- `GET /api/products/search?query=...` - Search products

### 6. **Email Notifications** 📧
- Order confirmation emails
- Customizable email templates
- Async email sending

**Configuration:**
Set environment variables:
- `EMAIL_USER` - Gmail address
- `EMAIL_PASS` - Gmail app password

### 7. **Admin Dashboard** 👨‍💼
- View all orders system-wide
- Dashboard statistics
- Order status management
- Inventory monitoring
- Admin-only product creation

**Endpoints:**
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/orders` - All orders
- `PATCH /api/admin/orders/:id/status` - Update order status
- `POST /api/products` - Create new product (admin only)

### 8. **Payment Integration** 💳
- Stripe payment processing
- Multiple payment methods (Card, UPI, COD)
- Secure payment handling
- Payment ID tracking

**Configuration:**
Set `STRIPE_SECRET_KEY` environment variable

### 9. **Product Image Upload** 🖼️
- Upload custom product images
- Automatic file organization
- Fallback placeholder images
- Image serving from /uploads directory

### 10. **Dark Mode** 🌙
- Toggle between light and dark themes
- Theme preference saved to localStorage
- Smooth transitions
- Dark mode CSS variables
- System theme detection

## Installation & Setup

### Prerequisites
- Node.js 14+
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the project root:

```env
# Server
PORT=3000
JWT_SECRET=your-secret-key

# Email (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment (optional)
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Start the Server
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
.
├── server.js              # Express backend with all APIs
├── app.js                 # Frontend JavaScript
├── index.html             # HTML structure
├── styles.css             # Responsive styles + dark mode
├── package.json           # Dependencies
└── shop.db               # SQLite database (auto-created)
```

## Database Schema

### Users Table
```sql
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT hashed)
- name (TEXT)
- phone (TEXT)
- address (TEXT)
- city (TEXT)
- pin (TEXT)
- role (TEXT: 'customer' or 'admin')
- createdAt (TEXT ISO date)
```

### Products Table
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- category (TEXT)
- price (INTEGER paise)
- rating (REAL average)
- description (TEXT)
- image (TEXT URL)
- inventory (INTEGER stock count)
- createdAt (TEXT ISO date)
```

### Reviews Table
```sql
- id (TEXT PRIMARY KEY)
- productId (INTEGER)
- userId (TEXT)
- rating (INTEGER 1-5)
- comment (TEXT)
- createdAt (TEXT ISO date)
```

### Wishlist Table
```sql
- id (TEXT PRIMARY KEY)
- userId (TEXT)
- productId (INTEGER)
- addedAt (TEXT ISO date)
```

### Orders Table
```sql
- id (TEXT PRIMARY KEY)
- userId (TEXT)
- createdAt (TEXT ISO date)
- customerName (TEXT)
- customerEmail (TEXT)
- customerPhone (TEXT)
- customerCity (TEXT)
- customerPin (TEXT)
- deliverySpeed (TEXT: 'standard' or 'express')
- paymentMethod (TEXT: 'card', 'upi', 'cod')
- paymentId (TEXT Stripe ID)
- status (TEXT: 'pending', 'confirmed', 'shipped', 'delivered')
- subtotal (INTEGER paise)
- delivery (INTEGER paise)
- total (INTEGER paise)
- items (TEXT JSON array)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user (requires token)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/search?query=...` - Search products
- `POST /api/products` - Create product (admin only)

### Reviews
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/reviews` - Submit review (requires auth)

### Wishlist
- `GET /api/wishlist` - Get wishlist (requires auth)
- `POST /api/wishlist/:productId` - Add to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist

### Orders
- `GET /api/orders` - Get user's orders (requires auth)
- `POST /api/orders` - Place new order

### Admin
- `GET /api/admin/stats` - Dashboard stats (admin only)
- `GET /api/admin/orders` - All orders (admin only)
- `PATCH /api/admin/orders/:id/status` - Update order status (admin only)

## Authentication

All protected endpoints require an Authorization header:
```javascript
headers: {
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

Get tokens from login/register endpoints.

## Frontend Features

### User Authentication
- Register/Login forms accessible from header
- Persistent login sessions
- User profile display in header
- Logout functionality

### Shopping Experience
- Browse products by category
- Real-time search with autocomplete
- Sort by price (low-high, high-low)
- Add to cart with quantity controls
- Cart persists in localStorage

### Wishlist Management
- Add/remove products to wishlist
- Visual heart icons on product cards
- Dedicated wishlist view
- Wishlist syncs with account

### Product Reviews
- View all reviews on product cards
- Submit your own reviews (1-5 stars)
- Review count and ratings displayed
- Real-time rating updates

### Checkout
- Customer information form
- Multiple payment options
- Order confirmation
- Order history tracking
- Email confirmation (if configured)

### Dark Mode
- Toggle button in header (☀️/🌙)
- Automatic theme switching
- Persistent theme preference
- Smooth transitions

## Usage Examples

### Register a User
```javascript
fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  })
})
```

### Submit a Review
```javascript
fetch('/api/products/1/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TOKEN'
  },
  body: JSON.stringify({
    rating: 4,
    comment: 'Great product!'
  })
})
```

### Add to Wishlist
```javascript
fetch('/api/wishlist/1', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' }
})
```

## Performance Optimizations

- Lazy loading of product images
- CSS transitions for smooth animations
- Efficient database queries
- LocalStorage for client-side caching
- JWT for stateless auth

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based access control (RBAC)
- CORS enabled
- SQL prepared statements (sqlite3)

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- OAuth integration (Google, GitHub)
- Product recommendations
- Advanced filters and faceted search
- Seller dashboard
- Real inventory sync
- Analytics and reporting
- Mobile app

## License

MIT

## Support

For issues or questions, please check the GitHub repository or contact support.

---

**Made for the ShopEase demo project**
