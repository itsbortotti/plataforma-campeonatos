import { prisma } from "../core/prisma.js";
import { liveBus } from "./live-bus.js";

const STALE_MS = 1000 * 60 * 60 * 4; // 4h

export async function finalizeStaleMatches() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await prisma.match.findMany({
    where: {
      status: { in: ["live", "halftime"] },
      updatedAt: { lt: cutoff },
    },
  });

  let count = 0;
  for (const match of stale) {
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "finished" },
    });
    await prisma.matchTimer.updateMany({
      where: { matchId: match.id },
      data: { isRunning: false },
    });
    liveBus.publish(match.id, "match_status", { status: "finished" });
    count += 1;
  }
  return { finalized: count };
}
