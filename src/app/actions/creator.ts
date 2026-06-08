'use server';

import { getDb } from '@/db';
import { creators, picoLinks, purchases } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getOrCreateCreator(walletAddress: string, handle?: string) {
  const db = getDb();
  const existing = await db.query.creators.findFirst({
    where: eq(creators.walletAddress, walletAddress.toLowerCase()),
  });
  if (existing) return { success: true, creator: existing, isNew: false };

  if (!handle) return { success: false, error: 'Handle required for new creators.' };

  const slug = handle.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!slug) return { success: false, error: 'Invalid handle.' };

  const taken = await db.query.creators.findFirst({ where: eq(creators.handle, slug) });
  if (taken) return { success: false, error: 'Handle already taken.' };

  const [created] = await db.insert(creators).values({
    walletAddress: walletAddress.toLowerCase(),
    handle: slug,
  }).returning();

  return { success: true, creator: created, isNew: true };
}

export async function getCreatorByWallet(walletAddress: string) {
  const db = getDb();
  const creator = await db.query.creators.findFirst({
    where: eq(creators.walletAddress, walletAddress.toLowerCase()),
  });
  return creator ?? null;
}

export async function getCreatorByHandle(handle: string) {
  const db = getDb();
  return db.query.creators.findFirst({ where: eq(creators.handle, handle.toLowerCase()) });
}

export async function updateCreatorBio(walletAddress: string, bio: string) {
  const db = getDb();
  await db.update(creators)
    .set({ bio })
    .where(eq(creators.walletAddress, walletAddress.toLowerCase()));
  revalidatePath('/dashboard');
}

export async function createPicoLink(data: {
  creatorId: string;
  title: string;
  description: string;
  price: string;
  contentUrl?: string;
  thankYouMessage?: string;
  type: string;
}) {
  const db = getDb();
  try {
    const [link] = await db.insert(picoLinks).values(data).returning();
    revalidatePath('/dashboard');
    return { success: true, link };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Failed to create link.' };
  }
}

export async function getCreatorLinks(creatorId: string) {
  const db = getDb();
  return db.query.picoLinks.findMany({
    where: eq(picoLinks.creatorId, creatorId),
    orderBy: desc(picoLinks.createdAt),
  });
}

export async function getLinkById(id: string) {
  const db = getDb();
  return db.query.picoLinks.findFirst({ where: eq(picoLinks.id, id) });
}

export async function recordPurchase(data: {
  linkId: string;
  buyerAddress: string;
  txHash: string;
  amountPaid: string;
}) {
  const db = getDb();
  try {
    const exists = await db.query.purchases.findFirst({
      where: eq(purchases.txHash, data.txHash),
    });
    if (exists) return { success: true };

    await db.insert(purchases).values(data);

    const link = await db.query.picoLinks.findFirst({ where: eq(picoLinks.id, data.linkId) });
    if (link) {
      const newEarnings = (parseFloat(link.totalEarnings ?? '0') + parseFloat(data.amountPaid)).toFixed(2);
      await db.update(picoLinks)
        .set({ salesCount: (link.salesCount ?? 0) + 1, totalEarnings: newEarnings })
        .where(eq(picoLinks.id, data.linkId));
    }

    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

export async function hasPurchased(linkId: string, buyerAddress: string) {
  const db = getDb();
  const p = await db.query.purchases.findFirst({
    where: (t, { and, eq }) => and(
      eq(t.linkId, linkId),
      eq(t.buyerAddress, buyerAddress.toLowerCase())
    ),
  });
  return !!p;
}

/** One-shot: create creator + first link from the landing page form */
export async function createCreatorWithLink(data: {
  walletAddress: string;
  displayName: string;
  purpose: string;
  price: string;
}) {
  const db = getDb();
  const wallet = data.walletAddress.toLowerCase();

  // Auto-generate handle from display name
  const base = data.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/, '')
    .slice(0, 18) || 'creator';

  const suffix = wallet.slice(2, 6); // last 4 hex chars as tie-breaker
  let handle = base;
  const taken = await db.query.creators.findFirst({ where: eq(creators.handle, handle) });
  if (taken && taken.walletAddress !== wallet) handle = `${base}_${suffix}`;

  // Upsert creator
  let creator = await db.query.creators.findFirst({
    where: eq(creators.walletAddress, wallet),
  });
  if (!creator) {
    const [c] = await db.insert(creators).values({
      walletAddress: wallet,
      handle,
      bio: data.displayName, // store display name in bio for now
    }).returning();
    creator = c;
  }

  // Create the link
  const [link] = await db.insert(picoLinks).values({
    creatorId: creator.id,
    title: data.purpose,
    description: '',
    price: data.price,
    type: 'tip',
  }).returning();

  revalidatePath('/dashboard');
  return { success: true, linkId: link.id, handle: creator.handle };
}

/** Get a link AND the creator's wallet address (for direct payment) */
export async function getLinkWithCreator(id: string) {
  const db = getDb();
  const link = await db.query.picoLinks.findFirst({ where: eq(picoLinks.id, id) });
  if (!link) return null;
  const creator = await db.query.creators.findFirst({ where: eq(creators.id, link.creatorId) });
  if (!creator) return null;
  return { link, creatorWallet: creator.walletAddress as `0x${string}` };
}

export async function getCreatorEarnings(creatorId: string) {
  const db = getDb();
  const links = await db.query.picoLinks.findMany({
    where: eq(picoLinks.creatorId, creatorId),
  });
  const total = links.reduce((sum, l) => sum + parseFloat(l.totalEarnings ?? '0'), 0);
  const sales = links.reduce((sum, l) => sum + (l.salesCount ?? 0), 0);
  return { total: total.toFixed(2), sales };
}
