import {
  formatMapDuration,
  formatMapPace,
  formatMapSessionDateTime,
  getMapActivityLabel,
  getMapSessionTitle,
} from '@/lib/mapActivity';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MapHistoryScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const mapSessions = useGameStore((state) => state.mapSessions);
  const refreshMapActivitySessions = useGameStore((state) => state.refreshMapActivitySessions);

  useFocusEffect(
    useCallback(() => {
      refreshMapActivitySessions();
    }, [refreshMapActivitySessions])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Activity History' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {mapSessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="trail-sign-outline" size={30} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No map sessions yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Finish a walk or run in the Maps tab and it will appear here.
            </Text>
          </View>
        ) : (
          mapSessions.map((session) => {
            const distanceKm = session.distanceMeters / 1000;
            const pacePerKm = formatMapPace(session.elapsedMs, distanceKm);

            return (
              <Pressable
                key={session.id}
                onPress={() =>
                  router.push({
                    pathname: '/maps/[sessionId]',
                    params: { sessionId: session.id },
                  })
                }
                style={({ pressed }) => [
                  styles.sessionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionHeaderCopy}>
                    <Text style={[styles.sessionTitle, { color: colors.text }]}>
                      {getMapSessionTitle(session)}
                    </Text>
                    <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                      {formatMapSessionDateTime(session.endedAt)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Activity</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {getMapActivityLabel(session.activityType)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Distance</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{distanceKm.toFixed(2)} km</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Time</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{formatMapDuration(session.elapsedMs)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Pace</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{pacePerKm} /km</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Difficulty</Text>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: DIFFICULTY_COLORS[session.difficulty] },
                    ]}
                  >
                    <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[session.difficulty]}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
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
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
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
  sessionCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sessionHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sessionDate: {
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
