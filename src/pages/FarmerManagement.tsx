import React, { useState, useRef } from "react";
import { Plus, Edit, Trash, FileImage, Upload, MapPin, Ruler, Crop } from "lucide-react";
import { Farmer } from "../types";

interface FarmerManagementProps {
  farmers: Farmer[];
  setFarmerForm: (form: Partial<Farmer>) => void;
  setShowFarmerModal: (show: boolean) => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  showToast: (message: string, type?: "success" | "error") => void;
}

export default function FarmerManagement({
  farmers,
  setFarmerForm,
  setShowFarmerModal,
  apiFetch,
  showToast
}: FarmerManagementProps) {
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerImages, setFarmerImages] = useState<Record<string, string>>({});
  const fileInputRef = useRef<Record<string, HTMLInputElement>>({});

  const handleUploadImage = (farmerId: string, file: File) => {
    // In a real app, this would upload to a server
    // For demo, we'll use base64 or a placeholder
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFarmerImages(prev => ({ ...prev, [farmerId]: base64 }));
      showToast("Farm image uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = (farmerId: string, file: File) => {
    // In a real app, this would upload the ownership document
    showToast(`${file.name} uploaded as ownership proof`);
    // Would typically store document URL in farmer record
  };

  const handleDeleteFarmer = async (farmer: Farmer) => {
    if (confirm(`Are you sure you want to archive farmer ${farmer.name}?`)) {
      try {
        await apiFetch(`/api/farmers/${farmer.id}`, {
          method: "DELETE"
        });
        showToast("Farmer archived successfully", "success");
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif italic text-emerald-50 font-medium">Farmer Management</h1>
          <p className="text-xs text-white/40">Register, manage, and verify smallholder farmers in your network.</p>
        </div>
        <button
          onClick={() => {
            setFarmerForm({ name: "", village: "", location: "Mityana", phone: "", farmSize: "", cropTypes: [], notes: "" });
            setShowFarmerModal(true);
          }}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register New Farmer
        </button>
      </div>

      {/* Farmers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farmers.map(farmer => (
          <div key={farmer.id} className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden flex flex-col">
            {/* Farm Image or Placeholder */}
            <div className="relative h-48 bg-zinc-900">
              {farmerImages[farmer.id] ? (
                <img src={farmerImages[farmer.id]} alt={farmer.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Crop className="w-12 h-12 text-white/20" />
                </div>
              )}
              
              {/* Upload Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-white" />
                  <span className="text-xs text-white">Upload Farm Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => { if (el) fileInputRef.current[farmer.id] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(farmer.id, file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Farmer Details */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{farmer.name}</h3>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{farmer.village}, {farmer.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{farmer.farmSize} Acres</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {farmer.cropTypes.map(crop => (
                      <span key={crop} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/60">
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => {
                    setFarmerForm(farmer);
                    setShowFarmerModal(true);
                  }}
                  className="p-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded transition-all cursor-pointer"
                  title="Edit Farmer"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <label className="p-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded transition-all cursor-pointer" title="Upload Ownership Document">
                    <FileImage className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDocument(farmer.id, file);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => handleDeleteFarmer(farmer)}
                    className="p-1.5 bg-white/5 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer"
                    title="Archive Farmer"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {farmers.length === 0 && (
          <div className="col-span-full py-16 text-center text-white/30">
            <p>No farmers registered yet. Click "Register New Farmer" to add one.</p>
          </div>
        )}
      </div>
    </div>
  );
}