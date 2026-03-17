import { DIFFICULTY_XP, type Difficulty, type MapActivitySession, type MapActivityType, type MapCoordinate } from '@/models';
import type { Region } from 'react-native-maps';

export const MAP_SESSION_DIFFICULTY_THRESHOLDS_KM = {
  easyMax: 5,
  mediumMax: 10,
} as const;

export const MAP_SESSION_XP_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.5,
};

export const MAP_SESSION_XP_BONUS_LABELS: Record<Difficulty, string> = {
  easy: 'Standard XP',
  medium: '+25% bonus XP',
  hard: '+50% bonus XP',
};

export function getMapSessionQuestXpReward(difficulty: Difficulty): number {
  return Math.round(DIFFICULTY_XP[difficulty] * MAP_SESSION_XP_MULTIPLIERS[difficulty]);
}

export function getMapSessionDifficulty(distanceKm: number): Difficulty {
  const safeDistanceKm = Math.max(0, distanceKm);

  if (safeDistanceKm <= MAP_SESSION_DIFFICULTY_THRESHOLDS_KM.easyMax) return 'easy';
  if (safeDistanceKm <= MAP_SESSION_DIFFICULTY_THRESHOLDS_KM.mediumMax) return 'medium';
  return 'hard';
}

export function formatMapDuration(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatMapPace(elapsedMs: number, distanceUnits: number): string {
  if (distanceUnits <= 0) return '--';

  const paceMinutes = elapsedMs / 60000 / distanceUnits;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);

  if (seconds === 60) {
    return `${minutes + 1}:00`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function roundElapsedMs(totalMs: number): number {
  return Math.floor(totalMs / 1000) * 1000;
}

export function getMapActivityLabel(activityType: MapActivityType): string {
  return activityType === 'run' ? 'Run' : 'Walk';
}

export function formatMapSessionDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getMapSessionTitle(session: Pick<MapActivitySession, 'activityType' | 'startedAt'>): string {
  const hour = new Date(session.startedAt).getHours();
  let dayPart = 'Session';

  if (hour < 12) {
    dayPart = 'Morning';
  } else if (hour < 18) {
    dayPart = 'Afternoon';
  } else {
    dayPart = 'Evening';
  }

  return `${dayPart} ${getMapActivityLabel(session.activityType)}`;
}

export function getMapRouteRegion(routeCoordinates: MapCoordinate[]): Region {
  const fallback = routeCoordinates[0] ?? { latitude: 37.78825, longitude: -122.4324 };

  if (routeCoordinates.length <= 1) {
    return {
      latitude: fallback.latitude,
      longitude: fallback.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  let minLat = routeCoordinates[0].latitude;
  let maxLat = routeCoordinates[0].latitude;
  let minLng = routeCoordinates[0].longitude;
  let maxLng = routeCoordinates[0].longitude;

  for (const coordinate of routeCoordinates) {
    minLat = Math.min(minLat, coordinate.latitude);
    maxLat = Math.max(maxLat, coordinate.latitude);
    minLng = Math.min(minLng, coordinate.longitude);
    maxLng = Math.max(maxLng, coordinate.longitude);
  }

  const latitudeDelta = Math.max((maxLat - minLat) * 1.4, 0.01);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.4, 0.01);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}
