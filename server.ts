import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { db, User, Farmer, Product, Order, Review, Notification, PlatformConfig } from "./server/db.js";
import authRouter, { authenticate, requireRole, AuthenticatedRequest } from "./server/auth.js";
import aiRouter from "./server/ai.js";

dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Port configuration (Must be 3000 as per environment constraints)
const PORT = 3000;

// REGISTER BACKEND ROUTERS
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);

// ----------------------------------------------------
// FARMERS API
// ----------------------------------------------------
app.get("/api/farmers", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role === "admin") {
    return res.json(db.farmers);
  } else if (user.role === "agent") {
    const list = db.farmers.filter(f => f.agentId === user.id);
    return res.json(list);
  }
  return res.status(403).json({ error: "Access denied" });
});

app.post("/api/farmers", authenticate, requireRole(["agent"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { name, village, location, phone, farmSize, cropTypes, notes } = req.body;

  if (!name || !village || !location || !phone || !farmSize || !cropTypes) {
    return res.status(400).json({ error: "Missing required farmer fields" });
  }

  const farmerId = "farm_" + Math.random().toString(36).substring(2, 11);
  const newFarmer: Farmer = {
    id: farmerId,
    agentId: user.id,
    name,
    village,
    location,
    phone,
    farmSize,
    cropTypes: Array.isArray(cropTypes) ? cropTypes : cropTypes.split(",").map((s: string) => s.trim()),
    notes: notes || "",
    createdAt: new Date().toISOString(),
    status: "active",
  };

  db.farmers.push(newFarmer);
  db.save();

  res.status(201).json(newFarmer);
});

app.put("/api/farmers/:id", authenticate, requireRole(["agent"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const farmerIndex = db.farmers.findIndex(f => f.id === req.params.id && f.agentId === user.id);

  if (farmerIndex === -1) {
    return res.status(404).json({ error: "Farmer not found or unauthorized" });
  }

  const farmer = db.farmers[farmerIndex];
  const { name, village, location, phone, farmSize, cropTypes, notes, status } = req.body;

  if (name) farmer.name = name;
  if (village) farmer.village = village;
  if (location) farmer.location = location;
  if (phone) farmer.phone = phone;
  if (farmSize) farmer.farmSize = farmSize;
  if (cropTypes) farmer.cropTypes = Array.isArray(cropTypes) ? cropTypes : cropTypes.split(",").map((s: string) => s.trim());
  if (notes !== undefined) farmer.notes = notes;
  if (status) farmer.status = status;

  db.save();
  res.json(farmer);
});

app.delete("/api/farmers/:id", authenticate, requireRole(["agent"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const farmerIndex = db.farmers.findIndex(f => f.id === req.params.id && f.agentId === user.id);

  if (farmerIndex === -1) {
    return res.status(404).json({ error: "Farmer not found or unauthorized" });
  }

  // Soft archive
  db.farmers[farmerIndex].status = "archived";
  db.save();

  res.json({ message: "Farmer archived successfully" });
});

// ----------------------------------------------------
// PRODUCTS API (Public browse + Agent manage)
// ----------------------------------------------------
app.get("/api/products", (req, res) => {
  // Publicly accessible with optional filter
  const { category, search, agentId } = req.query;
  let list = db.products;

  if (category) {
    list = list.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  if (agentId) {
    // Find farmers represented by this agent
    const farmerIds = db.farmers.filter(f => f.agentId === agentId).map(f => f.id);
    list = list.filter(p => farmerIds.includes(p.farmerId));
  }

  res.json(list);
});

app.get("/api/products/:id", (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

app.post("/api/products", authenticate, requireRole(["agent"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { farmerId, category, name, description, price, stock, unit, images, availability } = req.body;

  if (!farmerId || !category || !name || !price || !stock || !unit) {
    return res.status(400).json({ error: "Missing required product fields" });
  }

  // Verify farmer belongs to this agent
  const farmer = db.farmers.find(f => f.id === farmerId && f.agentId === user.id);
  if (!farmer) {
    return res.status(400).json({ error: "Farmer not found or does not belong to this agent" });
  }

  const defaultImage = "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600";
  const newProduct: Product = {
    id: "prod_" + Math.random().toString(36).substring(2, 11),
    farmerId,
    farmerName: farmer.name,
    category,
    name,
    description: description || "",
    price: Number(price),
    stock: Number(stock),
    unit,
    images: Array.isArray(images) && images.length > 0 ? images : [defaultImage],
    availability: availability || "immediate",
    createdAt: new Date().toISOString(),
  };

  db.products.push(newProduct);
  db.save();

  res.status(201).json(newProduct);
});

app.put("/api/products/:id", authenticate, requireRole(["agent"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const productIndex = db.products.findIndex(p => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const product = db.products[productIndex];

  // Verify farmer belongs to this agent
  const farmer = db.farmers.find(f => f.id === product.farmerId && f.agentId === user.id);
  if (!farmer) {
    return res.status(403).json({ error: "Unauthorized: this product is not managed by your farmers" });
  }

  const { category, name, description, price, stock, unit, images, availability } = req.body;

  if (category) product.category = category;
  if (name) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (unit) product.unit = unit;
  if (images) product.images = images;
  if (availability) product.availability = availability;

  db.save();
  res.json(product);
});

app.delete("/api/products/:id", authenticate, requireRole(["agent"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const productIndex = db.products.findIndex(p => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const product = db.products[productIndex];
  const farmer = db.farmers.find(f => f.id === product.farmerId && f.agentId === user.id);
  if (!farmer) {
    return res.status(403).json({ error: "Unauthorized: this product is not managed by your farmers" });
  }

  db.products.splice(productIndex, 1);
  db.save();

  res.json({ message: "Product deleted successfully" });
});

// ----------------------------------------------------
// COMMISSION UTILITY / CONFIG
// ----------------------------------------------------
export function commissionSplit(totalAmount: number, config: PlatformConfig) {
  const farmerAmount = Math.round((totalAmount * config.farmerPercentage) / 100);
  const agentCommission = Math.round((totalAmount * config.agentPercentage) / 100);
  const platformFee = totalAmount - farmerAmount - agentCommission; // residual to balance

  return {
    farmerAmount,
    agentCommission,
    platformFee,
    total: totalAmount
  };
}

// ----------------------------------------------------
// ORDERS API
// ----------------------------------------------------
app.get("/api/orders", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  if (user.role === "admin") {
    return res.json(db.orders);
  } else if (user.role === "buyer") {
    const list = db.orders.filter(o => o.buyerId === user.id);
    return res.json(list);
  } else if (user.role === "agent") {
    // Agent only sees orders containing products of farmers they represent
    const myFarmerIds = db.farmers.filter(f => f.agentId === user.id).map(f => f.id);
    const filteredOrders = db.orders.filter(o => {
      return o.products.some(p => myFarmerIds.includes(p.farmerId));
    }).map(o => {
      // Return order with products scoped to this agent
      const scopedProducts = o.products.filter(p => myFarmerIds.includes(p.farmerId));
      const partialTotal = scopedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const split = commissionSplit(partialTotal, db.config);
      return {
        ...o,
        products: scopedProducts, // Only show their products
        totals: {
          ...split,
          total: partialTotal
        }
      };
    });
    return res.json(filteredOrders);
  }

  return res.status(403).json({ error: "Access denied" });
});

app.post("/api/orders", authenticate, requireRole(["buyer"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { cartItems, shippingAddress, phone } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0 || !shippingAddress || !phone) {
    return res.status(400).json({ error: "Missing cart items or shipping details" });
  }

  let totalAmount = 0;
  const orderProducts: any[] = [];
  const notificationsToCreate: any[] = [];

  for (const item of cartItems) {
    const dbProduct = db.products.find(p => p.id === item.productId);
    if (!dbProduct) {
      return res.status(400).json({ error: `Product ${item.name || item.productId} no longer exists.` });
    }

    if (dbProduct.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${dbProduct.name}. Requested ${item.quantity}, available ${dbProduct.stock}.` });
    }

    // Deduct stock
    dbProduct.stock -= item.quantity;

    const farmer = db.farmers.find(f => f.id === dbProduct.farmerId);
    if (!farmer) {
      return res.status(400).json({ error: "Farmer data inconsistency" });
    }

    const itemTotal = dbProduct.price * item.quantity;
    totalAmount += itemTotal;

    orderProducts.push({
      productId: dbProduct.id,
      name: dbProduct.name,
      quantity: item.quantity,
      price: dbProduct.price,
      unit: dbProduct.unit,
      farmerId: farmer.id,
      agentId: farmer.agentId,
    });

    // Notify respective agent
    notificationsToCreate.push({
      id: "not_" + Math.random().toString(36).substring(2, 11),
      userId: farmer.agentId,
      title: "New Produce Order",
      message: `${user.name} ordered ${item.quantity} ${dbProduct.unit} of ${dbProduct.name} representing farmer ${farmer.name}.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const split = commissionSplit(totalAmount, db.config);

  const newOrder: Order = {
    id: "ord_" + Math.floor(100 + Math.random() * 900), // Human friendly random ID e.g. ord_534
    buyerId: user.id,
    buyerName: user.name,
    products: orderProducts,
    paymentStatus: "pending",
    deliveryStatus: "pending",
    totals: split,
    shippingAddress,
    phone,
    createdAt: new Date().toISOString(),
  };

  db.orders.push(newOrder);

  // Add agent notifications
  db.notifications.push(...notificationsToCreate);

  // Add buyer notification
  db.notifications.push({
    id: "not_" + Math.random().toString(36).substring(2, 11),
    userId: user.id,
    title: "Order Placed successfully",
    message: `Your order ${newOrder.id} of total UGX ${totalAmount.toLocaleString()} has been sent to our Agro Agents.`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  db.save();

  res.status(201).json(newOrder);
});

app.put("/api/orders/:id", authenticate, requireRole(["agent", "admin"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const order = db.orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const { deliveryStatus, paymentStatus } = req.body;

  // If agent, make sure they own at least one crop in this order
  if (user.role === "agent") {
    const myFarmerIds = db.farmers.filter(f => f.agentId === user.id).map(f => f.id);
    const hasMyFarmerProduct = order.products.some(p => myFarmerIds.includes(p.farmerId));
    if (!hasMyFarmerProduct) {
      return res.status(403).json({ error: "Unauthorized: none of your farmers' products are in this order" });
    }
  }

  if (deliveryStatus) order.deliveryStatus = deliveryStatus;
  if (paymentStatus) order.paymentStatus = paymentStatus;

  // Add notification to buyer
  db.notifications.push({
    id: "not_" + Math.random().toString(36).substring(2, 11),
    userId: order.buyerId,
    title: `Order Status Updated`,
    message: `Your order ${order.id} status is now: ${deliveryStatus || order.deliveryStatus} (Payment: ${paymentStatus || order.paymentStatus})`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  db.save();
  res.json(order);
});

// ----------------------------------------------------
// REVIEWS API
// ----------------------------------------------------
app.get("/api/reviews/:productId", (req, res) => {
  const list = db.reviews.filter(r => r.productId === req.params.productId);
  res.json(list);
});

app.post("/api/reviews", authenticate, requireRole(["buyer"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { productId, rating, comment } = req.body;

  if (!productId || !rating || !comment) {
    return res.status(400).json({ error: "Missing required review fields" });
  }

  const productExists = db.products.some(p => p.id === productId);
  if (!productExists) {
    return res.status(400).json({ error: "Product does not exist" });
  }

  const newReview: Review = {
    id: "rev_" + Math.random().toString(36).substring(2, 11),
    buyerId: user.id,
    buyerName: user.name,
    productId,
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString(),
  };

  db.reviews.push(newReview);
  db.save();

  res.status(201).json(newReview);
});

app.delete("/api/reviews/:id", authenticate, requireRole(["admin"]), (req, res) => {
  const index = db.reviews.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Review not found" });
  }
  db.reviews.splice(index, 1);
  db.save();
  res.json({ message: "Review deleted successfully" });
});

// ----------------------------------------------------
// NOTIFICATIONS API
// ----------------------------------------------------
app.get("/api/notifications", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const list = db.notifications.filter(n => n.userId === user.id);
  res.json(list);
});

app.put("/api/notifications/:id/read", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notification = db.notifications.find(n => n.id === req.params.id && n.userId === user.id);
  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }
  notification.read = true;
  db.save();
  res.json(notification);
});

app.post("/api/notifications/read-all", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.notifications.forEach(n => {
    if (n.userId === user.id) {
      n.read = true;
    }
  });
  db.save();
  res.json({ message: "All notifications marked as read" });
});

// ----------------------------------------------------
// ADMIN ONLY API: ANALYTICS & CONFIGS
// ----------------------------------------------------
app.get("/api/admin/analytics", authenticate, requireRole(["admin"]), (req, res) => {
  const totalRevenue = db.orders
    .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
    .reduce((sum, o) => sum + o.totals.total, 0);

  const totalFarmerPayouts = db.orders
    .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
    .reduce((sum, o) => sum + o.totals.farmerAmount, 0);

  const totalAgentCommissions = db.orders
    .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
    .reduce((sum, o) => sum + o.totals.agentCommission, 0);

  const totalPlatformFees = db.orders
    .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
    .reduce((sum, o) => sum + o.totals.platformFee, 0);

  res.json({
    totalRevenue,
    totalFarmerPayouts,
    totalAgentCommissions,
    totalPlatformFees,
    usersCount: db.users.length,
    agentsCount: db.users.filter(u => u.role === "agent").length,
    farmersCount: db.farmers.filter(f => f.status === "active").length,
    productsCount: db.products.length,
    ordersCount: db.orders.length,
    recentOrders: db.orders.slice(-5).reverse(),
  });
});

app.get("/api/admin/config", authenticate, requireRole(["admin"]), (req, res) => {
  res.json(db.config);
});

app.post("/api/admin/config", authenticate, requireRole(["admin"]), (req, res) => {
  const { farmerPercentage, agentPercentage, platformPercentage } = req.body;

  if (farmerPercentage === undefined || agentPercentage === undefined || platformPercentage === undefined) {
    return res.status(400).json({ error: "All percentage parameters are required" });
  }

  if (Number(farmerPercentage) + Number(agentPercentage) + Number(platformPercentage) !== 100) {
    return res.status(400).json({ error: "Sum of percentages must equal exactly 100" });
  }

  db.config = {
    farmerPercentage: Number(farmerPercentage),
    agentPercentage: Number(agentPercentage),
    platformPercentage: Number(platformPercentage),
  };

  db.save();

  // Create a system-wide notification for agents about change
  db.users.filter(u => u.role === "agent").forEach(agent => {
    db.notifications.push({
      id: "not_" + Math.random().toString(36).substring(2, 11),
      userId: agent.id,
      title: "Platform Split Adjusted",
      message: `The AgroBridge splits are updated: Farmers (${farmerPercentage}%), Agents (${agentPercentage}%), Platform (${platformPercentage}%)`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  });
  db.save();

  res.json(db.config);
});

// Admin endpoint to manage users (approve agents, suspend accounts)
app.get("/api/admin/users", authenticate, requireRole(["admin"]), (req, res) => {
  // Return users with their profiles linked
  const completeUsers = db.users.map(u => {
    const agentProfile = db.agents.find(a => a.userId === u.id);
    return {
      ...u,
      agentProfile
    };
  });
  res.json(completeUsers);
});

app.put("/api/admin/users/:id", authenticate, requireRole(["admin"]), (req, res) => {
  const { verificationStatus, approvalStatus } = req.body;
  const user = db.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (verificationStatus) {
    user.verificationStatus = verificationStatus;
  }

  // Handle agent profile approvalStatus
  if (user.role === "agent") {
    const agentProfile = db.agents.find(a => a.userId === user.id);
    if (agentProfile) {
      if (approvalStatus) {
        agentProfile.approvalStatus = approvalStatus;
        if (approvalStatus === "approved") {
          user.verificationStatus = "verified";
        } else if (approvalStatus === "rejected") {
          user.verificationStatus = "pending";
        }
      }
    }
  }

  db.save();
  res.json(user);
});

// ----------------------------------------------------
// ROUTING / VITE MIDDLEWARE SETUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting AgroBridge in DEVELOPMENT Mode (Vite Middleware)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    console.log("Starting AgroBridge in PRODUCTION Mode...");
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 AgroBridge Express Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
