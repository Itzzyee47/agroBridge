import React, { useState, useEffect } from "react";
import { Eye, ShoppingCart, Filter, ChevronLeft, ChevronRight, X, Star } from "lucide-react";
import { Product } from "../types";
import { useSearchParams } from "react-router-dom";
import ProductModal from "../ProductModal";

interface ProductsProps {
  products: Product[];
  cart: { product: Product; quantity: number }[];
  setCart: (cart: { product: Product; quantity: number }[]) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export default function Products({ products, cart, setCart, showToast, apiFetch }: ProductsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [availability, setAvailability] = useState(searchParams.get("availability") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const itemsPerPage = 12;

  // Update URL params when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (selectedCategory !== "All") params.category = selectedCategory;
    if (availability !== "all") params.availability = availability;
    if (sortBy !== "newest") params.sort = sortBy;
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, availability, sortBy, setSearchParams]);

  // Filter products
  let filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.farmerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchesAvailability = availability === "all" || p.availability === availability;
    return matchesSearch && matchesCat && matchesPrice && matchesAvailability;
  });

  // Sort products
  filteredProducts = filteredProducts.sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
      setCart([...cart]);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    showToast(`Added ${product.name} to cart`);
  };

  const categories = ["All", "Fruits & Bananas", "Vegetables", "Grains & Seeds"];
  const maxPrice = Math.max(...products.map(p => p.price), 100000);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-serif italic text-emerald-50 font-medium">All Products</h1>
        <p className="text-xs text-white/40">Browse all available organic produce from verified farmers.</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#121812] border border-white/5 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400">
          <Filter className="w-4 h-4" /> Filter Products
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Availability</option>
              <option value="immediate">Immediate</option>
              <option value="seasonal">Seasonal</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#080B08] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Price Range Slider */}
        <div>
          <div className="flex items-center justify-between text-xs text-white/50 mb-2">
            <span>Price Range: FCFA {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={maxPrice}
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="flex-1"
            />
            <input
              type="range"
              min="0"
              max={maxPrice}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map(product => (
          <div
            key={product.id}
            className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden flex flex-col group hover:border-emerald-500/20 transition-all"
          >
            <div className="relative aspect-video bg-zinc-900 overflow-hidden">
              <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-all" />
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[9px] uppercase tracking-wider text-emerald-400 font-bold border border-white/5">
                {product.availability}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-white/30">{product.category}</span>
                <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors mt-1">{product.name}</h4>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/40">
                  <span className="font-bold">From:</span> {product.farmerName}
                </div>
                <p className="text-xs text-white/50 line-clamp-2 mt-2 font-light">{product.description}</p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-base font-mono font-semibold text-emerald-400">FCFA {product.price.toLocaleString()}</span>
                  <span className="text-[10px] text-white/40">/{product.unit}</span>
                  <span className="block text-[9px] text-white/30 font-medium">Stock: {product.stock}</span>
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
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock <= 0}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded transition-all cursor-pointer"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {paginatedProducts.length === 0 && (
          <div className="col-span-full py-16 text-center text-white/30 text-sm">
            No products match your filter criteria. Try adjusting the filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-sm text-white font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={() => handleAddToCart(selectedProduct)}
          cart={cart}
          setCart={setCart}
          showToast={showToast}
        />
      )}
    </div>
  );
}
