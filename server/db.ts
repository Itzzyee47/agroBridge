import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "agrobridge.db");

// Create data directory if it doesn't exist
import fs from "fs";
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Password Helper
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "agrobridge_salt_2026").digest("hex");
}

// Collection Interfaces (exported for use in other files)
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: "admin" | "agent" | "buyer";
  verificationStatus: "pending" | "verified" | "suspended";
  createdAt: string;
}

export interface Agent {
  userId: string;
  nationalId: string;
  serviceArea: string;
  approvalStatus: "pending" | "approved" | "rejected";
}

export interface Farmer {
  id: string;
  agentId: string;
  name: string;
  village: string;
  location: string;
  phone: string;
  farmSize: string;
  cropTypes: string[];
  notes: string;
  createdAt: string;
  status: "active" | "archived";
}

export interface Product {
  id: string;
  farmerId: string;
  farmerName: string;
  category: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  images: string[];
  availability: "immediate" | "seasonal" | "upcoming";
  createdAt: string;
}

export interface OrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  farmerId: string;
  agentId: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  products: OrderProduct[];
  paymentStatus: "pending" | "paid";
  deliveryStatus: "pending" | "confirmed" | "packed" | "in_transit" | "delivered" | "cancelled";
  totals: {
    farmerAmount: number;
    agentCommission: number;
    platformFee: number;
    total: number;
  };
  shippingAddress: string;
  phone: string;
  createdAt: string;
}

export interface Review {
  id: string;
  buyerId: string;
  buyerName: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PlatformConfig {
  farmerPercentage: number;
  agentPercentage: number;
  platformPercentage: number;
}

class SQLiteDb {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_FILE);
    this.initSchema();
    this.seedIfEmpty();
  }

  private initSchema() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'agent', 'buyer')),
        verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'suspended')),
        created_at TEXT NOT NULL
      )
    `);

    // Agents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        user_id TEXT PRIMARY KEY,
        national_id TEXT,
        service_area TEXT,
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Farmers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS farmers (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        name TEXT NOT NULL,
        village TEXT,
        location TEXT,
        phone TEXT,
        farm_size TEXT,
        crop_types TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
        FOREIGN KEY (agent_id) REFERENCES users(id)
      )
    `);

    // Products table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        stock INTEGER NOT NULL,
        unit TEXT NOT NULL,
        images TEXT,
        availability TEXT NOT NULL DEFAULT 'immediate' CHECK(availability IN ('immediate', 'seasonal', 'upcoming')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES farmers(id)
      )
    `);

    // Orders table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        buyer_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        phone TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid')),
        delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending', 'confirmed', 'packed', 'in_transit', 'delivered', 'cancelled')),
        totals TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (buyer_id) REFERENCES users(id)
      )
    `);

    // Order products table (for order items)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_products (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        unit TEXT NOT NULL,
        farmer_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Reviews table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        buyer_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        product_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Notifications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Config table (single row)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        farmer_percentage INTEGER NOT NULL,
        agent_percentage INTEGER NOT NULL,
        platform_percentage INTEGER NOT NULL
      )
    `);
  }

  private seedIfEmpty() {
    const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    if (userCount.count > 0) return;

    console.log("Seeding initial AgroBridge database...");
    const dateStr = new Date().toISOString();

    // Seed users
    const insertUser = this.db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, verification_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const adminUser = insertUser.run(
      "usr_admin", "Mukasa David", "admin@agrobridge.com", hashPassword("admin123"),
      "+256 772 123456", "admin", "verified", dateStr
    );

    const agent1 = insertUser.run(
      "usr_agent1", "Nsubuga Peter", "agent1@agrobridge.com", hashPassword("agent123"),
      "+256 782 987654", "agent", "verified", dateStr
    );

    const agent2 = insertUser.run(
      "usr_agent2", "Aisha Kamara", "agent2@agrobridge.com", hashPassword("agent123"),
      "+256 752 444555", "agent", "verified", dateStr
    );

    const buyer1 = insertUser.run(
      "usr_buyer1", "Sarah Namubiru", "buyer@agrobridge.com", hashPassword("buyer123"),
      "+256 701 111222", "buyer", "verified", dateStr
    );

    // Seed agents
    const insertAgent = this.db.prepare(`
      INSERT INTO agents (user_id, national_id, service_area, approval_status)
      VALUES (?, ?, ?, ?)
    `);

    insertAgent.run("usr_agent1", "NIN-UG-19887722A", "Mityana & Wakiso Districts", "approved");
    insertAgent.run("usr_agent2", "NIN-UG-19942233B", "Luweero Rural Cooperatives", "approved");

    // Seed farmers
    const insertFarmer = this.db.prepare(`
      INSERT INTO farmers (id, agent_id, name, village, location, phone, farm_size, crop_types, notes, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFarmer.run(
      "farm_1", "usr_agent1", "John Ssekandi", "Kikandwa Village", "Mityana",
      "+256 774 000111", "4.5", JSON.stringify(["Matooke", "Coffee", "Cassava"]),
      "Ssekandi is a third-generation coffee and banana farmer. He has a highly productive organic farm but suffers from transport constraints.",
      dateStr, "active"
    );

    insertFarmer.run(
      "farm_2", "usr_agent1", "Grace Nakato", "Namutamba Rural", "Mityana",
      "+256 781 222333", "2.0", JSON.stringify(["Tomatoes", "Onions", "Green Peppers"]),
      "Nakato specializes in vegetable horticulture using basic gravity drip irrigation. Reliable water source but lacks market access.",
      dateStr, "active"
    );

    insertFarmer.run(
      "farm_3", "usr_agent2", "Yusuf Kato", "Kikyusa Village", "Luweero",
      "+256 754 555666", "8.0", JSON.stringify(["Pineapples", "Maize"]),
      "Kato is an experienced sweet organic pineapple farmer. Owns medium acreage, produces high-yield seasonal harvests.",
      dateStr, "active"
    );

    // Seed products
    const insertProduct = this.db.prepare(`
      INSERT INTO products (id, farmer_id, farmer_name, category, name, description, price, stock, unit, images, availability, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
      "prod_1", "farm_1", "John Ssekandi", "Fruits & Bananas",
      "Organic Matooke (Green Bananas)",
      "Extra large green banana bunches. Freshly cut on demand, heavy starch, traditional cooking quality directly from Ssekandi's grove.",
      25000, 45, "Bunch",
      JSON.stringify(["https://images.unsplash.com/photo-1566393028639-d108a42c46a7?auto=format&fit=crop&q=80&w=600"]),
      "immediate", dateStr
    );

    insertProduct.run(
      "prod_2", "farm_1", "John Ssekandi", "Grains & Seeds",
      "Arabica Coffee Beans (AA Grade)",
      "Sun-dried organic Arabica coffee beans. Handpicked, expertly hulled, ready for roasting. Premium harvest with rich chocolatey notes.",
      9000, 350, "kg",
      JSON.stringify(["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600"]),
      "immediate", dateStr
    );

    insertProduct.run(
      "prod_3", "farm_2", "Grace Nakato", "Vegetables",
      "Fresh Vine-Ripened Tomatoes",
      "Firm, juicy red tomatoes grown with organic compost. Handpicked at perfect maturity. Perfect for markets and restaurants.",
      45000, 12, "Crate (25kg)",
      JSON.stringify(["https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"]),
      "immediate", dateStr
    );

    insertProduct.run(
      "prod_4", "farm_3", "Yusuf Kato", "Fruits & Bananas",
      "Sweet Cayenne Pineapples",
      "Luweero's legendary honey-sweet pineapples. Large size, fragrant, thin skin and high sugar content. Organic certified.",
      3500, 500, "Piece",
      JSON.stringify(["https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=600"]),
      "immediate", dateStr
    );

    // Seed config
    this.db.exec(`
      INSERT INTO config (id, farmer_percentage, agent_percentage, platform_percentage)
      VALUES (1, 85, 10, 5)
    `);

    console.log("Database seeded successfully!");
  }

  // Collection Accessors
  get users(): User[] {
    return this.db.prepare("SELECT id, name, email, password_hash as passwordHash, phone, role, verification_status as verificationStatus, created_at as createdAt FROM users").all() as User[];
  }

  get agents(): Agent[] {
    return this.db.prepare("SELECT user_id as userId, national_id as nationalId, service_area as serviceArea, approval_status as approvalStatus FROM agents").all() as Agent[];
  }

  get farmers(): Farmer[] {
    const rows = this.db.prepare(`
      SELECT id, agent_id as agentId, name, village, location, phone, farm_size as farmSize, 
             crop_types as cropTypes, notes, created_at as createdAt, status 
      FROM farmers
    `).all() as any[];
    return rows.map(r => ({
      ...r,
      cropTypes: JSON.parse(r.cropTypes || '[]')
    }));
  }

  get products(): Product[] {
    const rows = this.db.prepare(`
      SELECT id, farmer_id as farmerId, farmer_name as farmerName, category, name, description, 
             price, stock, unit, images, availability, created_at as createdAt 
      FROM products
    `).all() as any[];
    return rows.map(r => ({
      ...r,
      images: JSON.parse(r.images || '[]')
    }));
  }

  get orders(): Order[] {
    const orderRows = this.db.prepare(`
      SELECT id, buyer_id as buyerId, buyer_name as buyerName, shipping_address as shippingAddress, 
             phone, payment_status as paymentStatus, delivery_status as deliveryStatus, 
             totals, created_at as createdAt 
      FROM orders
    `).all() as any[];

    return orderRows.map(order => {
      const productRows = this.db.prepare(`
        SELECT id, order_id as orderId, product_id as productId, name, quantity, price, unit, farmer_id as farmerId, agent_id as agentId
        FROM order_products WHERE order_id = ?
      `).all(order.id) as any[];

      return {
        ...order,
        products: productRows.map(p => ({
          productId: p.productId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          unit: p.unit,
          farmerId: p.farmerId,
          agentId: p.agentId
        })),
        totals: JSON.parse(order.totals)
      };
    });
  }

  get reviews(): Review[] {
    return this.db.prepare(`
      SELECT id, buyer_id as buyerId, buyer_name as buyerName, product_id as productId, 
             rating, comment, created_at as createdAt 
      FROM reviews
    `).all() as Review[];
  }

  get notifications(): Notification[] {
    const rows = this.db.prepare(`
      SELECT id, user_id as userId, title, message, read, created_at as createdAt 
      FROM notifications
    `).all() as any[];
    return rows.map(r => ({ ...r, read: !!r.read }));
  }

  get config(): PlatformConfig {
    const row = this.db.prepare("SELECT farmer_percentage as farmerPercentage, agent_percentage as agentPercentage, platform_percentage as platformPercentage FROM config WHERE id = 1").get() as PlatformConfig | undefined;
    return row || { farmerPercentage: 85, agentPercentage: 10, platformPercentage: 5 };
  }

  set config(val: PlatformConfig) {
    this.db.prepare(`
      INSERT OR REPLACE INTO config (id, farmer_percentage, agent_percentage, platform_percentage)
      VALUES (1, ?, ?, ?)
    `).run(val.farmerPercentage, val.agentPercentage, val.platformPercentage);
  }

  public save() {
    // SQLite is immediate - no need to explicitly save
  }

  // CRUD operations for farmers
  addFarmer(farmer: Farmer) {
    const stmt = this.db.prepare(`
      INSERT INTO farmers (id, agent_id, name, village, location, phone, farm_size, crop_types, notes, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      farmer.id, farmer.agentId, farmer.name, farmer.village, farmer.location,
      farmer.phone, farmer.farmSize, JSON.stringify(farmer.cropTypes), farmer.notes, farmer.createdAt, farmer.status
    );
  }

  updateFarmer(id: string, updates: Partial<Farmer>) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
    if (updates.village !== undefined) { fields.push("village = ?"); values.push(updates.village); }
    if (updates.location !== undefined) { fields.push("location = ?"); values.push(updates.location); }
    if (updates.phone !== undefined) { fields.push("phone = ?"); values.push(updates.phone); }
    if (updates.farmSize !== undefined) { fields.push("farm_size = ?"); values.push(updates.farmSize); }
    if (updates.cropTypes !== undefined) { fields.push("crop_types = ?"); values.push(JSON.stringify(updates.cropTypes)); }
    if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }

    if (fields.length === 0) return;
    
    values.push(id);
    this.db.prepare(`UPDATE farmers SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  // CRUD operations for products
  addProduct(product: Product) {
    const stmt = this.db.prepare(`
      INSERT INTO products (id, farmer_id, farmer_name, category, name, description, price, stock, unit, images, availability, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      product.id, product.farmerId, product.farmerName, product.category, product.name,
      product.description, product.price, product.stock, product.unit, JSON.stringify(product.images),
      product.availability, product.createdAt
    );
  }

  updateProduct(id: string, updates: Partial<Product>) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.farmerId !== undefined) { fields.push("farmer_id = ?"); values.push(updates.farmerId); }
    if (updates.farmerName !== undefined) { fields.push("farmer_name = ?"); values.push(updates.farmerName); }
    if (updates.category !== undefined) { fields.push("category = ?"); values.push(updates.category); }
    if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
    if (updates.price !== undefined) { fields.push("price = ?"); values.push(updates.price); }
    if (updates.stock !== undefined) { fields.push("stock = ?"); values.push(updates.stock); }
    if (updates.unit !== undefined) { fields.push("unit = ?"); values.push(updates.unit); }
    if (updates.images !== undefined) { fields.push("images = ?"); values.push(JSON.stringify(updates.images)); }
    if (updates.availability !== undefined) { fields.push("availability = ?"); values.push(updates.availability); }

    if (fields.length === 0) return;
    
    values.push(id);
    this.db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  deleteProduct(id: string) {
    this.db.prepare("DELETE FROM products WHERE id = ?").run(id);
  }

  // CRUD operations for orders
  addOrder(order: Order) {
    const stmt = this.db.prepare(`
      INSERT INTO orders (id, buyer_id, buyer_name, shipping_address, phone, payment_status, delivery_status, totals, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      order.id, order.buyerId, order.buyerName, order.shippingAddress, order.phone,
      order.paymentStatus, order.deliveryStatus, JSON.stringify(order.totals), order.createdAt
    );
  }

  updateOrder(id: string, updates: Partial<Order>) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.paymentStatus !== undefined) { fields.push("payment_status = ?"); values.push(updates.paymentStatus); }
    if (updates.deliveryStatus !== undefined) { fields.push("delivery_status = ?"); values.push(updates.deliveryStatus); }
    if (updates.totals !== undefined) { fields.push("totals = ?"); values.push(JSON.stringify(updates.totals)); }

    if (fields.length === 0) return;
    
    values.push(id);
    this.db.prepare(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  // Add order product
  addOrderProduct(orderProduct: OrderProduct & { orderId: string, id: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO order_products (id, order_id, product_id, name, quantity, price, unit, farmer_id, agent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      orderProduct.id, orderProduct.orderId, orderProduct.productId, orderProduct.name,
      orderProduct.quantity, orderProduct.price, orderProduct.unit, orderProduct.farmerId, orderProduct.agentId
    );
  }

  // Add review
  addReview(review: Review) {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (id, buyer_id, buyer_name, product_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      review.id, review.buyerId, review.buyerName, review.productId,
      review.rating, review.comment, review.createdAt
    );
  }

  deleteReview(id: string) {
    this.db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
  }

  // Add notification
  addNotification(notification: Notification) {
    const stmt = this.db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      notification.id, notification.userId, notification.title, notification.message,
      notification.read ? 1 : 0, notification.createdAt
    );
  }

  markNotificationRead(id: string) {
    this.db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
  }

  markAllNotificationsRead(userId: string) {
    this.db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
  }

  // Update user verification/approval
  updateUser(id: string, updates: Partial<User> & { approvalStatus?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.verificationStatus !== undefined) { fields.push("verification_status = ?"); values.push(updates.verificationStatus); }
    
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  updateAgentApproval(userId: string, approvalStatus: string) {
    this.db.prepare("UPDATE agents SET approval_status = ? WHERE user_id = ?").run(approvalStatus, userId);
  }
}

export const db = new SQLiteDb();
