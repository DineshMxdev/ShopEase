# ShopEase - Complete Feature Documentation

## Overview
This document provides detailed information about all 10 major features implemented in ShopEase v2.0.

---

## 1. User Authentication 🔐

### What It Does
- Allows users to create accounts and log in securely
- Manages user sessions with JWT tokens
- Stores user profiles with contact information

### How to Use

#### Registration
Click "Sign in" button in header → Select "Register"
```javascript
Enter:
- Email: user@example.com
- Password: securepassword123
- Name: John Doe
```

#### Login
Click "Sign in" button → Select "Login"
```javascript
Enter:
- Email: user@example.com
- Password: securepassword123
```

### Backend Implementation
```javascript
// Registration endpoint
POST /api/auth/register
Body: {
  email: "user@example.com",
  password: "password",
  name: "John Doe"
}
Response: {
  token: "JWT_TOKEN",
  userId: "user-uuid",
  email: "user@example.com",
  name: "John Doe"
}
```

### Key Files
- `server.js`: Lines 50-100 (authentication middleware)
- `server.js`: Lines 137-200 (auth endpoints)
- `app.js`: Lines 114-180 (auth functions)

### Security Features
- Passwords hashed with bcryptjs
- JWT tokens with 7-day expiration
- Role-based access control
- Token stored securely in localStorage

---

## 2. Product Reviews & Ratings ⭐

### What It Does
- Users can leave 1-5 star ratings on products
- Review comments are displayed on product pages
- Product average rating automatically calculated
- Reviews are tied to user accounts

### How to Use
1. Click the "💬 Review" button on any product
2. Enter rating (1-5 stars)
3. Enter your review comment
4. Review is instantly published

### Viewing Reviews
- Reviews appear in product card with reviewer name
- Ratings are sorted by most recent first
- Total review count displayed

### Backend Implementation
```javascript
// Get reviews
GET /api/products/1/reviews
Response: [
  {
    id: "review-uuid",
    rating: 5,
    comment: "Great product!",
    name: "John Doe",
    createdAt: "2024-01-15T10:30:00Z"
  }
]

// Submit review
POST /api/products/1/reviews
Body: { rating: 5, comment: "Great!" }
```

### Database
```sql
Reviews table:
- id (TEXT)
- productId (INTEGER)
- userId (TEXT)
- rating (INTEGER 1-5)
- comment (TEXT)
- createdAt (TEXT)
```

### Key Files
- `server.js`: Lines 300-365 (review endpoints)
- `app.js`: Lines 234-285 (review functions)

---

## 3. Wishlist Feature ❤️

### What It Does
- Users can save favorite products for later
- Wishlist persists across sessions
- Wishlist syncs with user account
- Visual indicators show wishlisted items

### How to Use

#### Adding to Wishlist
1. Look for the ❤️ heart icon on product cards
2. Click heart to add/remove from wishlist
3. Heart turns red when added

#### Viewing Wishlist
1. Click "Wishlist" in the header
2. See all saved items
3. Click items to add to cart

### Frontend Implementation
```javascript
// Toggle wishlist
async function toggleWishlist(productId) {
  const response = await fetch(`/api/wishlist/${productId}`, {
    method: isInWishlist ? "DELETE" : "POST",
    headers: { "Authorization": `Bearer ${token}` }
  });
}
```

### Backend Endpoints
```javascript
GET /api/wishlist - Get user's wishlist
POST /api/wishlist/1 - Add product to wishlist
DELETE /api/wishlist/1 - Remove from wishlist
```

### Database
```sql
Wishlist table:
- id (TEXT PRIMARY KEY)
- userId (TEXT)
- productId (INTEGER)
- addedAt (TEXT timestamp)
```

### Key Features
- Requires authentication
- Real-time synchronization
- Persistent storage
- Quick add/remove toggles

### Key Files
- `server.js`: Lines 367-413 (wishlist endpoints)
- `app.js`: Lines 197-230 (wishlist functions)

---

## 4. Product Reviews & Ratings (Detailed) ⭐

*See section #2 for full details*

---

## 5. Inventory Management 📦

### What It Does
- Tracks available stock for each product
- Prevents overselling
- Shows inventory status on product cards
- Updates inventory after orders

### Product Display
- **Green**: In stock (>10 items)
- **Orange**: Low stock (<10 items)
- **Disabled**: Out of stock

### How It Works

#### Preventing Overselling
```javascript
// When adding to cart:
if (item.quantity >= product.inventory) {
  showToast("Not enough stock available");
  return;
}
```

#### Inventory Updates
- Inventory decreases automatically after order
- Real-time stock display
- Database synchronized instantly

### Stock Status Display
```html
In Stock (45 left)  <!-- Green -->
Low Stock (8 left)  <!-- Orange -->
Out of Stock        <!-- Disabled button -->
```

### Backend
```javascript
// Check inventory
GET /api/products

// Update after order
UPDATE products 
SET inventory = inventory - ? 
WHERE id = ?
```

### Key Files
- `server.js`: Lines 115-135 (product table schema)
- `server.js`: Lines 455-470 (inventory update on order)
- `app.js`: Lines 425-445 (cart validation)

---

## 6. Advanced Search & Autocomplete 🔍

### What It Does
- Real-time product search
- Searches across multiple fields
- Instant filtering as you type
- Autocomplete suggestions

### How to Use
1. Type in the search box at the top
2. Results update instantly
3. Search across:
   - Product names
   - Descriptions
   - Categories

### Search Features
- Case-insensitive matching
- Partial word matching
- Wildcard support
- Real-time filtering

### Implementation
```javascript
// Search endpoint
GET /api/products/search?query=wireless

// Frontend search
async function searchProducts(query) {
  const response = await fetch(
    `/api/products/search?query=${encodeURIComponent(query)}`
  );
  products = await response.json();
  renderProducts();
}
```

### Database Query
```sql
SELECT * FROM products 
WHERE name LIKE ? 
  OR description LIKE ? 
  OR category LIKE ?
```

### Key Files
- `server.js`: Lines 257-272 (search endpoint)
- `app.js`: Lines 292-306 (search function)
- `index.html`: Product search input element

---

## 7. Email Notifications 📧

### What It Does
- Sends order confirmation emails
- Includes order details and total
- Async sending (doesn't block checkout)
- Customizable templates

### Email Contents
```
Subject: Order Confirmation - OD12345678

---
Order Confirmed!

Order ID: OD12345678
Total: ₹2,499

Thank you for your order!
---
```

### Configuration

#### Step 1: Enable Gmail App Password
1. Go to myaccount.google.com
2. Enable 2-Step Verification
3. Generate App Password for Gmail
4. Copy the 16-character password

#### Step 2: Set Environment Variables
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

#### Step 3: Emails Send Automatically
- After successful order placement
- Includes order ID and total amount
- Doesn't delay checkout process

### Backend
```javascript
// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email after order
emailTransporter.sendMail({
  to: customer.email,
  subject: `Order Confirmation - ${id}`,
  html: `<h2>Order Confirmed!</h2>...`
}).catch(err => console.log('Email send failed:', err));
```

### Key Files
- `server.js`: Lines 32-37 (email setup)
- `server.js`: Lines 448-456 (send confirmation email)

---

## 8. Admin Dashboard 👨‍💼

### What It Does
- View all orders in system
- Track sales statistics
- Update order statuses
- Monitor inventory levels
- Create/manage products

### Admin Features

#### Dashboard Stats
- Total orders count
- Total revenue generated
- Total users registered
- Low inventory alerts

#### Order Management
- View all orders (not just user's own)
- Update order status
- Track order timeline
- Customer details

#### Inventory Monitoring
- Products with <10 items in stock
- Quick reorder alerts
- Stock level overview

### Accessing Admin Panel
1. Admin account required
2. Login with admin user
3. Access to `/api/admin/*` endpoints

### Endpoints
```javascript
// Stats
GET /api/admin/stats
Response: {
  orders: { totalOrders: 42, totalRevenue: 150000 },
  users: { totalUsers: 25 },
  inventory: { lowInventory: 3 }
}

// All orders
GET /api/admin/orders
Response: [{ id, status, customer, items, total }]

// Update status
PATCH /api/admin/orders/OD123/status
Body: { status: "shipped" }
```

### Backend Implementation
```javascript
// Auth check
const user = db.get(`SELECT role FROM users WHERE id = ?`, [userId]);
if (user.role !== 'admin') {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

### Key Files
- `server.js`: Lines 473-520 (admin endpoints)

---

## 9. Payment Gateway Integration 💳

### What It Does
- Integrates with Stripe for payments
- Multiple payment methods
- Secure transaction handling
- Payment confirmation tracking

### Payment Methods
1. **Card** (Stripe)
2. **UPI** (Test mode)
3. **Cash on Delivery** (COD)

### How to Use
1. Add items to cart
2. Proceed to checkout
3. Select payment method
4. Enter payment details
5. Confirm order

### Test Credentials (Stripe Test Mode)
```
Card Number: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
```

### Configuration
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

### Backend Implementation
```javascript
// Process payment
if (paymentMethod === 'card' && token) {
  const charge = await stripe.charges.create({
    amount: total * 100,
    currency: 'inr',
    source: token,
    description: `Order ${id}`
  });
  paymentId = charge.id;
}
```

### Payment Status
- Pending: Initial state
- Confirmed: Payment successful
- Shipped: In delivery
- Delivered: Completed

### Key Files
- `server.js`: Lines 34-35 (Stripe setup)
- `server.js`: Lines 437-460 (payment processing)

---

## 10. Dark Mode 🌙

### What It Does
- Toggle between light and dark themes
- Smooth theme transitions
- Theme preference saved
- Works on all pages

### How to Use
1. Click the ☀️/🌙 button in the header
2. Theme switches instantly
3. Preference saved automatically
4. Persists across sessions

### Technical Implementation

#### CSS Variables
```css
:root {
  --fk-bg: #f1f3f6;
  --fk-white: #ffffff;
  --fk-ink: #212121;
}

html[data-theme="dark"] {
  --fk-bg: #1a1a1a;
  --fk-white: #2d2d2d;
  --fk-ink: #e0e0e0;
}
```

#### Toggle Function
```javascript
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";
  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}
```

#### Initialize on Load
```javascript
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
```

### Theme Colors
- **Light Mode**: Clean white background
- **Dark Mode**: Dark gray background with light text

### Transitions
- 0.3s smooth color transitions
- All elements update in sync
- No flickering or jarring changes

### Key Files
- `styles.css`: Lines 20-47 (dark mode CSS)
- `app.js`: Lines 310-330 (theme toggle functions)
- `index.html`: Theme toggle button

---

## Summary Table

| Feature | Type | Auth Required | Database | API Endpoints |
|---------|------|---------------|----------|---|
| Authentication | Core | No | Users | 3 |
| Reviews | Content | Yes | Reviews | 2 |
| Wishlist | Feature | Yes | Wishlist | 3 |
| Search | Feature | No | Products | 1 |
| Inventory | Core | No | Products | - |
| Emails | Service | No | Orders | - |
| Admin | Access | Yes | All | 3 |
| Payments | Integration | No | Orders | - |
| Image Upload | Feature | Yes | Products | - |
| Dark Mode | UI | No | LocalStorage | - |

---

## Next Steps

1. **Set up environment variables** (.env file)
2. **Install dependencies** (`npm install`)
3. **Start the server** (`npm start`)
4. **Create admin account** (register then promote user)
5. **Configure email** (optional, Gmail credentials)
6. **Configure Stripe** (optional, for payments)

---

## Troubleshooting

### Issue: Login not working
- Check if user registered first
- Verify email and password match
- Check browser console for errors

### Issue: Wishlist not saving
- Must be logged in
- Check browser's localStorage
- Verify auth token in headers

### Issue: Emails not sending
- Configure EMAIL_USER and EMAIL_PASS
- Generate Gmail App Password
- Check server logs for errors

### Issue: Dark mode not persisting
- Check if localStorage is enabled
- Clear browser cache
- Check for browser privacy settings

---

## API Authentication

All endpoints requiring authentication use JWT tokens:

```javascript
Authorization: Bearer <JWT_TOKEN>
```

Tokens obtained from:
- `/api/auth/register`
- `/api/auth/login`

Token expires in 7 days.

---

## Rate Limiting & Security Notes

- No rate limiting implemented (add in production)
- Use HTTPS in production
- Rotate JWT_SECRET regularly
- Enable CORS with specific domains
- Validate all inputs server-side

---

**Last Updated**: January 2024
**Version**: 2.0
