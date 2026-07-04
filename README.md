# AgroBridge — Smart Agricultural Proxy Marketplace

AgroBridge is a full-stack digital agricultural marketplace designed to bridge the digital divide between rural farmers and urban consumers. 

Unlike traditional e-commerce portals, AgroBridge utilizes a **Managed Proxy Marketplace Model**. Over 70% of rural producers lack smartphones, reliable internet, or bank accounts. To include them, local verified **Agro Agents** act as digital proxies—onboarding offline farmers, managing crop logs, posting real-time product listings, coordinating urban deliveries, and facilitating automatic commission/disbursement splitting.

---

## 🎨 Visual Identity & Theme
AgroBridge is styled in the **Sophisticated Dark** aesthetic:
- **Atmospheric Canvas**: Styled using `#0A0D0A` as a deep forest dark green background with clean `#060806` sidebar navigation panels.
- **Visual Accentuation**: Highlights, buttons, active states, and focus rings utilize highly vibrant emerald colors (`emerald-500`, `text-emerald-400`).
- **Typography pairings**: Elegant serif headings (*Playfair Display*) for market headers paired with sleek sans-serif (*Plus Jakarta Sans*) for responsive controls and *JetBrains Mono* for price ledgers and statistics.

---

## ⚙️ Technical Architecture & Stack

### Frontend
- **React 19 + TypeScript**: Solid, component-driven, type-safe single-page application.
- **Tailwind CSS v4**: Ultra-modern, responsive CSS utilities.
- **Lucide Icons**: Crisp, descriptive vector indicators for all actions.

### Backend & Storage
- **Node.js + Express**: Scalable API server handling routing, RBAC middlewares, and session verification.
- **Secure Native Sessions**: Lightweight custom JWT cookies for authentication.
- **Durable Local JSON Storage**: Handled in `server/db.ts`, providing reliable transaction logs, products catalog, and state synchronization across sessions.

### AI Integration Layer
- **Google Gemini-3.5-Flash**: Real-time server-side API calls analyze crop pricing indexes in Ugandan Shillings (UGX) based on seasonality, location, and transport constraints, providing actionable tips for smallholders.

---

## 👥 Dynamic Role Management
The system supports four distinct user profiles:
1. **Public / Guest**: Browses products, searches categories, and reviews farm profiles.
2. **Buyer**: Manages a shopping cart, reviews historical purchases, posts product ratings, and places orders.
3. **Agro Agent**: Registers offline farmers, posts crop inventories, updates order statuses, and checks live commission ledgers.
4. **Administrator**: Monitors global analytics, approves pending agent profiles, moderates products, and configures the platform percentage commission split.

---

## 📡 REST API Specifications

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` - Create a buyer or agent account.
- `POST /api/auth/login` - Verify credentials and set cookie.
- `POST /api/auth/logout` - Clear cookie.
- `GET /api/auth/me` - Inspect active user details.

### 2. Farmers Profile Manager (`/api/farmers`)
- `GET /api/farmers` - List active farmers (Scoped to agent, or full directory for admin).
- `POST /api/farmers` - Register a new offline farmer profile.
- `PUT /api/farmers/:id` - Edit farm size, village coordinates, crops list, or notes.
- `DELETE /api/farmers/:id` - Soft-archive farmer profile.

### 3. Product Catalog (`/api/products`)
- `GET /api/products` - Browse and filter active crops.
- `POST /api/products` - Add crops listing.
- `PUT /api/products/:id` - Modify pricing, availability, and description.
- `DELETE /api/products/:id` - Remove listing.

### 4. Orders Logistics (`/api/orders`)
- `GET /api/orders` - View historical purchases or dispatches.
- `POST /api/orders` - Check out shopping cart. Automatically calculates the platform percentage splits.
- `PUT /api/orders/:id` - Set status: `pending` ➔ `packed` ➔ `in_transit` ➔ `delivered`.

### 5. AI Services (`/api/ai`)
- `POST /api/ai/price-prediction` - Gemini price model analysis for crop & location.
- `POST /api/ai/farm-recommendation` - Smart crop advisor.

---

## ⚡ Instant Demo Quick-Access
To easily review the multi-role capabilities of AgroBridge, click any of the **Demo Access** quick buttons in the header:
- **Buyer Account**: `buyer@agrobridge.com` / `buyer123`
- **Agro Agent Account**: `agent1@agrobridge.com` / `agent123`
- **Administrator Account**: `admin@agrobridge.com` / `admin123`
