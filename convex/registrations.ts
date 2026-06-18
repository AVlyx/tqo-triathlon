import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("registrations")
      .order("asc")
      .collect();
  },
});

export const register = mutation({
  args: {
    name: v.string(),
    swimming: v.optional(v.number()),
    cycling: v.optional(v.number()),
    running: v.optional(v.number()),
    extraInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("registrations")
      .collect();
    const duplicate = existing.find(
      (r) => r.name.toLowerCase() === args.name.toLowerCase()
    );
    if (duplicate) {
      throw new Error("QUANTUM_COLLISION: A particle with this name already exists in this universe.");
    }
    return await ctx.db.insert("registrations", {
      ...args,
      quantumState: "collapsed",
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("registrations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("registrations"),
    swimming: v.optional(v.number()),
    cycling: v.optional(v.number()),
    running: v.optional(v.number()),
    extraInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
