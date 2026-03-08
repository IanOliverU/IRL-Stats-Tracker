import { ThemePicker } from '@/components/ThemePicker';
import { useAppColors, useIsDarkTheme } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

type SettingsModalProps = {
    visible: boolean;
    onClose: () => void;
    onResetTriggered: () => void;
};

export function SettingsModal({ visible, onClose, onResetTriggered }: SettingsModalProps) {
    const colors = useAppColors();
    const isDarkTheme = useIsDarkTheme();
    const destructiveTextColor = isDarkTheme ? '#ef4444' : '#991b1b';
    const destructiveMutedBg = isDarkTheme ? '#ef444415' : '#fee2e2';
    const destructiveButtonBg = isDarkTheme ? '#ef4444' : '#fecaca';
    const destructiveButtonPressedBg = isDarkTheme ? '#dc2626' : '#fca5a5';
    const destructiveButtonTextColor = isDarkTheme ? '#ffffff' : '#7f1d1d';
    const destructiveSecondaryText = isDarkTheme ? colors.textSecondary : '#4b5563';

    const [showThemePicker, setShowThemePicker] = useState(false);
    const [showResetFlow, setShowResetFlow] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [isCountdownDone, setIsCountdownDone] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!visible) {
            setShowResetFlow(false);
            setCountdown(5);
            setIsCountdownDone(false);
            setShowConfirmModal(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, [visible]);

    const startCountdown = useCallback(() => {
        setShowResetFlow(true);
        setCountdown(5);
        setIsCountdownDone(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setIsCountdownDone(true);
                    if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleResetPress = useCallback(() => {
        if (!isCountdownDone) return;
        setShowConfirmModal(true);
    }, [isCountdownDone]);

    const handleConfirmReset = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setShowConfirmModal(false);
        setShowResetFlow(false);
        onClose();
        setTimeout(() => {
            onResetTriggered();
        }, 300);
    }, [onClose, onResetTriggered]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <>
            <Modal visible={visible && !showThemePicker} animationType="slide" transparent>
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View
                        className="rounded-t-3xl"
                        style={{
                            backgroundColor: colors.card,
                            borderTopWidth: 1,
                            borderColor: colors.cardBorder,
                        }}
                    >
                        <View
                            className="flex-row items-center justify-between px-5 py-4"
                            style={{ borderBottomWidth: 1, borderColor: colors.cardBorder }}
                        >
                            <Text className="text-lg font-bold" style={{ color: colors.text }}>
                                Settings
                            </Text>
                            <Pressable
                                onPress={onClose}
                                className="w-8 h-8 items-center justify-center rounded-full"
                                style={{ backgroundColor: colors.inputBg }}
                            >
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <View className="px-5 py-4" style={{ paddingBottom: 40 }}>
                            <Pressable
                                onPress={() => setShowThemePicker(true)}
                                className="flex-row items-center py-4 px-4 rounded-xl mb-3"
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.inputBg : colors.background,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder,
                                })}
                            >
                                <View
                                    className="w-10 h-10 items-center justify-center rounded-xl mr-4"
                                    style={{ backgroundColor: colors.accent + '15' }}
                                >
                                    <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-semibold" style={{ color: colors.text }}>
                                        Color Theme
                                    </Text>
                                    <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                        Customize the app&apos;s appearance
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                            </Pressable>

                            {!showResetFlow ? (
                                <Pressable
                                    onPress={startCountdown}
                                    className="flex-row items-center py-4 px-4 rounded-xl"
                                    style={({ pressed }) => ({
                                        backgroundColor: pressed ? colors.inputBg : colors.background,
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder,
                                    })}
                                >
                                    <View
                                        className="w-10 h-10 items-center justify-center rounded-xl mr-4"
                                        style={{ backgroundColor: destructiveMutedBg }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={destructiveTextColor} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-semibold" style={{ color: colors.text }}>
                                            Reset Data
                                        </Text>
                                        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                            Clear all progress and start fresh
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                </Pressable>
                            ) : (
                                <View
                                    className="rounded-xl p-4"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderWidth: 1,
                                        borderColor: isCountdownDone ? destructiveTextColor : colors.cardBorder,
                                    }}
                                >
                                    <View className="flex-row items-center mb-3">
                                        <Ionicons name="warning-outline" size={20} color={destructiveTextColor} />
                                        <Text className="text-sm font-semibold ml-2" style={{ color: destructiveTextColor }}>
                                            Reset Data
                                        </Text>
                                    </View>
                                    <Text className="text-xs mb-4" style={{ color: destructiveSecondaryText }}>
                                        This will permanently delete all your habits, stats, and progress.
                                    </Text>
                                    {!isCountdownDone ? (
                                        <View className="items-center py-3">
                                            <View
                                                className="w-14 h-14 rounded-full items-center justify-center mb-2"
                                                style={{
                                                    backgroundColor: destructiveMutedBg,
                                                    borderWidth: 2,
                                                    borderColor: isDarkTheme ? '#ef444440' : '#fecaca',
                                                }}
                                            >
                                                <Text className="text-2xl font-bold" style={{ color: destructiveTextColor }}>
                                                    {countdown}
                                                </Text>
                                            </View>
                                            <Text className="text-xs" style={{ color: destructiveSecondaryText }}>
                                                Please wait...
                                            </Text>
                                        </View>
                                    ) : (
                                        <Pressable
                                            onPress={handleResetPress}
                                            className="items-center py-3.5 rounded-xl"
                                            style={({ pressed }) => ({
                                                backgroundColor: pressed ? destructiveButtonPressedBg : destructiveButtonBg,
                                            })}
                                        >
                                            <View className="flex-row items-center">
                                                <Ionicons name="trash-outline" size={16} color={destructiveButtonTextColor} />
                                                <Text className="text-sm font-bold ml-1.5" style={{ color: destructiveButtonTextColor }}>
                                                    Reset Data
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={() => {
                                            setShowResetFlow(false);
                                            setCountdown(5);
                                            setIsCountdownDone(false);
                                            if (intervalRef.current) {
                                                clearInterval(intervalRef.current);
                                                intervalRef.current = null;
                                            }
                                        }}
                                        className="items-center mt-3"
                                    >
                                        <Text className="text-xs font-medium" style={{ color: destructiveSecondaryText }}>
                                            Cancel
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showConfirmModal} animationType="fade" transparent>
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
                    <View
                        className="rounded-2xl p-6 w-full"
                        style={{
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: '#ef444440',
                            maxWidth: 340,
                        }}
                    >
                        <View className="items-center mb-4">
                            <View
                                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                                style={{ backgroundColor: destructiveMutedBg }}
                            >
                                <Ionicons name="alert-circle-outline" size={32} color={destructiveTextColor} />
                            </View>
                            <Text className="text-lg font-bold text-center" style={{ color: colors.text }}>
                                Are you sure?
                            </Text>
                        </View>
                        <Text className="text-sm text-center leading-5 mb-6" style={{ color: colors.textSecondary }}>
                            Your progress and stats will be permanently deleted and cannot be restored.
                        </Text>
                        <Pressable
                            onPress={handleConfirmReset}
                            className="items-center py-3.5 rounded-xl mb-3"
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? destructiveButtonPressedBg : destructiveButtonBg,
                            })}
                        >
                            <Text className="text-sm font-bold" style={{ color: destructiveButtonTextColor }}>
                                Yes, Delete Everything
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setShowConfirmModal(false)}
                            className="items-center py-3.5 rounded-xl"
                            style={{ backgroundColor: colors.inputBg }}
                        >
                            <Text className="text-sm font-medium" style={{ color: colors.text }}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <ThemePicker
                visible={showThemePicker}
                onClose={() => setShowThemePicker(false)}
            />
        </>
    );
}
