import type { NextFunction, Request, Response } from "express";
import { verifyToken, type SessionUser } from "../lib/auth.js";
import type { Role } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function handleError(error: unknown, res: Response) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: "Error interno" });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError("No autorizado", 401);
    req.user = await verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "No autorizado" });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autorizado" });
    }
    if (req.user.role !== "ADMIN" && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Sin permiso" });
    }
    next();
  };
}
