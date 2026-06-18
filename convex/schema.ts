import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  registrations: defineTable({
    name: v.string(),
    swimming: v.optional(v.number()),   // priority 1-3 or undefined
    cycling: v.optional(v.number()),
    running: v.optional(v.number()),
    extraInfo: v.optional(v.string()),
    quantumState: v.string(),           // "superposition" | "collapsed"
    createdAt: v.number(),
  }),
});
