import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Product } from "../types";
import { CheckCircle, X, Truck, Store, Smartphone, Loader2 } from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
}

interface LocationState {
  cart: CartItem[];
  shippingAddress: string;
  phone: string;
}

export default function Checkout({ apiFetch, showToast }: { apiFetch: any; showToast: (msg: string, type?: "success" | "error") => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const cart = state?.cart || [];
  const initialShippingAddress = state?.shippingAddress || "";
  const initialPhone = state?.phone || "";
  
  const [deliveryPreference, setDeliveryPreference] = useState<"delivery" | "pickup">("delivery");
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
  const [phone, setPhone] = useState(initialPhone);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = deliveryPreference === "delivery" ? 5000 : 0;
  const totalAmount = subtotal + deliveryFee;
  
  const config = {
    farmerPercentage: 85,
    agentPercentage: 10,
    platformPercentage: 5
  };

  const commissionSplit = (amount: number) => {
    const farmerAmount = Math.round((amount * config.farmerPercentage) / 100);
    const agentCommission = Math.round((amount * config.agentPercentage) / 100);
    const platformFee = amount - farmerAmount - agentCommission;
    return { farmerAmount, agentCommission, platformFee, total: amount };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (deliveryPreference === "delivery" && (!shippingAddress || !phone)) {
      showToast("Please provide delivery details", "error");
      return;
    }

    setShowPaymentModal(true);
  };

  const simulatePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const payload = {
        cartItems: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity
        })),
        shippingAddress: deliveryPreference === "delivery" ? shippingAddress : "Pickup at farm",
        phone,
        deliveryPreference,
        deliveryFee
      };
      
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      setPaymentSuccess(true);
      showToast("Order placed successfully! Payment simulated.", "success");
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (e: any) {
      showToast(e.message, "error");
      setShowPaymentModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-serif italic text-emerald-50">Your cart is empty</h2>
        <p className="text-white/50">Add products to your cart first.</p>
        <button 
          onClick={() => navigate("/marketplace")} 
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded cursor-pointer"
        >
          Browse Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-serif italic text-emerald-50">Checkout</h1>
      
      {/* Cart Items Summary */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Your Products</h2>
        <div className="space-y-2">
          {cart.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[#121812] border border-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-950 rounded overflow-hidden">
                  <img src={item.product.images[0]} alt={item.product.name} className="object-cover w-full h-full" />
                </div>
                <div>
                  <div className="font-bold text-white">{item.product.name}</div>
                  <div className="text-xs text-white/40">Qty: {item.quantity} × FCFA {item.product.price.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-emerald-400 font-mono">FCFA {(item.product.price * item.quantity).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Preference */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Delivery Preference</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeliveryPreference("delivery")}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              deliveryPreference === "delivery" 
                ? "bg-emerald-950/50 border-emerald-500" 
                : "bg-[#121812] border-white/5 hover:border-emerald-500/50"
            }`}
          >
            <Truck className="w-8 h-8 text-emerald-400" />
            <span className="font-semibold text-white">Home Delivery</span>
            <span className="text-xs text-white/50">+ FCFA 5,000</span>
          </button>
          <button
            onClick={() => setDeliveryPreference("pickup")}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              deliveryPreference === "pickup" 
                ? "bg-emerald-950/50 border-emerald-500" 
                : "bg-[#121812] border-white/5 hover:border-emerald-500/50"
            }`}
          >
            <Store className="w-8 h-8 text-emerald-400" />
            <span className="font-semibold text-white">Pickup at Farm</span>
            <span className="text-xs text-white/50">Free</span>
          </button>
        </div>
      </div>

      {/* Delivery Details (only for delivery option) */}
      {deliveryPreference === "delivery" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-semibold text-white">Delivery Details</h2>
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
          </div>
        </motion.div>
      )}

      {/* Price Breakdown */}
      <div className="space-y-2 text-xs bg-[#121812] p-4 rounded border border-white/5">
        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-2">Order Summary:</span>
        <div className="flex justify-between text-white/70">
          <span>Subtotal ({cart.length} items)</span>
          <span className="font-mono">FCFA {subtotal.toLocaleString()}</span>
        </div>
        {deliveryPreference === "delivery" && (
          <div className="flex justify-between text-white/70">
            <span>Delivery Fee</span>
            <span className="font-mono">FCFA {deliveryFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-white/50">
          <span>Farmer Payout (85%)</span>
          <span className="font-mono text-emerald-400">FCFA {Math.round((totalAmount * 0.85)).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-white/50">
          <span>Agent Commission (10%)</span>
          <span className="font-mono">FCFA {Math.round((totalAmount * 0.10)).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-white/50">
          <span>Platform Fee (5%)</span>
          <span className="font-mono">FCFA {Math.round((totalAmount * 0.05)).toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold text-white">
          <span>Total Amount</span>
          <span className="font-mono text-emerald-400">FCFA {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Proceed to Payment */}
      <button
        onClick={handleCheckout}
        disabled={deliveryPreference === "delivery" && (!shippingAddress || !phone)}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue to Payment
      </button>

      {/* Payment Simulation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121812] border border-white/5 p-6 rounded-lg space-y-4">
            <button 
              onClick={() => !isProcessing && setShowPaymentModal(false)} 
              disabled={isProcessing}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>
            
            {paymentSuccess ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-xl font-serif italic text-emerald-50">Payment Successful!</h3>
                <p className="text-sm text-white/50">Your order has been placed. Redirecting...</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-xl font-serif italic text-emerald-50">Mobile Money Payment</h3>
                <p className="text-sm text-white/50">Complete payment of FCFA {totalAmount.toLocaleString()}</p>
                
                <div className="bg-[#080B08] border border-white/10 rounded p-3">
                  <div className="text-xs text-white/50 mb-1">Phone Number</div>
                  <div className="font-mono text-white">{phone || "N/A"}</div>
                </div>
                
                <button
                  onClick={simulatePayment}
                  disabled={isProcessing}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Mobile Money Payment"
                  )}
                </button>
                
                <p className="text-[10px] text-white/30">
                  This is a simulation. No actual payment will be processed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}