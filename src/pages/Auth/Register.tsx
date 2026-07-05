import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sprout, Eye, EyeOff, Mail, Lock, User, Phone, FileText, Shield } from "lucide-react";

interface RegisterProps {
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  showToast: (message: string, type?: "success" | "error") => void;
}

export default function Register({ apiFetch, showToast }: RegisterProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "buyer" as "agent" | "buyer",
    nationalId: "",
    serviceArea: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAgentFields, setShowAgentFields] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      window.localStorage.setItem("agrobridge_token", data.token);
      showToast(`Account created successfully! Welcome, ${data.user.name}`, "success");
      navigate("/dashboard");
      window.location.reload();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded flex items-center justify-center font-bold text-black shadow-lg shadow-emerald-500/10">
              <Sprout className="w-7 h-7" />
            </div>
            <div>
              <span className="text-3xl font-serif italic font-bold tracking-tight text-emerald-50">AgroBridge</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-emerald-500/80 font-bold">Proxy Farmers Marketplace</span>
            </div>
          </Link>
          <h2 className="text-2xl font-serif italic text-emerald-50 font-medium">Create Account</h2>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-6 bg-[#121812] border border-white/5 rounded-xl p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-[#080B08] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#080B08] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+256 701 111222"
                  className="w-full pl-10 pr-4 py-3 bg-[#080B08] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-[#080B08] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Account Type</label>
              <select
                value={form.role}
                onChange={(e) => {
                  setForm({ ...form, role: e.target.value as "agent" | "buyer" });
                  setShowAgentFields(e.target.value === "agent");
                }}
                className="w-full bg-[#080B08] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="buyer">Buyer - Purchase fresh produce</option>
                <option value="agent">Agro Agent - Represent farmers</option>
              </select>
            </div>

            {/* Agent-only fields */}
            {showAgentFields && (
              <>
                <div>
                  <label className="block text-xs uppercase font-semibold text-white/50 mb-2">National ID (NIN)</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      required
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                      placeholder="NIN-UG-XX12345X"
                      className="w-full pl-10 pr-4 py-3 bg-[#080B08] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Service Area</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      required
                      value={form.serviceArea}
                      onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
                      placeholder="Mityana, Wakiso Districts, etc."
                      className="w-full pl-10 pr-4 py-3 bg-[#080B08] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold rounded-lg transition-all cursor-pointer"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="text-center text-xs text-white/50">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-emerald-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}