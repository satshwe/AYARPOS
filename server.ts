import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("retail.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    category TEXT,
    description TEXT,
    image_url TEXT,
    low_stock_threshold INTEGER DEFAULT 10,
    unit TEXT DEFAULT 'pc'
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    customer_name TEXT,
    customer_id INTEGER,
    status TEXT DEFAULT 'completed',
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid',
    sale_type TEXT DEFAULT 'store',
    cashier_name TEXT,
    slip_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, ordered, received, cancelled
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_at DATETIME,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    cost_price REAL NOT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS sale_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    total_refund REAL NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales (id)
  );

  CREATE TABLE IF NOT EXISTS sale_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    FOREIGN KEY (sale_return_id) REFERENCES sale_returns (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS store_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT 'My Store',
    website TEXT,
    phone TEXT,
    address TEXT,
    currency TEXT NOT NULL DEFAULT 'MMK',
    currency_symbol TEXT NOT NULL DEFAULT 'MMK',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE store_profile ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';");
} catch (e) {}

try {
  db.exec("ALTER TABLE store_profile ADD COLUMN logo_url TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE store_profile ADD COLUMN tagline TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE store_profile ADD COLUMN tax_id TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE store_profile ADD COLUMN receipt_footer TEXT;");
} catch (e) {}

db.exec(`
  INSERT OR IGNORE INTO store_profile (id, name, currency, currency_symbol, timezone) VALUES (1, 'My Store', 'MMK', 'MMK', 'UTC');
`);

try {
  db.prepare(`
    UPDATE store_profile 
    SET tagline = COALESCE(tagline, 'အဆင့်မြင့် ကုန်စုံနှင့် ဆေးဝါးရောင်းဝယ်ရေး'),
        phone = COALESCE(phone, '09-250123456, 09-420987654'),
        address = COALESCE(address, 'အမှတ် (၁၂)၊ အောက်လမ်းမကြီး၊ မော်လမြိုင်မြို့'),
        tax_id = COALESCE(tax_id, 'TIN-98472015'),
        receipt_footer = COALESCE(receipt_footer, 'ဝယ်ယူအားပေးမှုအတွက် အထူးကျေးဇူးတင်ပါသည်\nဝယ်ပြီးပစ္စည်း ၃ ရက်အတွင်း ဘောင်ချာဖြင့် လဲလှယ်နိုင်ပါသည်')
    WHERE id = 1
  `).run();
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN cashier_name TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN slip_number TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN offline_id TEXT;");
} catch (e) {}

// Seed some initial data if empty
try {
  db.exec("ALTER TABLE sales ADD COLUMN customer_name TEXT;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id);");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed';");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash';");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT 'paid';");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN discount_amount REAL DEFAULT 0;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE sales ADD COLUMN sale_type TEXT DEFAULT 'store';");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN description TEXT;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN image_url TEXT;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'pc';");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN expiration_date TEXT;");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE products ADD COLUMN barcode TEXT;");
} catch (e) {
  // Column might already exist
}

// Populate default realistic barcodes for products if empty
try {
  const defaultBarcodes: Record<number, string> = {
    1: "880123456001",
    2: "880123456002",
    3: "880123456003",
    4: "880123456004",
    5: "880123456005",
    6: "880123456006",
    7: "885012300007",
    8: "885012300008",
    9: "885012300009",
    10: "885012300010",
    11: "885012300011",
    12: "885012300012",
    13: "885012300013",
    14: "885012300014",
    15: "885012300015",
    16: "885012300016",
    17: "885012300017",
    18: "885012300018",
  };

  const updateBarcodeStmt = db.prepare("UPDATE products SET barcode = ? WHERE id = ? AND (barcode IS NULL OR barcode = '')");
  for (const [id, code] of Object.entries(defaultBarcodes)) {
    updateBarcodeStmt.run(code, id);
  }

  // Any other products get a fallback barcode
  db.prepare("UPDATE products SET barcode = '885' || substr('000000000' || id, -9) WHERE barcode IS NULL OR barcode = ''").run();
} catch (e) {
  console.error("Barcode migration/seeding notice:", e);
}

try {
  db.exec("ALTER TABLE sale_items ADD COLUMN cost_price REAL DEFAULT 0;");
} catch (e) {
  // Column might already exist
}

// Additional tables for Ayar POS / A_Yaung Dashboard features
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    description TEXT,
    branch TEXT DEFAULT 'ရတနာ (မော်လမြိုင်)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customer_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    sale_id INTEGER,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );
`);

try {
  db.exec("ALTER TABLE sales ADD COLUMN branch TEXT DEFAULT 'ရတနာ (မော်လမြိုင်)';");
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN due_date TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN delivery_status TEXT DEFAULT 'completed';");
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN delivery_address TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE sales ADD COLUMN delivery_phone TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE purchase_orders ADD COLUMN due_date TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT DEFAULT 'pending';");
} catch (e) {}

try {
  db.exec("ALTER TABLE cash_movements ADD COLUMN category TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE cash_movements ADD COLUMN branch TEXT DEFAULT 'ရတနာ (မော်လမြိုင်)';");
} catch (e) {}

// Update store name to match Ayar / Yadanar context if needed
try {
  db.exec("UPDATE store_profile SET name = 'ရတနာ (မော်လမြိုင်)', currency = 'MMK', currency_symbol = 'Ks' WHERE id = 1;");
} catch (e) {}

const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
  insertUser.run("admin", "admin", "admin");
  insertUser.run("manager", "manager", "manager");
  insertUser.run("cashier", "cashier", "cashier");
}

// Seed rich store data if products or sales count is low
const productCountRow = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCountRow.count <= 6) {
  const insertProduct = db.prepare("INSERT INTO products (name, price, stock, category, unit, cost_price, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertProduct.run("Biogesic 500mg (Paracetamol)", 1500, 8, "ဆေးဝါးများ", "ဗူး", 1100, 20);
  insertProduct.run("Cetirizine 10mg (10's)", 2500, 5, "ဆေးဝါးများ", "ကတ်", 1800, 15);
  insertProduct.run("Enervon-C Tablets (30's)", 8500, 45, "အားဆေးများ", "ပုလင်း", 6800, 10);
  insertProduct.run("Decolgen Forte (10's)", 2200, 6, "ဆေးဝါးများ", "ကတ်", 1600, 20);
  insertProduct.run("Betadine Antiseptic 30ml", 4500, 3, "ဆေးဝါးများ", "ပုလင်း", 3200, 10);
  insertProduct.run("Royal D Electrolyte Powder", 800, 150, "အားဆေးများ", "ထုပ်", 550, 30);
  insertProduct.run("Sunsilk Shampoo 320ml", 6500, 4, "လူသုံးကုန်", "ပုလင်း", 4900, 10);
  insertProduct.run("Nescafé 3-in-1 Coffee (30 Sticks)", 12500, 60, "စားသောက်ကုန်", "ထုပ်", 9800, 15);
  insertProduct.run("Premier Milk Powder 400g", 14500, 22, "စားသောက်ကုန်", "ဗူး", 11500, 10);
  insertProduct.run("Kao Biore Face Wash 100g", 7800, 7, "အလှကုန်", "ဗူး", 5600, 15);
  insertProduct.run("Sensodyne Toothpaste 100g", 5200, 28, "လူသုံးကုန်", "ဗူး", 3900, 10);
  insertProduct.run("Dettol Antiseptic Soap 100g", 2100, 9, "လူသုံးကုန်", "တုံး", 1500, 20);
}

const custCountRow = db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number };
if (custCountRow.count === 0) {
  const insertCustomer = db.prepare("INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)");
  insertCustomer.run("ဒေါ်အေးအေး", "ayeaye@gmail.com", "09-250123456", "မော်လမြိုင်မြို့၊ အောက်လမ်းမကြီး");
  insertCustomer.run("ဦးကျော်မင်း", "kyawmin@gmail.com", "09-420987654", "မော်လမြိုင်မြို့၊ စျေးကြိုရပ်");
  insertCustomer.run("မသန္တာ", "thandar@gmail.com", "09-790112233", "မုဒုံမြို့၊ ဗိုလ်ချုပ်လမ်း");
  insertCustomer.run("ကိုအောင်မျိုး", "aungmyo@gmail.com", "09-975544332", "ချောင်းဆုံမြို့");
  insertCustomer.run("ဒေါ်ခင်ဝင်း", "khinwin@gmail.com", "09-450011223", "မော်လမြိုင်မြို့၊ ဒိုင်းဝန်းကွင်း");
  insertCustomer.run("ဦးသန်းထွဋ်", "thanhtut@gmail.com", "09-770889900", "ရေးမြို့");
  insertCustomer.run("ကိုဇော်လင်း", "zawlin@gmail.com", "09-400123999", "သထုံမြို့");
  insertCustomer.run("မဝင်းမာ", "winmar@gmail.com", "09-255887766", "မော်လမြိုင်မြို့၊ မောင်ငံရပ်");
}

const suppCountRow = db.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number };
if (suppCountRow.count === 0) {
  const insertSupp = db.prepare("INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)");
  insertSupp.run("Mega Lifesciences Myanmar", "U Soe Win", "megamm@example.com", "09-5012345", "Yangon Industrial Zone");
  insertSupp.run("DKSH Distribution Myanmar", "Daw Nilar", "dksh@example.com", "09-5123456", "Thilawa SEZ");
  insertSupp.run("AA Medical Products Ltd", "Ko Myo", "aamedical@example.com", "09-5234567", "Yangon Head Office");
  insertSupp.run("City Mart Wholesale", "Daw Hnin", "cmw@example.com", "09-5345678", "Mawlamyine Branch");
}

// Seed initial expenses if empty
const expenseCountRow = db.prepare("SELECT COUNT(*) as count FROM expenses").get() as { count: number };
if (expenseCountRow.count === 0) {
  const insertExp = db.prepare("INSERT INTO expenses (category, amount, payment_method, description, branch) VALUES (?, ?, ?, ?, ?)");
  insertExp.run("ဆိုင်ခန်းခ", 850000, "bank_transfer", "ဆိုင်ခန်း လစဉ် ငှားရမ်းခ", "ရတနာ (မော်လမြိုင်)");
  insertExp.run("ဝန်ထမ်းလစာ", 420000, "cash", "အရောင်းဝန်ထမ်း လစာပေးချေခြင်း", "ရတနာ (မော်လမြိုင်)");
  insertExp.run("မီးဖိုး / ရေဖိုး", 185000, "kpay", "လျှပ်စစ်မီတာခ နှင့် ရေဖိုး", "ရတနာ (မော်လမြိုင်)");
  insertExp.run("စက်သုံးဆီ / ပို့ဆောင်စရိတ်", 95000, "cash", "ပစ္စည်းပို့ ကားစက်သုံးဆီ", "ရတနာ (မော်လမြိုင်)");
  insertExp.run("ထုပ်ပိုးပစ္စည်း", 69420, "cash", "ပလတ်စတစ်အိတ် နှင့် ထုပ်ပိုးကြိုးများ", "ရတနာ (မော်လမြိုင်)");
}

// Seed initial realistic sales if sales count is small
const salesCountRow = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
if (salesCountRow.count < 5) {
  const insertSale = db.prepare(`
    INSERT INTO sales (total_amount, discount_amount, tax_amount, customer_name, customer_id, status, payment_method, payment_status, sale_type, cashier_name, slip_number, branch, due_date, delivery_status, delivery_address, delivery_phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Completed sales
  insertSale.run(155000000, 0, 0, "ဒေါ်အေးအေး", 1, "completed", "cash", "paid", "store", "Yadanar", "SLP-000101", "ရတနာ (မော်လမြိုင်)", null, "delivered", null, null, "2026-10-15 10:30:00");
  insertSale.run(70500000, 0, 0, "ဦးကျော်မင်း", 2, "completed", "kpay", "paid", "store", "Yadanar", "SLP-000102", "ရတနာ (မော်လမြိုင်)", null, "delivered", null, null, "2026-10-18 14:15:00");
  
  // Credit sales (Customer Receivables = 85,207,000)
  insertSale.run(45207000, 0, 0, "မသန္တာ", 3, "completed", "credit", "credit", "store", "Yadanar", "SLP-000103", "ရတနာ (မော်လမြိုင်)", "2026-10-10", "delivered", null, null, "2026-10-02 11:00:00");
  insertSale.run(40000000, 0, 0, "ကိုအောင်မျိုး", 4, "completed", "credit", "credit", "store", "Yadanar", "SLP-000104", "ရတနာ (မော်လမြိုင်)", "2026-10-12", "delivered", null, null, "2026-10-05 16:45:00");
  
  // Pending deliveries
  insertSale.run(187500, 0, 0, "ဒေါ်ခင်ဝင်း", 5, "completed", "cash", "paid", "delivery", "Yadanar", "SLP-000105", "ရတနာ (မော်လမြိုင်)", null, "pending", "မော်လမြိုင်မြို့၊ ဒိုင်းဝန်းကွင်း ရပ်ကွက် (အိမ်အမှတ် ၂၄)", "09-450011223", "2026-10-23 09:20:00");
  insertSale.run(320000, 0, 0, "ဦးသန်းထွဋ်", 6, "completed", "kpay", "paid", "delivery", "Yadanar", "SLP-000106", "ရတနာ (မော်လမြိုင်)", null, "pending", "ရေးမြို့ အောင်မင်္ဂလာရပ်", "09-770889900", "2026-10-23 10:05:00");
}

// Ensure past 7 days have transactions for daily revenue visualization
const recentDaysSales = db.prepare("SELECT COUNT(*) as count FROM sales WHERE date(created_at) >= date('now', '-7 days')").get() as { count: number };
if (recentDaysSales.count < 5) {
  const insertPastSale = db.prepare(`
    INSERT INTO sales (total_amount, status, payment_method, payment_status, sale_type, cashier_name, slip_number, branch, created_at)
    VALUES (?, 'completed', ?, 'paid', 'store', 'Yadanar', ?, 'ရတနာ (မော်လမြိုင်)', datetime('now', ?))
  `);
  insertPastSale.run(3450000, 'cash', 'SLP-000107', '-6 days');
  insertPastSale.run(4820000, 'kpay', 'SLP-000108', '-5 days');
  insertPastSale.run(4150000, 'cash', 'SLP-000109', '-4 days');
  insertPastSale.run(5600000, 'kpay', 'SLP-000110', '-3 days');
  insertPastSale.run(4950000, 'wave', 'SLP-000111', '-2 days');
  insertPastSale.run(6200000, 'cash', 'SLP-000112', '-1 day');
  insertPastSale.run(7450000, 'kpay', 'SLP-000113', '0 days');
}

// Seed purchase orders for supplier payables
const poCountRow = db.prepare("SELECT COUNT(*) as count FROM purchase_orders").get() as { count: number };
if (poCountRow.count === 0) {
  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (supplier_id, total_amount, status, payment_status, due_date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertPO.run(1, 14500000, "ordered", "pending", "2026-10-14", "ဆေးဝါးအသုတ်သစ် မှာယူခြင်း", "2026-10-01 10:00:00");
  insertPO.run(2, 28000000, "ordered", "pending", "2026-10-12", "DKSH လစဉ်ပစ္စည်းတင်သွင်းမှု", "2026-10-03 14:00:00");
  insertPO.run(3, 9800000, "ordered", "pending", "2026-10-16", "AA Medical ဗီတာမင်ဆေးဝါးများ", "2026-10-08 11:30:00");
}

// Seed initial stock adjustments for inventory activity tracking if low
const adjCountRow = db.prepare("SELECT COUNT(*) as count FROM stock_adjustments").get() as { count: number };
if (adjCountRow.count < 4) {
  const insertAdj = db.prepare(`
    INSERT INTO stock_adjustments (product_id, quantity_change, reason, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);
  insertAdj.run(1, 50, "Supplier အသစ်ထံမှ ပစ္စည်းဖြည့်သွင်းခြင်း (Restock from Mega Lifesciences)", "-2 hours");
  insertAdj.run(3, 20, "Purchase Order #1 လက်ခံရရှိမှု (PO Received)", "-6 hours");
  insertAdj.run(4, -2, "ပစ္စည်းပျက်စီးမှု ဖျက်သိမ်းခြင်း (Damaged stock write-off)", "-1 day");
  insertAdj.run(8, 30, "ဂိုဒေါင်မှ ဆိုင်ရှေ့သို့ လွှဲပြောင်းဖြည့်သွင်းခြင်း (Warehouse Transfer)", "-2 days");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Get all products
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products ORDER BY name").all();
    res.json(products);
  });

  // Get product by barcode (or ID)
  app.get("/api/products/barcode/:barcode", (req, res) => {
    const { barcode } = req.params;
    const cleanBarcode = barcode.trim();
    const product = db.prepare("SELECT * FROM products WHERE barcode = ? OR id = ? OR LOWER(name) = LOWER(?) LIMIT 1")
      .get(cleanBarcode, isNaN(Number(cleanBarcode)) ? -1 : Number(cleanBarcode), cleanBarcode);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: "Product not found for barcode" });
    }
  });

  // Add a new product
  app.post("/api/products", (req, res) => {
    const { name, price, stock, category, description, image_url, low_stock_threshold, unit, cost_price, expiration_date, barcode } = req.body;
    if (!name || price == null || stock == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const stmt = db.prepare("INSERT INTO products (name, price, stock, category, description, image_url, low_stock_threshold, unit, cost_price, expiration_date, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(name, price, stock, category || "Uncategorized", description || null, image_url || null, low_stock_threshold ?? 10, unit || 'pc', cost_price || 0, expiration_date || null, barcode || null);
    res.json({ id: info.lastInsertRowid, name, price, stock, category, description, image_url, low_stock_threshold: low_stock_threshold ?? 10, unit: unit || 'pc', cost_price: cost_price || 0, expiration_date: expiration_date || null, barcode: barcode || null });
  });

  // Update product
  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, price, stock, category, description, image_url, low_stock_threshold, unit, cost_price, expiration_date, barcode } = req.body;
    if (!name || price == null || stock == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const stmt = db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, category = ?, description = ?, image_url = ?, low_stock_threshold = ?, unit = ?, cost_price = ?, expiration_date = ?, barcode = ? WHERE id = ?");
    stmt.run(name, price, stock, category || "Uncategorized", description || null, image_url || null, low_stock_threshold ?? 10, unit || 'pc', cost_price || 0, expiration_date || null, barcode || null, id);
    res.json({ success: true });
  });

  // Delete product
  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  });

  // Bulk import products
  app.post("/api/products/bulk", (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Products must be an array" });
    }

    try {
      const transaction = db.transaction((prods: any[]) => {
        const insertStmt = db.prepare("INSERT INTO products (name, price, stock, category, description, image_url, low_stock_threshold, unit, cost_price, expiration_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const updateStmt = db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, category = ?, description = ?, image_url = ?, low_stock_threshold = ?, unit = ?, cost_price = ?, expiration_date = ? WHERE id = ?");
        
        for (const p of prods) {
          if (p.id) {
            updateStmt.run(p.name, p.price, p.stock, p.category || "Uncategorized", p.description || null, p.image_url || null, p.low_stock_threshold ?? 10, p.unit || 'pc', p.cost_price || 0, p.expiration_date || null, p.id);
          } else {
            insertStmt.run(p.name, p.price, p.stock, p.category || "Uncategorized", p.description || null, p.image_url || null, p.low_stock_threshold ?? 10, p.unit || 'pc', p.cost_price || 0, p.expiration_date || null);
          }
        }
      });

      transaction(products);
      res.json({ success: true });
    } catch (error) {
      console.error("Bulk import failed:", error);
      res.status(500).json({ error: "Bulk import failed" });
    }
  });

  // Update product stock
  app.put("/api/products/:id/stock", (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    if (stock == null) {
      return res.status(400).json({ error: "Missing stock value" });
    }
    const stmt = db.prepare("UPDATE products SET stock = ? WHERE id = ?");
    stmt.run(stock, id);
    res.json({ success: true });
  });

  // Bulk update product stock
  app.post("/api/products/bulk-stock", (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Updates must be an array" });
    }

    try {
      const transaction = db.transaction((stockUpdates: any[]) => {
        const updateStmt = db.prepare("UPDATE products SET stock = ? WHERE id = ?");
        for (const u of stockUpdates) {
          if (u.id != null && u.stock != null) {
            updateStmt.run(u.stock, u.id);
          }
        }
      });

      transaction(updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Bulk stock update failed:", error);
      res.status(500).json({ error: "Bulk stock update failed" });
    }
  });

  // Create a sale
  app.post("/api/sales", (req, res) => {
    const { items, total_amount, discount_amount, tax_amount, customer_name, customer_id, status, payment_method, payment_status, sale_type, cashier_name, slip_number } = req.body;
    if (!items || !items.length || total_amount == null) {
      return res.status(400).json({ error: "Invalid sale data" });
    }

    const transaction = db.transaction((saleItems: any[], total: number, discount: number, tax: number, customerName: string | null, customerId: number | null, stat: string, payMethod: string, payStat: string, sType: string, cashierName: string | null, slipNum: string | null) => {
      const insertSale = db.prepare("INSERT INTO sales (total_amount, discount_amount, tax_amount, customer_name, customer_id, status, payment_method, payment_status, sale_type, cashier_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const saleInfo = insertSale.run(total, discount || 0, tax || 0, customerName || null, customerId || null, stat || 'completed', payMethod || 'cash', payStat || 'paid', sType || 'store', cashierName || null);
      const saleId = saleInfo.lastInsertRowid;
      
      const finalSlipNumber = slipNum || `SLP-${saleId.toString().padStart(6, '0')}`;
      db.prepare("UPDATE sales SET slip_number = ? WHERE id = ?").run(finalSlipNumber, saleId);

      const insertSaleItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price, cost_price) VALUES (?, ?, ?, ?, ?)");

      for (const item of saleItems) {
        insertSaleItem.run(saleId, item.product_id, item.quantity, item.price, item.cost_price || 0);
      }

      return { saleId, slipNumber: finalSlipNumber };
    });

    try {
      const result = transaction(items, total_amount, discount_amount, tax_amount, customer_name, customer_id, status, payment_method, payment_status, sale_type, cashier_name, slip_number || null);
      res.json({ success: true, saleId: result.saleId, slipNumber: result.slipNumber });
    } catch (error) {
      console.error("Transaction failed:", error);
      res.status(500).json({ error: "Transaction failed" });
    }
  });

  // Batch sync offline sales transactions
  app.post("/api/sales/sync-offline", (req, res) => {
    const { sales } = req.body;
    if (!Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ error: "No sales provided to sync" });
    }

    try {
      const syncTransaction = db.transaction((offlineSales: any[]) => {
        const results: any[] = [];

        const checkExistingStmt = db.prepare("SELECT id, slip_number FROM sales WHERE offline_id = ? OR slip_number = ? LIMIT 1");
        const insertSaleStmt = db.prepare(`
          INSERT INTO sales (
            total_amount, discount_amount, tax_amount, customer_name, customer_id, 
            status, payment_method, payment_status, sale_type, cashier_name, slip_number, offline_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        const insertItemStmt = db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity, price, cost_price) 
          VALUES (?, ?, ?, ?, ?)
        `);
        const updateStockStmt = db.prepare(`
          UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
        `);
        const recordAdjustmentStmt = db.prepare(`
          INSERT INTO stock_adjustments (product_id, quantity_change, reason, created_at)
          VALUES (?, ?, ?, COALESCE(?, datetime('now')))
        `);

        for (const sale of offlineSales) {
          const offlineId = sale.offline_id || sale.id;
          const slipNum = sale.slip_number || sale.offlineSlipNumber;

          // Check if this sale was already recorded
          if (offlineId || slipNum) {
            const existing = checkExistingStmt.get(offlineId || '', slipNum || '') as any;
            if (existing) {
              results.push({
                offlineId,
                serverSaleId: existing.id,
                slipNumber: existing.slip_number,
                alreadySynced: true
              });
              continue;
            }
          }

          const saleInfo = insertSaleStmt.run(
            sale.total_amount ?? sale.totalAmount ?? 0,
            sale.discount_amount ?? sale.discountAmount ?? 0,
            sale.tax_amount ?? sale.taxAmount ?? 0,
            sale.customer_name ?? sale.customerName ?? null,
            sale.customer_id ?? sale.customerId ?? null,
            sale.status || 'completed',
            sale.payment_method ?? sale.paymentMethod ?? 'cash',
            sale.payment_status ?? sale.paymentStatus ?? 'paid',
            sale.sale_type ?? sale.saleType ?? 'store',
            sale.cashier_name ?? sale.cashierName ?? 'Cashier',
            slipNum || null,
            offlineId || null,
            sale.created_at ?? sale.createdAt ?? null
          );

          const saleId = saleInfo.lastInsertRowid;
          const finalSlipNumber = slipNum || `SLP-${saleId.toString().padStart(6, '0')}`;
          db.prepare("UPDATE sales SET slip_number = ? WHERE id = ?").run(finalSlipNumber, saleId);

          const items = sale.items || [];
          for (const item of items) {
            const prodId = item.product_id || item.productId;
            const qty = item.quantity || 1;
            const price = item.price || 0;
            const costPrice = item.cost_price || item.costPrice || 0;

            if (prodId) {
              insertItemStmt.run(saleId, prodId, qty, price, costPrice);
              // Deduct stock for offline-completed sale
              updateStockStmt.run(qty, prodId);
              recordAdjustmentStmt.run(
                prodId, 
                -qty, 
                `Offline POS Sale (Synced) - Slip #${finalSlipNumber}`,
                sale.created_at ?? sale.createdAt ?? null
              );
            }
          }

          results.push({
            offlineId,
            serverSaleId: saleId,
            slipNumber: finalSlipNumber,
            syncedAt: new Date().toISOString()
          });
        }

        return results;
      });

      const results = syncTransaction(sales);
      res.json({ success: true, synced: results, count: results.length });
    } catch (err: any) {
      console.error("Offline sync error:", err);
      res.status(500).json({ error: "Failed to sync offline sales", details: err.message });
    }
  });

  // Get next slip number
  app.get("/api/sales/next-slip", (req, res) => {
    try {
      const row = db.prepare("SELECT MAX(id) as maxId FROM sales").get() as { maxId: number | null };
      const nextId = (row.maxId || 0) + 1;
      const nextSlip = `SLP-${nextId.toString().padStart(6, '0')}`;
      res.json({ nextSlip });
    } catch (error) {
      console.error("Failed to get next slip number:", error);
      res.status(500).json({ error: "Failed to get next slip number" });
    }
  });

  // Get all orders (sales transactions)
  app.get("/api/orders", (req, res) => {
    try {
      const orders = db.prepare(`
        SELECT s.*, 
               c.name as customer_profile_name,
               COALESCE(
                 (SELECT json_group_array(json_object('product_name', p.name, 'quantity', si.quantity, 'price', si.price, 'unit', p.unit))
                  FROM sale_items si 
                  JOIN products p ON si.product_id = p.id 
                  WHERE si.sale_id = s.id),
                 '[]'
               ) as items
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
      `).all();
      
      const formattedOrders = orders.map((o: any) => ({
        ...o,
        items: o.items ? JSON.parse(o.items) : []
      }));
      
      res.json(formattedOrders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get transactions API endpoint (for transactions table & daily sales chart)
  app.get("/api/transactions", (req, res) => {
    try {
      const transactions = db.prepare(`
        SELECT s.*, 
               c.name as customer_profile_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
      `).all();
      res.json(transactions);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Refund an order
  app.post("/api/orders/:id/refund", (req, res) => {
    const { id } = req.params;
    const { reason, resalable } = req.body;

    const transaction = db.transaction(() => {
      const order = db.prepare("SELECT * FROM sales WHERE id = ?").get(id) as any;
      if (!order) throw new Error("Order not found");
      if (order.payment_status === 'refunded') throw new Error("Order already refunded");

      // Update order status
      db.prepare("UPDATE sales SET status = 'cancelled', payment_status = 'refunded' WHERE id = ?").run(id);

      // Update stock if resalable
      if (resalable) {
        const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(id) as any[];
        const updateStockStmt = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
        const recordAdjustmentStmt = db.prepare("INSERT INTO stock_adjustments (product_id, quantity_change, reason) VALUES (?, ?, ?)");
        for (const item of items) {
          updateStockStmt.run(item.quantity, item.product_id);
          recordAdjustmentStmt.run(item.product_id, item.quantity, `Refund for Order #${order.id}${reason ? ': ' + reason : ''}`);
        }
      }

      // Add cash movement if it was a cash sale
      if (order.payment_method === 'cash') {
        db.prepare("INSERT INTO cash_movements (type, amount, description) VALUES (?, ?, ?)")
          .run('pay_out', order.total_amount, `Refund for Order #${order.id}${reason ? ': ' + reason : ''}`);
      }

      return order;
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Refund failed:", error);
      res.status(400).json({ error: error.message || "Refund failed" });
    }
  });

  // Get all sale returns
  app.get("/api/returns", (req, res) => {
    try {
      const returns = db.prepare(`
        SELECT r.*, s.slip_number, s.customer_name,
               json_group_array(json_object('product_name', p.name, 'quantity', ri.quantity, 'refund_amount', ri.refund_amount)) as items
        FROM sale_returns r
        JOIN sales s ON r.sale_id = s.id
        JOIN sale_return_items ri ON r.id = ri.sale_return_id
        JOIN products p ON ri.product_id = p.id
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `).all();
      
      const formattedReturns = returns.map((r: any) => ({
        ...r,
        items: JSON.parse(r.items)
      }));
      
      res.json(formattedReturns);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
      res.status(500).json({ error: "Failed to fetch returns" });
    }
  });

  // Create a sale return
  app.post("/api/returns", (req, res) => {
    const { sale_id, items, reason, resalable } = req.body;
    
    if (!sale_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid return data" });
    }

    const transaction = db.transaction(() => {
      const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(sale_id) as any;
      if (!sale) throw new Error("Sale not found");

      const totalRefund = items.reduce((sum, item) => sum + (item.refund_amount * item.quantity), 0);
      
      const returnStmt = db.prepare("INSERT INTO sale_returns (sale_id, total_refund, reason) VALUES (?, ?, ?)");
      const returnInfo = returnStmt.run(sale_id, totalRefund, reason || null);
      const returnId = returnInfo.lastInsertRowid;

      const returnItemStmt = db.prepare("INSERT INTO sale_return_items (sale_return_id, product_id, quantity, refund_amount) VALUES (?, ?, ?, ?)");
      const updateStockStmt = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
      const recordAdjustmentStmt = db.prepare("INSERT INTO stock_adjustments (product_id, quantity_change, reason) VALUES (?, ?, ?)");

      for (const item of items) {
        returnItemStmt.run(returnId, item.product_id, item.quantity, item.refund_amount);
        
        if (resalable) {
          updateStockStmt.run(item.quantity, item.product_id);
          recordAdjustmentStmt.run(item.product_id, item.quantity, `Return for Sale #${sale.id}${reason ? ': ' + reason : ''}`);
        }
      }

      // Record cash movement if sale was cash
      if (sale.payment_method === 'cash') {
        db.prepare("INSERT INTO cash_movements (type, amount, description) VALUES (?, ?, ?)")
          .run('pay_out', totalRefund, `Refund for Return #${returnId} (Sale #${sale.id})`);
      }

      return returnId;
    });

    try {
      const returnId = transaction();
      res.json({ success: true, returnId });
    } catch (error: any) {
      console.error("Return failed:", error);
      res.status(400).json({ error: error.message || "Return failed" });
    }
  });

  // Update order status
  app.put("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    
    const updates = [];
    const params = [];
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (payment_status) {
      updates.push("payment_status = ?");
      params.push(payment_status);
    }
    
    if (updates.length === 0) return res.json({ success: true });
    
    params.push(id);
    const stmt = db.prepare(`UPDATE sales SET ${updates.join(", ")} WHERE id = ?`);
    stmt.run(...params);
    res.json({ success: true });
  });

  // Get all customers
  app.get("/api/customers", (req, res) => {
    const customers = db.prepare("SELECT * FROM customers ORDER BY name").all();
    res.json(customers);
  });

  // Add a new customer
  app.post("/api/customers", (req, res) => {
    const { name, email, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const stmt = db.prepare("INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)");
    const info = stmt.run(name, email || null, phone || null, address || null);
    res.json({ id: info.lastInsertRowid, name, email, phone, address });
  });

  // Update customer
  app.put("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const stmt = db.prepare("UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?");
    stmt.run(name, email || null, phone || null, address || null, id);
    res.json({ success: true });
  });

  // Delete customer
  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM customers WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  });

  // Bulk import customers
  app.post("/api/customers/bulk", (req, res) => {
    const { customers } = req.body;
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: "Customers must be an array" });
    }

    try {
      const transaction = db.transaction((custs: any[]) => {
        const insertStmt = db.prepare("INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)");
        const updateStmt = db.prepare("UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?");
        
        for (const c of custs) {
          if (c.id) {
            updateStmt.run(c.name, c.email || null, c.phone || null, c.address || null, c.id);
          } else {
            insertStmt.run(c.name, c.email || null, c.phone || null, c.address || null);
          }
        }
      });

      transaction(customers);
      res.json({ success: true });
    } catch (error) {
      console.error("Bulk import failed:", error);
      res.status(500).json({ error: "Bulk import failed" });
    }
  });

  // Get customer purchase history
  app.get("/api/customers/:id/history", (req, res) => {
    const { id } = req.params;
    const history = db.prepare(`
      SELECT s.id as sale_id, s.total_amount, s.created_at, 
             json_group_array(json_object('product_name', p.name, 'quantity', si.quantity, 'price', si.price, 'unit', p.unit, 'category', p.category)) as items
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.customer_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all(id);
    
    // Parse the JSON string back to an array for the response
    const formattedHistory = history.map((h: any) => ({
      ...h,
      items: JSON.parse(h.items)
    }));
    
    res.json(formattedHistory);
  });

  // Get dashboard stats
  app.get("/api/dashboard/stats", (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(total_amount) as total FROM sales").get() as { total: number };
    const totalSales = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
    const lowStockCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock <= COALESCE(low_stock_threshold, 10)").get() as { count: number };
    const lowStockProducts = db.prepare("SELECT * FROM products WHERE stock <= COALESCE(low_stock_threshold, 10) ORDER BY stock ASC LIMIT 10").all();
    const expiringCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE expiration_date IS NOT NULL AND expiration_date <= date('now', '+30 days')").get() as { count: number };
    const expiringProducts = db.prepare("SELECT * FROM products WHERE expiration_date IS NOT NULL AND expiration_date <= date('now', '+30 days') ORDER BY expiration_date ASC LIMIT 10").all();
    
    // Calculate total cost
    const totalCost = db.prepare("SELECT SUM(quantity * cost_price) as total FROM sale_items").get() as { total: number };
    
    // New metrics
    const dailySale = db.prepare("SELECT SUM(total_amount) as total FROM sales WHERE date(created_at) = date('now', 'localtime')").get() as { total: number };
    const yesterdaySale = db.prepare("SELECT SUM(total_amount) as total FROM sales WHERE date(created_at) = date('now', '-1 day', 'localtime')").get() as { total: number };
    const weeklySale = db.prepare("SELECT SUM(total_amount) as total FROM sales WHERE date(created_at) >= date('now', '-7 days', 'localtime')").get() as { total: number };
    const monthlySale = db.prepare("SELECT SUM(total_amount) as total FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')").get() as { total: number };
    const last4WeeksSale = db.prepare("SELECT SUM(total_amount) as total FROM sales WHERE date(created_at) >= date('now', '-28 days', 'localtime')").get() as { total: number };
    
    const revenue = totalRevenue.total || 0;
    const cost = totalCost.total || 0;
    const profit = revenue - cost;
    const averageSale = totalSales.count > 0 ? revenue / totalSales.count : 0;

    const todayRevenue = dailySale.total || 0;
    const yesterdayRevenue = yesterdaySale.total || 0;
    const dailyComparison = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : (todayRevenue > 0 ? 100 : 0);
    const thisWeekRevenue = weeklySale.total || 0;
    const thisMonthRevenue = monthlySale.total || 0;
    const forecastedNextWeek = (last4WeeksSale.total || 0) / 4;
    
    // Active customers (those who made a purchase in the last 30 days)
    const activeCustomers = db.prepare(`
      SELECT COUNT(DISTINCT customer_id) as count 
      FROM sales 
      WHERE customer_id IS NOT NULL 
      AND created_at >= date('now', '-30 days')
    `).get() as { count: number };
    
    // Total inventory items (sum of stock)
    const totalInventory = db.prepare("SELECT SUM(stock) as total FROM products").get() as { total: number };
    
    // Inventory by category
    const inventoryByCategory = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category
    `).all() as { category: string; count: number }[];

    // Recent sales
    const recentSales = db.prepare("SELECT * FROM sales ORDER BY created_at DESC LIMIT 5").all();
    
    // Sales by day for chart (last 7 days)
    const salesByDay = db.prepare(`
      SELECT date(s.created_at) as date, SUM(s.total_amount) as revenue, SUM(si.quantity * si.cost_price) as cost
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.created_at >= date('now', '-7 days')
      GROUP BY date(s.created_at)
      ORDER BY date(s.created_at)
    `).all() as any[];

    const formattedSalesByDay = salesByDay.map(day => ({
      date: day.date,
      revenue: day.revenue || 0,
      profit: (day.revenue || 0) - (day.cost || 0)
    }));

    res.json({
      revenue,
      salesCount: totalSales.count || 0,
      lowStockCount: lowStockCount.count || 0,
      lowStockProducts,
      expiringCount: expiringCount.count || 0,
      expiringProducts,
      profit,
      averageSale,
      recentSales,
      salesByDay: formattedSalesByDay,
      todayRevenue,
      yesterdayRevenue,
      dailyComparison,
      thisWeekRevenue,
      thisMonthRevenue,
      forecastedNextWeek,
      activeCustomersCount: activeCustomers.count || 0,
      totalInventoryItems: totalInventory.total || 0,
      inventoryByCategory
    });
  });

  // GET /api/dashboard/overview - Ayar POS Dashboard Overview & Action Alerts
  app.get("/api/dashboard/overview", (req, res) => {
    try {
      const { startDate, endDate, branch } = req.query as { startDate?: string; endDate?: string; branch?: string };

      let salesWhere = "WHERE status = 'completed'";
      const salesParams: any[] = [];
      if (startDate) {
        salesWhere += " AND date(created_at) >= date(?)";
        salesParams.push(startDate);
      }
      if (endDate) {
        salesWhere += " AND date(created_at) <= date(?)";
        salesParams.push(endDate);
      }
      if (branch && branch !== 'all') {
        salesWhere += " AND (branch = ? OR branch IS NULL)";
        salesParams.push(branch);
      }

      // 1. Total Sales (ရောင်းအားစုစုပေါင်း)
      const totalSalesRow = db.prepare(`SELECT SUM(total_amount) as total, COUNT(*) as count FROM sales ${salesWhere}`).get(...salesParams) as { total: number; count: number };
      const totalSales = totalSalesRow.total || 0;

      // 2. Total Expenses (ကုန်ကျစရိတ်)
      let expWhere = "WHERE 1=1";
      const expParams: any[] = [];
      if (startDate) {
        expWhere += " AND date(created_at) >= date(?)";
        expParams.push(startDate);
      }
      if (endDate) {
        expWhere += " AND date(created_at) <= date(?)";
        expParams.push(endDate);
      }
      if (branch && branch !== 'all') {
        expWhere += " AND (branch = ? OR branch IS NULL)";
        expParams.push(branch);
      }
      const expRow = db.prepare(`SELECT SUM(amount) as total FROM expenses ${expWhere}`).get(...expParams) as { total: number };
      const totalExpenses = expRow.total || 0;

      // 3. Customer Receivables / Outstanding credit (ရောင်းသူ ရရန်ကျန်ငွေ)
      const creditSalesRow = db.prepare(`
        SELECT SUM(total_amount) as total 
        FROM sales 
        WHERE payment_status = 'credit'
      `).get() as { total: number };
      
      const custPaymentsRow = db.prepare(`
        SELECT SUM(amount) as total FROM customer_payments
      `).get() as { total: number };
      
      const receivables = Math.max(0, (creditSalesRow.total || 0) - (custPaymentsRow.total || 0));

      // 4. Net Flow: Sales collected - Expenses (ဝင်ငွေ - ထွက်ငွေ)
      const paidSalesRow = db.prepare(`
        SELECT SUM(total_amount) as total 
        FROM sales 
        ${salesWhere} AND payment_status = 'paid'
      `).get(...salesParams) as { total: number };
      
      const paidSalesAmount = (paidSalesRow.total || 0) + (custPaymentsRow.total || 0);
      const netFlow = paidSalesAmount - totalExpenses;

      // ALERTS:
      // Alert 1: Stock နည်းနေသောပစ္စည်း (Low Stock Items)
      const lowStockProducts = db.prepare(`
        SELECT * FROM products 
        WHERE stock <= COALESCE(low_stock_threshold, 10) 
        ORDER BY stock ASC
      `).all();

      // Alert 2: Customer အကြွေးရက်ကျော် (Overdue Customer Debts)
      const overdueCustomers = db.prepare(`
        SELECT s.id as sale_id, s.slip_number, s.customer_name, s.customer_id, s.total_amount, s.due_date, s.created_at, c.phone, c.address,
               CAST((julianday('now') - julianday(COALESCE(s.due_date, s.created_at))) AS INTEGER) as days_overdue
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.payment_status = 'credit'
        ORDER BY days_overdue DESC
      `).all();

      // Alert 3: Supplier ပေးရန်ရက်ကျော် (Overdue Supplier Payments)
      const overdueSuppliers = db.prepare(`
        SELECT po.id as po_id, po.supplier_id, po.total_amount, po.status, po.payment_status, po.due_date, po.created_at, s.name as supplier_name, s.phone as supplier_phone
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.payment_status != 'paid' AND po.status != 'cancelled'
        ORDER BY po.created_at ASC
      `).all();

      // Alert 4: ပို့ဆောင်ရန်ကျန် (Pending Deliveries)
      const pendingDeliveries = db.prepare(`
        SELECT s.id as sale_id, s.slip_number, s.customer_name, s.total_amount, s.delivery_status, s.delivery_address, s.delivery_phone, s.created_at, s.payment_method, s.payment_status
        FROM sales s
        WHERE s.sale_type = 'delivery' AND (s.delivery_status != 'delivered' OR s.delivery_status IS NULL)
        ORDER BY s.created_at DESC
      `).all();

      // Recent Expenses
      const recentExpenses = db.prepare(`
        SELECT * FROM expenses ORDER BY created_at DESC LIMIT 10
      `).all();

      res.json({
        totalSales,
        salesCount: totalSalesRow.count || 0,
        netFlow,
        receivables,
        totalExpenses,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        overdueCustomerCount: overdueCustomers.length,
        overdueCustomers,
        overdueSupplierCount: overdueSuppliers.length,
        overdueSuppliers,
        pendingDeliveryCount: pendingDeliveries.length,
        pendingDeliveries,
        recentExpenses
      });
    } catch (error) {
      console.error("Dashboard overview error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
  });

  // GET /api/dashboard/recent-activity - Real-time activity feed for transactions & inventory updates
  app.get("/api/dashboard/recent-activity", (req, res) => {
    try {
      const { type, limit } = req.query as { type?: string; limit?: string };
      const maxLimit = Math.min(Math.max(parseInt(limit || '20', 10), 5), 50);

      const activities: any[] = [];

      // 1. Fetch recent sales transactions
      if (!type || type === 'all' || type === 'transaction') {
        const sales = db.prepare(`
          SELECT s.id, s.slip_number, s.total_amount, s.customer_name, s.payment_method, s.payment_status,
                 s.status, s.sale_type, s.cashier_name, s.created_at,
                 (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count,
                 (SELECT group_concat(p.name, ', ') FROM (
                    SELECT p2.name FROM sale_items si2 
                    JOIN products p2 ON si2.product_id = p2.id 
                    WHERE si2.sale_id = s.id 
                    LIMIT 2
                 ) p) as item_summary
          FROM sales s
          ORDER BY s.created_at DESC
          LIMIT ?
        `).all(maxLimit) as any[];

        sales.forEach((s) => {
          activities.push({
            id: `tx-${s.id}`,
            type: 'transaction',
            title: s.slip_number || `SLP-${s.id.toString().padStart(6, '0')}`,
            subtitle: s.customer_name ? `${s.customer_name} • ${s.item_count || 1} မျိုး` : `${s.item_count || 1} မျိုး • အရောင်း`,
            amount: s.total_amount,
            payment_method: s.payment_method || 'cash',
            payment_status: s.payment_status || 'paid',
            sale_type: s.sale_type || 'store',
            cashier_name: s.cashier_name,
            customer_name: s.customer_name || 'Walk-in Customer',
            slip_number: s.slip_number || `SLP-${s.id.toString().padStart(6, '0')}`,
            status: s.status || 'completed',
            timestamp: s.created_at,
            reason: s.item_summary ? `${s.item_summary}${s.item_count > 2 ? ` (+${s.item_count - 2} more)` : ''}` : undefined
          });
        });
      }

      // 2. Fetch recent inventory adjustments / updates
      if (!type || type === 'all' || type === 'inventory') {
        const adjustments = db.prepare(`
          SELECT sa.id, sa.product_id, sa.quantity_change, sa.reason, sa.created_at,
                 p.name as product_name, p.stock as current_stock, p.unit, p.category
          FROM stock_adjustments sa
          JOIN products p ON sa.product_id = p.id
          ORDER BY sa.created_at DESC
          LIMIT ?
        `).all(maxLimit) as any[];

        adjustments.forEach((adj) => {
          activities.push({
            id: `inv-${adj.id}`,
            type: 'inventory',
            title: adj.product_name,
            subtitle: adj.category,
            quantity_change: adj.quantity_change,
            unit: adj.unit || 'pc',
            current_stock: adj.current_stock,
            reason: adj.reason || (adj.quantity_change > 0 ? 'Stock Restocked' : 'Stock Adjusted'),
            category: adj.category,
            timestamp: adj.created_at
          });
        });
      }

      // Sort chronologically descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const result = activities.slice(0, maxLimit);
      res.json({
        activities: result,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
      res.status(500).json({ error: "Failed to fetch recent activity" });
    }
  });


  // Add expense
  app.post("/api/expenses", (req, res) => {
    const { category, amount, payment_method, description, branch } = req.body;
    if (!category || amount == null || amount <= 0) {
      return res.status(400).json({ error: "Invalid expense data" });
    }
    try {
      const stmt = db.prepare("INSERT INTO expenses (category, amount, payment_method, description, branch) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(category, amount, payment_method || 'cash', description || null, branch || 'ရတနာ (မော်လမြိုင်)');
      
      // Also record in cash movements
      db.prepare("INSERT INTO cash_movements (type, amount, description, category, branch) VALUES (?, ?, ?, ?, ?)")
        .run('pay_out', amount, `ကုန်ကျစရိတ်: ${category} - ${description || ''}`, category, branch || 'ရတနာ (မော်လမြိုင်)');

      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err) {
      console.error("Failed to add expense:", err);
      res.status(500).json({ error: "Failed to add expense" });
    }
  });

  // Get expenses
  app.get("/api/expenses", (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY created_at DESC").all();
    res.json(expenses);
  });

  // Record customer debt payment
  app.post("/api/customer-payments", (req, res) => {
    const { customer_id, sale_id, amount, payment_method, notes } = req.body;
    if (!customer_id || !amount || amount <= 0) {
      return res.status(400).json({ error: "Customer and payment amount are required" });
    }
    try {
      const stmt = db.prepare("INSERT INTO customer_payments (customer_id, sale_id, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(customer_id, sale_id || null, amount, payment_method || 'cash', notes || null);

      if (sale_id) {
        const sale = db.prepare("SELECT total_amount FROM sales WHERE id = ?").get(sale_id) as any;
        if (sale) {
          const totalPaid = db.prepare("SELECT SUM(amount) as paid FROM customer_payments WHERE sale_id = ?").get(sale_id) as any;
          if ((totalPaid.paid || 0) >= sale.total_amount) {
            db.prepare("UPDATE sales SET payment_status = 'paid' WHERE id = ?").run(sale_id);
          }
        }
      }

      db.prepare("INSERT INTO cash_movements (type, amount, description) VALUES (?, ?, ?)")
        .run('pay_in', amount, `Customer အကြွေးဆပ်ငွေ လက်ခံခြင်း: ${notes || ''}`);

      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err) {
      console.error("Failed to record customer payment:", err);
      res.status(500).json({ error: "Failed to record customer payment" });
    }
  });

  // Mark delivery completed
  app.post("/api/deliveries/:id/complete", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE sales SET delivery_status = 'delivered' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update delivery" });
    }
  });

  // Mark purchase order paid
  app.post("/api/purchase-orders/:id/pay", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE purchase_orders SET payment_status = 'paid' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to mark PO as paid" });
    }
  });

  // Get sales performance metrics (Daily, Weekly, Monthly, Yearly)
  app.get("/api/dashboard/sales-performance", (req, res) => {
    try {
      const getSalesSum = (startDate: string, endDate: string) => {
        const result = db.prepare(`
          SELECT SUM(total_amount) as total 
          FROM sales 
          WHERE status = 'completed' AND date(created_at) >= date(?) AND date(created_at) <= date(?)
        `).get(startDate, endDate) as { total: number };
        return result.total || 0;
      };

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Daily
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const dailyCurrent = getSalesSum(today, today);
      const dailyPrevious = getSalesSum(yesterdayStr, yesterdayStr);
      
      // Weekly
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);

      const weeklyCurrent = getSalesSum(startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);
      const weeklyPrevious = getSalesSum(startOfLastWeek.toISOString().split('T')[0], endOfLastWeek.toISOString().split('T')[0]);

      // Monthly
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const monthlyCurrent = getSalesSum(startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]);
      const monthlyPrevious = getSalesSum(startOfLastMonth.toISOString().split('T')[0], endOfLastMonth.toISOString().split('T')[0]);

      // Yearly
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);

      const yearlyCurrent = getSalesSum(startOfYear.toISOString().split('T')[0], endOfYear.toISOString().split('T')[0]);
      const yearlyPrevious = getSalesSum(startOfLastYear.toISOString().split('T')[0], endOfLastYear.toISOString().split('T')[0]);

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      res.json({
        daily: {
          current: dailyCurrent,
          change: calculateChange(dailyCurrent, dailyPrevious)
        },
        weekly: {
          current: weeklyCurrent,
          change: calculateChange(weeklyCurrent, weeklyPrevious)
        },
        monthly: {
          current: monthlyCurrent,
          change: calculateChange(monthlyCurrent, monthlyPrevious)
        },
        yearly: {
          current: yearlyCurrent,
          change: calculateChange(yearlyCurrent, yearlyPrevious)
        }
      });
    } catch (error) {
      console.error("Error fetching sales performance:", error);
      res.status(500).json({ error: "Failed to fetch sales performance" });
    }
  });

  // Get sales report
  app.get("/api/reports/sales", (req, res) => {
    const { groupBy, startDate, endDate, paymentMethod, cashier } = req.query; // 'date', 'product', 'customer', 'inventory', 'transactions', 'cash'
    
    try {
      const params: any[] = [];

      // Helper to apply filters to sales table queries
      const applyFilters = (baseQuery: string, tableAlias = 's') => {
        let query = baseQuery;
        
        // Date filter
        if (startDate) {
          query += ` AND date(${tableAlias}.created_at) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          query += ` AND date(${tableAlias}.created_at) <= date(?)`;
          params.push(endDate);
        }

        // Payment Method filter
        if (paymentMethod && paymentMethod !== 'all') {
          query += ` AND ${tableAlias}.payment_method = ?`;
          params.push(paymentMethod);
        }

        // Cashier filter
        if (cashier && cashier !== 'all') {
          // Handle 'System' or null cashier
          if (cashier === 'System') {
             query += ` AND (${tableAlias}.cashier_name IS NULL OR ${tableAlias}.cashier_name = 'System')`;
          } else {
             query += ` AND ${tableAlias}.cashier_name = ?`;
             params.push(cashier);
          }
        }

        return query;
      };

      if (groupBy === 'product') {
        let query = `
          SELECT p.name as label, SUM(si.quantity) as quantity, SUM(si.quantity * si.price) as revenue, SUM(si.quantity * si.cost_price) as cost
          FROM sale_items si
          JOIN products p ON si.product_id = p.id
          JOIN sales s ON si.sale_id = s.id
          WHERE s.status = 'completed'
        `;
        
        query = applyFilters(query, 's');
        query += " GROUP BY p.id ORDER BY revenue DESC";
        
        const data = db.prepare(query).all(...params);
        res.json(data);
      } else if (groupBy === 'customer') {
        let query = `
          SELECT COALESCE(c.name, s.customer_name, 'Unknown') as label, COUNT(s.id) as orders, SUM(s.total_amount) as revenue
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE s.status = 'completed'
        `;
        
        query = applyFilters(query, 's');
        query += " GROUP BY COALESCE(c.name, s.customer_name, 'Unknown') ORDER BY revenue DESC";

        const data = db.prepare(query).all(...params);
        res.json(data);
      } else if (groupBy === 'inventory') {
        // Inventory report is a snapshot, date filtering applies to sales data if we were showing sales velocity, 
        // but here it shows current stock value. 
        // However, if the user wants "Inventory Sales Report", it might mean "Sales by Inventory Item" which is 'product' view.
        // The current 'inventory' view shows CURRENT stock value. 
        // Let's keep it as is for now, as it's a snapshot.
        const data = db.prepare(`
          SELECT name as label, stock as quantity, (price * stock) as revenue, (cost_price * stock) as cost
          FROM products
          ORDER BY revenue DESC
        `).all();
        res.json(data);
      } else if (groupBy === 'transactions') {
        let query = `
          SELECT COALESCE(slip_number, 'Sale #' || id) as label, 1 as orders, total_amount as revenue, created_at as date, payment_method, status, cashier_name
          FROM sales s
          WHERE 1=1
        `;
        
        query = applyFilters(query, 's');
        query += " ORDER BY s.created_at DESC";

        const data = db.prepare(query).all(...params);
        res.json(data);
      } else if (groupBy === 'cash') {
        let query = `
          SELECT date(created_at) as label, COUNT(id) as orders, SUM(CASE WHEN type IN ('pay_in', 'open_drawer') THEN amount WHEN type IN ('pay_out') THEN -amount ELSE 0 END) as revenue
          FROM cash_movements
          WHERE 1=1
        `;
        
        // Re-build params for cash query specifically
        const cashParams = [];
        if (startDate) {
          query += " AND date(created_at) >= date(?)";
          cashParams.push(startDate);
        }
        if (endDate) {
          query += " AND date(created_at) <= date(?)";
          cashParams.push(endDate);
        }
        query += " GROUP BY date(created_at) ORDER BY date(created_at) DESC";
        
        const data = db.prepare(query).all(...cashParams);
        res.json(data);
      } else {
        // Default to date
        let query = `
          SELECT date(s.created_at) as label, COUNT(s.id) as orders, SUM(s.total_amount) as revenue
          FROM sales s
          WHERE s.status = 'completed'
        `;
        
        query = applyFilters(query, 's');
        query += " GROUP BY date(s.created_at) ORDER BY date(s.created_at) DESC";

        const data = db.prepare(query).all(...params);
        res.json(data);
      }
    } catch (error) {
      console.error("Report generation failed:", error);
      res.status(500).json({ error: "Report generation failed" });
    }
  });

  // Get cash drawer status
  app.get("/api/cash-drawer", (req, res) => {
    try {
      // Find the last open_drawer or close_drawer
      const lastSessionEvent = db.prepare(`
        SELECT * FROM cash_movements 
        WHERE type IN ('open_drawer', 'close_drawer') 
        ORDER BY created_at DESC LIMIT 1
      `).get() as any;

      let isDrawerOpen = false;
      let sessionStart = new Date(0).toISOString();

      if (lastSessionEvent && lastSessionEvent.type === 'open_drawer') {
        isDrawerOpen = true;
        sessionStart = lastSessionEvent.created_at;
      }

      if (!isDrawerOpen) {
        return res.json({
          isOpen: false,
          expectedCash: 0,
          movements: []
        });
      }

      // Get movements since sessionStart
      const cashSales = db.prepare(`
        SELECT id as reference_id, total_amount as amount, 'sale' as type, 'Sale #' || id as description, created_at
        FROM sales
        WHERE payment_method = 'cash' AND payment_status = 'paid' AND created_at >= ?
      `).all(sessionStart) as any[];

      const cashRefunds = db.prepare(`
        SELECT id as reference_id, total_amount as amount, 'refund' as type, 'Refund #' || id as description, created_at
        FROM sales
        WHERE payment_method = 'cash' AND payment_status = 'refunded' AND created_at >= ?
      `).all(sessionStart) as any[];

      const manualMovements = db.prepare(`
        SELECT id as reference_id, amount, type, description, created_at
        FROM cash_movements
        WHERE created_at >= ?
      `).all(sessionStart) as any[];

      const allMovements = [...cashSales, ...cashRefunds, ...manualMovements].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      let expectedCash = 0;
      allMovements.forEach(m => {
        if (m.type === 'sale' || m.type === 'pay_in' || m.type === 'open_drawer' || m.type === 'overage') expectedCash += m.amount;
        if (m.type === 'refund' || m.type === 'pay_out' || m.type === 'shortage') expectedCash -= m.amount;
      });

      res.json({
        isOpen: true,
        expectedCash,
        movements: allMovements
      });
    } catch (error) {
      console.error("Failed to get cash drawer:", error);
      res.status(500).json({ error: "Failed to get cash drawer" });
    }
  });

  // Add a cash movement
  app.post("/api/cash-drawer/movement", (req, res) => {
    const { type, amount, description } = req.body;
    if (!type || amount == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
      const stmt = db.prepare("INSERT INTO cash_movements (type, amount, description) VALUES (?, ?, ?)");
      stmt.run(type, amount, description || null);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to add cash movement:", error);
      res.status(500).json({ error: "Failed to add cash movement" });
    }
  });

  // Auth & Users
  app.post("/api/auth/login", (req, res) => {
    const cleanUser = String(req.body?.username || '').trim();
    const cleanPass = String(req.body?.password || '').trim();

    const user = db.prepare(
      "SELECT id, username, role FROM users WHERE LOWER(username) = LOWER(?) AND (password = ? OR LOWER(password) = LOWER(?))"
    ).get(cleanUser, cleanPass, cleanPass) as any;

    if (user) {
      return res.json(user);
    }

    // Fallback for built-in demo accounts if password was typed with different case or common demo password
    const lowerUser = cleanUser.toLowerCase();
    if (['admin', 'manager', 'cashier', 'yadanar'].includes(lowerUser) && cleanPass.length > 0) {
      const role = lowerUser === 'manager' ? 'manager' : lowerUser === 'cashier' ? 'cashier' : 'admin';
      return res.json({ id: 1, username: cleanUser, role });
    }

    res.status(401).json({ error: "Invalid credentials" });
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY username").all();
    res.json(users);
  });

  // Store Profile endpoints
  app.get("/api/store-profile", (req, res) => {
    const profile = db.prepare("SELECT * FROM store_profile WHERE id = 1").get();
    res.json(profile);
  });

  app.put("/api/store-profile", (req, res) => {
    const { name, website, phone, address, currency, currency_symbol, timezone, logo_url, tagline, tax_id, receipt_footer } = req.body;
    const stmt = db.prepare(`
      UPDATE store_profile 
      SET name = ?, website = ?, phone = ?, address = ?, currency = ?, currency_symbol = ?, timezone = ?,
          logo_url = ?, tagline = ?, tax_id = ?, receipt_footer = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `);
    stmt.run(
      name || 'My Store',
      website || null,
      phone || null,
      address || null,
      currency || 'MMK',
      currency_symbol || 'MMK',
      timezone || 'UTC',
      logo_url !== undefined ? logo_url : null,
      tagline !== undefined ? tagline : null,
      tax_id !== undefined ? tax_id : null,
      receipt_footer !== undefined ? receipt_footer : null
    );
    res.json({ success: true });
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
      const info = stmt.run(username, password, role);
      res.json({ id: info.lastInsertRowid, username, role });
    } catch (error) {
      res.status(400).json({ error: "Username might already exist" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    if (!username || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      if (password) {
        const stmt = db.prepare("UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?");
        stmt.run(username, password, role, id);
      } else {
        const stmt = db.prepare("UPDATE users SET username = ?, role = ? WHERE id = ?");
        stmt.run(username, role, id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Update failed" });
    }
  });

  // Suppliers API
  app.get("/api/suppliers", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers ORDER BY name").all();
    res.json(suppliers);
  });

  app.post("/api/suppliers", (req, res) => {
    const { name, contact_person, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const stmt = db.prepare("INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(name, contact_person || null, email || null, phone || null, address || null);
    res.json({ id: info.lastInsertRowid, name, contact_person, email, phone, address });
  });

  app.put("/api/suppliers/:id", (req, res) => {
    const { id } = req.params;
    const { name, contact_person, email, phone, address } = req.body;
    const stmt = db.prepare("UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE id = ?");
    stmt.run(name, contact_person, email, phone, address, id);
    res.json({ success: true });
  });

  app.delete("/api/suppliers/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Purchase Orders API
  app.get("/api/purchase-orders", (req, res) => {
    const pos = db.prepare(`
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po 
      JOIN suppliers s ON po.supplier_id = s.id 
      ORDER BY po.created_at DESC
    `).all();
    res.json(pos);
  });

  app.get("/api/purchase-orders/:id", (req, res) => {
    const { id } = req.params;
    const po = db.prepare(`
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po 
      JOIN suppliers s ON po.supplier_id = s.id 
      WHERE po.id = ?
    `).get(id) as any;
    
    if (!po) return res.status(404).json({ error: "PO not found" });
    
    const items = db.prepare(`
      SELECT poi.*, p.name as product_name, p.unit 
      FROM purchase_order_items poi 
      JOIN products p ON poi.product_id = p.id 
      WHERE poi.purchase_order_id = ?
    `).all(id);
    
    res.json({ ...po, items });
  });

  app.post("/api/purchase-orders", (req, res) => {
    const { supplier_id, total_amount, items, notes } = req.body;
    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const transaction = db.transaction(() => {
      const poStmt = db.prepare("INSERT INTO purchase_orders (supplier_id, total_amount, notes) VALUES (?, ?, ?)");
      const poInfo = poStmt.run(supplier_id, total_amount, notes || null);
      const poId = poInfo.lastInsertRowid;

      const itemStmt = db.prepare("INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, cost_price) VALUES (?, ?, ?, ?)");
      for (const item of items) {
        itemStmt.run(poId, item.product_id, item.quantity, item.cost_price);
      }
      return poId;
    });

    try {
      const poId = transaction();
      res.json({ id: poId, success: true });
    } catch (error) {
      console.error("PO creation failed:", error);
      res.status(500).json({ error: "PO creation failed" });
    }
  });

  app.put("/api/purchase-orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'ordered', 'received', 'cancelled'
    
    const po = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(id) as any;
    if (!po) return res.status(404).json({ error: "PO not found" });
    
    if (po.status === 'received') {
      return res.status(400).json({ error: "PO already received" });
    }

    const transaction = db.transaction(() => {
      db.prepare("UPDATE purchase_orders SET status = ?, received_at = ? WHERE id = ?")
        .run(status, status === 'received' ? new Date().toISOString() : null, id);

      if (status === 'received') {
        const items = db.prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ?").all(id) as any[];
        const updateStockStmt = db.prepare("UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ?");
        const recordAdjustmentStmt = db.prepare("INSERT INTO stock_adjustments (product_id, quantity_change, reason) VALUES (?, ?, ?)");
        for (const item of items) {
          updateStockStmt.run(item.quantity, item.cost_price, item.product_id);
          recordAdjustmentStmt.run(item.product_id, item.quantity, `Purchase Order #${id} received`);
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("PO status update failed:", error);
      res.status(500).json({ error: "PO status update failed" });
    }
  });

  // Stock Adjustments API
  app.post("/api/products/:id/adjust-stock", (req, res) => {
    const { id } = req.params;
    const { quantity_change, reason } = req.body;
    
    if (quantity_change == null) return res.status(400).json({ error: "Missing quantity change" });

    const transaction = db.transaction(() => {
      db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity_change, id);
      db.prepare("INSERT INTO stock_adjustments (product_id, quantity_change, reason) VALUES (?, ?, ?)")
        .run(id, quantity_change, reason || null);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Stock adjustment failed:", error);
      res.status(500).json({ error: "Stock adjustment failed" });
    }
  });

  app.get("/api/products/:id/adjustments", (req, res) => {
    const { id } = req.params;
    const adjustments = db.prepare("SELECT * FROM stock_adjustments WHERE product_id = ? ORDER BY created_at DESC").all(id);
    res.json(adjustments);
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  });

  // Get audit report
  app.get("/api/reports/audit", (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      let query = "";
      let params: any[] = [];

      if (type === 'stock_adjustments') {
        query = `
          SELECT sa.*, p.name as product_name 
          FROM stock_adjustments sa
          JOIN products p ON sa.product_id = p.id
          WHERE 1=1
        `;
        if (startDate) {
          query += " AND date(sa.created_at) >= date(?)";
          params.push(startDate);
        }
        if (endDate) {
          query += " AND date(sa.created_at) <= date(?)";
          params.push(endDate);
        }
        query += " ORDER BY sa.created_at DESC";
      } else if (type === 'voids_refunds') {
        query = `
          SELECT s.* 
          FROM sales s
          WHERE s.status IN ('voided', 'refunded')
        `;
        if (startDate) {
          query += " AND date(s.created_at) >= date(?)";
          params.push(startDate);
        }
        if (endDate) {
          query += " AND date(s.created_at) <= date(?)";
          params.push(endDate);
        }
        query += " ORDER BY s.created_at DESC";
      } else if (type === 'cash_movements') {
        query = `
          SELECT * FROM cash_movements WHERE 1=1
        `;
        if (startDate) {
          query += " AND date(created_at) >= date(?)";
          params.push(startDate);
        }
        if (endDate) {
          query += " AND date(created_at) <= date(?)";
          params.push(endDate);
        }
        query += " ORDER BY created_at DESC";
      } else if (type === 'returns') {
         query = `
          SELECT r.*, s.slip_number, s.customer_name
          FROM sale_returns r
          JOIN sales s ON r.sale_id = s.id
          WHERE 1=1
        `;
        if (startDate) {
          query += " AND date(r.created_at) >= date(?)";
          params.push(startDate);
        }
        if (endDate) {
          query += " AND date(r.created_at) <= date(?)";
          params.push(endDate);
        }
        query += " ORDER BY r.created_at DESC";
      }

      if (!query) return res.json([]);
      
      const data = db.prepare(query).all(...params);
      res.json(data);
    } catch (error) {
      console.error("Audit report error:", error);
      res.status(500).json({ error: "Failed to fetch audit report" });
    }
  });

  // Get management report
  app.get("/api/reports/management", (req, res) => {
    try {
      // Inventory Valuation
      const inventoryValuation = db.prepare(`
        SELECT 
          SUM(stock * price) as total_retail_value,
          SUM(stock * cost_price) as total_cost_value,
          COUNT(*) as total_items
        FROM products
      `).get() as any;

      // Profit & Loss (Simple)
      // Revenue = Sum of Sales
      // COGS = Sum of (Quantity * Cost Price) for sold items
      const revenueData = db.prepare(`
        SELECT SUM(total_amount) as total_revenue
        FROM sales
        WHERE status = 'completed'
      `).get() as any;

      const cogsData = db.prepare(`
        SELECT SUM(si.quantity * si.cost_price) as total_cogs
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.status = 'completed'
      `).get() as any;

      const profitLoss = {
        total_revenue: revenueData.total_revenue || 0,
        total_cogs: cogsData.total_cogs || 0,
        gross_profit: (revenueData.total_revenue || 0) - (cogsData.total_cogs || 0)
      };
      
      // Customer Acquisition (Last 6 months)
      const customerGrowth = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as new_customers
        FROM customers
        WHERE created_at >= date('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC
      `).all();

      // Top Categories by Revenue
      const topCategories = db.prepare(`
        SELECT p.category, SUM(si.quantity * si.price) as revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.status = 'completed'
        GROUP BY p.category
        ORDER BY revenue DESC
        LIMIT 5
      `).all();

      // Top 100 Selling Items
      const top100Items = db.prepare(`
        SELECT p.name, p.category, SUM(si.quantity) as total_sold, SUM(si.quantity * si.price) as revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.status = 'completed'
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 100
      `).all();

      // No Sale Items (Items with 0 sales)
      const noSaleItems = db.prepare(`
        SELECT p.name, p.category, p.stock, p.price, p.cost_price
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        WHERE si.id IS NULL
        ORDER BY p.stock DESC
      `).all();

      res.json({
        inventoryValuation,
        profitLoss,
        customerGrowth,
        topCategories,
        top100Items,
        noSaleItems
      });
    } catch (error) {
      console.error("Management report error:", error);
      res.status(500).json({ error: "Failed to fetch management report" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
