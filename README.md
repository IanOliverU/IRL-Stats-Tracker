# IRL Stats Tracker

IRL Stats Tracker is a gamified habit and activity tracker built with Expo. It turns real-life routines into RPG-style quests, stats, levels, achievements, inventory unlocks, weather context, and map-based walk/run sessions.

The app uses local SQLite storage for gameplay data, Supabase for authentication and weather-related cloud tables, and Expo Router for native mobile navigation.

## Features

- Supabase authentication with email/password and OAuth provider support.
- Protected app routes that only load after the auth session is initialized.
- RPG-style character progression with level, XP, and five stats: STR, INT, WIS, CHA, and VIT.
- Daily and weekly habits with configurable XP, stat rewards, streaks, and completion feedback.
- One-time custom quests with difficulty-based XP.
- Map activity tracking for walks and runs with live route drawing, distance, elapsed time, pace, activity history, and session detail screens.
- Auto-generated map activity quests that can complete when a tracked session ends.
- Inventory unlocks with stat, utility, and cosmetic item definitions.
- Achievement system for progression, streaks, stats, inventory, and exploration milestones.
- Calendar screen with monthly completion markers, weekly recaps, consistency summaries, and weekly XP bonus tiers.
- Weather dashboard with saved cities, default city handling, refresh, and Supabase Edge Function integration.
- Theme picker with multiple dark and light editor-inspired palettes.
- Native haptics, animated quest feedback, level-up modal, unlock popups, and reset animation.
- Android notification channel for activity tracking alerts in development/production builds.

## Tech Stack

- **Framework:** Expo SDK 54, React Native 0.81, React 19
- **Routing:** Expo Router with file-based routes and protected stacks
- **State:** Zustand
- **Persistence:** Expo SQLite for local gameplay data
- **Auth and cloud:** Supabase Auth, Supabase database, Supabase Edge Functions
- **Maps and location:** `react-native-maps`, `expo-location`
- **Notifications:** `expo-notifications`
- **Styling:** NativeWind, Tailwind CSS, NativeCN-style UI helpers
- **Icons:** `@expo/vector-icons`
- **Build tooling:** EAS config, TypeScript, ESLint

## Requirements

- Node.js and npm
- Expo CLI through `npx expo`
- Android Studio or a physical Android device for Android testing
- Xcode for iOS simulator/device testing on macOS
- Supabase project for auth and weather data
- Google Maps API key for Android map rendering
- OpenWeather API key for the Supabase weather Edge Function

## Installation

Install dependencies:

```bash
npm install
```

Copy the environment example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill in the values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Start the development server:

```bash
npm start
```

Run on a target platform:

```bash
npm run android
npm run ios
npm run web
```

Run linting:

```bash
npm run lint
```

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Starts the Expo dev server. |
| `npm run android` | Starts Expo and opens the Android target. |
| `npm run ios` | Starts Expo and opens the iOS target. |
| `npm run web` | Starts Expo for web. |
| `npm run lint` | Runs Expo ESLint checks. |
| `npm run reset-project` | Runs the starter reset script from `scripts/reset-project.js`. Use with care. |

## Environment Variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | App runtime | Supabase project URL for auth, database, and functions. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App runtime | Supabase publishable key. |
| `GOOGLE_MAPS_API_KEY` | `app.config.js` | Injects the Android Google Maps API key into Expo config. |
| `OPENWEATHER_API_KEY` | Supabase Edge Function secret | Server-side weather API key. Do not expose this in the app. |

If the Supabase public env vars are missing, the root layout shows a build configuration error instead of the auth screen.

## Supabase Setup

The app expects Supabase Auth to be configured and uses a `profiles` table through the auth flow. Weather data also requires the migration and Edge Function in `supabase/`.

The weather migration is included in this repo. If your Supabase project does not already have `public.profiles`, create it with at least an `id` column that references `auth.users(id)`, a nullable `name` column, and an `updated_at` column, or adjust `ensureProfile` in `store/useAuthStore.ts`.

Weather setup:

```bash
supabase db push
supabase secrets set OPENWEATHER_API_KEY=your-server-key
supabase functions deploy weather
```

The weather migration creates:

- `public.weather_saved_cities`
- `public.weather_settings`
- Row Level Security policies so authenticated users can only manage their own weather rows
- An update trigger for `weather_settings.updated_at`

The weather Edge Function calls OpenWeather APIs from the server so the mobile app never receives the OpenWeather key.

## Project Structure

```text
app/                       Expo Router screens and route groups
app/(tabs)/                Main tab screens
app/maps/                  Map history and session detail routes
app/quest/                 Quest detail route
components/                Reusable UI and feedback components
components/ui/             Button, card, badge, icon, and collapsible helpers
constants/                 Theme definitions and shared constants
hooks/                     App hooks such as game hydration and color scheme helpers
lib/                       Pure helpers for weather, maps, feedback, Supabase, progression
models/                    Domain types, constants, item definitions, achievement definitions
services/                  Database, quest, achievement, calendar, weather, notification services
store/                     Zustand stores for auth, game state, and theme state
supabase/                  Migrations and Edge Functions
assets/                    Icons, splash assets, and images
scripts/                   Maintenance scripts
```

## App Screens

| Route | Purpose |
| --- | --- |
| `app/auth.tsx` | Email/password sign in, sign up, OAuth provider list, auth error handling. |
| `app/(tabs)/index.tsx` | Home dashboard with greeting, weather, next level, next unlock, next achievement, focus quest, and today's queue. |
| `app/(tabs)/dashboard.tsx` | Player dashboard with stats, XP progress, habit/custom quest completion, settings, achievements, reset, and feedback modals. |
| `app/(tabs)/habits.tsx` | Quest management screen for recurring habits and one-time custom quests. |
| `app/(tabs)/calendar.tsx` | Calendar, weekly recap, current week progress, recent week summaries, and bonus tiers. |
| `app/(tabs)/maps.tsx` | Live walk/run tracker with GPS route, pace, distance, pause/resume/stop, generated quests, and notifications. |
| `app/maps/history.tsx` | List of saved map activity sessions. |
| `app/maps/[sessionId].tsx` | Session detail with route preview and stats. |
| `app/(tabs)/character.tsx` | Character stats, total power, total mission XP, cloud account, and sign out. |
| `app/(tabs)/inventory.tsx` | Locked/unlocked inventory list and rarity breakdown. |
| `app/quest/[questType]/[questId].tsx` | Detail page for habit and custom quests. |

## Core Modules

### Models

`models/index.ts` defines the app domain:

- User, habit, habit log, item, achievement, custom quest, and map session types.
- Stat model: `STR`, `INT`, `WIS`, `CHA`, `VIT`.
- Habit frequency model: `daily`, `weekly`.
- Custom quest difficulty model: `easy`, `medium`, `hard`.
- Map activity model: `walk`, `run`.
- Item definitions, item rarity, item effects, and unlock rules.
- Achievement definitions and achievement categories.
- Progression helpers such as `xpRequiredForLevel`, `totalXpForLevel`, `weeklyBonusForCompletedDays`, and `normalizeHabitXpReward`.

Important gameplay constants:

- Habit XP range: 10 to 25 XP.
- Default habit XP: 20 XP.
- Custom quest XP: easy 25, medium 50, hard 80.
- Custom quest daily completion limit: 3.
- Custom quest per-stat daily XP limit: 200.
- Weekly completion bonus tiers: 3, 5, and 7 active days.

### Game Store

`store/useGameStore.ts` is the main Zustand store. It hydrates SQLite state and exposes gameplay actions:

- `hydrate`
- `completeHabit`
- `addHabit`
- `removeHabit`
- `resetData`
- `addCustomQuest`
- `updateCustomQuest`
- `refreshCustomQuests`
- `completeCustomQuest`
- `deleteCustomQuest`
- `addMapActivitySession`
- `refreshMapActivitySessions`
- `setUserName`
- `refreshUser`
- `refreshAchievements`
- `getStreak`
- `isCompletedToday`
- `getEffectiveStat`
- `getCompletedDaysForMonth`
- `getCurrentWeekSummary`
- `getCurrentWeeklyRecap`
- `getRecentWeekSummaries`
- `getQuestStreakSummary`
- `getTodayQuestXp`
- `getTotalMissionXp`
- `dismissAchievementUnlock`
- `dismissItemUnlock`
- `dismissItemUnlocks`

The store delegates persistent work to the service layer, then refreshes state slices and queues unlock popups.

### Auth Store

`store/useAuthStore.ts` manages Supabase auth:

- `initialize` loads the current Supabase session and subscribes to auth state changes.
- `handleDeepLink` completes OAuth callback sessions.
- `signInWithEmail` signs in with email/password.
- `signUpWithEmail` creates an account and optionally stores display name metadata.
- `signInWithProvider` starts OAuth through Discord, Facebook, GitHub, Google, or X.
- `signOut` clears the Supabase session.

### Theme Store

`store/useThemeStore.ts` persists the selected theme in SQLite settings and exposes:

- `setTheme`
- `hydrateTheme`
- `useAppColors`
- `useIsDarkTheme`

Themes are defined in `constants/themes.ts`.

## Service Layer

### Database Service

`services/database.ts` owns the local SQLite schema and low-level data access. It creates and reads data for:

- User profile and stats
- Habits and habit logs
- Items and unlock status
- Achievements
- Settings
- Custom quests
- Map activity sessions
- Completion analytics

Representative functions include `getDb`, `dbGetUser`, `dbCreateHabit`, `dbInsertHabitLog`, `dbGetItems`, `dbUnlockItem`, `dbUnlockAchievement`, `dbGetCompletedQuestEvents`, `dbCreateCustomQuest`, `dbCompleteCustomQuest`, `dbCreateMapActivitySession`, and `dbResetAllData`.

### Habit and Quest Service

`services/habitService.ts` contains completion logic:

- Calculates habit streaks and streak XP bonus.
- Applies item-based XP modifiers.
- Adds XP and stat points.
- Handles level-up calculations.
- Enforces custom quest daily and per-stat XP limits.
- Unlocks eligible items and applies one-time instant XP rewards.

Primary exports:

- `getStreakForHabit`
- `syncItemUnlocks`
- `completeHabit`
- `completeCustomQuest`
- `getEffectiveStat`

### Achievement Service

`services/achievementService.ts` builds analytics from completed quest events and unlocks achievements when conditions are met.

Primary exports:

- `getAchievementStatuses`
- `checkAndUnlockAchievements`
- `getAchievementProgressSnapshot`

Achievement conditions cover total quests, streaks, perfect habit days, weekend/morning/night activity, stat XP, level, inventory, comeback days, all-rounder weeks, and high-volume weeks.

### Calendar Service

`services/calendarService.ts` computes activity calendar and weekly bonus data:

- Completed day keys for month views
- Current week summaries
- Weekly recaps
- Recent week summaries
- Quest streak summaries
- Pending weekly bonus processing

Primary exports:

- `getCurrentWeekStartKey`
- `getCompletedDayKeysForMonth`
- `getWeekCompletionSummary`
- `getCurrentWeekCompletionSummary`
- `getWeeklyRecap`
- `getCurrentWeeklyRecap`
- `getQuestStreakSummary`
- `getRecentWeekCompletionSummaries`
- `processPendingWeeklyBonus`

### Weather Service

`services/weatherService.ts` connects the app to Supabase weather tables and the `weather` Edge Function.

Primary exports:

- `loadWeatherDashboard`
- `refreshWeatherDashboard`
- `addWeatherCity`
- `selectWeatherCity`
- `setDefaultWeatherCity`
- `deleteWeatherCity`

The service bootstraps Manila as the default city when a user has no saved cities.

### Notification Service

`services/notificationService.ts` configures native activity tracking notifications:

- `configureNotificationPresentationAsync`
- `initializeNotificationsAsync`
- `notifyTrackingStartedAsync`
- `notifyTrackingCompletedAsync`

Expo Go cannot fully test Android notification behavior, so the app shows an in-app banner when running there.

## Utility Libraries

- `lib/supabase.ts` creates the Supabase client, validates required env vars, stores auth session in SQLite-backed local storage, and formats network errors.
- `lib/mapActivity.ts` formats activity durations, pace, labels, route regions, and map-session difficulty/XP scaling.
- `lib/progression.ts` computes next item unlock and next achievement previews for the Home screen.
- `lib/weather.ts` defines weather payload types and simple formatting helpers.
- `lib/feedback.ts` wraps haptic feedback patterns for quest completion, rewards, achievements, and level-ups.
- `lib/modalBackdrop.ts` computes readable modal overlay colors from the current theme.
- `lib/utils.ts` provides the `cn` class name helper.

## Component Highlights

- `WeatherCard` displays current weather, forecasts, saved cities, default city actions, and city creation.
- `QuestCard` and `CustomQuestCard` render recurring and one-time quest cards.
- `QuestCompletionFeedback`, `LevelUpModal`, `ItemUnlockPopup`, and `AchievementUnlockPopup` handle the reward loop.
- `AchievementsModal` groups and displays achievement status.
- `SettingsModal` exposes settings, theme picker, and reset entry point.
- `ThemePicker` switches persisted app themes.
- `StatCard`, `ItemCard`, and `ProgressBar` provide core repeated UI primitives.
- `QuestStartAnimation` and `ResetAnimation` add onboarding/reset feedback.

## Gameplay Flow

1. The root layout hydrates the game store, theme store, Supabase auth, deep links, and notification setup.
2. Authenticated users enter the tab navigator.
3. The game store loads SQLite data, normalizes habit rewards, applies pending weekly bonuses, syncs item unlocks, and checks achievements.
4. Completing a habit or custom quest updates logs, XP, level, stats, item unlocks, achievements, and popup queues.
5. The Home, Dashboard, Character, Inventory, and Calendar screens read refreshed Zustand state.
6. Map sessions can create linked custom quests and save route history locally.
7. Weather data loads through Supabase and the deployed weather Edge Function.

## Maps Notes

The Maps screen requires foreground location permission. Android also needs a valid Google Maps API key injected by `app.config.js`.

Map sessions store:

- Activity type
- Difficulty
- Distance
- Elapsed time
- Start/end timestamps
- XP multiplier
- Route coordinates

Difficulty is distance based and affects map-session XP scaling.

## Development Notes

- Gameplay data is currently local-first in SQLite.
- Supabase is currently used for auth, profiles, weather saved cities, weather settings, and the weather function.
- The Character screen notes that gameplay cloud sync is not finished yet.
- The app uses typed Expo routes.
- `expo-notifications` is imported dynamically so Expo Go and web do not crash on unsupported notification APIs.
- Some features, such as password reset and reserved utility item behavior, are scaffolded but not fully wired.

## Troubleshooting

### Build configuration missing

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then restart Expo or rebuild the native app.

### Weather tables are not set up

Run the Supabase migration:

```bash
supabase db push
```

### Weather function is not deployed

Set `OPENWEATHER_API_KEY` as a Supabase secret and deploy the function:

```bash
supabase secrets set OPENWEATHER_API_KEY=your-server-key
supabase functions deploy weather
```

### Android map is blank

Confirm `GOOGLE_MAPS_API_KEY` is set in `.env`, then rebuild/restart the Android target so Expo can inject it into native config.

### Location tracking does not start

Grant foreground location permission. If testing on Android, a development build is better than Expo Go for native notification behavior.

## Useful Files

- `package.json` for dependencies and npm scripts.
- `.env.example` for required local environment variables.
- `app.config.js` for runtime config injection.
- `app.json` for Expo app metadata, plugins, permissions, scheme, and EAS project id.
- `supabase/functions/weather/README.md` for weather function deployment notes.
- `supabase/migrations/202603140001_add_weather_tables.sql` for weather database setup.
