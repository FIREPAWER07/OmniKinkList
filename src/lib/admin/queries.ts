import "server-only";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";

export async function getUsers() {
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
    .from(user)
    .orderBy(asc(user.createdAt));
}

export async function getAuditLog(limit = 100) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(limit);
}

export type AuditEntry = Awaited<ReturnType<typeof getAuditLog>>[number];
