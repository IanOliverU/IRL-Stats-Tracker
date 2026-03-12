import {
  formatMapDuration,
  formatMapPace,
  formatMapSessionDateTime,
  getMapActivityLabel,
  getMapRouteRegion,
  getMapSessionTitle,
  MAP_SESSION_XP_BONUS_LABELS,
} from '@/lib/mapActivity';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function MapSessionDetailScreen() {
  const colors = useAppColors();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const mapSessions = useGameStore((state) => state.mapSessions);
  const refreshMapActivitySessions = useGameStore((state) => state.refreshMapActivitySessions);

  useFocusEffect(
    useCallback(() => {
      refreshMapActivitySessions();
    }, [refreshMapActivitySessions])
  );

  const session = useMemo(
    () => mapSessions.find((entry) => entry.id === sessionId) ?? null,
    [mapSessions, sessionId]
  );

  if (!session) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Session Detail' }} />
        <Ionicons name="alert-circle-outline" size={30} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Session not found</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          This map activity could not be loaded from history.
        </Text>
      </View>
    );
  }

  const distanceKm = session.distanceMeters / 1000;
  const distanceMiles = session.distanceMeters / 1609.344;
  const pacePerKm = formatMapPace(session.elapsedMs, distanceKm);
  const pacePerMile = formatMapPace(session.elapsedMs, distanceMiles);
  const routeRegion = getMapRouteRegion(session.routeCoordinates);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: getMapSessionTitle(session) }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={[styles.title, { color: colors.text }]}>{getMapSessionTitle(session)}</Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatMapSessionDateTime(session.endedAt)}
              </Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[session.difficulty] }]}>
              <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[session.difficulty]}</Text>
            </View>
          </View>

          <View style={styles.activityRow}>
            <Text style={[styles.activityText, { color: colors.textSecondary }]}>
              {getMapActivityLabel(session.activityType)}
            </Text>
            <Text style={[styles.activityText, { color: colors.textSecondary }]}>
              Reward: {MAP_SESSION_XP_BONUS_LABELS[session.difficulty]}
            </Text>
          </View>
        </View>

        <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Route Preview</Text>
          <View style={styles.mapFrame}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={routeRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              toolbarEnabled={false}
            >
              {session.routeCoordinates.length > 1 ? (
                <Polyline coordinates={session.routeCoordinates} strokeColor={colors.accent} strokeWidth={4} />
              ) : null}
              {session.routeCoordinates[0] ? (
                <Marker coordinate={session.routeCoordinates[0]} title="Start" />
              ) : null}
              {session.routeCoordinates.length > 1 ? (
                <Marker
                  coordinate={session.routeCoordinates[session.routeCoordinates.length - 1]}
                  title="Finish"
                />
              ) : null}
            </MapView>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Summary</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Total Distance</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {distanceKm.toFixed(2)} km ({distanceMiles.toFixed(2)} mi)
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Total Time</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>{formatMapDuration(session.elapsedMs)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Average Pace</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {pacePerKm} /km | {pacePerMile} /mi
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Difficulty</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {DIFFICULTY_LABELS[session.difficulty]}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>XP Scaling</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {MAP_SESSION_XP_BONUS_LABELS[session.difficulty]} ({session.xpMultiplier.toFixed(2)}x)
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 13,
  },
  activityRow: {
    gap: 4,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  mapFrame: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  difficultyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
