import React, { useState } from "react";
import { Eye, X, Star } from "lucide-react";
import { Product, User } from "../types";

interface MarketplaceProps {
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  cart: { product: Product; quantity: number }[];
  setCart: (cart: { product: Product; quantity: number }[]) => void;
  user: User | null;
  showToast: (msg: string, type?: "success" | "error") => void;
  onSubmitReview: (productId: string, rating: number, comment: string) => Promise<void>;
}

export default function Marketplace({
  products,
  selectedProduct,
  setSelectedProduct,
  cart,
  setCart,
  user,
  showToast,
  onSubmitReview
}: MarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Local Review Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmittingReview(true);
    try {
      await onSubmitReview(selectedProduct.id, rating, comment);
      setComment("");
      setRating(5);
    } catch (err) {
      // Errors are handled in the parent via toast
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div id="marketplace_tab" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-serif italic text-emerald-50 font-medium">Bridges Crop Terminal</h1>
          <p className="text-xs text-white/40">Sourced organic crops and vegetables represented by verified agents.</p>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search tomatoes, coffee, pineapples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 min-w-[240px]"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#121812] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="All">All Categories</option>
            <option value="Fruits & Bananas">Fruits & Bananas</option>
            <option value="Vegetables">Vegetables</option>
            <option value="Grains & Seeds">Grains & Seeds</option>
          </select>
        </div>
      </div>

      {/* Split screen: Products catalog + Details sidebar if selected */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Product Grid */}
        <div className={`${selectedProduct ? "col-span-12 lg:col-span-8" : "col-span-12"} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`}>
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className={`bg-[#121812] border rounded-lg overflow-hidden flex flex-col group transition-all ${
                selectedProduct?.id === product.id ? "border-emerald-500" : "border-white/5 hover:border-emerald-500/20"
              }`}
            >
              <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-all" />
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[9px] uppercase tracking-wider text-emerald-400 font-bold border border-white/5">
                  {product.availability}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400/80">{product.category}</span>
                  <h4 className="text-base font-bold text-white mt-1">{product.name}</h4>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/40">
                    <span className="font-bold">Farmer:</span> {product.farmerName}
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 mt-2 font-light">{product.description}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-base font-mono font-semibold text-emerald-400">FCFA {product.price.toLocaleString()}</span>
                    <span className="text-[10px] text-white/40">/{product.unit}</span>
                    <span className="block text-[9px] text-white/30 font-medium">Stock: {product.stock} left</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="p-2 bg-white/5 hover:bg-emerald-500/10 rounded border border-white/5 transition-all cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => {
                        const existingIndex = cart.findIndex(item => item.product.id === product.id);
                        if (existingIndex > -1) {
                          cart[existingIndex].quantity += 1;
                          setCart([...cart]);
                        } else {
                          setCart([...cart, { product, quantity: 1 }]);
                        }
                        showToast(`Added 1 ${product.unit} of ${product.name} to cart`);
                      }}
                      disabled={product.stock <= 0}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-xs rounded transition-all cursor-pointer"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-white/30 text-sm">
              No crop listings matched your criteria.
            </div>
          )}
        </div>

        {/* Right Column: Interactive Crop Profile / Detail panel */}
        {selectedProduct && (
          <div className="col-span-12 lg:col-span-4 bg-[#121812] border border-emerald-500/25 rounded-lg p-6 space-y-6 self-start relative">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 rounded-full text-white/60 cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-video w-full rounded overflow-hidden bg-zinc-950">
              <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="object-cover w-full h-full" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">{selectedProduct.category}</span>
              <h2 className="text-2xl font-serif text-white font-medium">{selectedProduct.name}</h2>
              <div className="text-xl font-mono text-emerald-400 font-semibold">
                FCFA {selectedProduct.price.toLocaleString()} <span className="text-xs text-white/40">/{selectedProduct.unit}</span>
              </div>
            </div>

            <div className="p-4 bg-[#080B08] border border-white/5 rounded space-y-2">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400/70 font-bold block">Proxy Farmer Origin</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {selectedProduct.farmerName
                    ? selectedProduct.farmerName
                        .split(" ")
                        .map(n => n[0])
                        .join("")
                    : "F"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{selectedProduct.farmerName}</div>
                  <div className="text-[10px] text-white/40">Seeded smallholder producer coordinates via proxy</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-light">{selectedProduct.description}</p>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/50">Farmer Reviews (Verified Purchases)</h4>

              <div className="space-y-3">
                <div className="p-3 bg-[#080B08] rounded border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-50 font-serif italic">Sarah Namubiru</span>
                    <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 5.0
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50">Cooks beautifully. Excellent size bunches, freshly cut.</p>
                </div>
              </div>

              {user && user.role === "buyer" && (
                <form onSubmit={handleReviewSubmit} className="space-y-3 bg-[#080B08] p-3 rounded border border-white/5">
                  <div className="text-[11px] font-bold text-white/70 uppercase">Add Review</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => setRating(s)} className="p-0.5 cursor-pointer">
                        <Star className={`w-4 h-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-white/20"}`} />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Leave your comments..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-[#121812] border border-white/10 text-xs rounded p-2 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded transition-all cursor-pointer"
                  >
                    {submittingReview ? "Submitting..." : "Submit Comment"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
