export interface User {
  id: string;
  name: string;
  email: string;
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

export interface Analytics {
  totalRevenue: number;
  totalFarmerPayouts: number;
  totalAgentCommissions: number;
  totalPlatformFees: number;
  usersCount: number;
  agentsCount: number;
  farmersCount: number;
  productsCount: number;
  ordersCount: number;
  recentOrders: Order[];
}
