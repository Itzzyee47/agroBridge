import React, { useState } from "react";
import { X, Star, ShoppingCart } from "lucide-react";
import { Product } from "./types";

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: () => void;
  cart: { product: Product; quantity: number }[];
  setCart: (cart: { product: Product; quantity: number }[]) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
  cart,
  setCart,
  showToast
}: ProductModalProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > product.stock) return;
    setQuantity(newQty);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#121812] border border-white/5 rounded-xl flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery */}
        <div className="w-full md:w-1/2 p-6 space-y-4">
          <div className="aspect-video rounded-lg overflow-hidden bg-zinc-900">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-16 rounded border-2 transition-all ${
                    selectedImage === idx ? "border-emerald-500" : "border-white/5"
                  }`}
                >
                  <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover rounded" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">
              {product.category}
            </span>
            <h2 className="text-3xl font-serif italic text-white font-medium">
              {product.name}
            </h2>
            <div className="text-2xl font-mono text-emerald-400 font-semibold">
              FCFA {product.price.toLocaleString()} <span className="text-sm text-white/40">/{product.unit}</span>
            </div>
          </div>

          {/* Farmer Info */}
          <div className="p-4 bg-[#080B08] border border-white/5 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-emerald-400/70 block mb-2">
              Proxy Farmer Origin
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                {product.farmerName?.split(" ").map(n => n[0]).join("") || "F"}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{product.farmerName}</div>
                <div className="text-[10px] text-white/40">Verified smallholder producer</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-2">
              Product Description
            </h3>
            <p className="text-sm text-white/70 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Stock & Availability */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-white/40">Availability: </span>
              <span className="text-emerald-400 font-semibold">{product.availability}</span>
            </div>
            <div>
              <span className="text-white/40">Stock: </span>
              <span className="text-white font-mono">{product.stock} units</span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <label className="text-xs uppercase font-semibold text-white/50">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-white font-mono cursor-pointer"
              >
                -
              </button>
              <span className="w-12 text-center font-mono text-white text-sm">
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= product.stock}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-white font-mono cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={() => {
              for (let i = 0; i < quantity; i++) {
                onAddToCart();
              }
              onClose();
              showToast(`Added ${quantity} ${product.unit} of ${product.name} to cart`);
            }}
            disabled={product.stock <= 0}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart - FCFA {(product.price * quantity).toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}
