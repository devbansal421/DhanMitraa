import { useEffect, useState } from 'react';
import { listParticipants } from '@/services/networkRepository';

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

async function loadVerifiedNames(): Promise<Set<string>> {
  if (cache) return cache;
  if (!inflight) {
    inflight = listParticipants()
      .then((participants) => {
        cache = new Set(participants.map((p) => p.name.trim().toLowerCase()));
        return cache;
      })
      .catch(() => {
        // Guests and un-provisioned accounts cannot read the directory — that is
        // fine, it just means no "verified" badges.
        cache = new Set<string>();
        return cache;
      });
  }
  return inflight;
}

/** Names of organisations in the user's verified network, lower-cased, for
 *  showing a "verified payee" cue on the Send screen. Empty when unavailable. */
export function useVerifiedPayees() {
  const [names, setNames] = useState<Set<string>>(cache ?? new Set());

  useEffect(() => {
    let active = true;
    void loadVerifiedNames().then((result) => { if (active) setNames(result); });
    return () => { active = false; };
  }, []);

  return {
    names,
    isVerified: (candidate: string) => names.has(candidate.trim().toLowerCase()),
  };
}
