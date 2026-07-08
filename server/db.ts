import { Firestore } from "firebase-admin/firestore";
import crypto from "crypto";
import { seedData } from "./seed.js";

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
    deliveryFee: number;
    total: number;
  };
  shippingAddress: string;
  deliveryPreference: string;
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

// Get or initialize Firestore
let _db: Firestore | null = null;
let _initPromise: Promise<void> | null = null;

async function getDb(): Promise<Firestore> {
  if (_db) return _db;
  
  if (_initPromise) {
    await _initPromise;
    return _db!;
  }
  
  _initPromise = (async () => {
    const { getFirestore } = await import("firebase-admin/firestore");
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const path = await import("path");
    const fs = await import("fs");
    
    if (!getApps().length) {
      let serviceAccount;
      
      // Option 1: Full JSON in FIREBASE_SERVICE_ACCOUNT env var
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } 
      // Option 2: Individual keys in .env
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Fix newline formatting from .env
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
      } 
      // Option 3: Read from service account file for local development
      else {
        // Use process.cwd() to get project root
        const serviceAccountPath = path.join(process.cwd(), "data", "serviceAccountKey.json");
        
        if (fs.existsSync(serviceAccountPath)) {
          const content = fs.readFileSync(serviceAccountPath, "utf-8");
          serviceAccount = JSON.parse(content);
        } else {
          throw new Error("No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY env vars, or create data/serviceAccountKey.json");
        }
      }
      
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
    
    _db = getFirestore();
  })();
  
  await _initPromise;
  return _db!;
}

class FirebaseDb {
  private initialized = false;
  private _config: PlatformConfig = { farmerPercentage: 85, agentPercentage: 10, platformPercentage: 5 };

  private async getDb(): Promise<Firestore> {
    return getDb();
  }

  private async seedIfEmpty() {
    if (this.initialized) return;
    
    const db = await this.getDb();
    const usersSnapshot = await db.collection("users").limit(1).get();
    if (!usersSnapshot.empty) {
      const configDoc = await db.collection("config").doc("default").get();
      if (configDoc.exists) {
        this._config = configDoc.data() as PlatformConfig;
      }
      this.initialized = true;
      return;
    }

    console.log("Seeding initial AgroBridge data to Firebase...");
    const batch = db.batch();
    const dateStr = new Date().toISOString();

    const users = seedData.users.map(u => ({
      ...u,
      passwordHash: hashPassword(u.passwordHash),
      createdAt: dateStr,
    }));
    users.forEach(u => {
      const ref = db.collection("users").doc(u.id);
      batch.set(ref, u);
    });

    seedData.agents.forEach(a => {
      const ref = db.collection("agents").doc(a.userId);
      batch.set(ref, a);
    });

    seedData.farmers.forEach(f => {
      const ref = db.collection("farmers").doc(f.id);
      batch.set(ref, f);
    });

    seedData.products.forEach(p => {
      const ref = db.collection("products").doc(p.id);
      batch.set(ref, p);
    });

    const configRef = db.collection("config").doc("default");
    batch.set(configRef, seedData.config);

    await batch.commit();
    this._config = seedData.config;
    this.initialized = true;
    console.log("Database seeded successfully!");
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.seedIfEmpty();
    }
  }

  async getUsers(): Promise<User[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map(doc => doc.data() as User);
  }

  async getAgents(): Promise<Agent[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("agents").get();
    return snapshot.docs.map(doc => doc.data() as Agent);
  }

  async getFarmers(): Promise<Farmer[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("farmers").get();
    return snapshot.docs.map(doc => doc.data() as Farmer);
  }

  async getProducts(): Promise<Product[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("products").get();
    return snapshot.docs.map(doc => doc.data() as Product);
  }

  async getOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("orders").get();
    return snapshot.docs.map(doc => doc.data() as Order);
  }

  async getReviews(): Promise<Review[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("reviews").get();
    return snapshot.docs.map(doc => doc.data() as Review);
  }

  async getNotifications(): Promise<Notification[]> {
    await this.ensureInitialized();
    const db = await this.getDb();
    const snapshot = await db.collection("notifications").get();
    return snapshot.docs.map(doc => doc.data() as Notification);
  }

  async getConfig(): Promise<PlatformConfig> {
    await this.ensureInitialized();
    return this._config;
  }

  get users(): User[] { return []; }
  get agents(): Agent[] { return []; }
  get farmers(): Farmer[] { return []; }
  get products(): Product[] { return []; }
  get orders(): Order[] { return []; }
  get reviews(): Review[] { return []; }
  get notifications(): Notification[] { return []; }

  get config(): PlatformConfig { return this._config; }

  set config(val: PlatformConfig) {
    this._config = val;
    this.getDb().then(db => db.collection("config").doc("default").set(val));
  }

  public save() {}

  async addUser(user: User) {
    const db = await this.getDb();
    await db.collection("users").doc(user.id).set(user);
  }

  async findUser(idOrEmail: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const db = await this.getDb();
    if (idOrEmail.includes('@')) {
      const snapshot = await db.collection("users").where("email", "==", idOrEmail.toLowerCase()).limit(1).get();
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as User;
      }
      return undefined;
    }
    const doc = await db.collection("users").doc(idOrEmail).get();
    return doc.exists ? doc.data() as User : undefined;
  }

  async addAgent(agent: Agent) {
    const db = await this.getDb();
    await db.collection("agents").doc(agent.userId).set(agent);
  }

  async addFarmer(farmer: Farmer) {
    const db = await this.getDb();
    await db.collection("farmers").doc(farmer.id).set(farmer);
  }

  async updateFarmer(id: string, updates: Partial<Farmer>) {
    const db = await this.getDb();
    await db.collection("farmers").doc(id).update(updates);
  }

  async addProduct(product: Product) {
    const db = await this.getDb();
    await db.collection("products").doc(product.id).set(product);
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    const db = await this.getDb();
    await db.collection("products").doc(id).update(updates);
  }

  async deleteProduct(id: string) {
    const db = await this.getDb();
    await db.collection("products").doc(id).delete();
  }

  async addOrder(order: Order) {
    const db = await this.getDb();
    await db.collection("orders").doc(order.id).set(order);
  }

  async addOrderProduct(orderProduct: OrderProduct & { orderId: string, id: string }) {
    const db = await this.getDb();
    const { orderId, ...productData } = orderProduct;
    await db.collection("orders").doc(orderId)
      .collection("orderProducts").doc(orderProduct.id).set(productData);
  }

  async updateOrder(id: string, updates: Partial<Order>) {
    const db = await this.getDb();
    await db.collection("orders").doc(id).update(updates);
  }

  async addReview(review: Review) {
    const db = await this.getDb();
    await db.collection("reviews").doc(review.id).set(review);
  }

  async deleteReview(id: string) {
    const db = await this.getDb();
    await db.collection("reviews").doc(id).delete();
  }

  async addNotification(notification: Notification) {
    const db = await this.getDb();
    await db.collection("notifications").doc(notification.id).set(notification);
  }

  async markNotificationRead(id: string) {
    const db = await this.getDb();
    await db.collection("notifications").doc(id).update({ read: true });
  }

  async markAllNotificationsRead(userId: string) {
    const db = await this.getDb();
    const snapshot = await db.collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  }

  async updateUser(id: string, updates: Partial<User>) {
    const db = await this.getDb();
    await db.collection("users").doc(id).update(updates);
  }

  async updateAgentApproval(userId: string, approvalStatus: string) {
    const db = await this.getDb();
    await db.collection("agents").doc(userId).update({ approvalStatus });
  }
}

export const firebaseDb = new FirebaseDb();
export const db = firebaseDb;