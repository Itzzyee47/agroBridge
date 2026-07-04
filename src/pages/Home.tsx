import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, ShoppingBag, Users, Brain, DollarSign, ChevronRight, Sprout } from "lucide-react";
import { Product, User } from "../types";

interface HomeProps {
  products: Product[];
  user: User | null;
  demoSignIn: (role: "admin" | "agent" | "buyer") => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
}

export default function Home({ products, user, demoSignIn, setSelectedProduct }: HomeProps) {
  const navigate = useNavigate();

  return (
    <div id="home_tab" className="space-y-16">
      {/* Banner Section */}
      <div className="relative bg-gradient-to-b from-[#121812] to-[#0A0D0A] rounded-2xl border border-white/5 p-8 sm:p-16 text-center space-y-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
        <div className="relative max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400 tracking-wide uppercase">
            <Leaf className="w-3.5 h-3.5" /> Managed Proxy Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif text-emerald-50 font-medium tracking-tight leading-none">
            Empowering rural farmers through <span className="italic text-emerald-400">trusted agents</span>
          </h1>
          <p className="text-base sm:text-lg text-white/60 font-light max-w-2xl mx-auto leading-relaxed">
            AgroBridge links rural producers directly to urban consumption grids. Verified agents digitize crop logs, coordinate bulk orders, and protect pricing margins so farmers can focus entirely on harvesting.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/marketplace")}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded shadow-lg shadow-emerald-500/10 transition-all text-sm flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" /> Browse Food Marketplace
            </button>
            {!user && (
              <button
                onClick={() => demoSignIn("agent")}
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded border border-white/10 transition-all text-sm cursor-pointer"
              >
                Access as Agent Demo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Core Model Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#121812] border border-white/5 p-8 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif italic text-emerald-50 font-semibold">1. Proxy Agent Representation</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Over 70% of rural smallholders lack smartphones. Local Agro Agents onboard farmers, catalogue crops, set up transparent profiles, and upload inventory logs.
          </p>
        </div>

        <div className="bg-[#121812] border border-white/5 p-8 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif italic text-emerald-50 font-semibold">2. Price Intelligence (Gemini)</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Real-time market tracking leverages the server-side Gemini API. It suggests pricing intervals, detects regional shortages, and predicts optimal harvest storage timing.
          </p>
        </div>

        <div className="bg-[#121812] border border-white/5 p-8 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif italic text-emerald-50 font-semibold">3. Transparent Earning Split</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Every transaction triggers an automatic commission breakdown. Farmers earn up to 85% of full retail pricing directly through verified, tracked payouts.
          </p>
        </div>
      </div>

      {/* Featured Catalog Preview */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-2xl font-serif italic text-emerald-50 font-medium">Seasonal Crop Highlight</h2>
          <button
            onClick={() => navigate("/marketplace")}
            className="text-xs text-emerald-400 font-bold tracking-wider uppercase hover:underline flex items-center gap-1 cursor-pointer"
          >
            View Full Catalog <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map(product => (
            <div key={product.id} className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden flex flex-col group hover:border-emerald-500/20 transition-all">
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-all" />
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[9px] uppercase tracking-wider text-emerald-400 font-bold border border-white/5">
                  {product.availability}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-white/30">{product.category}</span>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mt-1">{product.name}</h4>
                  <p className="text-xs text-white/50 line-clamp-2 mt-1 font-light">{product.description}</p>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-white/30">Farm Price</span>
                    <span className="text-sm font-mono font-semibold text-emerald-400">UGX {product.price.toLocaleString()}</span>
                    <span className="text-[10px] text-white/40"> / {product.unit}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedProduct(product); navigate("/marketplace"); }}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
