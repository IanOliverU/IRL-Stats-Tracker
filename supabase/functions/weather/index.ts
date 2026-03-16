// @ts-nocheck

type WeatherUnit = 'C' | 'F';

type GeocodingResult = {
  city: string;
  placeId: string | null;
  latitude: number;
  longitude: number;
};

type OpenWeatherGeoResult = {
  name?: string;
  lat?: number;
  lon?: number;
  country?: string;
  state?: string;
};

type OpenWeatherCurrentResponse = {
  cod?: number | string;
  message?: string;
  dt?: number;
  timezone?: number;
  name?: string;
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
  };
  weather?: {
    main?: string;
    description?: string;
    icon?: string;
  }[];
  sys?: {
    sunrise?: number;
    sunset?: number;
  };
};

type OpenWeatherForecastItem = {
  dt?: number;
  main?: {
    temp?: number;
    temp_min?: number;
    temp_max?: number;
  };
  weather?: {
    main?: string;
    description?: string;
    icon?: string;
  }[];
  sys?: {
    pod?: string;
  };
};

type OpenWeatherForecastResponse = {
  cod?: number | string;
  message?: string;
  city?: {
    name?: string;
    timezone?: number;
    coord?: {
      lat?: number;
      lon?: number;
    };
  };
  list?: OpenWeatherForecastItem[];
};

type DailyAggregate = {
  date: string;
  min: number | null;
  max: number | null;
  condition: string;
  icon: string | null;
  bestHourDelta: number;
};

type HourlyForecastEntry = {
  timeLabel: string;
  temperature: number | null;
  condition: string;
  icon: string | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function roundNumber(value: number | undefined): number | null {
  return typeof value === 'number' ? Math.round(value) : null;
}

function toConditionText(condition: { main?: string; description?: string } | undefined): string {
  if (typeof condition?.description === 'string' && condition.description.trim()) {
    return condition.description
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  if (typeof condition?.main === 'string' && condition.main.trim()) {
    return condition.main;
  }

  return 'Unavailable';
}

function toConditionToken(condition: { main?: string; icon?: string } | undefined): string | null {
  if (typeof condition?.main === 'string' && condition.main.trim()) {
    return condition.main;
  }

  if (typeof condition?.icon === 'string' && condition.icon.trim()) {
    return condition.icon;
  }

  return null;
}

function toDisplayCityName(name: string, state?: string, country?: string): string {
  const parts = [name.trim()];

  if (typeof state === 'string' && state.trim()) {
    parts.push(state.trim());
  }

  if (typeof country === 'string' && country.trim()) {
    parts.push(country.trim().toUpperCase());
  }

  return parts.join(', ');
}

function buildPlaceId(latitude: number, longitude: number, name: string): string {
  return `owm:${name.toLowerCase()}:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function getUnitsSystem(unit: WeatherUnit): 'metric' | 'imperial' {
  return unit === 'F' ? 'imperial' : 'metric';
}

function getLocalDateParts(unixSeconds: number, timezoneOffsetSeconds: number): { date: string; hour: number } {
  const localDate = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);

  return {
    date: localDate.toISOString().slice(0, 10),
    hour: localDate.getUTCHours(),
  };
}

function isCurrentDaytime(current: OpenWeatherCurrentResponse): boolean {
  const timestamp = typeof current.dt === 'number' ? current.dt : null;
  const sunrise = typeof current.sys?.sunrise === 'number' ? current.sys.sunrise : null;
  const sunset = typeof current.sys?.sunset === 'number' ? current.sys.sunset : null;

  if (timestamp !== null && sunrise !== null && sunset !== null) {
    return timestamp >= sunrise && timestamp < sunset;
  }

  return String(current.weather?.[0]?.icon ?? '').endsWith('d');
}

function formatHourLabel(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM';
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return `${displayHour} ${suffix}`;
}

async function geocodeCity(city: string, apiKey: string): Promise<GeocodingResult> {
  const url = new URL('https://api.openweathermap.org/geo/1.0/direct');
  url.searchParams.set('q', city);
  url.searchParams.set('limit', '1');
  url.searchParams.set('appid', apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as OpenWeatherGeoResult[] | { message?: string };

  if (!response.ok) {
    const message =
      typeof (data as { message?: string })?.message === 'string'
        ? (data as { message?: string }).message
        : 'Geocoding request failed.';
    throw new HttpError(response.status, message);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new HttpError(404, `Unable to find weather for "${city}".`);
  }

  const first = data[0];
  if (typeof first.lat !== 'number' || typeof first.lon !== 'number' || typeof first.name !== 'string') {
    throw new HttpError(422, 'Geocoding response did not include valid coordinates.');
  }

  return {
    city: toDisplayCityName(first.name, first.state, first.country),
    placeId: buildPlaceId(first.lat, first.lon, first.name),
    latitude: first.lat,
    longitude: first.lon,
  };
}

async function fetchCurrentConditions(
  latitude: number,
  longitude: number,
  apiKey: string,
  unit: WeatherUnit
): Promise<OpenWeatherCurrentResponse> {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('units', getUnitsSystem(unit));
  url.searchParams.set('lang', 'en');
  url.searchParams.set('appid', apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as OpenWeatherCurrentResponse;

  if (!response.ok) {
    throw new HttpError(response.status, data.message ?? 'Current weather request failed.');
  }

  return data;
}

async function fetchForecast(
  latitude: number,
  longitude: number,
  apiKey: string,
  unit: WeatherUnit
): Promise<OpenWeatherForecastResponse> {
  const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('units', getUnitsSystem(unit));
  url.searchParams.set('lang', 'en');
  url.searchParams.set('appid', apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as OpenWeatherForecastResponse;

  if (!response.ok) {
    throw new HttpError(response.status, data.message ?? 'Forecast request failed.');
  }

  return data;
}

function buildDailyForecast(
  forecast: OpenWeatherForecastResponse,
  days: number
): { date: string; min: number | null; max: number | null; condition: string; icon: string | null }[] {
  const timezoneOffset = typeof forecast.city?.timezone === 'number' ? forecast.city.timezone : 0;
  const grouped = new Map<string, DailyAggregate>();

  for (const entry of forecast.list ?? []) {
    if (typeof entry.dt !== 'number') {
      continue;
    }

    const { date, hour } = getLocalDateParts(entry.dt, timezoneOffset);
    const condition = entry.weather?.[0];
    const tempMin = roundNumber(entry.main?.temp_min ?? entry.main?.temp);
    const tempMax = roundNumber(entry.main?.temp_max ?? entry.main?.temp);
    const hourDelta = Math.abs(hour - 12);

    const existing = grouped.get(date);
    if (!existing) {
      grouped.set(date, {
        date,
        min: tempMin,
        max: tempMax,
        condition: toConditionText(condition),
        icon: toConditionToken(condition),
        bestHourDelta: hourDelta,
      });
      continue;
    }

    existing.min =
      existing.min === null ? tempMin : tempMin === null ? existing.min : Math.min(existing.min, tempMin);
    existing.max =
      existing.max === null ? tempMax : tempMax === null ? existing.max : Math.max(existing.max, tempMax);

    if (hourDelta < existing.bestHourDelta) {
      existing.condition = toConditionText(condition);
      existing.icon = toConditionToken(condition);
      existing.bestHourDelta = hourDelta;
    }
  }

  return Array.from(grouped.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, days)
    .map(({ date, min, max, condition, icon }) => ({
      date,
      min,
      max,
      condition,
      icon,
    }));
}

function buildHourlyTodayForecast(
  forecast: OpenWeatherForecastResponse,
  current: OpenWeatherCurrentResponse
): HourlyForecastEntry[] {
  const timezoneOffset =
    typeof forecast.city?.timezone === 'number'
      ? forecast.city.timezone
      : typeof current.timezone === 'number'
        ? current.timezone
        : 0;

  const currentTimestamp = typeof current.dt === 'number' ? current.dt : Math.floor(Date.now() / 1000);
  const currentDate = getLocalDateParts(currentTimestamp, timezoneOffset).date;

  const upcomingToday = (forecast.list ?? [])
    .filter((entry) => {
      if (typeof entry.dt !== 'number') {
        return false;
      }

      const { date } = getLocalDateParts(entry.dt, timezoneOffset);
      return entry.dt >= currentTimestamp && date === currentDate;
    })
    .slice(0, 5);

  return upcomingToday.map((entry) => {
    const { hour } = getLocalDateParts(entry.dt ?? currentTimestamp, timezoneOffset);
    const condition = entry.weather?.[0];

    return {
      timeLabel: formatHourLabel(hour),
      temperature: roundNumber(entry.main?.temp),
      condition: toConditionText(condition),
      icon: toConditionToken(condition),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Use POST for weather requests.');
    }

    const openWeatherApiKey = Deno.env.get('OPENWEATHER_API_KEY');
    if (!openWeatherApiKey) {
      throw new HttpError(500, 'Missing OPENWEATHER_API_KEY secret.');
    }

    const body = (await req.json().catch(() => null)) as
      | {
          city?: string;
          latitude?: number;
          longitude?: number;
          unit?: WeatherUnit;
          days?: number;
        }
      | null;

    const unit: WeatherUnit = body?.unit === 'F' ? 'F' : 'C';
    const days = Math.min(Math.max(body?.days ?? 5, 1), 5);

    let location: GeocodingResult;
    const hasCoordinates = typeof body?.latitude === 'number' && typeof body?.longitude === 'number';

    if (hasCoordinates) {
      location = {
        city: typeof body?.city === 'string' && body.city.trim() ? body.city.trim() : 'Selected City',
        placeId: null,
        latitude: body.latitude,
        longitude: body.longitude,
      };
    } else if (typeof body?.city === 'string' && body.city.trim()) {
      location = await geocodeCity(body.city.trim(), openWeatherApiKey);
    } else {
      throw new HttpError(400, 'Provide either a city name or latitude/longitude coordinates.');
    }

    const [current, forecast] = await Promise.all([
      fetchCurrentConditions(location.latitude, location.longitude, openWeatherApiKey, unit),
      fetchForecast(location.latitude, location.longitude, openWeatherApiKey, unit),
    ]);

    const resolvedCity =
      typeof body?.city === 'string' && body.city.trim() && hasCoordinates
        ? body.city.trim()
        : location.city !== 'Selected City'
          ? location.city
          : current.name ?? forecast.city?.name ?? location.city;

    return json({
      city: resolvedCity,
      placeId: location.placeId,
      lat: location.latitude,
      lng: location.longitude,
      current: {
        temperature: roundNumber(current.main?.temp),
        feelsLike: roundNumber(current.main?.feels_like),
        humidity: typeof current.main?.humidity === 'number' ? current.main.humidity : null,
        condition: toConditionText(current.weather?.[0]),
        icon: toConditionToken(current.weather?.[0]),
        isDaytime: isCurrentDaytime(current),
      },
      daily: buildDailyForecast(forecast, days),
      hourlyToday: buildHourlyTodayForecast(forecast, current),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : 'Unexpected weather function failure.';
    return json({ error: message }, 500);
  }
});
