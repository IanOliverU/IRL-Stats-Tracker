import { DEFAULT_THEME_ID, getThemeById, type AppTheme, type ThemeColors } from '@/constants/themes';
import { dbGetSetting, dbSetSetting } from '@/services/database';
import { create } from 'zustand';

interface ThemeState {
    themeId: string;
    theme: AppTheme;
}

interface ThemeActions {
    setTheme: (themeId: string) => void;
    hydrateTheme: () => void;
}

export const useThemeStore = create<ThemeState & ThemeActions>((set) => ({
    themeId: DEFAULT_THEME_ID,
    theme: getThemeById(DEFAULT_THEME_ID),

    setTheme: (themeId: string) => {
        const theme = getThemeById(themeId);
        set({ themeId, theme });
        try {
            dbSetSetting('app_theme', themeId);
        } catch (e) {
            console.warn('Failed to persist theme', e);
        }
    },

    hydrateTheme: () => {
        try {
            const saved = dbGetSetting('app_theme');
            if (saved) {
                const theme = getThemeById(saved);
                set({ themeId: saved, theme });
            }
        } catch (e) {
            console.warn('Failed to load theme', e);
        }
    },
}));

/** Convenience hook to get just the colors */
export function useAppColors(): ThemeColors {
    return useThemeStore((s) => s.theme.colors);
}

/** Convenience hook to check if current theme is dark */
export function useIsDarkTheme(): boolean {
    return useThemeStore((s) => s.theme.group === 'dark');
}
