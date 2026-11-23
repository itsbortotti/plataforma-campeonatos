import { EventEmitter } from "node:events";

type LivePayload = { type: string; matchId: string; data?: unknown };

class LiveBus extends EventEmitter {
  publish(matchId: string, type: string, data?: unknown) {
    const payload: LivePayload = { type, matchId, data };
    this.emit(`match:${matchId}`, payload);
    this.emit("season", payload);
  }

  subscribeMatch(matchId: string, listener: (p: LivePayload) => void) {
    this.on(`match:${matchId}`, listener);
    return () => this.off(`match:${matchId}`, listener);
  }

  subscribeSeason(listener: (p: LivePayload) => void) {
    this.on("season", listener);
    return () => this.off("season", listener);
  }
}

export const liveBus = new LiveBus();
