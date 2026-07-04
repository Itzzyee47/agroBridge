import React from "react";
import { Sprout } from "lucide-react";

export default function About() {
  return (
    <div id="about_tab" className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif italic text-emerald-50 font-medium">AgroBridge Proxy Operations Architecture</h1>
        <p className="text-xs text-white/40 font-mono">Managed Proxy Marketplaces for Financial Inclusion</p>
      </div>

      <div className="space-y-6 bg-[#121812] border border-white/5 p-8 rounded-xl leading-relaxed text-sm text-white/70">
        <h3 className="text-lg font-serif italic text-white font-semibold">Addressing the Digitization Deficit</h3>
        <p>
          In emerging agricultural regions, over **75% of rural producers** live off-grid without active smartphones, reliable cellular internet, or banking accounts. Traditional e-commerce models fail them because listing, cataloging, and dispatch management require digital literacy.
        </p>
        <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400">The Proxy Agent Ecosystem</h4>
        <p>
          AgroBridge fixes this using the **Managed Proxy Model**. Trusted, approved Agro Agents live within rural farming clusters and manage the digital profiles of 20 to 50 local farmers.
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/60 pl-2">
          <li>Agents run inventory counts on behalf of offline smallholders.</li>
          <li>Agents handle price listings, transport bids, and order dispatches.</li>
          <li>The split engine automatically distributes payouts, protecting farmer profit margins.</li>
        </ul>
        <div className="p-4 bg-[#080B08] rounded border border-emerald-900/20 text-xs text-emerald-400/90 font-mono">
          SPLIT LOGIC EXPLAINED:
          <br />
          Every order total splits directly: 85% goes to the Farmer payout registry, 10% goes to the representing Agent, and 5% covers AgroBridge core infrastructure operations.
        </div>
      </div>
    </div>
  );
}
