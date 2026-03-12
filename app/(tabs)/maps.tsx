import {
  formatMapDuration,
  formatMapPace,
  getMapActivityLabel,
  getMapSessionDifficulty,
  getMapSessionTitle,
  MAP_SESSION_XP_BONUS_LABELS,
  MAP_SESSION_XP_MULTIPLIERS,
  roundElapsedMs,
} from '@/lib/mapActivity';
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_XP,
  MAX_CUSTOM_QUESTS_PER_DAY,
  type Difficulty,
  type MapActivityType,
} from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { LatLng, Marker, Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TrackingStatus = 'running' | 'paused' | 'stopped';
type CompletedSessionSummary = {
  activityMode: MapActivityType;
  difficulty: Difficulty;
  distanceMeters: number;
  elapsedMs: number;
  xpMultiplier: number;
};

const DEFAULT_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const EARTH_RADIUS_METERS = 6371000;
const MIN_DISTANCE_DELTA_METERS = 2;
const SUMMARY_MODAL_DURATION_MS = 10000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export default function MapsScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addMapActivitySession = useGameStore((state) => state.addMapActivitySession);
  const addCustomQuest = useGameStore((state) => state.addCustomQuest);
  const updateCustomQuest = useGameStore((state) => state.updateCustomQuest);
  const completeCustomQuestAction = useGameStore((state) => state.completeCustomQuest);
  const deleteCustomQuest = useGameStore((state) => state.deleteCustomQuest);
  const getCustomQuestsCompletedToday = useGameStore((state) => state.getCustomQuestsCompletedToday);

  const mapRef = useRef<MapView | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const lastTrackedCoordinateRef = useRef<LatLng | null>(null);
  const activeCustomQuestIdRef = useRef<string | null>(null);
  const lastQuestDistanceSyncMetersRef = useRef(0);

  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('stopped');
  const [activityMode, setActivityMode] = useState<MapActivityType>('run');
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus>(
    Location.PermissionStatus.UNDETERMINED
  );
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [currentCoordinate, setCurrentCoordinate] = useState<LatLng | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedBeforeRunMs, setElapsedBeforeRunMs] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [completedSession, setCompletedSession] = useState<CompletedSessionSummary | null>(null);
  const [summaryCountdownMs, setSummaryCountdownMs] = useState(SUMMARY_MODAL_DURATION_MS);
  const summaryCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryClosingRef = useRef(false);
  const summaryOverlayOpacity = useRef(new Animated.Value(0)).current;
  const summaryCardOpacity = useRef(new Animated.Value(0)).current;
  const summaryCardTranslateY = useRef(new Animated.Value(18)).current;
  const summaryCardScale = useRef(new Animated.Value(0.96)).current;
  const summaryProgress = useRef(new Animated.Value(1)).current;

  const buildRegion = useCallback((coordinate: LatLng): Region => {
    return {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, []);

  const centerMapOnCoordinate = useCallback(
    (coordinate: LatLng, animated = true) => {
      const region = buildRegion(coordinate);
      setInitialRegion((previous) => previous ?? region);
      mapRef.current?.animateToRegion(region, animated ? 600 : 0);
    },
    [buildRegion]
  );

  const stopLocationWatcher = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    const loadInitialLocationContext = async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status === Location.PermissionStatus.UNDETERMINED) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        setLocationPermission(permission.status);

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setInitialRegion(DEFAULT_REGION);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coordinate = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setCurrentCoordinate(coordinate);
        centerMapOnCoordinate(coordinate, false);
      } catch {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown) {
            const coordinate = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
            setCurrentCoordinate(coordinate);
            centerMapOnCoordinate(coordinate, false);
            return;
          }
        } catch {
          // fall through
        }
        setInitialRegion(DEFAULT_REGION);
        setPermissionMessage('Unable to load location context on this device.');
      }
    };

    loadInitialLocationContext();

    return () => {
      stopLocationWatcher();
    };
  }, [centerMapOnCoordinate, stopLocationWatcher]);

  useEffect(() => {
    if (trackingStatus !== 'running') {
      setClockNow(Date.now());
      return;
    }

    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [trackingStatus]);

  const clearSummaryCountdownInterval = useCallback(() => {
    if (summaryCountdownIntervalRef.current) {
      clearInterval(summaryCountdownIntervalRef.current);
      summaryCountdownIntervalRef.current = null;
    }
  }, []);

  const closeSummaryModal = useCallback(() => {
    if (!completedSession || summaryClosingRef.current) return;

    summaryClosingRef.current = true;
    clearSummaryCountdownInterval();
    summaryProgress.stopAnimation();

    Animated.parallel([
      Animated.timing(summaryOverlayOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(summaryCardOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(summaryCardTranslateY, {
        toValue: 18,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(summaryCardScale, {
        toValue: 0.97,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      summaryClosingRef.current = false;
      setCompletedSession(null);
      setSummaryCountdownMs(SUMMARY_MODAL_DURATION_MS);
      summaryProgress.setValue(1);
    });
  }, [
    clearSummaryCountdownInterval,
    completedSession,
    summaryCardOpacity,
    summaryCardScale,
    summaryCardTranslateY,
    summaryOverlayOpacity,
    summaryProgress,
  ]);

  useEffect(() => {
    return () => {
      clearSummaryCountdownInterval();
      summaryProgress.stopAnimation();
    };
  }, [clearSummaryCountdownInterval, summaryProgress]);

  useEffect(() => {
    if (!completedSession) {
      clearSummaryCountdownInterval();
      return;
    }

    summaryClosingRef.current = false;
    setSummaryCountdownMs(SUMMARY_MODAL_DURATION_MS);
    summaryOverlayOpacity.setValue(0);
    summaryCardOpacity.setValue(0);
    summaryCardTranslateY.setValue(18);
    summaryCardScale.setValue(0.96);
    summaryProgress.setValue(1);

    const openedAt = Date.now();
    clearSummaryCountdownInterval();
    summaryCountdownIntervalRef.current = setInterval(() => {
      const nextRemainingMs = Math.max(0, SUMMARY_MODAL_DURATION_MS - (Date.now() - openedAt));
      setSummaryCountdownMs(nextRemainingMs);

      if (nextRemainingMs <= 0) {
        closeSummaryModal();
      }
    }, 100);

    Animated.parallel([
      Animated.timing(summaryOverlayOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(summaryCardOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(summaryCardTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(summaryCardScale, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(summaryProgress, {
        toValue: 0,
        duration: SUMMARY_MODAL_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished && !summaryClosingRef.current) {
        closeSummaryModal();
      }
    });

    return () => {
      clearSummaryCountdownInterval();
      summaryProgress.stopAnimation();
    };
  }, [
    clearSummaryCountdownInterval,
    closeSummaryModal,
    completedSession,
    summaryCardOpacity,
    summaryCardScale,
    summaryCardTranslateY,
    summaryOverlayOpacity,
    summaryProgress,
  ]);

  const activeElapsedMs = useMemo(() => {
    if (trackingStatus === 'running' && runStartedAtRef.current) {
      return elapsedBeforeRunMs + (clockNow - runStartedAtRef.current);
    }
    return elapsedBeforeRunMs;
  }, [clockNow, elapsedBeforeRunMs, trackingStatus]);

  useEffect(() => {
    const activeQuestId = activeCustomQuestIdRef.current;
    if (!activeQuestId || trackingStatus === 'stopped') return;

    const shouldSyncDistance =
      distanceMeters === 0 ||
      Math.abs(distanceMeters - lastQuestDistanceSyncMetersRef.current) >= 100;

    if (!shouldSyncDistance) return;

    lastQuestDistanceSyncMetersRef.current = distanceMeters;
    updateCustomQuest(activeQuestId, { distanceMeters });
  }, [distanceMeters, trackingStatus, updateCustomQuest]);

  const ensureForegroundPermission = useCallback(async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === Location.PermissionStatus.GRANTED) {
      setLocationPermission(current.status);
      setPermissionMessage(null);
      return true;
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(requested.status);

    if (requested.status !== Location.PermissionStatus.GRANTED) {
      setPermissionMessage('Location permission is required to track your route.');
      return false;
    }

    setPermissionMessage(null);
    return true;
  }, []);

  const beginWatchingPosition = useCallback(async () => {
    stopLocationWatcher();

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 2,
      },
      (location) => {
        const nextCoordinate: LatLng = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCurrentCoordinate(nextCoordinate);
        setRouteCoordinates((previous) => [...previous, nextCoordinate]);
        mapRef.current?.animateToRegion(buildRegion(nextCoordinate), 450);

        const previousCoordinate = lastTrackedCoordinateRef.current;
        if (previousCoordinate) {
          const delta = haversineDistanceMeters(previousCoordinate, nextCoordinate);
          if (delta >= MIN_DISTANCE_DELTA_METERS) {
            setDistanceMeters((previousDistance) => previousDistance + delta);
          }
        }

        lastTrackedCoordinateRef.current = nextCoordinate;
      }
    );

    locationSubscriptionRef.current = subscription;
  }, [buildRegion, stopLocationWatcher]);

  const startTracking = useCallback(async () => {
    const hasPermission = await ensureForegroundPermission();
    if (!hasPermission) return;

    if (trackingStatus === 'stopped') {
      setRouteCoordinates([]);
      setDistanceMeters(0);
      setElapsedBeforeRunMs(0);
      setCompletedSession(null);
      sessionStartedAtRef.current = null;
      activeCustomQuestIdRef.current = null;
      lastQuestDistanceSyncMetersRef.current = 0;
      lastTrackedCoordinateRef.current = null;
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentPoint: LatLng = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setCurrentCoordinate(currentPoint);
      centerMapOnCoordinate(currentPoint);

      setRouteCoordinates((previous) => {
        if (previous.length > 0) return [...previous, currentPoint];
        return [currentPoint];
      });
      lastTrackedCoordinateRef.current = currentPoint;
    } catch {
      runStartedAtRef.current = null;
      setPermissionMessage('Could not read your current location. Try again.');
      return;
    }

    try {
      await beginWatchingPosition();
      const startedAt = Date.now();
      if (!sessionStartedAtRef.current) {
        sessionStartedAtRef.current = new Date(startedAt).toISOString();
      }
      runStartedAtRef.current = startedAt;
      setClockNow(startedAt);
      setTrackingStatus('running');
      if (trackingStatus === 'stopped') {
        if (getCustomQuestsCompletedToday() < MAX_CUSTOM_QUESTS_PER_DAY) {
          const quest = addCustomQuest({
            title: `${getMapActivityLabel(activityMode)} Session`,
            statReward: 'VIT',
            difficulty: 'easy',
            source: 'map_activity',
            activityType: activityMode,
            distanceMeters: 0,
          });

          activeCustomQuestIdRef.current = quest?.id ?? null;
          lastQuestDistanceSyncMetersRef.current = 0;
        } else {
          setPermissionMessage(
            `Daily custom quest limit reached (${MAX_CUSTOM_QUESTS_PER_DAY}). This session will still be saved to history.`
          );
        }
      }
    } catch {
      stopLocationWatcher();
      runStartedAtRef.current = null;
      setPermissionMessage('Unable to start live tracking. Please try again.');
    }
  }, [
    activityMode,
    addCustomQuest,
    beginWatchingPosition,
    centerMapOnCoordinate,
    ensureForegroundPermission,
    getCustomQuestsCompletedToday,
    stopLocationWatcher,
    trackingStatus,
  ]);

  const pauseTracking = useCallback(() => {
    if (trackingStatus !== 'running') return;

    const startedAt = runStartedAtRef.current;
    if (startedAt) {
      setElapsedBeforeRunMs((previous) => {
        return roundElapsedMs(previous + (Date.now() - startedAt));
      });
      runStartedAtRef.current = null;
    }

    stopLocationWatcher();
    setTrackingStatus('paused');
  }, [stopLocationWatcher, trackingStatus]);

  const stopTracking = useCallback(() => {
    let finalElapsedMs = elapsedBeforeRunMs;
    const startedAt = runStartedAtRef.current;
    const activeCustomQuestId = activeCustomQuestIdRef.current;
    if (trackingStatus === 'running' && startedAt) {
      finalElapsedMs = roundElapsedMs(elapsedBeforeRunMs + (Date.now() - startedAt));
      setElapsedBeforeRunMs(finalElapsedMs);
      runStartedAtRef.current = null;
    }

    if (routeCoordinates.length > 1 && (distanceMeters > 0 || finalElapsedMs > 0)) {
      const difficulty = getMapSessionDifficulty(distanceMeters / 1000);
      const endedAt = new Date().toISOString();
      const startedAtIso = sessionStartedAtRef.current ?? new Date(Date.now() - finalElapsedMs).toISOString();
      const session = addMapActivitySession({
        activityType: activityMode,
        difficulty,
        distanceMeters,
        elapsedMs: finalElapsedMs,
        startedAt: startedAtIso,
        endedAt,
        xpMultiplier: MAP_SESSION_XP_MULTIPLIERS[difficulty],
        routeCoordinates,
      });

      setCompletedSession({
        activityMode: session.activityType,
        difficulty: session.difficulty,
        distanceMeters: session.distanceMeters,
        elapsedMs: session.elapsedMs,
        xpMultiplier: session.xpMultiplier,
      });

      if (activeCustomQuestId) {
        const finalQuestTitle = getMapSessionTitle({
          activityType: session.activityType,
          startedAt: session.startedAt,
        });

        updateCustomQuest(activeCustomQuestId, {
          title: finalQuestTitle,
          difficulty,
          xpReward: DIFFICULTY_XP[difficulty],
          activityType: session.activityType,
          linkedMapSessionId: session.id,
          distanceMeters: session.distanceMeters,
        });

        const autoCompleteResult = completeCustomQuestAction(activeCustomQuestId);
        if (!autoCompleteResult.success) {
          setPermissionMessage(`Session saved, but quest auto-complete failed: ${autoCompleteResult.message}`);
        }
      }
    } else {
      if (activeCustomQuestId) {
        deleteCustomQuest(activeCustomQuestId);
      }
      setCompletedSession(null);
    }

    activeCustomQuestIdRef.current = null;
    lastQuestDistanceSyncMetersRef.current = 0;
    stopLocationWatcher();
    setTrackingStatus('stopped');
  }, [
    activityMode,
    addMapActivitySession,
    completeCustomQuestAction,
    deleteCustomQuest,
    distanceMeters,
    elapsedBeforeRunMs,
    routeCoordinates,
    stopLocationWatcher,
    trackingStatus,
    updateCustomQuest,
  ]);

  const statusLabel = trackingStatus[0].toUpperCase() + trackingStatus.slice(1);
  const activityLabel = getMapActivityLabel(activityMode);
  const kilometers = distanceMeters / 1000;
  const miles = distanceMeters / 1609.344;
  const pacePerKm = formatMapPace(activeElapsedMs, kilometers);
  const gpsReady = !!currentCoordinate;
  const panelTitle = gpsReady ? activityLabel : 'No GPS signal';
  const summaryKilometers = completedSession ? completedSession.distanceMeters / 1000 : 0;
  const summaryMiles = completedSession ? completedSession.distanceMeters / 1609.344 : 0;
  const summaryPacePerKm = completedSession ? formatMapPace(completedSession.elapsedMs, summaryKilometers) : '--';
  const summaryPacePerMile = completedSession ? formatMapPace(completedSession.elapsedMs, summaryMiles) : '--';
  const summaryDifficultyLabel = completedSession ? `${DIFFICULTY_LABELS[completedSession.difficulty]} Session` : '';
  const summaryRewardLabel = completedSession ? MAP_SESSION_XP_BONUS_LABELS[completedSession.difficulty] : '';
  const summaryCountdownSeconds = Math.max(0, Math.ceil(summaryCountdownMs / 100) / 10);
  const summaryProgressWidth = summaryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const goToActivityHistory = useCallback(() => {
    closeSummaryModal();
    router.push('/maps/history');
  }, [closeSummaryModal, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {initialRegion ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={locationPermission === Location.PermissionStatus.GRANTED}
        >
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.accent}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {currentCoordinate && <Marker coordinate={currentCoordinate} title="Current Location" />}
        </MapView>
      ) : (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textSecondary }}>Getting your location...</Text>
        </View>
      )}

      <Pressable
        onPress={() => router.push('/maps/history')}
        style={({ pressed }) => [
          styles.historyButton,
          {
            top: Math.max(insets.top + 10, 18),
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderColor: '#22c55e',
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        accessibilityLabel="Open activity history"
      >
        <Ionicons name="time-outline" size={22} color="#ffffff" />
      </Pressable>

      <View style={[styles.bottomDock, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <View style={[styles.trackerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.trackerHeaderRow}>
            <View style={styles.trackerTitleRow}>
              {!gpsReady && <Ionicons name="warning-outline" size={22} color="#ff5a5a" />}
              <Text style={[styles.trackerTitleText, { color: gpsReady ? colors.text : '#ff5a5a' }]}>{panelTitle}</Text>
            </View>
            <Ionicons name="expand-outline" size={26} color={colors.text} />
          </View>

          <Text style={[styles.trackerStatusText, { color: colors.textSecondary }]}>Status: {statusLabel}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricValue, { color: colors.text }]}>{formatMapDuration(activeElapsedMs)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Time</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricValue, { color: colors.text }]}>{pacePerKm}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Split avg. (/km)</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricValue, { color: colors.text }]}>{kilometers.toFixed(2)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Distance (km)</Text>
              <Text style={[styles.metricSubLabel, { color: colors.textTertiary }]}>{miles.toFixed(2)} mi</Text>
            </View>
          </View>

          {permissionMessage ? (
            <Text style={[styles.permissionText, { color: colors.warning }]}>{permissionMessage}</Text>
          ) : null}
        </View>

        <View style={[styles.controlsShell, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {trackingStatus === 'stopped' && (
            <View style={styles.idleActionsRow}>
              <View style={styles.idleActionItem}>
                <Pressable
                  onPress={() => setActivityMode((previous) => (previous === 'run' ? 'walk' : 'run'))}
                  style={({ pressed }) => [
                    styles.idleRoundButton,
                    {
                      backgroundColor: colors.accentMuted,
                      borderColor: colors.accent,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  accessibilityLabel="Toggle walk and run"
                >
                  <Ionicons name={activityMode === 'run' ? 'flash' : 'walk'} size={34} color={colors.accent} />
                </Pressable>
                <Text style={[styles.idleActionLabel, { color: colors.text }]}>{activityLabel}</Text>
              </View>

              <View style={styles.idleActionItem}>
                <Pressable
                  onPress={startTracking}
                  style={({ pressed }) => [styles.startRoundButton, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityLabel={`Start ${activityLabel.toLowerCase()} tracking`}
                >
                  <Ionicons name="play" size={36} color="#ffffff" />
                </Pressable>
                <Text style={[styles.idleActionLabel, { color: colors.text }]}>Start</Text>
              </View>
            </View>
          )}

          {(trackingStatus === 'running' || trackingStatus === 'paused') && (
            <View style={styles.activityActionsRow}>
              <Pressable
                onPress={trackingStatus === 'running' ? pauseTracking : startTracking}
                style={({ pressed }) => [styles.activityPrimaryButton, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityLabel={trackingStatus === 'running' ? 'Pause tracking' : 'Resume tracking'}
              >
                <Ionicons name={trackingStatus === 'running' ? 'pause' : 'play'} size={28} color="#ffffff" />
                <Text style={styles.activityPrimaryText}>{trackingStatus === 'running' ? 'Pause' : 'Resume'}</Text>
              </Pressable>

              <Pressable
                onPress={stopTracking}
                style={({ pressed }) => [styles.activityStopButton, { opacity: pressed ? 0.9 : 1 }]}
                accessibilityLabel="Stop tracking"
              >
                <Ionicons name="stop" size={28} color="#ff5f5f" />
                <Text style={styles.activityStopText}>Stop</Text>
              </Pressable>
            </View>
          )}
        </View>

      </View>

      <Modal
        animationType="fade"
        transparent
        visible={!!completedSession}
        onRequestClose={closeSummaryModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: summaryOverlayOpacity }]}>
          <Animated.View
            style={[
              styles.summaryModal,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                opacity: summaryCardOpacity,
                transform: [{ translateY: summaryCardTranslateY }, { scale: summaryCardScale }],
              },
            ]}
          >
            <View style={styles.summaryHeaderRow}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                {completedSession ? `${getMapActivityLabel(completedSession.activityMode)} Session Summary` : 'Session Summary'}
              </Text>
              {completedSession ? (
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: DIFFICULTY_COLORS[completedSession.difficulty] },
                  ]}
                >
                  <Text style={styles.difficultyBadgeText}>{summaryDifficultyLabel}</Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.progressTrack,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
              ]}
            >
              <Animated.View style={[styles.progressFill, { width: summaryProgressWidth }]} />
            </View>

            <Text style={[styles.summaryCountdownText, { color: colors.textSecondary }]}>
              Auto-closes in {summaryCountdownSeconds.toFixed(1)}s
            </Text>

            {completedSession ? (
              <>
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  Total Distance: {summaryKilometers.toFixed(2)} km ({summaryMiles.toFixed(2)} mi)
                </Text>
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  Total Time: {formatMapDuration(completedSession.elapsedMs)}
                </Text>
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  Avg Pace: {summaryPacePerKm} /km | {summaryPacePerMile} /mi
                </Text>
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  Reward Scaling: {summaryRewardLabel} ({completedSession.xpMultiplier.toFixed(2)}x)
                </Text>
              </>
            ) : null}

            <View style={styles.summaryActionsRow}>
              <Pressable
                onPress={closeSummaryModal}
                style={({ pressed }) => [
                  styles.summarySecondaryButton,
                  {
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.inputBg,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={[styles.summarySecondaryButtonText, { color: colors.text }]}>Close</Text>
              </Pressable>

              <Pressable
                onPress={goToActivityHistory}
                style={({ pressed }) => [
                  styles.summaryPrimaryButton,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Text style={styles.summaryPrimaryButtonText}>Go to Activity History</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyButton: {
    position: 'absolute',
    right: 12,
    zIndex: 5,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  bottomDock: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    gap: 8,
  },
  trackerCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  trackerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackerTitleText: {
    fontSize: 20,
    fontWeight: '800',
  },
  trackerStatusText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  metricBlock: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  metricSubLabel: {
    marginTop: 3,
    fontSize: 12,
  },
  permissionText: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  controlsShell: {
    borderWidth: 1,
    borderRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  idleActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingHorizontal: 6,
    paddingBottom: 2,
  },
  idleActionItem: {
    flex: 1,
    alignItems: 'center',
  },
  idleRoundButton: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startRoundButton: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#ff6200',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleActionLabel: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  activityActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '92%',
    alignSelf: 'center',
  },
  activityPrimaryButton: {
    width: '48%',
    minHeight: 74,
    borderRadius: 999,
    backgroundColor: '#ff6200',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  activityPrimaryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  activityStopButton: {
    width: '48%',
    minHeight: 74,
    borderRadius: 999,
    backgroundColor: '#2b1212',
    borderWidth: 1.5,
    borderColor: '#ff5f5f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  activityStopText: {
    color: '#ff5f5f',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  summaryModal: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    marginTop: 2,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 10,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  summaryCountdownText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  difficultyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  difficultyBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  summaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  summarySecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  summarySecondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryPrimaryButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  summaryPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});
