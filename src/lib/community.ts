import { z } from "zod";
export const communityAuthSchema = z.object({ email: z.email().max(254), token: z.string().regex(/^\d{6,10}$/).optional(), mode: z.enum(["link", "login"]) }).strict();
export const postSchema = z.object({ kind: z.enum(["help", "experience"]), title: z.string().trim().min(4).max(100), body: z.string().trim().min(10).max(4000), public_consent: z.literal(true) }).strict();
export const communityActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), post: postSchema }).strict(),
  z.object({ action: z.literal("delete"), id: z.uuid() }).strict(),
  z.object({ action: z.literal("report"), id: z.uuid(), reason: z.enum(["privacy", "abuse", "spam", "other"]) }).strict(),
]);
export type CommunityPost = { id: string; kind: "help" | "experience"; title: string; body: string; created_at: string; mine: boolean };
