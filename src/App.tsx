import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout, ShoppingCart, LogOut, CheckCircle, Clock, Trash, X, AlertTriangle, Leaf
} from "lucide-react";
import { User, Farmer, Product, Order, Review, Notification, PlatformConfig, Analytics } from "./types";

import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Products from "./pages/Products";
import FarmerManagement from "./pages/FarmerManagement";
import FarmerVerification from "./pages/Admin/FarmerVerification";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

function AgroBridgeApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const getStoredToken = () => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("agrobridge_token") || "";
  };

  // Navigation & User Session State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(getStoredToken);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Core Data Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Buyer State
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [showCart, setShowCart] = useState(false);

  // Admin Config & Users Lists
  const [config, setConfig] = useState<PlatformConfig>({ farmerPercentage: 85, agentPercentage: 10, platformPercentage: 5 });
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [adminUsers, setAdminUsers] = useState<(User & { agentProfile?: any })[]>([]);

  // Form Modals
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [farmerForm, setFarmerForm] = useState<Partial<Farmer>>({ name: "", village: "", location: "Mityana", phone: "", farmSize: "", cropTypes: [], notes: "" });
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({ name: "", category: "Fruits & Bananas", description: "", price: 0, stock: 100, unit: "Bunch", availability: "immediate", farmerId: "" });

  // 1. Toast triggers
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthToken = () => token || getStoredToken();

  // 2. Fetch Helper with token
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const authToken = getAuthToken();
    const authHeaders = {
      "Content-Type": "application/json",
      ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {})
    };
    const mergedHeaders = {
      ...((options.headers as Record<string, string>) || {}),
      ...authHeaders,
    };

    const res = await fetch(endpoint, { ...options, headers: mergedHeaders, credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }
    return data;
  };

  const restoreSession = async () => {
    const storedToken = getStoredToken();
    // If no token stored, skip the API call entirely
    if (!storedToken) {
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${storedToken}`,
        },
        credentials: "include",
      });
      if (!res.ok) {
        setToken("");
        setUser(null);
        window.localStorage.removeItem("agrobridge_token");
        return;
      }
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
      }
      if (data?.token) {
        setToken(data.token);
        window.localStorage.setItem("agrobridge_token", data.token);
      }
    } catch (err) {
      console.error("Session restore failed:", err);
      setToken("");
      setUser(null);
      window.localStorage.removeItem("agrobridge_token");
    }
  };

  // 3. Load initial data
  const loadMarketData = async () => {
    try {
      const prods = await apiFetch("/api/products");
      setProducts(prods);
    } catch (e: any) {
      console.error(e);
    }
  };

  // 4. Load Authenticated Data
  const loadAuthData = async () => {
    if (!token) return;
    try {
      const ordersData = await apiFetch("/api/orders");
      setOrders(ordersData);

      const notifs = await apiFetch("/api/notifications");
      setNotifications(notifs);

      if (user?.role === "agent" || user?.role === "admin") {
        const farmList = await apiFetch("/api/farmers");
        setFarmers(farmList.filter((f: Farmer) => f.status === "active"));
      }

      if (user?.role === "admin") {
        const stats = await apiFetch("/api/admin/analytics");
        setAnalytics(stats);
        const uList = await apiFetch("/api/admin/users");
        setAdminUsers(uList);
        const cfg = await apiFetch("/api/admin/config");
        setConfig(cfg);
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  useEffect(() => {
    loadMarketData();
    restoreSession();
  }, []);

  useEffect(() => {
    if (token && user) {
      loadAuthData();
    }
  }, [token, user]);

const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setUser(null);
      setToken("");
      window.localStorage.removeItem("agrobridge_token");
      setCart([]);
      setOrders([]);
      navigate("/");
      showToast("Logged out successfully");
    } catch (e) {
      setUser(null);
      setToken("");
      window.localStorage.removeItem("agrobridge_token");
    }
  };

  // Checkout Handler
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!shippingAddress || !phone) {
      showToast("Please provide delivery details", "error");
      return;
    }
    try {
      const payload = {
        cartItems: cart.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity })),
        shippingAddress,
        phone
      };
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setCart([]);
      setShowCart(false);
      showToast("Order placed successfully! Agro Agents have been notified.");
      loadMarketData();
      loadAuthData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Add/Edit Farmer (Agent Only)
  const saveFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = farmerForm.id ? "PUT" : "POST";
      const endpoint = farmerForm.id ? `/api/farmers/${farmerForm.id}` : "/api/farmers";

      // Parse crop types string if manual typing input is used
      const cropTypesParsed = typeof farmerForm.cropTypes === "string"
        ? (farmerForm.cropTypes as string).split(",").map(c => c.trim()).filter(Boolean)
        : farmerForm.cropTypes;

      await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...farmerForm,
          cropTypes: cropTypesParsed
        })
      });
      showToast(farmerForm.id ? "Farmer profile updated" : "New farmer registered");
      setShowFarmerModal(false);
      setFarmerForm({ name: "", village: "", location: "Mityana", phone: "", farmSize: "", cropTypes: [], notes: "" });
      loadAuthData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Add/Edit Product (Agent Only)
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = productForm.id ? "PUT" : "POST";
      const endpoint = productForm.id ? `/api/products/${productForm.id}` : "/api/products";
      await apiFetch(endpoint, {
        method,
        body: JSON.stringify(productForm)
      });
      showToast(productForm.id ? "Product catalog entry updated" : "Product catalog entry added");
      setShowProductModal(false);
      setProductForm({ name: "", category: "Fruits & Bananas", description: "", price: 0, stock: 100, unit: "Bunch", availability: "immediate", farmerId: "" });
      loadMarketData();
      loadAuthData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Update Order Status (Agent & Admin)
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({ deliveryStatus: status })
      });
      showToast(`Order status set to ${status.toUpperCase()}`);
      loadAuthData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Admin Approval
  const updateAgentStatus = async (userId: string, status: "approved" | "rejected") => {
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ approvalStatus: status })
      });
      showToast(`Agent has been ${status}`);
      loadAuthData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Admin Config Update
  const updateSplitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/admin/config", {
        method: "POST",
        body: JSON.stringify(config)
      });
      showToast("Platform commission splits updated", "success");
      loadAuthData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Submit Review (Buyer)
  const submitReview = async (productId: string, rating: number, comment: string) => {
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ productId, rating, comment })
      });
      showToast("Review submitted successfully");
      loadMarketData();
    } catch (e: any) {
      showToast(e.message, "error");
      throw e;
    }
  };

  return (
    <div id="agrobridge_app" className="min-h-screen bg-[#0A0D0A] text-gray-200 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Toast Overlay */}
      {toast && (
        <div id="toast_popup" className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-lg shadow-xl backdrop-blur-md border ${toast.type === "success" ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-300" : "bg-red-950/95 border-red-500/30 text-red-300"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Top Main Navigation Bar */}
      <header id="main_header" className="sticky top-0 z-40 bg-[#060806]/90 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-emerald-500 rounded flex items-center justify-center font-bold text-black shadow-lg shadow-emerald-500/10">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-serif italic font-bold tracking-tight text-emerald-50">AgroBridge</span>
              <span className="block text-[9px] uppercase tracking-[0.2em] text-emerald-500/80 font-bold">Proxy Farmers Marketplace</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className={`hover:text-emerald-400 transition-colors ${location.pathname === "/" ? "text-emerald-400" : "text-white/70"}`}>Home</Link>
            <Link to="/marketplace" className={`hover:text-emerald-400 transition-colors ${location.pathname === "/marketplace" ? "text-emerald-400" : "text-white/70"}`}>Marketplace</Link>
            {user && (
              <Link to="/dashboard" className={`hover:text-emerald-400 transition-colors ${location.pathname === "/dashboard" ? "text-emerald-400" : "text-white/70"}`}>My Dashboard ({user.role})</Link>
            )}
            <Link to="/about" className={`hover:text-emerald-400 transition-colors ${location.pathname === "/about" ? "text-emerald-400" : "text-white/70"}`}>About Model</Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Cart Button */}
            <button onClick={() => setShowCart(true)} className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 text-white transition-all cursor-pointer">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

{!user ? (
              <button
                onClick={() => navigate("/auth/login")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded flex items-center gap-2 transition-all cursor-pointer"
              >
                Sign In / Register
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-semibold text-emerald-50">{user.name}</div>
                  <div className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest">{user.role} profile</div>
                </div>
                <button onClick={handleLogout} className="p-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-full transition-all cursor-pointer" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

{/* Main Area Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          <Routes>
<Route path="/" element={
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 transition={{ duration: 0.3 }}
               >
                 <Home
                   products={products}
                   user={user}
                   setSelectedProduct={setSelectedProduct}
                 />
               </motion.div>
             } />
            <Route path="/marketplace" element={
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Marketplace
                  products={products}
                  selectedProduct={selectedProduct}
                  setSelectedProduct={setSelectedProduct}
                  cart={cart}
                  setCart={setCart}
                  user={user}
                  showToast={showToast}
                  onSubmitReview={submitReview}
                />
              </motion.div>
            } />
            <Route path="/products" element={
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Products
                  products={products}
                  cart={cart}
                  setCart={setCart}
                  showToast={showToast}
                  apiFetch={apiFetch}
                />
              </motion.div>
            } />
            <Route path="/auth/login" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Login apiFetch={apiFetch} showToast={showToast} />
              </motion.div>
            } />
            <Route path="/auth/register" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Register apiFetch={apiFetch} showToast={showToast} />
              </motion.div>
            } />
            <Route path="/farmers" element={
              user?.role === "agent" ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <FarmerManagement
                    farmers={farmers}
                    setFarmerForm={setFarmerForm}
                    setShowFarmerModal={setShowFarmerModal}
                    apiFetch={apiFetch}
                    showToast={showToast}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="py-20 text-center">Access denied. Agents only.</div>
                </motion.div>
              )
            } />
            <Route path="/admin/farmers" element={
              user?.role === "admin" ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <FarmerVerification apiFetch={apiFetch} showToast={showToast} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="py-20 text-center">Access denied. Admin only.</div>
                </motion.div>
              )
            } />
<Route path="/dashboard" element={
            user ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Dashboard
                  user={user}
                  farmers={farmers}
                  orders={orders}
                  adminUsers={adminUsers}
                  analytics={analytics}
                  config={config}
                  setConfig={setConfig}
                  updateSplitConfig={updateSplitConfig}
                  updateAgentStatus={updateAgentStatus}
                  updateOrderStatus={updateOrderStatus}
                  setFarmerForm={setFarmerForm}
                  setShowFarmerModal={setShowFarmerModal}
                  setProductForm={setProductForm}
                  setShowProductModal={setShowProductModal}
                  apiFetch={apiFetch}
                  showToast={showToast}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
<div className="py-20 text-center max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                      <Leaf className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-serif italic text-emerald-50 font-medium">Dashboard Restricted</h2>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Please sign in to access your personalized dashboard. Agents and Admins must register and await approval.
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <button onClick={() => navigate("/auth/login")} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded cursor-pointer">Sign In</button>
                      <button onClick={() => navigate("/auth/register")} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded cursor-pointer">Register</button>
                    </div>
                  </div>
              </motion.div>
            )
          } />
            <Route path="/about" element={
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <About />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Cart Slider / Drawer overlay */}
      {showCart && (
        <div id="cart_overlay" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#0C100C] border-l border-white/5 h-full flex flex-col p-6 space-y-6 relative text-sm">
            <button onClick={() => setShowCart(false)} className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer">
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="border-b border-white/5 pb-4">
              <h2 className="text-xl font-serif italic text-emerald-50">Sourced Cart Logs</h2>
              <p className="text-[11px] text-white/40">Itemized proxy farm bookings.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#121812] border border-white/5 rounded-lg">
                  <div className="w-12 h-12 bg-zinc-950 rounded overflow-hidden">
                    <img src={item.product.images[0]} alt={item.product.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{item.product.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">FCFA {item.product.price.toLocaleString()} / {item.product.unit}</div>

                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => {
                        if (item.quantity > 1) {
                          item.quantity -= 1;
                          setCart([...cart]);
                        } else {
                          cart.splice(index, 1);
                          setCart([...cart]);
                        }
                      }} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-xs cursor-pointer">-</button>
                      <span className="font-mono text-white text-xs">{item.quantity}</span>
                      <button onClick={() => {
                        item.quantity += 1;
                        setCart([...cart]);
                      }} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-xs cursor-pointer">+</button>
                    </div>
                  </div>
                  <button onClick={() => { cart.splice(index, 1); setCart([...cart]); }} className="p-1 text-red-400 hover:bg-red-950/20 rounded cursor-pointer">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {cart.length === 0 && (
                <p className="text-center text-white/30 py-10">Your food basket is currently empty.</p>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/5 bg-transparent">
                <div className="space-y-2 text-xs bg-[#121812] p-4 rounded border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">Expected Financial Splits:</span>
                  <div className="flex justify-between text-white/50">
                    <span>Farmer Payout (85%)</span>
                    <span className="font-mono text-emerald-400">FCFA {(cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) * 0.85).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Agent Commission (10%)</span>
                    <span className="font-mono">FCFA {(cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) * 0.10).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Platform Fee (5%)</span>
                    <span className="font-mono">FCFA {(cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) * 0.05).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold text-white">
                    <span>Total Bill:</span>
                    <span className="font-mono text-emerald-400">FCFA {cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-white/50 mb-1">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot 42 Wandegeya, Kampala"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-white/50 mb-1">Mobile Money Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +256 701 111222"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <button onClick={handleCheckout} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-all cursor-pointer">
                    Authorize Payment & Dispatch Proxy Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FARMER PROFILE MODAL (Agent Only) */}
      {showFarmerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121812] border border-white/5 p-6 rounded-lg space-y-4 relative">
            <button onClick={() => setShowFarmerModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-serif italic text-emerald-50">{farmerForm.id ? "Edit Farmer Profile" : "Register Farmer Profile"}</h3>

            <form onSubmit={saveFarmer} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Farmer Full Name</label>
                <input required type="text" value={farmerForm.name} onChange={(e) => setFarmerForm({...farmerForm, name: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Village</label>
                  <input required type="text" value={farmerForm.village} onChange={(e) => setFarmerForm({...farmerForm, village: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">District Location</label>
                  <input required type="text" value={farmerForm.location} onChange={(e) => setFarmerForm({...farmerForm, location: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Acreage size</label>
                  <input required type="text" placeholder="e.g. 4.5" value={farmerForm.farmSize} onChange={(e) => setFarmerForm({...farmerForm, farmSize: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Offline Phone</label>
                  <input required type="text" placeholder="+256..." value={farmerForm.phone} onChange={(e) => setFarmerForm({...farmerForm, phone: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-1">Crops grown (comma-separated)</label>
                <input required type="text" placeholder="Matooke, Coffee, Beans" value={Array.isArray(farmerForm.cropTypes) ? farmerForm.cropTypes.join(", ") : farmerForm.cropTypes} onChange={(e) => setFarmerForm({...farmerForm, cropTypes: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Extension Service Notes</label>
                <textarea rows={3} value={farmerForm.notes} onChange={(e) => setFarmerForm({...farmerForm, notes: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
              </div>

              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-all mt-2 cursor-pointer">
                Commit Farmer Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT CATALOG ENTRY MODAL (Agent Only) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121812] border border-white/5 p-6 rounded-lg space-y-4 relative">
            <button onClick={() => setShowProductModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-serif italic text-emerald-50">{productForm.id ? "Edit Produce Entry" : "Post Produce Entry"}</h3>

            <form onSubmit={saveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Represented Farmer</label>
                <select required value={productForm.farmerId} onChange={(e) => setProductForm({...productForm, farmerId: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none">
                  <option value="">Select represented farmer</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Produce Name</label>
                  <input required type="text" placeholder="e.g. Arabica Beans" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Category</label>
                  <select required value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none">
                    <option value="Fruits & Bananas">Fruits & Bananas</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Grains & Seeds">Grains & Seeds</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Price (FCFA)</label>
                  <input required type="number" value={productForm.price || ""} onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Stock</label>
                  <input required type="number" value={productForm.stock || ""} onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Unit</label>
                  <select required value={productForm.unit} onChange={(e) => setProductForm({...productForm, unit: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none">
                    <option value="Bunch">Bunch</option>
                    <option value="kg">kg</option>
                    <option value="Crate (25kg)">Crate (25kg)</option>
                    <option value="Piece">Piece</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-1">Produce Description</label>
                <textarea rows={3} value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none" />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Availability</label>
                <select required value={productForm.availability} onChange={(e) => setProductForm({...productForm, availability: e.target.value as any})} className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none">
                  <option value="immediate">Immediate</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-all mt-2 cursor-pointer">
                Commit Produce Listing
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Humble Footer containing model details */}
      <footer className="border-t border-white/5 py-12 bg-[#060806]/80 text-center text-xs text-white/30 font-light space-y-2">
        <div className="flex justify-center items-center gap-2 text-emerald-400 font-bold">
          <Sprout className="w-4 h-4" /> AgroBridge System Ecosystem
        </div>
        <p>Â© 2026 AgroBridge Inc. All rights reserved. Registered proxies operating under Wakiso Cooperative grids.</p>
        <p className="font-mono text-[10px]">Real-time AI Grounding utilizing Google Gemini-3.5-Flash capabilities.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AgroBridgeApp />
    </BrowserRouter>
  );
}
