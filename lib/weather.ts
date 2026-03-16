export type WeatherUnit = 'C' | 'F';

export interface SavedWeatherCity {
  id: string;
  cityName: string;
  placeId: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
}

export interface WeatherSettings {
  selectedCityId: string | null;
  defaultCityId: string | null;
  unit: WeatherUnit;
}

export interface WeatherCurrentConditions {
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  condition: string;
  icon: string | null;
  isDaytime: boolean;
}

export interface WeatherDailyForecast {
  date: string;
  min: number | null;
  max: number | null;
  condition: string;
  icon: string | null;
}

export interface WeatherHourlyForecast {
  timeLabel: string;
  temperature: number | null;
  condition: string;
  icon: string | null;
}

export interface WeatherResponse {
  city: string;
  placeId: string | null;
  lat: number;
  lng: number;
  current: WeatherCurrentConditions;
  daily: WeatherDailyForecast[];
  hourlyToday: WeatherHourlyForecast[];
  fetchedAt: string;
}

export interface WeatherDashboardState {
  cities: SavedWeatherCity[];
  settings: WeatherSettings;
  selectedCity: SavedWeatherCity | null;
  weather: WeatherResponse | null;
  errorMessage: string | null;
}

export const DEFAULT_MANILA_CITY = {
  cityName: 'Manila',
  latitude: 14.5995,
  longitude: 120.9842,
  placeId: null,
} as const;

export function formatWeatherDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

export function getTemperatureUnitLabel(unit: WeatherUnit): string {
  return unit === 'F' ? 'F' : 'C';
}
