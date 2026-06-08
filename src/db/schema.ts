import { pgTable, text, timestamp, decimal, uuid, integer } from 'drizzle-orm/pg-core';

export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull().unique(),
  handle: text('handle').notNull().unique(),
  bio: text('bio').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const picoLinks = pgTable('pico_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  contentUrl: text('content_url'),              // null = tip only (no reward)
  thankYouMessage: text('thank_you_message'),   // shown after payment
  type: text('type').notNull().default('tip'),  // tip | coffee | pdf | guide | call | other
  salesCount: integer('sales_count').notNull().default(0),
  totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  linkId: uuid('link_id').notNull().references(() => picoLinks.id),
  buyerAddress: text('buyer_address').notNull(),
  txHash: text('tx_hash').notNull().unique(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Creator = typeof creators.$inferSelect;
export type NewCreator = typeof creators.$inferInsert;
export type PicoLink = typeof picoLinks.$inferSelect;
export type NewPicoLink = typeof picoLinks.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
