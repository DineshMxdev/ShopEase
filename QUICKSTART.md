# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env File
```bash
# Copy from .env.example
cp .env.example .env

# Edit .env with your settings:
PORT=3000
JWT_SECRET=your-secret-key-here
```

### 3. Start Server
```bash
npm start
```

Server runs at: **http://localhost:3000**

---

## 📝 First Steps

### Create Account
1. Click "Sign in" in header
2. Choose "Register"
3. Fill in email, password, name
4. You're logged in!

### Browse Products
1. Products display automatically
2. Use search box for quick find
3. Sort by price if needed
4. Filter by category

### Add to Cart
1. Click "ADD TO CART" on product
2. Update quantity in cart view
3. Proceed to checkout

### Complete Purchase
1. Enter delivery address
2. Select payment method
3. Choose delivery speed
4. Complete payment
5. Order confirmation sent to email

### Try New Features
- ❤️ Add products to **Wishlist**
- ⭐ Leave **Reviews** on products
- 🌙 Toggle **Dark Mode** (☀️ button)
- 🔐 **Login/Register** to save data

---

## 🔧 Configuration

### Email (Optional)
To enable order confirmation emails:

1. Go to myaccount.google.com
2. Enable 2-Step Verification
3. Generate Gmail App Password
4. Add to .env:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

### Stripe Payments (Optional)
1. Get API key from stripe.com
2. Add to .env:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
```

---

## 📊 Admin Features

### Become Admin
(Contact developer to set role in database)

### Admin Endpoints
```
GET /api/admin/stats        - Dashboard stats
GET /api/admin/orders       - All orders
PATCH /api/admin/orders/:id/status - Update status
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change PORT in .env |
| Database not found | Run: `rm shop.db && npm start` |
| Can't login | Check email/password match |
| Dark mode not saving | Check browser localStorage |
| Emails not sending | Set EMAIL_USER and EMAIL_PASS |

---

## 📚 Learn More

- See [README.md](./README.md) for complete documentation
- See [FEATURES.md](./FEATURES.md) for detailed feature guides
- Check [package.json](./package.json) for dependencies

---

## 💡 API Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Search Products
```bash
curl http://localhost:3000/api/products/search?query=wireless
```

### Get Wishlist
```bash
curl http://localhost:3000/api/wishlist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Review
```bash
curl -X POST http://localhost:3000/api/products/1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "rating": 5, "comment": "Great!" }'
```

---

## 🎯 Project Structure

```
d:\Claude\
├── server.js         ← Express backend
├── app.js            ← Frontend logic
├── index.html        ← HTML structure
├── styles.css        ← Styling + dark mode
├── package.json      ← Dependencies
├── .env             ← Configuration (create from .env.example)
├── .gitignore       ← Git ignore rules
├── README.md        ← Full documentation
├── FEATURES.md      ← Feature guides
├── QUICKSTART.md    ← This file
└── shop.db          ← SQLite database (auto-created)
```

---

## ✨ What's New in v2.0

✅ User authentication with JWT  
✅ Product reviews & ratings  
✅ Wishlist feature  
✅ Advanced search  
✅ Inventory management  
✅ Email notifications  
✅ Admin dashboard  
✅ Payment integration  
✅ Image uploads  
✅ Dark mode  

---

## 🎓 Next: Deploy

Ready to go live? Check production deployment guides:
- Heroku: Add Procfile with `web: npm start`
- Vercel: Use serverless functions
- AWS: Lambda + RDS

---

**Happy Shopping! 🛍️**

For issues: Check server console logs or browser developer tools.
