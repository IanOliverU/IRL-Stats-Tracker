import { useAppColors } from '@/store/useThemeStore';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
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

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(ratio, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });
  }, [ratio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
  }));

  return (
    <View
      className={className}
      style={{
        height,
        backgroundColor: colors.inputBg,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
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
    </View>
  );
}
