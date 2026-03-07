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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type ResetAnimationProps = {
    visible: boolean;
    onAnimationComplete: () => void;
};

export function ResetAnimation({ visible, onAnimationComplete }: ResetAnimationProps) {
    const overlayOpacity = useSharedValue(0);
    const scanLineY = useSharedValue(-100);
    const scanLineOpacity = useSharedValue(0);
    const warningOpacity = useSharedValue(0);
    const warningScale = useSharedValue(0.7);
    const messageOpacity = useSharedValue(0);
    const deletedOpacity = useSharedValue(0);
    const deletedScale = useSharedValue(0.5);
    const flashOpacity = useSharedValue(0);
    const borderGlow = useSharedValue(0);
    const lineWidth1 = useSharedValue(0);
    const lineWidth2 = useSharedValue(0);
    const glitchOffset = useSharedValue(0);

    useEffect(() => {
        if (!visible) return;

        // Reset everything to initial state first
        overlayOpacity.value = 0;
        scanLineY.value = -100;
        scanLineOpacity.value = 0;
        warningOpacity.value = 0;
        warningScale.value = 0.7;
        messageOpacity.value = 0;
        deletedOpacity.value = 0;
        deletedScale.value = 0.5;
        flashOpacity.value = 0;
        borderGlow.value = 0;
        lineWidth1.value = 0;
        lineWidth2.value = 0;
        glitchOffset.value = 0;

        // Phase 1: Dark overlay fades in, then stays, then fades out at end
        // Use withSequence to chain: fade in → hold → fade out
        overlayOpacity.value = withSequence(
            withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
            withDelay(3200, withTiming(0, { duration: 500 }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationComplete)();
                }
            })),
        );

        // Phase 1b: Border glow
        borderGlow.value = withDelay(400, withTiming(1, { duration: 400 }));

        // Phase 2: Horizontal decorative lines expand
        lineWidth1.value = withDelay(600, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
        lineWidth2.value = withDelay(700, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));

        // Phase 2: Scan line sweeps down
        scanLineOpacity.value = withDelay(800, withSequence(
            withTiming(0.8, { duration: 100 }),
            withTiming(0.3, { duration: 600 }),
            withTiming(0, { duration: 200 }),
        ));
        scanLineY.value = withDelay(800, withTiming(SCREEN_H + 100, { duration: 900, easing: Easing.linear }));

        // Phase 3: "WARNING" text
        warningOpacity.value = withDelay(1000, withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(0.6, { duration: 100 }),
            withTiming(1, { duration: 100 }),
        ));
        warningScale.value = withDelay(1000, withSequence(
            withTiming(1.1, { duration: 200, easing: Easing.out(Easing.back(2)) }),
            withTiming(1, { duration: 150 }),
        ));

        // Phase 3b: Glitch effect
        glitchOffset.value = withDelay(1200, withSequence(
            withTiming(4, { duration: 50 }),
            withTiming(-3, { duration: 50 }),
            withTiming(2, { duration: 50 }),
            withTiming(0, { duration: 50 }),
            withDelay(300, withSequence(
                withTiming(-3, { duration: 40 }),
                withTiming(2, { duration: 40 }),
                withTiming(0, { duration: 40 }),
            )),
        ));

        // Phase 4: System message
        messageOpacity.value = withDelay(1600, withTiming(1, { duration: 400 }));

        // Phase 5: "DATA DELETED"
        deletedOpacity.value = withDelay(2400, withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(0.4, { duration: 80 }),
            withTiming(1, { duration: 80 }),
        ));
        deletedScale.value = withDelay(2400, withSequence(
            withTiming(1.15, { duration: 150, easing: Easing.out(Easing.back(3)) }),
            withTiming(1, { duration: 200 }),
        ));

        // Phase 6: Flash
        flashOpacity.value = withDelay(3200, withSequence(
            withTiming(0.9, { duration: 80 }),
            withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }),
        ));
    }, [visible]);

    // Animated styles
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const scanLineStyle = useAnimatedStyle(() => ({
        opacity: scanLineOpacity.value,
        transform: [{ translateY: scanLineY.value }],
    }));

    const warningStyle = useAnimatedStyle(() => ({
        opacity: warningOpacity.value,
        transform: [
            { scale: warningScale.value },
            { translateX: glitchOffset.value },
        ],
    }));

    const messageStyle = useAnimatedStyle(() => ({
        opacity: messageOpacity.value,
    }));

    const deletedStyle = useAnimatedStyle(() => ({
        opacity: deletedOpacity.value,
        transform: [{ scale: deletedScale.value }],
    }));

    const flashStyle = useAnimatedStyle(() => ({
        opacity: flashOpacity.value,
    }));

    const borderStyle = useAnimatedStyle(() => ({
        opacity: borderGlow.value * 0.8,
    }));

    const line1Style = useAnimatedStyle(() => ({
        width: lineWidth1.value * (SCREEN_W * 0.4),
        opacity: lineWidth1.value,
    }));

    const line2Style = useAnimatedStyle(() => ({
        width: lineWidth2.value * (SCREEN_W * 0.4),
        opacity: lineWidth2.value,
    }));

    // Always render — Modal visible controls display
    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            hardwareAccelerated
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                {/* Corner borders (SAO-style HUD frame) */}
                <Animated.View style={[styles.cornerTL, borderStyle]} />
                <Animated.View style={[styles.cornerTR, borderStyle]} />
                <Animated.View style={[styles.cornerBL, borderStyle]} />
                <Animated.View style={[styles.cornerBR, borderStyle]} />

                {/* Decorative horizontal lines */}
                <Animated.View style={[styles.hLine, styles.hLineTop, line1Style]} />
                <Animated.View style={[styles.hLine, styles.hLineBottom, line2Style]} />

                {/* Scan line */}
                <Animated.View style={[styles.scanLine, scanLineStyle]} />

                {/* Center content */}
                <View style={styles.center}>
                    <Animated.View style={warningStyle}>
                        <Text style={styles.warningText}>⚠ WARNING</Text>
                        <View style={styles.warningUnderline} />
                    </Animated.View>

                    <Animated.View style={[styles.messageBox, messageStyle]}>
                        <Text style={styles.systemLabel}>SYSTEM NOTIFICATION</Text>
                        <Text style={styles.messageText}>
                            All character data will be permanently erased.{'\n'}
                            This action cannot be undone.
                        </Text>
                    </Animated.View>

                    <Animated.View style={deletedStyle}>
                        <Text style={styles.deletedText}>DATA DELETED</Text>
                    </Animated.View>
                </View>

                {/* White flash */}
                <Animated.View style={[styles.flash, flashStyle]} />
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    scanLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#ff2020',
        shadowColor: '#ff2020',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
    },
    cornerTL: {
        position: 'absolute',
        top: 60,
        left: 30,
        width: 40,
        height: 40,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#ff2020',
    },
    cornerTR: {
        position: 'absolute',
        top: 60,
        right: 30,
        width: 40,
        height: 40,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: '#ff2020',
    },
    cornerBL: {
        position: 'absolute',
        bottom: 60,
        left: 30,
        width: 40,
        height: 40,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#ff2020',
    },
    cornerBR: {
        position: 'absolute',
        bottom: 60,
        right: 30,
        width: 40,
        height: 40,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: '#ff2020',
    },
    hLine: {
        position: 'absolute',
        height: 1,
        backgroundColor: '#ff202060',
    },
    hLineTop: {
        top: '30%',
        left: '30%',
    },
    hLineBottom: {
        bottom: '30%',
        right: '30%',
    },
    warningText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#ff2020',
        letterSpacing: 8,
        textAlign: 'center',
        textShadowColor: '#ff2020',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    warningUnderline: {
        width: 120,
        height: 2,
        backgroundColor: '#ff2020',
        alignSelf: 'center',
        marginTop: 8,
        shadowColor: '#ff2020',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    messageBox: {
        marginTop: 30,
        marginBottom: 30,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: '#ff202040',
        backgroundColor: '#ff202010',
        borderRadius: 4,
    },
    systemLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#ff202090',
        letterSpacing: 4,
        textAlign: 'center',
        marginBottom: 10,
    },
    messageText: {
        fontSize: 14,
        color: '#cc8888',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '400',
    },
    deletedText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#ff4040',
        letterSpacing: 6,
        textAlign: 'center',
        textShadowColor: '#ff2020',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30,
    },
    flash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#ffffff',
    },
});
