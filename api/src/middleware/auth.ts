import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenClaims } from "../lib/jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AccessTokenClaims;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookieToken = (req as Request & { cookies: Record<string, string> }).cookies?.access_token;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
