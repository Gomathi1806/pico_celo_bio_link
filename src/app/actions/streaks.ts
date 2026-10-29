'use server';

import { getDb } from '@/db';
import { streaks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export async function recordStreakActivity(
  walletAddress: string,
  creatorId: string
): Promise<{ currentStreak: number; longestStreak: number; totalInteractions: number }> {
  const db = getDb();
  const wallet = walletAddress.toLowerCase();
  const today = todayUTC();

  const existing = await db.query.streaks.findFirst({
    where: and(eq(streaks.walletAddress, wallet), eq(streaks.creatorId, creatorId)),
  });

  if (!existing) {
    const [row] = await db.insert(streaks).values({
      walletAddress: wallet,
      creatorId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
      totalInteractions: 1,
    }).returning();
    return { currentStreak: row.currentStreak, longestStreak: row.longestStreak, totalInteractions: row.totalInteractions };
  }

  if (existing.lastActivityDate === today) {
    return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, totalInteractions: existing.totalInteractions };
  }

  const gap = existing.lastActivityDate ? daysBetween(existing.lastActivityDate, today) : 999;
  const newStreak = gap === 1 ? existing.currentStreak + 1 : 1;
  const newLongest = Math.max(newStreak, existing.longestStreak);

  const [row] = await db.update(streaks)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: today,
      totalInteractions: existing.totalInteractions + 1,
      updatedAt: new Date(),
    })
    .where(eq(streaks.id, existing.id))
    .returning();

  return { currentStreak: row.currentStreak, longestStreak: row.longestStreak, totalInteractions: row.totalInteractions };
}

export async function getStreak(walletAddress: string, creatorId: string) {
  const db = getDb();
  const wallet = walletAddress.toLowerCase();
  const row = await db.query.streaks.findFirst({
    where: and(eq(streaks.walletAddress, wallet), eq(streaks.creatorId, creatorId)),
  });
  if (!row) return { currentStreak: 0, longestStreak: 0, totalInteractions: 0 };

  const today = todayUTC();
  const gap = row.lastActivityDate ? daysBetween(row.lastActivityDate, today) : 999;
  const currentStreak = gap <= 1 ? row.currentStreak : 0;

  return { currentStreak, longestStreak: row.longestStreak, totalInteractions: row.totalInteractions };
}

export async function getCreatorTopSupporters(creatorId: string, limit = 10) {
  const db = getDb();
  const rows = await db.query.streaks.findMany({
    where: eq(streaks.creatorId, creatorId),
    orderBy: (s, { desc }) => [desc(s.longestStreak)],
    limit,
  });
  return rows.map(r => ({
    walletAddress: r.walletAddress,
    currentStreak: r.currentStreak,
    longestStreak: r.longestStreak,
    totalInteractions: r.totalInteractions,
  }));
}
