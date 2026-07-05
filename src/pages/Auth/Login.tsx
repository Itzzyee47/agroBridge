import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sprout, Eye, EyeOff, Mail, Lock } from "lucide-react";

interface LoginProps {
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  showToast: (message: string, type?: "success" | "error") => void;
}

export default function Login({ apiFetch, showToast }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isDemoMode = true; // Demo buttons - controlled by environment in production

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      window.localStorage.setItem("agrobridge_token", data.token);
      showToast(`Welcome back, ${data.user.name}!`, "success");
      navigate("/dashboard");
      window.location.reload(); // Reload to update auth state
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role: "admin" | "agent" | "buyer") => {
    const credentials = {
      admin: { email: "admin@agrobridge.com", password: "admin123" },
      agent: { email: "agent1@agrobridge.com", password: "agent123" },
      buyer: { email: "buyer@agrobridge.com", password: "buyer123" }
    };
    setEmail(credentials[role].email);
    setPassword(credentials[role].password);
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials[role])
      });
      window.localStorage.setItem("agrobridge_token", data.token);
      showToast(`Logged in as ${role.toUpperCase()} demo`, "success");
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
          <h2 className="text-2xl font-serif italic text-emerald-50 font-medium">Sign In</h2>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6 bg-[#121812] border border-white/5 rounded-xl p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-white/50 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold rounded-lg transition-all cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {/* Demo Login Buttons - Only visible in development */}
          {isDemoMode && (
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="text-center text-[10px] uppercase font-bold tracking-widest text-emerald-400/80">
                Demo Access (Development Only)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => demoLogin("buyer")}
                  className="px-3 py-2 bg-white/5 hover:bg-emerald-500/10 text-white text-xs rounded transition-all cursor-pointer"
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin("agent")}
                  className="px-3 py-2 bg-white/5 hover:bg-emerald-500/10 text-white text-xs rounded transition-all cursor-pointer"
                >
                  Agent
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin("admin")}
                  className="px-3 py-2 bg-white/5 hover:bg-emerald-500/10 text-white text-xs rounded transition-all cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-white/50">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-emerald-400 hover:underline font-semibold">
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}