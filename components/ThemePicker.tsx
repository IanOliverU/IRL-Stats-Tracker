import { APP_THEMES, type AppTheme } from '@/constants/themes';
import { getModalBackdropColor } from '@/lib/modalBackdrop';
import { useAppColors, useIsDarkTheme, useThemeStore } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

type ThemePickerProps = {
    visible: boolean;
    onClose: () => void;
};

export function ThemePicker({ visible, onClose }: ThemePickerProps) {
    const colors = useAppColors();
    const isDarkTheme = useIsDarkTheme();
    const currentThemeId = useThemeStore((s) => s.themeId);
    const setTheme = useThemeStore((s) => s.setTheme);
    const backdropColor = getModalBackdropColor(colors.background, isDarkTheme);

    const darkThemes = APP_THEMES.filter((t) => t.group === 'dark');
    const lightThemes = APP_THEMES.filter((t) => t.group === 'light');

    const handleSelect = (themeId: string) => {
        setTheme(themeId);
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View className="flex-1 justify-end">
                <Pressable
                    onPress={onClose}
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        backgroundColor: backdropColor,
                    }}
                />
                <View
                    className="rounded-t-3xl max-h-[80%]"
                    style={{
                        backgroundColor: colors.card,
                        borderTopWidth: 1,
                        borderColor: colors.cardBorder,
                    }}
                >
                    {/* Header */}
                    <View
                        className="flex-row items-center justify-between px-5 py-4"
                        style={{ borderBottomWidth: 1, borderColor: colors.cardBorder }}
                    >
                        <Text className="text-lg font-bold" style={{ color: colors.text }}>
                            Color Theme
                        </Text>
                        <Pressable
                            onPress={onClose}
                            className="w-8 h-8 items-center justify-center rounded-full"
                            style={{ backgroundColor: colors.inputBg }}
                        >
                            <Ionicons name="close" size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView
                        className="px-5 py-3"
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Dark themes */}
                        <Text
                            className="text-xs font-semibold uppercase tracking-wider mb-2"
                            style={{ color: colors.textTertiary }}
                        >
                            Dark Themes
                        </Text>
                        {darkThemes.map((theme) => (
                            <ThemeRow
                                key={theme.id}
                                theme={theme}
                                isActive={currentThemeId === theme.id}
                                onPress={() => handleSelect(theme.id)}
                                parentColors={colors}
                            />
                        ))}

                        {/* Light themes */}
                        <Text
                            className="text-xs font-semibold uppercase tracking-wider mt-5 mb-2"
                            style={{ color: colors.textTertiary }}
                        >
                            Light Themes
                        </Text>
                        {lightThemes.map((theme) => (
                            <ThemeRow
                                key={theme.id}
                                theme={theme}
                                isActive={currentThemeId === theme.id}
                                onPress={() => handleSelect(theme.id)}
                                parentColors={colors}
                            />
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

type ThemeRowProps = {
    theme: AppTheme;
    isActive: boolean;
    onPress: () => void;
    parentColors: ReturnType<typeof useAppColors>;
};

function ThemeRow({ theme, isActive, onPress, parentColors }: ThemeRowProps) {
    const tc = theme.colors;

    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center py-3 px-3 rounded-xl mb-1"
            style={({ pressed }) => ({
                backgroundColor: isActive
                    ? parentColors.accentMuted
                    : pressed
                        ? parentColors.inputBg
                        : 'transparent',
            })}
        >
            {/* Color preview dots */}
            <View className="flex-row items-center mr-3 gap-0.5">
                {[tc.background, tc.accent, tc.success, tc.warning, tc.statSTR].map((c, i) => (
                    <View
                        key={i}
                        className="w-3.5 h-3.5 rounded-full"
                        style={{
                            backgroundColor: c,
                            borderWidth: 1,
                            borderColor: parentColors.cardBorder,
                        }}
                    />
                ))}
            </View>

            {/* Name */}
            <Text
                className="flex-1 text-sm"
                style={{
                    color: isActive ? parentColors.accent : parentColors.text,
                    fontWeight: isActive ? '600' : '400',
                }}
            >
                {theme.name}
            </Text>

            {/* Active indicator */}
            {isActive && (
                <Ionicons name="checkmark" size={18} color={parentColors.accent} />
            )}
        </Pressable>
    );
}
