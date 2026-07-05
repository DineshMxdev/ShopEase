const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fileUpload = require('express-fileupload');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const os = require('os');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');
const app = express();
const port = process.env.PORT || 3000;
const isServerlessRuntime = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  __dirname.startsWith('/var/task')
);
const bundledDbPath = path.join(__dirname, 'shop.db');
const dbPath = isServerlessRuntime ? path.join(os.tmpdir(), 'shop.db') : bundledDbPath;
const uploadDir = isServerlessRuntime ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (isServerlessRuntime && !fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
  fs.copyFileSync(bundledDbPath, dbPath);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(fileUpload());

app.get('/styles.css', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/app.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

app.use(express.static(__dirname));

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-password'
  }
});

const APP_NAME = 'ShopEase';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapePdfText(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function pdfMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function buildInvoicePdf(order) {
  const commands = [];
  const pageWidth = 595;
  const left = 42;
  const right = pageWidth - 42;

  const color = (r, g, b) => commands.push(`${r} ${g} ${b} rg ${r} ${g} ${b} RG`);
  const rect = (x, y, w, h, fill = true) => commands.push(`${x} ${y} ${w} ${h} re ${fill ? 'f' : 'S'}`);
  const line = (x1, y1, x2, y2) => commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  const add = (text, x, y, size = 10, font = 'F1') => {
    color(0.08, 0.10, 0.14);
    commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
  };
  const addMuted = (text, x, y, size = 9) => {
    color(0.36, 0.40, 0.46);
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
  };
  const addWhite = (text, x, y, size = 10, font = 'F1') => {
    color(1, 1, 1);
    commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
  };
  const truncate = (text, max = 34) => {
    const value = String(text ?? '');
    return value.length > max ? `${value.slice(0, max - 3)}...` : value;
  };

  color(0.97, 0.98, 0.99);
  rect(0, 0, 595, 842);

  color(0.16, 0.45, 0.94);
  rect(0, 742, 595, 100);
  addWhite(APP_NAME, left, 790, 28, 'F2');
  addWhite('Tax Invoice / Order Receipt', left, 768, 13, 'F1');
  addWhite(`Order ID: ${order.id}`, 390, 790, 11, 'F2');
  addWhite(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 390, 772, 10, 'F1');

  color(1, 1, 1);
  rect(left, 610, right - left, 104);
  color(0.88, 0.90, 0.94);
  rect(left, 610, right - left, 104, false);
  add('Sold By', 62, 682, 12, 'F2');
  addMuted('ShopEase Demo Store', 62, 664);
  addMuted('Online shopping marketplace', 62, 648);
  addMuted(`Payment: ${order.paymentMethod}`, 62, 632);

  add('Bill To', 330, 682, 12, 'F2');
  addMuted(order.customer.name, 330, 664);
  addMuted(order.customer.email, 330, 648);
  addMuted(order.customer.phone, 330, 632);
  addMuted(`${order.customer.city} - ${order.customer.pin}`, 330, 616);

  color(0.10, 0.14, 0.22);
  rect(left, 560, right - left, 32);
  addWhite('Product', 62, 572, 10, 'F2');
  addWhite('Qty', 318, 572, 10, 'F2');
  addWhite('Price', 378, 572, 10, 'F2');
  addWhite('Amount', 468, 572, 10, 'F2');

  let y = 532;
  order.items.forEach((item, index) => {
    if (index % 2 === 0) {
      color(1, 1, 1);
    } else {
      color(0.96, 0.97, 0.99);
    }
    rect(left, y - 10, right - left, 34);
    add(truncate(item.name, 38), 62, y, 10, 'F2');
    add(String(item.quantity), 324, y);
    add(pdfMoney(item.price), 378, y);
    add(pdfMoney(item.price * item.quantity), 468, y);
    color(0.88, 0.90, 0.94);
    line(left, y - 14, right, y - 14);
    y -= 34;
  });

  const totalsTop = Math.min(y - 6, 440);
  color(1, 1, 1);
  rect(330, totalsTop - 96, right - 330, 104);
  color(0.88, 0.90, 0.94);
  rect(330, totalsTop - 96, right - 330, 104, false);
  add('Subtotal', 350, totalsTop - 18);
  add(pdfMoney(order.subtotal), 458, totalsTop - 18, 10, 'F2');
  add('Delivery', 350, totalsTop - 40);
  add(order.delivery === 0 ? 'FREE' : pdfMoney(order.delivery), 458, totalsTop - 40, 10, 'F2');
  color(0.88, 0.90, 0.94);
  line(350, totalsTop - 56, 528, totalsTop - 56);
  add('Total Paid', 350, totalsTop - 78, 13, 'F2');
  add(pdfMoney(order.total), 458, totalsTop - 78, 13, 'F2');

  color(1, 1, 1);
  rect(left, 90, right - left, 70);
  color(0.98, 0.39, 0.11);
  rect(left, 90, 4, 70);
  add('Thank you for shopping with ShopEase.', 62, 134, 12, 'F2');
  addMuted('This invoice is generated for your order confirmation email.', 62, 116);
  addMuted('For help, reply to this email with your order ID.', 62, 100);

  const stream = commands.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function buildOrderEmail(order) {
  const itemRows = order.items.map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eef1f4;">
        <strong>${escapeHtml(item.name)}</strong><br>
        <span style="color:#6b7280;font-size:13px;">Qty: ${item.quantity}</span>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eef1f4;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="margin:0;padding:0;background:#f1f3f6;font-family:Arial,Helvetica,sans-serif;color:#172337;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f3f6;padding:24px 0;">
        <tr>
          <td align="center">
            <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="width:620px;max-width:94%;background:#ffffff;border-radius:6px;overflow:hidden;">
              <tr>
                <td style="background:#2874f0;padding:22px 28px;color:#ffffff;">
                  <div style="font-size:26px;font-weight:800;">Shop<span style="color:#ffe500;">Ease</span></div>
                  <div style="font-size:13px;margin-top:4px;">Smart deals. Simple checkout.</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <h1 style="margin:0 0 10px;font-size:22px;color:#172337;">Your order is confirmed</h1>
                  <p style="margin:0 0 18px;line-height:1.5;color:#4b5563;">Hi ${escapeHtml(order.customer.name)}, thanks for shopping with ShopEase. We have received your order and attached your invoice PDF to this email.</p>
                  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;">Order ID</td>
                        <td align="right" style="font-weight:700;">${escapeHtml(order.id)}</td>
                      </tr>
                      <tr>
                        <td style="padding-top:8px;font-size:13px;color:#6b7280;">Payment</td>
                        <td align="right" style="padding-top:8px;">${escapeHtml(order.paymentMethod)}</td>
                      </tr>
                      <tr>
                        <td style="padding-top:8px;font-size:13px;color:#6b7280;">Delivery</td>
                        <td align="right" style="padding-top:8px;">${order.deliverySpeed === 'express' ? 'Express delivery' : 'Standard delivery'}</td>
                      </tr>
                    </table>
                  </div>
                  <h2 style="margin:0 0 8px;font-size:16px;">Order summary</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${itemRows}</table>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
                    <tr><td style="padding:5px 0;color:#6b7280;">Subtotal</td><td align="right">${formatCurrency(order.subtotal)}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">Delivery charges</td><td align="right">${order.delivery === 0 ? 'FREE' : formatCurrency(order.delivery)}</td></tr>
                    <tr><td style="padding:10px 0 0;font-size:17px;font-weight:800;">Total amount</td><td align="right" style="padding:10px 0 0;font-size:17px;font-weight:800;">${formatCurrency(order.total)}</td></tr>
                  </table>
                  <div style="margin-top:22px;padding:14px 16px;background:#fff7ed;border-left:4px solid #fb641b;color:#7c2d12;">
                    Your invoice is attached as a PDF. Keep it for your records.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px;background:#172337;color:#d1d5db;font-size:12px;">
                  This is an automated email from ShopEase. For help, reply with your order ID ${escapeHtml(order.id)}.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    `ShopEase order confirmed: ${order.id}`,
    `Hi ${order.customer.name}, your order has been confirmed.`,
    `Total: ${formatCurrency(order.total)}`,
    `Payment: ${order.paymentMethod}`,
    'Your invoice PDF is attached.'
  ].join('\n');

  return { html, text };
}

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Database setup
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database', err.message);
    process.exit(1);
  }

  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        pin TEXT,
        role TEXT DEFAULT 'customer',
        createdAt TEXT NOT NULL
      )
    `);

    // Products table with inventory
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        rating REAL NOT NULL DEFAULT 0,
        description TEXT NOT NULL,
        image TEXT NOT NULL,
        inventory INTEGER DEFAULT 100,
        createdAt TEXT NOT NULL
      )
    `);

    db.all(`PRAGMA table_info(products)`, (err, columns) => {
      if (err) {
        console.error('Failed to inspect products table', err.message);
        return;
      }

      const hasInventory = columns.some((column) => column.name === 'inventory');
      if (!hasInventory) {
        db.run(`ALTER TABLE products ADD COLUMN inventory INTEGER DEFAULT 100`);
      }
    });

    // Reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        productId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Wishlist table
    db.run(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        productId INTEGER NOT NULL,
        addedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (productId) REFERENCES products(id)
      )
    `);

    // Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        userId TEXT,
        createdAt TEXT NOT NULL,
        customerName TEXT NOT NULL,
        customerEmail TEXT NOT NULL,
        customerPhone TEXT NOT NULL,
        customerCity TEXT NOT NULL,
        customerPin TEXT NOT NULL,
        deliverySpeed TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        paymentId TEXT,
        status TEXT DEFAULT 'pending',
        subtotal INTEGER NOT NULL,
        delivery INTEGER NOT NULL,
        total INTEGER NOT NULL,
        items TEXT NOT NULL
      )
    `);

    db.all(`PRAGMA table_info(orders)`, (err, columns) => {
      if (err) {
        console.error('Failed to inspect orders table', err.message);
        return;
      }

      const columnNames = new Set(columns.map((column) => column.name));
      const addColumn = (name, definition) => {
        if (!columnNames.has(name)) {
          db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
        }
      };

      addColumn('userId', 'TEXT');
      addColumn('paymentId', 'TEXT');
      addColumn('status', "TEXT DEFAULT 'pending'");
    });

    // Seed products if empty
    db.get('SELECT COUNT(*) AS count FROM products', (err, row) => {
      if (err) {
        console.error('Failed to count products', err.message);
        return;
      }

      if (row.count === 0) {
        const seedProducts = [
          {
            name: 'Wireless Headphones',
            category: 'Tech',
            price: 2499,
            rating: 4.7,
            description: 'Noise-isolating audio with 30-hour battery life.',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
            inventory: 50
          },
          {
            name: 'Smart Watch',
            category: 'Tech',
            price: 3999,
            rating: 4.6,
            description: 'Track workouts, calls, steps, and sleep from your wrist.',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
            inventory: 30
          },
          {
            name: 'Desk Lamp',
            category: 'Home',
            price: 1199,
            rating: 4.4,
            description: 'Warm adjustable lighting for study and work desks.',
            image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
            inventory: 75
          },
          {
            name: 'Travel Backpack',
            category: 'Style',
            price: 1799,
            rating: 4.8,
            description: 'Lightweight daypack with laptop sleeve and rain cover.',
            image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
            inventory: 40
          },
          {
            name: 'Coffee Mug Set',
            category: 'Home',
            price: 699,
            rating: 4.5,
            description: 'Ceramic set of four mugs for home or office coffee.',
            image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80',
            inventory: 100
          },
          {
            name: 'Running Shoes',
            category: 'Style',
            price: 2999,
            rating: 4.7,
            description: 'Cushioned shoes built for daily walks and runs.',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
            inventory: 60
          }
        ];

        const insert = db.prepare(`
          INSERT INTO products (name, category, price, rating, description, image, inventory, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        seedProducts.forEach((product) => {
          insert.run(
            product.name,
            product.category,
            product.price,
            product.rating,
            product.description,
            product.image,
            product.inventory,
            new Date().toISOString()
          );
        });

        insert.finalize();
      }
    });
  });
});

// ========== Authentication Endpoints ==========

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      `INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, name, new Date().toISOString()],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Email already exists' });
        }

        const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, userId, email, name });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, userId: user.id, email: user.email, name: user.name });
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });
});

// ========== Product Endpoints ==========

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY id', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    res.json(rows);
  });
});

app.get('/api/products/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  const searchTerm = `%${query}%`;
  db.all(
    `SELECT * FROM products WHERE name LIKE ? OR description LIKE ? OR category LIKE ?`,
    [searchTerm, searchTerm, searchTerm],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Search failed' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/products', authenticateToken, (req, res) => {
  // Only admins can add products
  db.get(`SELECT role FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err || user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add products' });
    }

    const { name, category, price, description, inventory } = req.body;
    const image = req.files ? req.files.image : null;

    let imagePath = 'https://via.placeholder.com/800x600?text=No+Image';
    if (image) {
      imagePath = `/uploads/${uuidv4()}_${image.name}`;
      image.mv(path.join(uploadDir, path.basename(imagePath)));
    }

    db.run(
      `INSERT INTO products (name, category, price, description, image, inventory, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category, price, description, imagePath, inventory, new Date().toISOString()],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to add product' });
        }
        res.json({ id: this.lastID });
      }
    );
  });
});

// ========== Reviews & Ratings Endpoints ==========

app.get('/api/products/:id/reviews', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT r.*, u.name FROM reviews r 
     JOIN users u ON r.userId = u.id 
     WHERE r.productId = ? ORDER BY r.createdAt DESC`,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch reviews' });
      }
      res.json(rows || []);
    }
  );
});

app.post('/api/products/:id/reviews', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const reviewId = uuidv4();
  db.run(
    `INSERT INTO reviews (id, productId, userId, rating, comment, createdAt) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reviewId, id, req.user.userId, rating, comment, new Date().toISOString()],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save review' });
      }

      // Update product average rating
      db.get(
        `SELECT AVG(rating) as avgRating FROM reviews WHERE productId = ?`,
        [id],
        (err, result) => {
          if (!err && result) {
            db.run(`UPDATE products SET rating = ? WHERE id = ?`, [result.avgRating, id]);
          }
        }
      );

      res.json({ id: reviewId });
    }
  );
});

// ========== Wishlist Endpoints ==========

app.get('/api/wishlist', authenticateToken, (req, res) => {
  db.all(
    `SELECT p.* FROM wishlist w 
     JOIN products p ON w.productId = p.id 
     WHERE w.userId = ?`,
    [req.user.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch wishlist' });
      }
      res.json(rows || []);
    }
  );
});

app.post('/api/wishlist/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;
  const wishlistId = uuidv4();

  db.run(
    `INSERT INTO wishlist (id, userId, productId, addedAt) VALUES (?, ?, ?, ?)`,
    [wishlistId, req.user.userId, productId, new Date().toISOString()],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to add to wishlist' });
      }
      res.json({ id: wishlistId });
    }
  );
});

app.delete('/api/wishlist/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  db.run(
    `DELETE FROM wishlist WHERE userId = ? AND productId = ?`,
    [req.user.userId, productId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove from wishlist' });
      }
      res.json({ success: true });
    }
  );
});

// ========== Orders Endpoints ==========

app.get('/api/orders', authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC`,
    [req.user.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      const normalized = rows.map((order) => ({
        ...order,
        items: JSON.parse(order.items)
      }));

      res.json(normalized);
    }
  );
});

app.post('/api/orders', async (req, res) => {
  try {
    const { id, createdAt, customer, items, subtotal, delivery, total, deliverySpeed, paymentMethod, token } = req.body;

    // Process payment with Stripe
    let paymentId = null;
    if (paymentMethod === 'card' && token) {
      try {
        const charge = await stripe.charges.create({
          amount: total * 100,
          currency: 'inr',
          source: token,
          description: `Order ${id}`
        });
        paymentId = charge.id;
      } catch (paymentError) {
        return res.status(400).json({ error: 'Payment failed', details: paymentError.message });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO orders (
        id, userId, createdAt, customerName, customerEmail, customerPhone,
        customerCity, customerPin, deliverySpeed, paymentMethod, paymentId, status, subtotal, delivery, total, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      customer.userId || null,
      createdAt,
      customer.name,
      customer.email,
      customer.phone,
      customer.city,
      customer.pin,
      deliverySpeed,
      paymentMethod,
      paymentId,
      'confirmed',
      subtotal,
      delivery,
      total,
      JSON.stringify(items),
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save order' });
        }

        // Update inventory
        items.forEach(item => {
          db.run(
            `UPDATE products SET inventory = inventory - ? WHERE id = ?`,
            [item.quantity, item.id]
          );
        });

        const orderForEmail = {
          id,
          createdAt,
          customer,
          items,
          subtotal,
          delivery,
          total,
          deliverySpeed,
          paymentMethod
        };

        let emailSent = false;
        let emailError = null;

        // Send confirmation email only when real mail credentials are configured.
        if (customer.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          const email = buildOrderEmail(orderForEmail);
          const invoicePdf = buildInvoicePdf(orderForEmail);

          try {
            await emailTransporter.sendMail({
              from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
              to: customer.email,
              subject: `${APP_NAME} order confirmed - ${id}`,
              text: email.text,
              html: email.html,
              attachments: [
                {
                  filename: `${APP_NAME}-Invoice-${id}.pdf`,
                  content: invoicePdf,
                  contentType: 'application/pdf'
                }
              ]
            });
            emailSent = true;
            console.log(`Order confirmation email sent to ${customer.email}`);
          } catch (err) {
            emailError = err.message;
            console.log('Email send failed:', err);
          }
        }

        res.status(201).json({ success: true, id, paymentId, emailSent, emailError });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// ========== Admin Dashboard Endpoints ==========

app.get('/api/admin/stats', authenticateToken, (req, res) => {
  db.get(`SELECT role FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err || user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access stats' });
    }

    db.serialize(() => {
      db.get(`SELECT COUNT(*) as totalOrders, SUM(total) as totalRevenue FROM orders`, (err, orderStats) => {
        db.get(`SELECT COUNT(*) as totalUsers FROM users`, (err, userStats) => {
          db.get(`SELECT COUNT(*) as lowInventory FROM products WHERE inventory < 10`, (err, invStats) => {
            res.json({
              orders: orderStats,
              users: userStats,
              inventory: invStats
            });
          });
        });
      });
    });
  });
});

app.get('/api/admin/orders', authenticateToken, (req, res) => {
  db.get(`SELECT role FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.all(`SELECT * FROM orders ORDER BY createdAt DESC`, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      const normalized = rows.map((order) => ({
        ...order,
        items: JSON.parse(order.items)
      }));

      res.json(normalized);
    });
  });
});

app.patch('/api/admin/orders/:id/status', authenticateToken, (req, res) => {
  db.get(`SELECT role FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { status } = req.body;
    db.run(
      `UPDATE orders SET status = ? WHERE id = ?`,
      [status, req.params.id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update status' });
        }
        res.json({ success: true });
      }
    );
  });
});

// ========== Static Routes ==========

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Shop backend running on http://localhost:${port}`);
  });
}

module.exports = app;
