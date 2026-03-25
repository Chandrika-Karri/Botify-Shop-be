import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { mergeGuestCart } from "../utils/cart";

interface JwtPayload {
  userId: string;
  role: string;
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const sessionId = req.headers['x-session-id'] as string | undefined;

  // If no token, allow guest access
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // guest can proceed
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not defined in environment!");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;

    // Merge guest cart into user cart if sessionId exists
    if (req.user.userId && sessionId) {
      await mergeGuestCart(req.user.userId, sessionId);
    }

    next();
  } catch (error) {
    console.warn("Invalid or expired token, proceeding as guest");
    // Treat invalid token as guest
    next();
  }
};

// Role-based authorization (optional)
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden: Insufficient role" });
    next();
  };
};