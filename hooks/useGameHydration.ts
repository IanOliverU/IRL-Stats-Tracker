import { useGameStore } from '@/store/useGameStore';
import { useEffect } from 'react';

export function useGameHydration(): boolean {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  return hydrated;
}
