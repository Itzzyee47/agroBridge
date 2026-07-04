import React, { useState } from "react";
import {
  Plus, Edit, Eye, Trash, CheckCircle, Clock, Users, DollarSign, Brain, Star
} from "lucide-react";
import { User, Farmer, Order, PlatformConfig, Analytics } from "../types";

interface DashboardProps {
  user: User;
  farmers: Farmer[];
  orders: Order[];
  adminUsers: (User & { agentProfile?: any })[];
  analytics: Analytics | null;
  config: PlatformConfig;
  setConfig: React.Dispatch<React.SetStateAction<PlatformConfig>>;
  updateSplitConfig: (e: React.FormEvent) => Promise<void>;
  updateAgentStatus: (userId: string, status: "approved" | "rejected") => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  setFarmerForm: React.Dispatch<React.SetStateAction<Partial<Farmer>>>;
  setShowFarmerModal: (show: boolean) => void;
  setProductForm: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  setShowProductModal: (show: boolean) => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  showToast: (message: string, type?: "success" | "error") => void;
}

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  images: string[];
  availability: "immediate" | "seasonal" | "upcoming";
  farmerId: string;
  farmerName: string;
}

export default function Dashboard({
  user,
  farmers,
  orders,
  adminUsers,
  analytics,
  config,
  setConfig,
  updateSplitConfig,
  updateAgentStatus,
  updateOrderStatus,
  setFarmerForm,
  setShowFarmerModal,
  setProductForm,
  setShowProductModal,
  apiFetch,
  showToast
}: DashboardProps) {
  // Local state for Gemini AI Price Advisor
  const [aiCrop, setAiCrop] = useState("Organic Matooke (Green Bananas)");
  const [aiLocation, setAiLocation] = useState("Mityana");
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Local state for Gemini AI Agronomist Advisor
  const [farmAdviceInput, setFarmAdviceInput] = useState<{ size: string; crops: string; notes: string }>({
    size: "4.5",
    crops: "Matooke, Coffee",
    notes: "Needs drip irrigation advice"
  });
  const [farmAdviceResult, setFarmAdviceResult] = useState<any | null>(null);
  const [farmAdviceLoading, setFarmAdviceLoading] = useState(false);

  const runAiPricing = async () => {
    setAiLoading(true);
    try {
      const res = await apiFetch("/api/ai/price-prediction", {
        method: "POST",
        body: JSON.stringify({ crop: aiCrop, location: aiLocation })
      });
      setAiResult(res);
      showToast("AI Price model generated", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const runAiFarmAdvice = async () => {
    setFarmAdviceLoading(true);
    try {
      const res = await apiFetch("/api/ai/farm-recommendation", {
        method: "POST",
        body: JSON.stringify({
          size: farmAdviceInput.size,
          cropTypes: farmAdviceInput.crops.split(",").map(c => c.trim()),
          capacity: farmAdviceInput.notes
        })
      });
      setFarmAdviceResult(res);
      showToast("AI farming strategy drafted", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setFarmAdviceLoading(false);
    }
  };

  return (
    <div id="dashboard_tab" className="space-y-10">
      {/* AGENT DASHBOARD FLAVOUR */}
      {user.role === "agent" && (
        <div className="space-y-10">
          {/* Header overview banner */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 bg-[#121812] border border-white/5 rounded-xl">
            <div>
              <h2 className="text-2xl font-serif italic text-emerald-50">Agro Agent Workspace</h2>
              <p className="text-xs text-white/40">Proxying {farmers.length} active smallholders in Wakiso & Central Uganda.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFarmerForm({ name: "", village: "", location: "Mityana", phone: "", farmSize: "", cropTypes: [], notes: "" });
                  setShowFarmerModal(true);
                }}
                className="px-4 py-2.5 bg-[#080B08] hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Farmer Profile
              </button>
              <button
                onClick={() => {
                  setProductForm({ name: "", category: "Fruits & Bananas", description: "", price: 0, stock: 100, unit: "Bunch", availability: "immediate", farmerId: "" });
                  setShowProductModal(true);
                }}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Post Crop Listing
              </button>
            </div>
          </div>

          {/* Subsections grids */}
          <div className="grid grid-cols-12 gap-8">
            {/* Managed Farmers Registry (Col-8) */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-bold uppercase tracking-widest text-white/80">Represented Farmers Portfolio</h3>
                <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono">
                  {farmers.length} Registered
                </span>
              </div>

              <div className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-white/40 border-b border-white/5">
                        <th className="px-5 py-3.5">Farmer Name</th>
                        <th className="px-5 py-3.5">Acreage & Sector</th>
                        <th className="px-5 py-3.5">Crops Grown</th>
                        <th className="px-5 py-3.5">Registry Phone</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {farmers.map(farmer => (
                        <tr key={farmer.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4 font-semibold text-emerald-50">{farmer.name}</td>
                          <td className="px-5 py-4">
                            <div className="text-white">{farmer.farmSize} Acres</div>
                            <div className="text-white/30 text-[10px]">
                              {farmer.village}, {farmer.location}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {farmer.cropTypes.map(c => (
                                <span key={c} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/60">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-white/50">{farmer.phone}</td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setFarmerForm(farmer);
                                setShowFarmerModal(true);
                              }}
                              className="p-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {farmers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-white/30 text-xs">
                            No registered farmers managed.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Earnings Commission Splitting Panel (Col-4) */}
            <div className="col-span-12 lg:col-span-4 bg-[#121812] border border-white/5 p-6 rounded-lg space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-3">Earnings Ledger Split</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>Farmers Payout share (85%)</span>
                    <span className="font-mono text-emerald-400">
                      UGX {orders.reduce((sum, o) => sum + o.totals.farmerAmount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-emerald-500"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>Your Agent Commission (10%)</span>
                    <span className="font-mono text-white font-semibold">
                      UGX {orders.reduce((sum, o) => sum + o.totals.agentCommission, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[10%] h-full bg-white"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>Platform Maintenance Fee (5%)</span>
                    <span className="font-mono text-white/30">
                      UGX {orders.reduce((sum, o) => sum + o.totals.platformFee, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[5%] h-full bg-white/20"></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#080B08] border border-white/5 rounded text-center space-y-2">
                <span className="text-[10px] text-white/40 uppercase tracking-widest block">Available Agent Cashout</span>
                <div className="text-2xl font-mono text-emerald-400 font-bold">
                  UGX {(orders.reduce((sum, o) => sum + o.totals.agentCommission, 0) * 0.8).toLocaleString()}
                </div>
                <button
                  onClick={() => showToast("Payout request submitted to mobile money registrar", "success")}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded transition-all cursor-pointer"
                >
                  Request Mobile Money Transfer
                </button>
              </div>
            </div>
          </div>

          {/* AI Market Intel terminal Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Prices Prediction tool */}
            <div className="bg-[#080B08] border border-emerald-900/30 rounded-xl p-6 space-y-6 shadow-[0_0_12px_rgba(16,185,129,0.05)]">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Gemini Price Intelligence (2026 Index)
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Crop to Analyze</label>
                  <select
                    value={aiCrop}
                    onChange={(e) => setAiCrop(e.target.value)}
                    className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Organic Matooke (Green Bananas)">Organic Matooke</option>
                    <option value="Arabica Coffee Beans">Arabica Coffee Beans</option>
                    <option value="Fresh Vine-Ripened Tomatoes">Fresh Tomatoes</option>
                    <option value="Sweet Cayenne Pineapples">Luweero Pineapples</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">District / Hub Location</label>
                  <input
                    type="text"
                    value={aiLocation}
                    onChange={(e) => setAiLocation(e.target.value)}
                    className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  onClick={runAiPricing}
                  disabled={aiLoading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-bold rounded transition-all cursor-pointer"
                >
                  {aiLoading ? "Consulting Pricing API..." : "Run Price Prediction Model"}
                </button>
              </div>

              {aiResult && (
                <div className="p-4 bg-[#121812] rounded border border-emerald-500/20 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-semibold text-white/50">Predicted Price Range</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        aiResult.trend === "UP" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                      }`}
                    >
                      Trend: {aiResult.trend}
                    </span>
                  </div>
                  <div className="text-2xl font-mono text-emerald-400 font-bold">
                    UGX {aiResult.recommendedPrice.toLocaleString()} <span className="text-xs text-white/40">/ unit</span>
                  </div>
                  <p className="text-[11px] text-white/50 font-light leading-relaxed">{aiResult.explanation}</p>

                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[9px] uppercase font-bold text-emerald-400/80 block">Actionable Tips:</span>
                    {aiResult.tips.map((t: string, idx: number) => (
                      <p key={idx} className="text-[10px] text-white/70 pl-2 border-l border-emerald-500/30">
                        {t}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Farm Advisor tool */}
            <div className="bg-[#080B08] border border-emerald-900/30 rounded-xl p-6 space-y-6 shadow-[0_0_12px_rgba(16,185,129,0.05)]">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Agronomist Farm Strategy Advisor
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Acreage size</label>
                    <input
                      type="text"
                      value={farmAdviceInput.size}
                      onChange={(e) => setFarmAdviceInput({ ...farmAdviceInput, size: e.target.value })}
                      className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Crops grown</label>
                    <input
                      type="text"
                      value={farmAdviceInput.crops}
                      onChange={(e) => setFarmAdviceInput({ ...farmAdviceInput, crops: e.target.value })}
                      className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Soil / Irrigation constraints</label>
                  <input
                    type="text"
                    value={farmAdviceInput.notes}
                    onChange={(e) => setFarmAdviceInput({ ...farmAdviceInput, notes: e.target.value })}
                    className="w-full bg-[#121812] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  onClick={runAiFarmAdvice}
                  disabled={farmAdviceLoading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-bold rounded transition-all cursor-pointer"
                >
                  {farmAdviceLoading ? "Consulting Agronomy API..." : "Draft Farming Strategy"}
                </button>
              </div>

              {farmAdviceResult && (
                <div className="p-4 bg-[#121812] rounded border border-emerald-500/20 space-y-3 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest block">
                      Water & Soil Advice
                    </span>
                    <p className="text-[11px] text-white/60 leading-relaxed mt-1">{farmAdviceResult.soilAndWaterAdvice}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest block">
                      Agent Marketing Strategy
                    </span>
                    <p className="text-[11px] text-white/60 leading-relaxed mt-1">{farmAdviceResult.agentStrategy}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest block">
                      High-Value Future intercrops
                    </span>
                    <div className="flex gap-2 mt-1">
                      {farmAdviceResult.futureCrops.map((c: string) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded text-[10px]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Orders List & Status Changer */}
          <div className="space-y-4">
            <h3 className="text-base font-bold uppercase tracking-widest text-white/80 border-b border-white/5 pb-3">
              Crop Orders Log
            </h3>
            <div className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-white/40 border-b border-white/5">
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Buyer</th>
                      <th className="px-5 py-3.5">Crops Purchased</th>
                      <th className="px-5 py-3.5">Order Total</th>
                      <th className="px-5 py-3.5">Delivery Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 font-mono font-semibold text-emerald-400">{order.id}</td>
                        <td className="px-5 py-4">
                          <div className="text-white">{order.buyerName}</div>
                          <div className="text-white/30 text-[10px]">{order.phone}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {order.products.map((p, idx) => (
                              <div key={idx} className="text-white/70">
                                {p.quantity} {p.unit} of {p.name}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono font-semibold">UGX {order.totals.total.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.deliveryStatus === "delivered"
                                ? "bg-emerald-950 text-emerald-400"
                                : order.deliveryStatus === "cancelled"
                                ? "bg-red-950 text-red-400"
                                : "bg-amber-950 text-amber-400"
                            }`}
                          >
                            {order.deliveryStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => updateOrderStatus(order.id, "packed")}
                            className="px-2 py-1 bg-white/5 hover:bg-emerald-500 hover:text-black rounded text-[10px] transition-all cursor-pointer"
                          >
                            Pack
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, "in_transit")}
                            className="px-2 py-1 bg-white/5 hover:bg-emerald-500 hover:text-black rounded text-[10px] transition-all cursor-pointer"
                          >
                            Dispatch
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, "delivered")}
                            className="px-2 py-1 bg-white/5 hover:bg-emerald-500 hover:text-black rounded text-[10px] transition-all cursor-pointer"
                          >
                            Deliver
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-white/30 text-xs">
                          No order logs recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD FLAVOUR */}
      {user.role === "admin" && analytics && (
        <div className="space-y-10">
          {/* Admin Overview Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#121812] border border-white/5 p-6 rounded-lg">
              <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1">Platform Revenue</div>
              <div className="text-3xl font-mono text-emerald-50 font-bold">UGX {analytics.totalRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-white/40 mt-2">Combined orders value</div>
            </div>

            <div className="bg-[#121812] border border-white/5 p-6 rounded-lg">
              <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1">Farmer Disbursements</div>
              <div className="text-3xl font-mono text-emerald-400 font-bold">
                UGX {analytics.totalFarmerPayouts.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-2">({config.farmerPercentage}% of volume)</div>
            </div>

            <div className="bg-[#121812] border border-white/5 p-6 rounded-lg">
              <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1">Agent Commissions</div>
              <div className="text-3xl font-mono text-white font-bold">
                UGX {analytics.totalAgentCommissions.toLocaleString()}
              </div>
              <div className="text-[10px] text-white/50 mt-2">({config.agentPercentage}% of volume)</div>
            </div>

            <div className="bg-[#121812] border border-white/5 p-6 rounded-lg">
              <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1">Platform Operations Fee</div>
              <div className="text-3xl font-mono text-white/50 font-bold">UGX {analytics.totalPlatformFees.toLocaleString()}</div>
              <div className="text-[10px] text-white/30 mt-2">({config.platformPercentage}% system cut)</div>
            </div>
          </div>

          {/* Main section: Users Approvals & Splits Settings */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Registered Users Approvals List */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <h3 className="text-base font-bold uppercase tracking-widest text-white/80 border-b border-white/5 pb-3">
                Agro Agents & Users Register
              </h3>
              <div className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-white/40 border-b border-white/5">
                        <th className="px-5 py-3.5">User Details</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Agency Profile</th>
                        <th className="px-5 py-3.5">Verification</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-white/40 text-[10px]">{u.email}</div>
                          </td>
                          <td className="px-5 py-4 font-mono uppercase text-white/60">{u.role}</td>
                          <td className="px-5 py-4">
                            {u.agentProfile ? (
                              <div>
                                <div className="text-white">{u.agentProfile.serviceArea}</div>
                                <div className="text-[10px] text-white/30 font-mono">ID: {u.agentProfile.nationalId}</div>
                              </div>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.verificationStatus === "verified" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                              }`}
                            >
                              {u.verificationStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {u.role === "agent" && u.agentProfile?.approvalStatus === "pending" && (
                              <button
                                onClick={() => updateAgentStatus(u.id, "approved")}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded text-[10px] cursor-pointer"
                              >
                                Approve Agent
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Platform Commission config Form */}
            <div className="col-span-12 lg:col-span-4 bg-[#121812] border border-white/5 p-6 rounded-lg space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-3">Platform Split Config</h3>

              <form onSubmit={updateSplitConfig} className="space-y-4 text-xs">
                <div>
                  <label className="block text-white/50 mb-1">Farmer Share (%)</label>
                  <input
                    type="number"
                    value={config.farmerPercentage}
                    onChange={(e) => setConfig({ ...config, farmerPercentage: Number(e.target.value) })}
                    className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1">Agent Share (%)</label>
                  <input
                    type="number"
                    value={config.agentPercentage}
                    onChange={(e) => setConfig({ ...config, agentPercentage: Number(e.target.value) })}
                    className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1">Platform Fee (%)</label>
                  <input
                    type="number"
                    value={config.platformPercentage}
                    onChange={(e) => setConfig({ ...config, platformPercentage: Number(e.target.value) })}
                    className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-[#080B08] rounded border border-white/5 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Sum Check:</span>
                    <span
                      className={`font-mono font-bold ${
                        config.farmerPercentage + config.agentPercentage + config.platformPercentage === 100
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {config.farmerPercentage + config.agentPercentage + config.platformPercentage}%
                    </span>
                  </div>
                  <p className="text-white/40 leading-tight">Must total exactly 100% to successfully save splits.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-all cursor-pointer"
                >
                  Update Commission Percentages
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BUYER DASHBOARD FLAVOUR */}
      {user.role === "buyer" && (
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-2xl font-serif italic text-emerald-50">My Purchase Ledger</h2>
            <p className="text-xs text-white/40">Monitoring your logistics, deliveries, and verified order logs.</p>
          </div>

          <div className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-white/40 border-b border-white/5">
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Ordered On</th>
                    <th className="px-5 py-3.5">Delivery Address</th>
                    <th className="px-5 py-3.5">Products Sourced</th>
                    <th className="px-5 py-3.5">Paid Total</th>
                    <th className="px-5 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 font-mono font-semibold text-emerald-400">{order.id}</td>
                      <td className="px-5 py-4 text-white/60">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-white/50">{order.shippingAddress}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {order.products.map((p, idx) => (
                            <div key={idx} className="text-white/80 font-medium">
                              {p.quantity} {p.unit} of {p.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold">UGX {order.totals.total.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold ${
                            order.deliveryStatus === "delivered" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                          }`}
                        >
                          {order.deliveryStatus === "delivered" ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {order.deliveryStatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-white/30 text-xs">
                        You have not placed any orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
