import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, ShoppingBag, Users, Brain, DollarSign, ChevronRight, Sprout, MessageSquare, HelpCircle, Mail, Phone, MapPin } from "lucide-react";
import { Product, User } from "../types";

interface HomeProps {
  products: Product[];
  user: User | null;
  setSelectedProduct: (product: Product | null) => void;
}

const testimonials = [
  {
    id: 1,
    name: "Dr. Samuel Okello",
    role: "Agricultural Economist",
    content: "AgroBridge fills a critical gap in Uganda's agricultural value chain. By connecting rural farmers to urban markets through verified agents, they're increasing farm-gate prices by up to 40%.",
    avatar: "SO"
  },
  {
    id: 2,
    name: "Grace Nakato",
    role: "Verified Farmer",
    content: "As a vegetable farmer in Mityana, AgroBridge helped me reach customers in Kampala who value fresh, organic produce. My income has doubled since joining.",
    avatar: "GN"
  },
  {
    id: 3,
    name: "Peter Nsubuga",
    role: "Agro Agent",
    content: "The agent model works perfectly - I can serve 15+ farmers in my community while earning commissions. The AI price predictions help my farmers maximize their profits.",
    avatar: "PN"
  }
];

const faqs = [
  {
    question: "How does AgroBridge work?",
    answer: "Agro Agents register smallholder farmers in their communities, catalogue their crops, and manage orders. Buyers can purchase directly from the platform and agents handle logistics."
  },
  {
    question: "What percentage do farmers receive?",
    answer: "Farmers receive 85% of the total sale price. The remaining 15% covers agent commissions (10%) and platform maintenance (5%)."
  },
  {
    question: "How do I become an Agro Agent?",
    answer: "Register with your details and service area. Once approved by admin, you can start registering farmers and managing their produce listings."
  },
  {
    question: "What types of produce are available?",
    answer: "We feature seasonal crops including Matooke (bananas), coffee, tomatoes, pineapples, and other organic vegetables and fruits from verified farmers."
  }
];

export default function Home({ products, user, setSelectedProduct }: HomeProps) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
              onClick={() => navigate("/products")}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded shadow-lg shadow-emerald-500/10 transition-all text-sm flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" /> Browse All Products
            </button>
{!user && (
              <button
                onClick={() => navigate("/auth/login")}
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded border border-white/10 transition-all text-sm cursor-pointer"
              >
                Sign In / Register
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

      {/* Statistics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center p-6 bg-[#121812] border border-white/5 rounded-xl">
          <div className="text-3xl font-mono text-emerald-400 font-bold">70%+</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Smallholder Farmers Served</div>
        </div>
        <div className="text-center p-6 bg-[#121812] border border-white/5 rounded-xl">
          <div className="text-3xl font-mono text-emerald-400 font-bold">40%</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Average Price Increase</div>
        </div>
        <div className="text-center p-6 bg-[#121812] border border-white/5 rounded-xl">
          <div className="text-3xl font-mono text-emerald-400 font-bold">150+</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Verified Agents</div>
        </div>
        <div className="text-center p-6 bg-[#121812] border border-white/5 rounded-xl">
          <div className="text-3xl font-mono text-emerald-400 font-bold">FCFA 50M+</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Farmer Payouts</div>
        </div>
      </div>

      {/* Featured Catalog Preview */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-2xl font-serif italic text-emerald-50 font-medium">Seasonal Crop Highlight</h2>
          <button
            onClick={() => navigate("/products")}
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
                    <span className="text-[10px] uppercase font-semibold text-white/30">Price:</span>
                    <span className="block font-mono text-emerald-400">FCFA {product.price.toLocaleString()}</span>
                    <span className="text-[9px] text-white/30 font-medium">/ {product.unit}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedProduct(product); navigate("/products"); }}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded text-[10px] font-bold transition-all cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif italic text-emerald-50 font-medium">What Our Users Say</h2>
          <p className="text-xs text-white/40">Stories from farmers, agents, and partners across Uganda.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(testimonial => (
            <div key={testimonial.id} className="bg-[#121812] border border-white/5 p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-xs">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{testimonial.name}</div>
                  <div className="text-[10px] text-white/40">{testimonial.role}</div>
                </div>
              </div>
              <p className="text-xs text-white/60 leading-relaxed italic">"{testimonial.content}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <HelpCircle className="w-5 h-5" />
            <h2 className="text-3xl font-serif italic text-emerald-50 font-medium">Frequently Asked Questions</h2>
          </div>
          <p className="text-xs text-white/40">Everything you need to know about AgroBridge.</p>
        </div>
        <div className="space-y-4 max-w-3xl mx-auto">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#121812] border border-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold text-white">{faq.question}</span>
                <span className={`text-emerald-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`}>
                  â–¼
                </span>
              </button>
              {openFaq === idx && (
                <div className="p-4 border-t border-white/5">
                  <p className="text-xs text-white/50">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="space-y-8 bg-[#121812] border border-white/5 rounded-2xl p-8 sm:p-12">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-3xl font-serif italic text-emerald-50 font-medium">Contact Us</h2>
          </div>
          <p className="text-xs text-white/40">Have questions? Reach out to our team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-3 p-6 bg-[#080B08] border border-white/5 rounded-lg">
            <Mail className="w-8 h-8 text-emerald-400" />
            <div className="text-center">
              <div className="text-xs font-semibold text-white/50 uppercase">Email</div>
              <a href="mailto:info@agrobridge.com" className="text-sm text-emerald-400 hover:underline">info@agrobridge.com</a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 p-6 bg-[#080B08] border border-white/5 rounded-lg">
            <Phone className="w-8 h-8 text-emerald-400" />
            <div className="text-center">
              <div className="text-xs font-semibold text-white/50 uppercase">Phone</div>
              <a href="tel:+256772123456" className="text-sm text-emerald-400 hover:underline">+237 6772123456</a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 p-6 bg-[#080B08] border border-white/5 rounded-lg">
            <MapPin className="w-8 h-8 text-emerald-400" />
            <div className="text-center">
              <div className="text-xs font-semibold text-white/50 uppercase">Office</div>
              <div className="text-sm text-white">Buea, Cameroon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
