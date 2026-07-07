import express from "express";
import path from "path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { db, User, Farmer, Product, Order, Review, Notification, PlatformConfig } from "../server/db.js";
import authRouter, { authenticate, requireRole, AuthenticatedRequest } from "../server/auth.js";
import aiRouter from "../server/ai.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

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

// REGISTER BACKEND ROUTERS
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);

// ----------------------------------------------------
// FARMERS API
// ----------------------------------------------------
app.get("/api/farmers", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  try {
    if (user.role === "admin") {
      const farmers = await db.getFarmers();
      return res.json(farmers);
    } else if (user.role === "agent") {
      const farmers = await db.getFarmers();
      const list = farmers.filter(f => f.agentId === user.id);
      return res.json(list);
    }
    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    console.error("Get farmers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/farmers", authenticate, requireRole(["agent"]), async (req: AuthenticatedRequest, res) => {
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

  try {
    await db.addFarmer(newFarmer);
    res.status(201).json(newFarmer);
  } catch (err) {
    console.error("Add farmer error:", err);
    res.status(500).json({ error: "Failed to add farmer" });
  }
});

app.put("/api/farmers/:id", authenticate, requireRole(["agent"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  try {
    const farmers = await db.getFarmers();
    const farmer = farmers.find(f => f.id === req.params.id && f.agentId === user.id);

    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found or unauthorized" });
    }

    await db.updateFarmer(req.params.id, req.body);
    const updatedFarmers = await db.getFarmers();
    const updatedFarmer = updatedFarmers.find(f => f.id === req.params.id);
    res.json(updatedFarmer);
  } catch (err) {
    console.error("Update farmer error:", err);
    res.status(500).json({ error: "Failed to update farmer" });
  }
});

app.delete("/api/farmers/:id", authenticate, requireRole(["agent"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  try {
    const farmers = await db.getFarmers();
    const farmer = farmers.find(f => f.id === req.params.id && f.agentId === user.id);

    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found or unauthorized" });
    }

    // Soft archive
    await db.updateFarmer(req.params.id, { status: "archived" });

    res.json({ message: "Farmer archived successfully" });
  } catch (err) {
    console.error("Delete farmer error:", err);
    res.status(500).json({ error: "Failed to archive farmer" });
  }
});

// ----------------------------------------------------
// PRODUCTS API (Public browse + Agent manage)
// ----------------------------------------------------
app.get("/api/products", async (req, res) => {
  try {
    const { category, search, agentId } = req.query;
    let products = await db.getProducts();

    if (category) {
      products = products.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
    }

    if (search) {
      const q = (search as string).toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    if (agentId) {
      // Find farmers represented by this agent
      const farmers = await db.getFarmers();
      const farmerIds = farmers.filter(f => f.agentId === agentId).map(f => f.id);
      products = products.filter(p => farmerIds.includes(p.farmerId));
    }

    res.json(products);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Failed to get products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const products = await db.getProducts();
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ error: "Failed to get product" });
  }
});

app.post("/api/products", authenticate, requireRole(["agent"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { farmerId, category, name, description, price, stock, unit, images, availability } = req.body;

  if (!farmerId || !category || !name || !price || !stock || !unit) {
    return res.status(400).json({ error: "Missing required product fields" });
  }

  try {
    // Verify farmer belongs to this agent
    const farmers = await db.getFarmers();
    const farmer = farmers.find(f => f.id === farmerId && f.agentId === user.id);
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

    await db.addProduct(newProduct);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

app.put("/api/products/:id", authenticate, requireRole(["agent"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  try {
    const products = await db.getProducts();
    const product = products.find(p => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Verify farmer belongs to this agent
    const farmers = await db.getFarmers();
    const farmer = farmers.find(f => f.id === product.farmerId && f.agentId === user.id);
    if (!farmer) {
      return res.status(403).json({ error: "Unauthorized: this product is not managed by your farmers" });
    }

    await db.updateProduct(req.params.id, req.body);
    const updatedProducts = await db.getProducts();
    res.json(updatedProducts.find(p => p.id === req.params.id));
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", authenticate, requireRole(["agent"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  try {
    const products = await db.getProducts();
    const product = products.find(p => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const farmers = await db.getFarmers();
    const farmer = farmers.find(f => f.id === product.farmerId && f.agentId === user.id);
    if (!farmer) {
      return res.status(403).json({ error: "Unauthorized: this product is not managed by your farmers" });
    }

    await db.deleteProduct(req.params.id);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ----------------------------------------------------
// COMMISSION UTILITY / CONFIG
// ----------------------------------------------------
export function commissionSplit(totalAmount: number, config: PlatformConfig) {
  const farmerAmount = Math.round((totalAmount * config.farmerPercentage) / 100);
  const agentCommission = Math.round((totalAmount * config.agentPercentage) / 100);
  const platformFee = totalAmount - farmerAmount - agentCommission;

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
app.get("/api/orders", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  try {
    if (user.role === "admin") {
      const orders = await db.getOrders();
      return res.json(orders);
    } else if (user.role === "buyer") {
      const orders = await db.getOrders();
      const list = orders.filter(o => o.buyerId === user.id);
      return res.json(list);
    } else if (user.role === "agent") {
      const orders = await db.getOrders();
      const farmers = await db.getFarmers();
      const myFarmerIds = farmers.filter(f => f.agentId === user.id).map(f => f.id);
      const filteredOrders = orders.filter(o => {
        return o.products.some(p => myFarmerIds.includes(p.farmerId));
      }).map(o => {
        const scopedProducts = o.products.filter(p => myFarmerIds.includes(p.farmerId));
        const partialTotal = scopedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const split = commissionSplit(partialTotal, db.config);
        return {
          ...o,
          products: scopedProducts,
          totals: { ...split, total: partialTotal }
        };
      });
      return res.json(filteredOrders);
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to get orders" });
  }
});

app.post("/api/orders", authenticate, requireRole(["buyer"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { cartItems, shippingAddress, phone } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0 || !shippingAddress || !phone) {
    return res.status(400).json({ error: "Missing cart items or shipping details" });
  }

  try {
    let totalAmount = 0;
    const orderProducts: any[] = [];
    const notificationsToCreate: any[] = [];

    for (const item of cartItems) {
      const products = await db.getProducts();
      const dbProduct = products.find(p => p.id === item.productId);
      if (!dbProduct) {
        return res.status(400).json({ error: `Product ${item.name || item.productId} no longer exists.` });
      }

      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${dbProduct.name}. Requested ${item.quantity}, available ${dbProduct.stock}.` });
      }

      // Deduct stock
      await db.updateProduct(dbProduct.id, { stock: dbProduct.stock - item.quantity });

      const farmers = await db.getFarmers();
      const farmer = farmers.find(f => f.id === dbProduct.farmerId);
      if (!farmer) {
        return res.status(400).json({ error: "Farmer data inconsistency" });
      }

      const itemTotal = dbProduct.price * item.quantity;
      totalAmount += itemTotal;

      const opId = "op_" + Math.random().toString(36).substring(2, 11);
      orderProducts.push({
        id: opId,
        orderId: "ord_" + Math.floor(100 + Math.random() * 900),
        productId: dbProduct.id,
        name: dbProduct.name,
        quantity: item.quantity,
        price: dbProduct.price,
        unit: dbProduct.unit,
        farmerId: farmer.id,
        agentId: farmer.agentId,
      });

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
    const orderId = "ord_" + Math.floor(100 + Math.random() * 900);

    const newOrder: Order = {
      id: orderId,
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

    await db.addOrder(newOrder);
    
    for (const op of orderProducts) {
      await db.addOrderProduct({ ...op, orderId: orderId });
    }

    for (const notif of notificationsToCreate) {
      await db.addNotification(notif);
    }

    await db.addNotification({
      id: "not_" + Math.random().toString(36).substring(2, 11),
      userId: user.id,
      title: "Order Placed successfully",
      message: `Your order ${newOrder.id} of total FCFA ${totalAmount.toLocaleString()} has been sent to our Agro Agents.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.put("/api/orders/:id", authenticate, requireRole(["agent", "admin"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  try {
    const orders = await db.getOrders();
    const order = orders.find(o => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const { deliveryStatus, paymentStatus } = req.body;

    if (user.role === "agent") {
      const farmers = await db.getFarmers();
      const myFarmerIds = farmers.filter(f => f.agentId === user.id).map(f => f.id);
      const hasMyFarmerProduct = order.products.some(p => myFarmerIds.includes(p.farmerId));
      if (!hasMyFarmerProduct) {
        return res.status(403).json({ error: "Unauthorized: none of your farmers' products are in this order" });
      }
    }

    await db.updateOrder(req.params.id, { deliveryStatus, paymentStatus });

    await db.addNotification({
      id: "not_" + Math.random().toString(36).substring(2, 11),
      userId: order.buyerId,
      title: "Order Status Updated",
      message: `Your order ${order.id} status is now: ${deliveryStatus || order.deliveryStatus} (Payment: ${paymentStatus || order.paymentStatus})`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    const updatedOrders = await db.getOrders();
    res.json(updatedOrders.find(o => o.id === req.params.id));
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ----------------------------------------------------
// REVIEWS API
// ----------------------------------------------------
app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const reviews = await db.getReviews();
    const list = reviews.filter(r => r.productId === req.params.productId);
    res.json(list);
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ error: "Failed to get reviews" });
  }
});

app.post("/api/reviews", authenticate, requireRole(["buyer"]), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { productId, rating, comment } = req.body;

  if (!productId || !rating || !comment) {
    return res.status(400).json({ error: "Missing required review fields" });
  }

  try {
    const products = await db.getProducts();
    const productExists = products.some(p => p.id === productId);
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

    await db.addReview(newReview);

    res.status(201).json(newReview);
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ error: "Failed to add review" });
  }
});

app.delete("/api/reviews/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const reviews = await db.getReviews();
    const exists = reviews.some(r => r.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ error: "Review not found" });
    }
    await db.deleteReview(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS API
// ----------------------------------------------------
app.get("/api/notifications", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  try {
    const notifications = await db.getNotifications();
    const list = notifications.filter(n => n.userId === user.id);
    res.json(list);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

app.put("/api/notifications/:id/read", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  try {
    const notifications = await db.getNotifications();
    const notification = notifications.find(n => n.id === req.params.id && n.userId === user.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    await db.markNotificationRead(req.params.id);
    res.json({ ...notification, read: true });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Failed to mark notification read" });
  }
});

app.post("/api/notifications/read-all", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  try {
    await db.markAllNotificationsRead(user.id);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.status(500).json({ error: "Failed to mark all notifications read" });
  }
});

// ----------------------------------------------------
// ADMIN ONLY API: ANALYTICS & CONFIGS
// ----------------------------------------------------
app.get("/api/admin/analytics", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const orders = await db.getOrders();
    const users = await db.getUsers();
    const farmers = await db.getFarmers();
    const products = await db.getProducts();

    const totalRevenue = orders
      .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
      .reduce((sum, o) => sum + o.totals.total, 0);

    const totalFarmerPayouts = orders
      .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
      .reduce((sum, o) => sum + o.totals.farmerAmount, 0);

    const totalAgentCommissions = orders
      .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
      .reduce((sum, o) => sum + o.totals.agentCommission, 0);

    const totalPlatformFees = orders
      .filter(o => o.paymentStatus === "paid" || o.deliveryStatus === "delivered")
      .reduce((sum, o) => sum + o.totals.platformFee, 0);

    res.json({
      totalRevenue,
      totalFarmerPayouts,
      totalAgentCommissions,
      totalPlatformFees,
      usersCount: users.length,
      agentsCount: users.filter(u => u.role === "agent").length,
      farmersCount: farmers.filter(f => f.status === "active").length,
      productsCount: products.length,
      ordersCount: orders.length,
      recentOrders: orders.slice(-5).reverse(),
    });
  } catch (err) {
    console.error("Get analytics error:", err);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

app.get("/api/admin/config", authenticate, requireRole(["admin"]), (req, res) => {
  res.json(db.config);
});

app.post("/api/admin/config", authenticate, requireRole(["admin"]), async (req, res) => {
  const { farmerPercentage, agentPercentage, platformPercentage } = req.body;

  if (farmerPercentage === undefined || agentPercentage === undefined || platformPercentage === undefined) {
    return res.status(400).json({ error: "All percentage parameters are required" });
  }

  if (Number(farmerPercentage) + Number(agentPercentage) + Number(platformPercentage) !== 100) {
    return res.status(400).json({ error: "Sum of percentages must equal exactly 100" });
  }

  try {
    db.config = {
      farmerPercentage: Number(farmerPercentage),
      agentPercentage: Number(agentPercentage),
      platformPercentage: Number(platformPercentage),
    };

    const users = await db.getUsers();
    users.filter(u => u.role === "agent").forEach(async agent => {
      await db.addNotification({
        id: "not_" + Math.random().toString(36).substring(2, 11),
        userId: agent.id,
        title: "Platform Split Adjusted",
        message: `The AgroBridge splits are updated: Farmers (${farmerPercentage}%), Agents (${agentPercentage}%), Platform (${platformPercentage}%)`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    res.json(db.config);
  } catch (err) {
    console.error("Update config error:", err);
    res.status(500).json({ error: "Failed to update config" });
  }
});

// Admin endpoint to manage users (approve agents, suspend accounts)
app.get("/api/admin/users", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const users = await db.getUsers();
    const agents = await db.getAgents();
    const completeUsers = users.map(u => {
      const agentProfile = agents.find(a => a.userId === u.id);
      return { ...u, agentProfile };
    });
    res.json(completeUsers);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to get users" });
  }
});

app.put("/api/admin/users/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  const { verificationStatus, approvalStatus } = req.body;

  try {
    const users = await db.getUsers();
    const user = users.find(u => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.updateUser(req.params.id, { verificationStatus });

    if (user.role === "agent") {
      if (approvalStatus) {
        await db.updateAgentApproval(user.id, approvalStatus);
        if (approvalStatus === "approved") {
          await db.updateUser(user.id, { verificationStatus: "verified" });
        } else if (approvalStatus === "rejected") {
          await db.updateUser(user.id, { verificationStatus: "pending" });
        }
      }
    }

    res.json(users.find(u => u.id === req.params.id));
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default app;