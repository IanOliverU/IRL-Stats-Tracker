import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

type QuestStartAnimationProps = {
    visible: boolean;
    playerName: string;
    onAnimationComplete: () => void;
};

/**
 * Clean "quest start" animation after user sets their name.
 * 
 * Timeline (~3.5s):
 *  0.0s — Dark overlay fades in
 *  0.3s — Accent line expands from center
 *  0.6s — Player name fades in above line
 *  1.0s — "QUEST START" fades in below line
 *  1.8s — Subtitle fades in
 *  2.8s — Everything fades out
 *  3.3s — Complete
 */
export function QuestStartAnimation({ visible, playerName, onAnimationComplete }: QuestStartAnimationProps) {
    const overlayOpacity = useSharedValue(0);
    const lineWidth = useSharedValue(0);
    const lineOpacity = useSharedValue(0);
    const nameOpacity = useSharedValue(0);
    const nameTranslateY = useSharedValue(10);
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(-10);
    const subtitleOpacity = useSharedValue(0);
    const dotLeftOpacity = useSharedValue(0);
    const dotRightOpacity = useSharedValue(0);

    useEffect(() => {
        if (!visible) return;

        // Reset
        overlayOpacity.value = 0;
        lineWidth.value = 0;
        lineOpacity.value = 0;
        nameOpacity.value = 0;
        nameTranslateY.value = 10;
        titleOpacity.value = 0;
        titleTranslateY.value = -10;
        subtitleOpacity.value = 0;
        dotLeftOpacity.value = 0;
        dotRightOpacity.value = 0;

        // Phase 1: Overlay fades in → holds → fades out
        overlayOpacity.value = withSequence(
            withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
            withDelay(2600, withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationComplete)();
                }
            })),
        );

        // Phase 2: Accent line expands from center
        lineOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
        lineWidth.value = withDelay(300, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));

        // Phase 2b: Dots at line ends
        dotLeftOpacity.value = withDelay(600, withSequence(
            withTiming(1, { duration: 150 }),
            withDelay(2200, withTiming(0, { duration: 300 })),
        ));
        dotRightOpacity.value = withDelay(600, withSequence(
            withTiming(1, { duration: 150 }),
            withDelay(2200, withTiming(0, { duration: 300 })),
        ));

        // Phase 3: Player name slides up and fades in
        nameOpacity.value = withDelay(600, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
        nameTranslateY.value = withDelay(600, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));

        // Phase 4: "QUEST START" slides down and fades in
        titleOpacity.value = withDelay(1000, withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.7, { duration: 100 }),
            withTiming(1, { duration: 100 }),
        ));
        titleTranslateY.value = withDelay(1000, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }));

        // Phase 5: Subtitle
        subtitleOpacity.value = withDelay(1600, withTiming(0.6, { duration: 400 }));
    }, [visible]);

    // Animated styles
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const lineStyle = useAnimatedStyle(() => ({
        width: lineWidth.value * (SCREEN_W * 0.6),
        opacity: lineOpacity.value,
    }));

    const nameStyle = useAnimatedStyle(() => ({
        opacity: nameOpacity.value,
        transform: [{ translateY: nameTranslateY.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const subtitleStyle = useAnimatedStyle(() => ({
        opacity: subtitleOpacity.value,
    }));

    const dotLeftStyle = useAnimatedStyle(() => ({
        opacity: dotLeftOpacity.value,
    }));

    const dotRightStyle = useAnimatedStyle(() => ({
        opacity: dotRightOpacity.value,
    }));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            hardwareAccelerated
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <View style={styles.center}>
                    {/* Player name */}
                    <Animated.View style={nameStyle}>
                        <Text style={styles.nameText}>{playerName}</Text>
                    </Animated.View>

                    {/* Accent line with dots */}
                    <View style={styles.lineContainer}>
                        <Animated.View style={[styles.dot, dotLeftStyle]} />
                        <Animated.View style={[styles.line, lineStyle]} />
                        <Animated.View style={[styles.dot, dotRightStyle]} />
                    </View>

                    {/* QUEST START */}
                    <Animated.View style={titleStyle}>
                        <Text style={styles.titleText}>QUEST START</Text>
                    </Animated.View>

                    {/* Subtitle */}
                    <Animated.View style={subtitleStyle}>
                        <Text style={styles.subtitleText}>Your adventure begins now</Text>
                    </Animated.View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    nameText: {
        fontSize: 32,
        fontWeight: '200',
        color: '#ffffff',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 16,
    },
    lineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    line: {
        height: 1,
        backgroundColor: '#38bdf8',
        shadowColor: '#38bdf8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 4,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#38bdf8',
        shadowColor: '#38bdf8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    },
    titleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#38bdf8',
        letterSpacing: 8,
        textAlign: 'center',
        marginTop: 16,
        textShadowColor: '#38bdf8',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitleText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#94a3b8',
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: 12,
    },
});
