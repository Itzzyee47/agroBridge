import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, FileText, MapPin, Ruler, Crop, Shield, Clock, X, Package } from "lucide-react";
import { Farmer, User, Product } from "../../types";

interface FarmerVerificationProps {
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  showToast: (message: string, type?: "success" | "error") => void;
}

interface FarmerWithUser extends Farmer {
  verifyStatus?: "verified" | "pending" | "rejected";
  verificationDate?: string;
}

export default function FarmerVerification({ apiFetch, showToast }: FarmerVerificationProps) {
  const [farmers, setFarmers] = useState<FarmerWithUser[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerWithUser | null>(null);
  const [farmerProducts, setFarmerProducts] = useState<Product[]>([]);
  const [showCropsModal, setShowCropsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cropsLoading, setCropsLoading] = useState(false);

  const loadFarmers = async () => {
    setLoading(true);
    try {
      // In a real app, this would be a dedicated admin endpoint
      const allFarmers = await apiFetch("/api/farmers");
      setFarmers(allFarmers.map((f: Farmer) => ({
        ...f,
        verifyStatus: f.status === "active" ? "verified" : "pending",
        verificationDate: f.createdAt
      })));
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFarmer = async (farmer: FarmerWithUser, status: "verified" | "rejected") => {
    try {
      // This would update farmer verification status in the backend
      await apiFetch(`/api/farmers/${farmer.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: status === "verified" ? "active" : "archived" })
      });
      showToast(`Farmer ${farmer.name} has been ${status}`);
      loadFarmers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    loadFarmers();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif italic text-emerald-50 font-medium">Farmer Verification</h1>
        <p className="text-xs text-white/40">Review and verify farmer registrations across the platform.</p>
      </div>

      {/* Farmers List */}
      <div className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-white/5 text-[9px] uppercase tracking-wider text-white/40 border-b border-white/5">
                <th className="px-5 py-3.5">Farmer</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Acreage</th>
                <th className="px-5 py-3.5">Crops</th>
                <th className="px-5 py-3.5">Agent</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-white/30">Loading farmers...</td>
                </tr>
              ) : farmers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-white/30">No farmers to verify.</td>
                </tr>
              ) : (
                farmers.map(farmer => (
                  <tr key={farmer.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{farmer.name}</div>
                      <div className="text-[10px] text-white/40">{farmer.phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-white/60">
                        <MapPin className="w-3.5 h-3.5" />
                        {farmer.village}, {farmer.location}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-white/60">
                        <Ruler className="w-3.5 h-3.5" />
                        {farmer.farmSize} Acres
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {farmer.cropTypes.slice(0, 3).map(crop => (
                          <span key={crop} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/60">
                            {crop}
                          </span>
                        ))}
                        {farmer.cropTypes.length > 3 && (
                          <span className="text-[10px] text-white/40">+ {farmer.cropTypes.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/60 font-mono">{farmer.agentId}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          farmer.verifyStatus === "verified"
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-amber-950 text-amber-400"
                        }`}
                      >
                        {farmer.verifyStatus === "verified" ? "Verified" : "Pending"}
                      </span>
                    </td>
<td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedFarmer(farmer)}
                        className="p-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          setSelectedFarmer(farmer);
                          setCropsLoading(true);
                          try {
                            const products = await apiFetch(`/api/products?farmerId=${farmer.id}`);
                            setFarmerProducts(products);
                            setShowCropsModal(true);
                          } catch (e: any) {
                            showToast(e.message, "error");
                          } finally {
                            setCropsLoading(false);
                          }
                        }}
                        className="p-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded transition-all cursor-pointer"
                        title="View Crops"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      {farmer.verifyStatus === "pending" && (
                        <>
                          <button
                            onClick={() => handleVerifyFarmer(farmer, "verified")}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyFarmer(farmer, "rejected")}
                            className="px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5 inline mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Farmer Detail Modal */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#121812] border border-white/5 rounded-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif italic text-emerald-50">{selectedFarmer.name}</h2>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/40">Phone:</span>
                  <div className="font-mono text-white">{selectedFarmer.phone}</div>
                </div>
                <div>
                  <span className="text-white/40">Status:</span>
                  <div className="text-white font-semibold">{selectedFarmer.verifyStatus}</div>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-sm">Farm Location:</span>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-white">{selectedFarmer.village}, {selectedFarmer.location}</span>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-sm">Acreage:</span>
                <div className="flex items-center gap-2 mt-1">
                  <Ruler className="w-4 h-4 text-emerald-400" />
                  <span className="text-white">{selectedFarmer.farmSize} Acres</span>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-sm">Crops Grown:</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedFarmer.cropTypes.map(crop => (
                    <span key={crop} className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 rounded">
                      {crop}
                    </span>
                  ))}
                </div>
              </div>

              {selectedFarmer.notes && (
                <div>
                  <span className="text-white/40 text-sm">Notes:</span>
                  <p className="text-white/80 mt-1 text-sm">{selectedFarmer.notes}</p>
                </div>
              )}

{/* Document Upload Placeholder */}
              <div className="p-4 bg-[#080B08] border border-white/5 rounded">
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Land Ownership Documents</span>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-emerald-500/10 text-white rounded transition-all cursor-pointer">
                  View Documents (PDF/Image)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Farmer Crops Modal */}
      {showCropsModal && selectedFarmer && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#121812] border border-white/5 rounded-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif italic text-emerald-50">
                Crops for {selectedFarmer.name}
              </h2>
              <button
                onClick={() => setShowCropsModal(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cropsLoading ? (
              <div className="text-center py-8 text-white/50">Loading crops...</div>
            ) : farmerProducts.length === 0 ? (
              <div className="text-center py-8 text-white/50">No crops listed for this farmer.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {farmerProducts.map(product => (
                  <div key={product.id} className="bg-[#080B08] border border-white/5 rounded-lg p-4 space-y-2">
                    <img src={product.images[0]} alt={product.name} className="w-full h-32 object-cover rounded" />
                    <div className="text-sm font-bold text-white">{product.name}</div>
                    <div className="text-[10px] text-white/40">{product.category}</div>
<div className="text-xs font-mono text-emerald-400">FCFA {product.price.toLocaleString()}</div>
                    <div className="text-[10px] text-white/60">Stock: {product.stock}</div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      product.availability === "immediate" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                    }`}>
                      {product.availability.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
