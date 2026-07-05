import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, User, Agent, hashPassword } from "./db.js";

const JWT_SECRET = "agrobridge_jwt_secret_token_2026_super_secure";

// Types extension for Request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "agent" | "buyer";
    verificationStatus: string;
  };
}

// Native JWT Signer
export function signToken(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const sHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const sPayload = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${sHeader}.${sPayload}`)
    .digest("base64url");

  return `${sHeader}.${sPayload}.${signature}`;
}

// Native JWT Verifier
export function verifyToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [sHeader, sPayload, sSignature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${sHeader}.${sPayload}`)
      .digest("base64url");

    if (sSignature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(sPayload, "base64url").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Authentication Middleware
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = "";

  // 1. Try to extract from cookie (using cookie-parser)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Try to extract from Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Find user to verify they still exist and check status
  const user = await db.findUser(decoded.id);
  if (!user) {
    return res.status(401).json({ error: "User no longer exists" });
  }

  if (user.verificationStatus === "suspended") {
    return res.status(403).json({ error: "This account has been suspended" });
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verificationStatus: user.verificationStatus,
  };

  next();
}

// RBAC Middleware generator
export function requireRole(roles: Array<"admin" | "agent" | "buyer">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized access: insufficient privileges" });
    }
    next();
  };
}

const authRouter = Router();

// 1. REGISTER
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role, nationalId, serviceArea } = req.body;

    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ error: "Missing required registration fields" });
    }

    if (!["agent", "buyer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    // Check if email already exists
    const existing = await db.findUser(email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Agent validation
    if (role === "agent" && (!nationalId || !serviceArea)) {
      return res.status(400).json({ error: "Agents must provide National ID and Service Area" });
    }

    // Create user object
    const userId = "usr_" + Math.random().toString(36).substring(2, 11);
    const isAgent = role === "agent";

    const newUser: User = {
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      phone,
      role,
      // Agents default to pending, buyers are instantly verified
      verificationStatus: isAgent ? "pending" : "verified",
      createdAt: new Date().toISOString(),
    };

    await db.addUser(newUser);

    // If agent, create the agent profile
    if (isAgent) {
      const newAgent: Agent = {
        userId,
        nationalId,
        serviceArea,
        approvalStatus: "pending",
      };
      await db.addAgent(newAgent);

      // Create admin notification
      await db.addNotification({
        id: "not_" + Math.random().toString(36).substring(2, 11),
        userId: "usr_admin", // Target administrator
        title: "New Agent Registered",
        message: `Agent ${name} (${serviceArea}) has registered and is pending approval.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Sign Token
    const token = signToken({ id: newUser.id, role: newUser.role });

    // Set cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "strict",
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        verificationStatus: newUser.verificationStatus,
      },
    });
  } catch (err: any) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// 2. LOGIN
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.findUser(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.verificationStatus === "suspended") {
      return res.status(403).json({ error: "Your account is suspended. Please contact support." });
    }

    const token = signToken({ id: user.id, role: user.role });

    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// 3. ME
authRouter.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const token = signToken({ id: user.id, role: user.role });
  res.json({
    user,
    token,
  });
});

// 4. LOGOUT
authRouter.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logout successful" });
});

// NOTE: /me is already defined above and returns the authenticated user.

export default authRouter;