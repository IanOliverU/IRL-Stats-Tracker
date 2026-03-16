import {
  DEFAULT_MANILA_CITY,
  type SavedWeatherCity,
  type WeatherDashboardState,
  type WeatherResponse,
  type WeatherSettings,
  type WeatherUnit,
} from '@/lib/weather';
import { supabase } from '@/lib/supabase';

type SavedCityRow = {
  id: string;
  city_name: string;
  place_id: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
};

type WeatherSettingsRow = {
  user_id: string;
  selected_city_id: string | null;
  default_city_id: string | null;
  unit: WeatherUnit;
};

type WeatherFunctionPayload = {
  city?: string;
  latitude?: number;
  longitude?: number;
  unit?: WeatherUnit;
  days?: number;
};

const WEATHER_FUNCTION_NAME = 'weather';

function normalizeCityName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toSavedWeatherCity(row: SavedCityRow): SavedWeatherCity {
  return {
    id: row.id,
    cityName: row.city_name,
    placeId: row.place_id,
    latitude: row.latitude,
    longitude: row.longitude,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

function toWeatherSettings(row: WeatherSettingsRow | null, fallbackCityId: string | null): WeatherSettings {
  return {
    selectedCityId: row?.selected_city_id ?? fallbackCityId,
    defaultCityId: row?.default_city_id ?? fallbackCityId,
    unit: row?.unit === 'F' ? 'F' : 'C',
  };
}

function getFriendlyWeatherError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unable to load weather right now.';

  if (message.includes('weather_saved_cities') || message.includes('weather_settings')) {
    return 'Weather tables are not set up yet. Run the Supabase migration first.';
  }

  if (message.includes('Failed to send a request to the Edge Function')) {
    return 'Weather function is not deployed yet. Deploy the Supabase weather function to enable live data.';
  }

  return message;
}

async function listSavedCities(userId: string): Promise<SavedWeatherCity[]> {
  const { data, error } = await supabase
    .from('weather_saved_cities')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toSavedWeatherCity(row as SavedCityRow));
}

async function getWeatherSettings(userId: string): Promise<WeatherSettingsRow | null> {
  const { data, error } = await supabase
    .from('weather_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WeatherSettingsRow | null) ?? null;
}

async function upsertWeatherSettings(userId: string, settings: WeatherSettings): Promise<WeatherSettings> {
  const { data, error } = await supabase
    .from('weather_settings')
    .upsert(
      {
        user_id: userId,
        selected_city_id: settings.selectedCityId,
        default_city_id: settings.defaultCityId,
        unit: settings.unit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toWeatherSettings(data as WeatherSettingsRow, settings.selectedCityId);
}

async function insertDefaultManila(userId: string): Promise<SavedWeatherCity> {
  const { data, error } = await supabase
    .from('weather_saved_cities')
    .insert({
      user_id: userId,
      city_name: DEFAULT_MANILA_CITY.cityName,
      place_id: DEFAULT_MANILA_CITY.placeId,
      latitude: DEFAULT_MANILA_CITY.latitude,
      longitude: DEFAULT_MANILA_CITY.longitude,
      is_default: true,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toSavedWeatherCity(data as SavedCityRow);
}

async function ensureWeatherBootstrap(userId: string): Promise<{
  cities: SavedWeatherCity[];
  settings: WeatherSettings;
}> {
  let cities = await listSavedCities(userId);

  if (cities.length === 0) {
    const manila = await insertDefaultManila(userId);
    cities = [manila];
  }

  const existingSettings = await getWeatherSettings(userId);
  const fallbackCityId = cities[0]?.id ?? null;
  let settings = toWeatherSettings(existingSettings, fallbackCityId);

  const selectedExists = settings.selectedCityId
    ? cities.some((city) => city.id === settings.selectedCityId)
    : false;
  const defaultExists = settings.defaultCityId
    ? cities.some((city) => city.id === settings.defaultCityId)
    : false;

  if (!selectedExists || !defaultExists || !existingSettings) {
    const defaultCityId = defaultExists ? settings.defaultCityId : fallbackCityId;
    const selectedCityId = selectedExists ? settings.selectedCityId : defaultCityId;

    settings = await upsertWeatherSettings(userId, {
      selectedCityId,
      defaultCityId,
      unit: settings.unit,
    });
  }

  return { cities, settings };
}

async function fetchWeather(payload: WeatherFunctionPayload): Promise<WeatherResponse> {
  const { data, error, response } = await supabase.functions.invoke<WeatherResponse>(WEATHER_FUNCTION_NAME, {
    body: {
      ...payload,
      days: payload.days ?? 5,
    },
  });

  if (error) {
    if (response) {
      try {
        const errorPayload = await response.clone().json();
        const message =
          typeof errorPayload?.error === 'string'
            ? errorPayload.error
            : typeof errorPayload?.message === 'string'
              ? errorPayload.message
              : null;

        if (message) {
          throw new Error(message);
        }
      } catch {
        try {
          const text = await response.clone().text();
          if (text.trim()) {
            throw new Error(text.trim());
          }
        } catch {
          // Fall back to the original invoke error below.
        }
      }
    }

    throw error;
  }

  if (!data) {
    throw new Error('Weather function returned an empty response.');
  }

  return data;
}

async function fetchWeatherForCity(city: SavedWeatherCity, unit: WeatherUnit): Promise<WeatherResponse> {
  return fetchWeather({
    latitude: city.latitude,
    longitude: city.longitude,
    city: city.cityName,
    unit,
  });
}

async function buildDashboardState(
  userId: string,
  options?: {
    weatherOverride?: WeatherResponse | null;
  }
): Promise<WeatherDashboardState> {
  const { cities, settings } = await ensureWeatherBootstrap(userId);
  const selectedCity =
    cities.find((city) => city.id === settings.selectedCityId) ??
    cities.find((city) => city.id === settings.defaultCityId) ??
    cities[0] ??
    null;

  if (!selectedCity) {
    return {
      cities,
      settings,
      selectedCity: null,
      weather: null,
      errorMessage: 'No saved weather city is available yet.',
    };
  }

  if (options?.weatherOverride) {
    return {
      cities,
      settings,
      selectedCity,
      weather: options.weatherOverride,
      errorMessage: null,
    };
  }

  try {
    const weather = await fetchWeatherForCity(selectedCity, settings.unit);
    return {
      cities,
      settings,
      selectedCity,
      weather,
      errorMessage: null,
    };
  } catch (error) {
    return {
      cities,
      settings,
      selectedCity,
      weather: null,
      errorMessage: getFriendlyWeatherError(error),
    };
  }
}

export async function loadWeatherDashboard(userId: string): Promise<WeatherDashboardState> {
  return buildDashboardState(userId);
}

export async function refreshWeatherDashboard(userId: string): Promise<WeatherDashboardState> {
  return buildDashboardState(userId);
}

export async function addWeatherCity(userId: string, cityName: string): Promise<WeatherDashboardState> {
  const trimmedCity = cityName.trim();
  if (!trimmedCity) {
    throw new Error('Enter a city name first.');
  }

  const { cities, settings } = await ensureWeatherBootstrap(userId);
  const weather = await fetchWeather({
    city: trimmedCity,
    unit: settings.unit,
  });

  const matchingCity =
    cities.find((city) => weather.placeId && city.placeId === weather.placeId) ??
    cities.find((city) => normalizeCityName(city.cityName) === normalizeCityName(weather.city));

  const shouldSetDefault = !settings.defaultCityId;

  let selectedCityId = matchingCity?.id ?? null;

  if (!matchingCity) {
    const { data, error } = await supabase
      .from('weather_saved_cities')
      .insert({
        user_id: userId,
        city_name: weather.city,
        place_id: weather.placeId,
        latitude: weather.lat,
        longitude: weather.lng,
        is_default: shouldSetDefault,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    selectedCityId = data.id as string;
  }

  await upsertWeatherSettings(userId, {
    selectedCityId,
    defaultCityId: shouldSetDefault ? selectedCityId : settings.defaultCityId,
    unit: settings.unit,
  });

  return buildDashboardState(userId, { weatherOverride: weather });
}

export async function selectWeatherCity(userId: string, cityId: string): Promise<WeatherDashboardState> {
  const { cities, settings } = await ensureWeatherBootstrap(userId);
  const city = cities.find((entry) => entry.id === cityId);

  if (!city) {
    throw new Error('Selected city could not be found.');
  }

  await upsertWeatherSettings(userId, {
    ...settings,
    selectedCityId: city.id,
  });

  const weather = await fetchWeatherForCity(city, settings.unit);
  return buildDashboardState(userId, { weatherOverride: weather });
}

export async function setDefaultWeatherCity(userId: string, cityId: string): Promise<WeatherDashboardState> {
  const { cities, settings } = await ensureWeatherBootstrap(userId);
  const city = cities.find((entry) => entry.id === cityId);

  if (!city) {
    throw new Error('Default city could not be found.');
  }

  const resetResult = await supabase
    .from('weather_saved_cities')
    .update({ is_default: false })
    .eq('user_id', userId);

  if (resetResult.error) {
    throw resetResult.error;
  }

  const selectResult = await supabase
    .from('weather_saved_cities')
    .update({ is_default: true })
    .eq('user_id', userId)
    .eq('id', cityId);

  if (selectResult.error) {
    throw selectResult.error;
  }

  await upsertWeatherSettings(userId, {
    ...settings,
    selectedCityId: settings.selectedCityId ?? cityId,
    defaultCityId: cityId,
  });

  return buildDashboardState(userId);
}
