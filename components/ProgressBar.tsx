import { useAppColors } from '@/store/useThemeStore';
import React, { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type ProgressBarProps = {
  progress: number;
  height?: number;
  fillColor?: string;
  className?: string;
};

export function ProgressBar({
  progress,
  height = 12,
  fillColor,
  className,
}: ProgressBarProps) {
  const colors = useAppColors();
  const ratio = Math.max(0, Math.min(1, progress));
  const previousRatio = useRef(ratio);

  const animatedProgress = useSharedValue(ratio);
  const flashOpacity = useSharedValue(0);
  const flashTranslateX = useSharedValue(-48);
  const trackScale = useSharedValue(1);

  useEffect(() => {
    animatedProgress.value = withTiming(ratio, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });

    if (ratio > previousRatio.current + 0.001) {
      flashOpacity.value = withSequence(
        withTiming(0.82, { duration: 110 }),
        withDelay(110, withTiming(0, { duration: 260 }))
      );
      flashTranslateX.value = -48;
      flashTranslateX.value = withTiming(220, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      });
      trackScale.value = withSequence(
        withTiming(1.025, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
      );
    }

    previousRatio.current = ratio;
  }, [animatedProgress, flashOpacity, flashTranslateX, ratio, trackScale]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: trackScale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ translateX: flashTranslateX.value }],
  }));

  return (
    <Animated.View
      className={className}
      style={[
        {
          height,
          backgroundColor: colors.inputBg,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        trackStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            height,
            backgroundColor: fillColor ?? colors.accent,
            borderRadius: height / 2,
            position: 'absolute',
            left: 0,
            top: 0,
          },
          fillStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -height * 0.25,
            bottom: -height * 0.25,
            width: Math.max(24, height * 2.2),
            borderRadius: height,
            backgroundColor: '#ffffff',
          },
          flashStyle,
        ]}
      />
    </Animated.View>
  );
}
