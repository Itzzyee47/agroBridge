import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Collection Interfaces
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
  farmSize: string; // in acres
  cropTypes: string[];
  notes: string;
  createdAt: string;
  status: "active" | "archived";
}

export interface Product {
  id: string;
  farmerId: string;
  farmerName: string; // denormalized for easy display
  category: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  unit: string; // e.g. kg, bag, crate
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
  rating: number; // 1 to 5
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
  farmerPercentage: number; // e.g., 85
  agentPercentage: number;  // e.g., 10
  platformPercentage: number; // e.g., 5
}

// Database schema
interface DbSchema {
  users: User[];
  agents: Agent[];
  farmers: Farmer[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  notifications: Notification[];
  config: PlatformConfig;
}

const DB_FILE = path.join(DATA_DIR, "db.json");

// Default initial config
const defaultConfig: PlatformConfig = {
  farmerPercentage: 85,
  agentPercentage: 10,
  platformPercentage: 5,
};

// Password Helper
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "agrobridge_salt_2026").digest("hex");
}

class JsonDb {
  private data: DbSchema = {
    users: [],
    agents: [],
    farmers: [],
    products: [],
    orders: [],
    reviews: [],
    notifications: [],
    config: defaultConfig,
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        // Ensure config exists
        if (!this.data.config) {
          this.data.config = defaultConfig;
        }
      } else {
        this.seed();
        this.save();
      }
    } catch (e) {
      console.error("Failed to load JSON database:", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save JSON database:", e);
    }
  }

  // Collection Accessors
  get users() { return this.data.users; }
  get agents() { return this.data.agents; }
  get farmers() { return this.data.farmers; }
  get products() { return this.data.products; }
  get orders() { return this.data.orders; }
  get reviews() { return this.data.reviews; }
  get notifications() { return this.data.notifications; }
  get config() { return this.data.config; }
  set config(val: PlatformConfig) { this.data.config = val; }

  // Seed Initial Data
  private seed() {
    console.log("Seeding initial AgroBridge database...");

    const dateStr = new Date().toISOString();

    // 1. Create Users (admin, agents, buyers)
    const admin: User = {
      id: "usr_admin",
      name: "Mukasa David",
      email: "admin@agrobridge.com",
      passwordHash: hashPassword("admin123"),
      phone: "+256 772 123456",
      role: "admin",
      verificationStatus: "verified",
      createdAt: dateStr,
    };

    const agent1: User = {
      id: "usr_agent1",
      name: "Nsubuga Peter",
      email: "agent1@agrobridge.com",
      passwordHash: hashPassword("agent123"),
      phone: "+256 782 987654",
      role: "agent",
      verificationStatus: "verified",
      createdAt: dateStr,
    };

    const agent2: User = {
      id: "usr_agent2",
      name: "Aisha Kamara",
      email: "agent2@agrobridge.com",
      passwordHash: hashPassword("agent123"),
      phone: "+256 752 444555",
      role: "agent",
      verificationStatus: "verified",
      createdAt: dateStr,
    };

    const buyer1: User = {
      id: "usr_buyer1",
      name: "Sarah Namubiru",
      email: "buyer@agrobridge.com",
      passwordHash: hashPassword("buyer123"),
      phone: "+256 701 111222",
      role: "buyer",
      verificationStatus: "verified",
      createdAt: dateStr,
    };

    this.data.users = [admin, agent1, agent2, buyer1];

    // 2. Create Agent Profiles
    this.data.agents = [
      {
        userId: "usr_agent1",
        nationalId: "NIN-UG-19887722A",
        serviceArea: "Mityana & Wakiso Districts",
        approvalStatus: "approved",
      },
      {
        userId: "usr_agent2",
        nationalId: "NIN-UG-19942233B",
        serviceArea: "Luweero Rural Cooperatives",
        approvalStatus: "approved",
      }
    ];

    // 3. Create Farmers Represented by Agents
    const farmer1: Farmer = {
      id: "farm_1",
      agentId: "usr_agent1",
      name: "John Ssekandi",
      village: "Kikandwa Village",
      location: "Mityana",
      phone: "+256 774 000111", // offline/basic phone
      farmSize: "4.5",
      cropTypes: ["Matooke", "Coffee", "Cassava"],
      notes: "Ssekandi is a third-generation coffee and banana farmer. He has a highly productive organic farm but suffers from transport constraints.",
      createdAt: dateStr,
      status: "active",
    };

    const farmer2: Farmer = {
      id: "farm_2",
      agentId: "usr_agent1",
      name: "Grace Nakato",
      village: "Namutamba Rural",
      location: "Mityana",
      phone: "+256 781 222333",
      farmSize: "2.0",
      cropTypes: ["Tomatoes", "Onions", "Green Peppers"],
      notes: " Nakato specializes in vegetable horticulture using basic gravity drip irrigation. Reliable water source but lacks market access.",
      createdAt: dateStr,
      status: "active",
    };

    const farmer3: Farmer = {
      id: "farm_3",
      agentId: "usr_agent2",
      name: "Yusuf Kato",
      village: "Kikyusa Village",
      location: "Luweero",
      phone: "+256 754 555666",
      farmSize: "8.0",
      cropTypes: ["Pineapples", "Maize"],
      notes: "Kato is an experienced sweet organic pineapple farmer. Owns medium acreage, produces high-yield seasonal harvests.",
      createdAt: dateStr,
      status: "active",
    };

    this.data.farmers = [farmer1, farmer2, farmer3];

    // 4. Create Products
    const prod1: Product = {
      id: "prod_1",
      farmerId: "farm_1",
      farmerName: "John Ssekandi",
      category: "Fruits & Bananas",
      name: "Organic Matooke (Green Bananas)",
      description: "Extra large green banana bunches. Freshly cut on demand, heavy starch, traditional cooking quality directly from Ssekandi's grove.",
      price: 25000, // UGX per bunch
      stock: 45,
      unit: "Bunch",
      images: [
        "https://images.unsplash.com/photo-1566393028639-d108a42c46a7?auto=format&fit=crop&q=80&w=600"
      ],
      availability: "immediate",
      createdAt: dateStr,
    };

    const prod2: Product = {
      id: "prod_2",
      farmerId: "farm_1",
      farmerName: "John Ssekandi",
      category: "Grains & Seeds",
      name: "Arabica Coffee Beans (AA Grade)",
      description: "Sun-dried organic Arabica coffee beans. Handpicked, expertly hulled, ready for roasting. Premium harvest with rich chocolatey notes.",
      price: 9000, // UGX per kg
      stock: 350,
      unit: "kg",
      images: [
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600"
      ],
      availability: "immediate",
      createdAt: dateStr,
    };

    const prod3: Product = {
      id: "prod_3",
      farmerId: "farm_2",
      farmerName: "Grace Nakato",
      category: "Vegetables",
      name: "Fresh Vine-Ripened Tomatoes",
      description: "Firm, juicy red tomatoes grown with organic compost. Handpicked at perfect maturity. Perfect for markets and restaurants.",
      price: 45000, // UGX per crate
      stock: 12,
      unit: "Crate (25kg)",
      images: [
        "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"
      ],
      availability: "immediate",
      createdAt: dateStr,
    };

    const prod4: Product = {
      id: "prod_4",
      farmerId: "farm_3",
      farmerName: "Yusuf Kato",
      category: "Fruits & Bananas",
      name: "Sweet Cayenne Pineapples",
      description: "Luweero's legendary honey-sweet pineapples. Large size, fragrant, thin skin and high sugar content. Organic certified.",
      price: 3500, // UGX per piece
      stock: 500,
      unit: "Piece",
      images: [
        "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=600"
      ],
      availability: "immediate",
      createdAt: dateStr,
    };

    this.data.products = [prod1, prod2, prod3, prod4];

    // 5. Create Reviews
    this.data.reviews = [
      {
        id: "rev_1",
        buyerId: "usr_buyer1",
        buyerName: "Sarah Namubiru",
        productId: "prod_1",
        rating: 5,
        comment: "Excellent Matooke! The bunch was massive and the bananas cooked so softly. Highly recommend Ssekandi's farm products.",
        createdAt: dateStr,
      },
      {
        id: "rev_2",
        buyerId: "usr_buyer1",
        buyerName: "Sarah Namubiru",
        productId: "prod_4",
        rating: 5,
        comment: "Luweero pineapples never disappoint! So sweet and juicy, children loved them.",
        createdAt: dateStr,
      }
    ];

    // 6. Create Initial Orders
    this.data.orders = [
      {
        id: "ord_101",
        buyerId: "usr_buyer1",
        buyerName: "Sarah Namubiru",
        products: [
          {
            productId: "prod_1",
            name: "Organic Matooke (Green Bananas)",
            quantity: 2,
            price: 25000,
            unit: "Bunch",
            farmerId: "farm_1",
            agentId: "usr_agent1"
          },
          {
            productId: "prod_4",
            name: "Sweet Cayenne Pineapples",
            quantity: 5,
            price: 3500,
            unit: "Piece",
            farmerId: "farm_3",
            agentId: "usr_agent2"
          }
        ],
        paymentStatus: "paid",
        deliveryStatus: "delivered",
        totals: {
          farmerAmount: 57375, // 85% of 67500
          agentCommission: 6750, // 10%
          platformFee: 3375, // 5%
          total: 67500,
        },
        shippingAddress: "Plot 42 Kampala Road, City Centre, Kampala",
        phone: "+256 701 111222",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
      {
        id: "ord_102",
        buyerId: "usr_buyer1",
        buyerName: "Sarah Namubiru",
        products: [
          {
            productId: "prod_3",
            name: "Fresh Vine-Ripened Tomatoes",
            quantity: 1,
            price: 45000,
            unit: "Crate (25kg)",
            farmerId: "farm_2",
            agentId: "usr_agent1"
          }
        ],
        paymentStatus: "pending",
        deliveryStatus: "confirmed",
        totals: {
          farmerAmount: 38250,
          agentCommission: 4500,
          platformFee: 2250,
          total: 45000,
        },
        shippingAddress: "Namubiru Kitchen, Wandegeya Market, Kampala",
        phone: "+256 701 111222",
        createdAt: dateStr,
      }
    ];

    // 7. Seed notifications
    this.data.notifications = [
      {
        id: "not_1",
        userId: "usr_agent1",
        title: "New Order Assigned",
        message: "Sarah Namubiru has ordered 1 crate of tomatoes from Grace Nakato.",
        read: false,
        createdAt: dateStr,
      },
      {
        id: "not_2",
        userId: "usr_admin",
        title: "Agent Registration Approved",
        message: "Nsubuga Peter is now a verified Agro Agent representing Mityana.",
        read: true,
        createdAt: dateStr,
      }
    ];
  }
}

export const db = new JsonDb();
