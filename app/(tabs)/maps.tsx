import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { LatLng, Marker, Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TrackingStatus = 'running' | 'paused' | 'stopped';
type ActivityMode = 'run' | 'walk';

const DEFAULT_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const EARTH_RADIUS_METERS = 6371000;
const MIN_DISTANCE_DELTA_METERS = 2;

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

function formatDuration(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPace(elapsedMs: number, distanceUnits: number): string {
  if (distanceUnits <= 0) return '--';

  const paceMinutes = elapsedMs / 60000 / distanceUnits;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);

  if (seconds === 60) {
    return `${minutes + 1}:00`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getActivityLabel(mode: ActivityMode): string {
  return mode === 'run' ? 'Run' : 'Walk';
}

export default function MapsScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const lastTrackedCoordinateRef = useRef<LatLng | null>(null);

  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('stopped');
  const [activityMode, setActivityMode] = useState<ActivityMode>('run');
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

  const activeElapsedMs = useMemo(() => {
    if (trackingStatus === 'running' && runStartedAtRef.current) {
      return elapsedBeforeRunMs + (clockNow - runStartedAtRef.current);
    }
    return elapsedBeforeRunMs;
  }, [clockNow, elapsedBeforeRunMs, trackingStatus]);

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
      runStartedAtRef.current = startedAt;
      setClockNow(startedAt);
      setTrackingStatus('running');
    } catch {
      stopLocationWatcher();
      runStartedAtRef.current = null;
      setPermissionMessage('Unable to start live tracking. Please try again.');
    }
  }, [beginWatchingPosition, centerMapOnCoordinate, ensureForegroundPermission, stopLocationWatcher, trackingStatus]);

  const pauseTracking = useCallback(() => {
    if (trackingStatus !== 'running') return;

    const startedAt = runStartedAtRef.current;
    if (startedAt) {
      setElapsedBeforeRunMs((previous) => {
        const next = previous + (Date.now() - startedAt);
        return Math.floor(next / 1000) * 1000;
      });
      runStartedAtRef.current = null;
    }

    stopLocationWatcher();
    setTrackingStatus('paused');
  }, [stopLocationWatcher, trackingStatus]);

  const stopTracking = useCallback(() => {
    const startedAt = runStartedAtRef.current;
    if (trackingStatus === 'running' && startedAt) {
      setElapsedBeforeRunMs((previous) => {
        const next = previous + (Date.now() - startedAt);
        return Math.floor(next / 1000) * 1000;
      });
      runStartedAtRef.current = null;
    }

    stopLocationWatcher();
    setTrackingStatus('stopped');
  }, [stopLocationWatcher, trackingStatus]);

  const statusLabel = trackingStatus[0].toUpperCase() + trackingStatus.slice(1);
  const activityLabel = getActivityLabel(activityMode);
  const kilometers = distanceMeters / 1000;
  const miles = distanceMeters / 1609.344;
  const pacePerKm = formatPace(activeElapsedMs, kilometers);
  const pacePerMile = formatPace(activeElapsedMs, miles);
  const gpsReady = !!currentCoordinate;
  const panelTitle = gpsReady ? activityLabel : 'No GPS signal';

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
              <Text style={[styles.metricValue, { color: colors.text }]}>{formatDuration(activeElapsedMs)}</Text>
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
                  <Ionicons name={activityMode === 'run' ? 'flash' : 'walk'} size={32} color={colors.accent} />
                </Pressable>
                <Text style={[styles.idleActionLabel, { color: colors.text }]}>{activityLabel}</Text>
              </View>

              <View style={styles.idleActionItem}>
                <Pressable
                  onPress={startTracking}
                  style={({ pressed }) => [styles.startRoundButton, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityLabel={`Start ${activityLabel.toLowerCase()} tracking`}
                >
                  <Ionicons name="play" size={44} color="#ffffff" />
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

        {trackingStatus === 'stopped' && routeCoordinates.length > 1 ? (
          <View style={[styles.summaryCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Session Summary</Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              Total Distance: {kilometers.toFixed(2)} km ({miles.toFixed(2)} mi)
            </Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              Total Time: {formatDuration(activeElapsedMs)}
            </Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              Avg Pace: {pacePerKm} /km | {pacePerMile} /mi
            </Text>
          </View>
        ) : null}
      </View>
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
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  idleActionItem: {
    alignItems: 'center',
  },
  idleRoundButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startRoundButton: {
    width: 116,
    height: 116,
    borderRadius: 58,
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
  summaryCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    marginTop: 2,
  },
});
