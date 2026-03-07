/**
 * App color themes inspired by popular editor themes.
 * Each theme defines a full palette for the app UI.
 */

export interface AppTheme {
    id: string;
    name: string;
    group: 'light' | 'dark';
    colors: ThemeColors;
}

export interface ThemeColors {
    background: string;
    card: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    accent: string;
    accentMuted: string;
    success: string;
    warning: string;
    inputBg: string;
    inputBorder: string;
    /**  Stat-specific accent colors */
    statSTR: string;
    statINT: string;
    statWIS: string;
    statCHA: string;
    statVIT: string;
}

export const APP_THEMES: AppTheme[] = [
    // ─── Dark Themes ─────────────────────────────────────
    {
        id: 'dark-default',
        name: 'Dark Default',
        group: 'dark',
        colors: {
            background: '#000000',
            card: '#1c1c1e',
            cardBorder: '#2c2c2e',
            text: '#f5f5f5',
            textSecondary: '#8e8e93',
            textTertiary: '#636366',
            accent: '#38bdf8',
            accentMuted: '#38bdf820',
            success: '#22c55e',
            warning: '#f59e0b',
            inputBg: '#2c2c2e',
            inputBorder: '#3a3a3c',
            statSTR: '#ef4444',
            statINT: '#3b82f6',
            statWIS: '#a855f7',
            statCHA: '#f59e0b',
            statVIT: '#22c55e',
        },
    },
    {
        id: 'one-dark',
        name: 'One Dark Pro',
        group: 'dark',
        colors: {
            background: '#282c34',
            card: '#21252b',
            cardBorder: '#3e4452',
            text: '#abb2bf',
            textSecondary: '#7f848e',
            textTertiary: '#5c6370',
            accent: '#61afef',
            accentMuted: '#61afef25',
            success: '#98c379',
            warning: '#e5c07b',
            inputBg: '#1b1d23',
            inputBorder: '#3e4452',
            statSTR: '#e06c75',
            statINT: '#61afef',
            statWIS: '#c678dd',
            statCHA: '#e5c07b',
            statVIT: '#98c379',
        },
    },
    {
        id: 'dracula',
        name: 'Dracula',
        group: 'dark',
        colors: {
            background: '#282a36',
            card: '#21222c',
            cardBorder: '#44475a',
            text: '#f8f8f2',
            textSecondary: '#9fa5b5',
            textTertiary: '#6272a4',
            accent: '#bd93f9',
            accentMuted: '#bd93f920',
            success: '#50fa7b',
            warning: '#f1fa8c',
            inputBg: '#1e1f29',
            inputBorder: '#44475a',
            statSTR: '#ff5555',
            statINT: '#8be9fd',
            statWIS: '#bd93f9',
            statCHA: '#f1fa8c',
            statVIT: '#50fa7b',
        },
    },
    {
        id: 'monokai',
        name: 'Monokai',
        group: 'dark',
        colors: {
            background: '#272822',
            card: '#1e1f1c',
            cardBorder: '#3e3d32',
            text: '#f8f8f2',
            textSecondary: '#a6a68a',
            textTertiary: '#75715e',
            accent: '#66d9ef',
            accentMuted: '#66d9ef20',
            success: '#a6e22e',
            warning: '#e6db74',
            inputBg: '#1e1f1c',
            inputBorder: '#3e3d32',
            statSTR: '#f92672',
            statINT: '#66d9ef',
            statWIS: '#ae81ff',
            statCHA: '#e6db74',
            statVIT: '#a6e22e',
        },
    },
    {
        id: 'tokyo-night',
        name: 'Tokyo Night',
        group: 'dark',
        colors: {
            background: '#1a1b26',
            card: '#16161e',
            cardBorder: '#292e42',
            text: '#c0caf5',
            textSecondary: '#9aa5ce',
            textTertiary: '#565f89',
            accent: '#7aa2f7',
            accentMuted: '#7aa2f720',
            success: '#9ece6a',
            warning: '#e0af68',
            inputBg: '#16161e',
            inputBorder: '#292e42',
            statSTR: '#f7768e',
            statINT: '#7aa2f7',
            statWIS: '#bb9af7',
            statCHA: '#e0af68',
            statVIT: '#9ece6a',
        },
    },
    {
        id: 'nord',
        name: 'Nord',
        group: 'dark',
        colors: {
            background: '#2e3440',
            card: '#3b4252',
            cardBorder: '#4c566a',
            text: '#eceff4',
            textSecondary: '#d8dee9',
            textTertiary: '#81a1c1',
            accent: '#88c0d0',
            accentMuted: '#88c0d020',
            success: '#a3be8c',
            warning: '#ebcb8b',
            inputBg: '#3b4252',
            inputBorder: '#4c566a',
            statSTR: '#bf616a',
            statINT: '#81a1c1',
            statWIS: '#b48ead',
            statCHA: '#ebcb8b',
            statVIT: '#a3be8c',
        },
    },
    {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        group: 'dark',
        colors: {
            background: '#002b36',
            card: '#073642',
            cardBorder: '#094959',
            text: '#839496',
            textSecondary: '#657b83',
            textTertiary: '#586e75',
            accent: '#268bd2',
            accentMuted: '#268bd220',
            success: '#859900',
            warning: '#b58900',
            inputBg: '#073642',
            inputBorder: '#094959',
            statSTR: '#dc322f',
            statINT: '#268bd2',
            statWIS: '#6c71c4',
            statCHA: '#b58900',
            statVIT: '#859900',
        },
    },
    {
        id: 'abyss',
        name: 'Abyss',
        group: 'dark',
        colors: {
            background: '#000c18',
            card: '#060f1e',
            cardBorder: '#1b324a',
            text: '#6688cc',
            textSecondary: '#5577aa',
            textTertiary: '#384887',
            accent: '#6688cc',
            accentMuted: '#6688cc20',
            success: '#22aa44',
            warning: '#ddbb88',
            inputBg: '#060f1e',
            inputBorder: '#1b324a',
            statSTR: '#ee6666',
            statINT: '#6688cc',
            statWIS: '#9966b8',
            statCHA: '#ddbb88',
            statVIT: '#22aa44',
        },
    },

    // ─── Light Themes ────────────────────────────────────
    {
        id: 'light-default',
        name: 'Light Default',
        group: 'light',
        colors: {
            background: '#f8f9fa',
            card: '#ffffff',
            cardBorder: '#e5e7eb',
            text: '#1a1a1a',
            textSecondary: '#6b7280',
            textTertiary: '#9ca3af',
            accent: '#0a7ea4',
            accentMuted: '#0a7ea415',
            success: '#16a34a',
            warning: '#d97706',
            inputBg: '#f2f2f7',
            inputBorder: '#e5e7eb',
            statSTR: '#dc2626',
            statINT: '#2563eb',
            statWIS: '#9333ea',
            statCHA: '#d97706',
            statVIT: '#16a34a',
        },
    },
    {
        id: 'github-light',
        name: 'GitHub Light',
        group: 'light',
        colors: {
            background: '#ffffff',
            card: '#f6f8fa',
            cardBorder: '#d0d7de',
            text: '#1f2328',
            textSecondary: '#656d76',
            textTertiary: '#8b949e',
            accent: '#0969da',
            accentMuted: '#0969da15',
            success: '#1a7f37',
            warning: '#9a6700',
            inputBg: '#f6f8fa',
            inputBorder: '#d0d7de',
            statSTR: '#cf222e',
            statINT: '#0969da',
            statWIS: '#8250df',
            statCHA: '#9a6700',
            statVIT: '#1a7f37',
        },
    },
    {
        id: 'solarized-light',
        name: 'Solarized Light',
        group: 'light',
        colors: {
            background: '#fdf6e3',
            card: '#eee8d5',
            cardBorder: '#d9d2c2',
            text: '#657b83',
            textSecondary: '#839496',
            textTertiary: '#93a1a1',
            accent: '#268bd2',
            accentMuted: '#268bd218',
            success: '#859900',
            warning: '#b58900',
            inputBg: '#eee8d5',
            inputBorder: '#d9d2c2',
            statSTR: '#dc322f',
            statINT: '#268bd2',
            statWIS: '#6c71c4',
            statCHA: '#b58900',
            statVIT: '#859900',
        },
    },
    {
        id: 'quiet-light',
        name: 'Quiet Light',
        group: 'light',
        colors: {
            background: '#f5f5f5',
            card: '#ffffff',
            cardBorder: '#e0e0e0',
            text: '#333333',
            textSecondary: '#777777',
            textTertiary: '#aaaaaa',
            accent: '#4b83cd',
            accentMuted: '#4b83cd15',
            success: '#448c27',
            warning: '#b98600',
            inputBg: '#f0f0f0',
            inputBorder: '#e0e0e0',
            statSTR: '#aa3731',
            statINT: '#4b83cd',
            statWIS: '#7a3e9d',
            statCHA: '#b98600',
            statVIT: '#448c27',
        },
    },
];

export const DEFAULT_THEME_ID = 'dark-default';

export function getThemeById(id: string): AppTheme {
    return APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0];
}
