// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

type WeatherUnit = 'C' | 'F';

type GeocodingResult = {
  city: string;
  placeId: string | null;
  latitude: number;
  longitude: number;
};

type CurrentConditionsResponse = {
  weatherCondition?: {
    description?: { text?: string };
    type?: string;
    iconBaseUri?: string;
  };
  temperature?: { degrees?: number };
  feelsLikeTemperature?: { degrees?: number };
  relativeHumidity?: number;
  isDaytime?: boolean;
};

type ForecastDaysResponse = {
  forecastDays?: Array<{
    displayDate?: { year?: number; month?: number; day?: number };
    minTemperature?: { degrees?: number };
    maxTemperature?: { degrees?: number };
    daytimeForecast?: {
      weatherCondition?: {
        description?: { text?: string };
        type?: string;
      };
    };
    nighttimeForecast?: {
      weatherCondition?: {
        description?: { text?: string };
        type?: string;
      };
    };
  }>;
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

function toDegrees(value: { degrees?: number } | undefined): number | null {
  return typeof value?.degrees === 'number' ? Math.round(value.degrees) : null;
}

function toConditionText(
  condition:
    | {
        description?: { text?: string };
        type?: string;
      }
    | undefined
): string {
  if (condition?.description?.text) {
    return condition.description.text;
  }

  if (condition?.type) {
    return condition.type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return 'Unavailable';
}

function toIsoDate(date: { year?: number; month?: number; day?: number } | undefined): string {
  const year = date?.year ?? 1970;
  const month = String(date?.month ?? 1).padStart(2, '0');
  const day = String(date?.day ?? 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function requireAuthenticatedUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, 'Missing Supabase runtime environment variables.');
  }

  if (!authHeader) {
    throw new HttpError(401, 'Missing authorization header.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, 'Unauthorized weather request.');
  }

  return user;
}

function resolveCityName(result: Record<string, unknown>): string {
  const components = Array.isArray(result.address_components)
    ? (result.address_components as Array<Record<string, unknown>>)
    : [];

  const preferredTypeOrder = [
    'locality',
    'administrative_area_level_2',
    'administrative_area_level_1',
    'postal_town',
  ];

  for (const type of preferredTypeOrder) {
    const match = components.find((component) => {
      const types = Array.isArray(component.types) ? (component.types as string[]) : [];
      return types.includes(type);
    });

    if (typeof match?.long_name === 'string' && match.long_name.trim()) {
      return match.long_name.trim();
    }
  }

  if (typeof result.formatted_address === 'string' && result.formatted_address.trim()) {
    return result.formatted_address.split(',')[0].trim();
  }

  return 'Unknown City';
}

async function geocodeCity(city: string, apiKey: string): Promise<GeocodingResult> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', city);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<Record<string, unknown>>;
  };

  if (!response.ok) {
    throw new HttpError(response.status, data.error_message ?? 'Geocoding request failed.');
  }

  if (data.status !== 'OK' || !data.results?.length) {
    throw new HttpError(404, `Unable to find weather for "${city}".`);
  }

  const first = data.results[0];
  const location = (first.geometry as { location?: { lat?: number; lng?: number } } | undefined)?.location;

  if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') {
    throw new HttpError(422, 'Geocoding response did not include coordinates.');
  }

  return {
    city: resolveCityName(first),
    placeId: typeof first.place_id === 'string' ? first.place_id : null,
    latitude: location.lat,
    longitude: location.lng,
  };
}

async function fetchCurrentConditions(
  latitude: number,
  longitude: number,
  apiKey: string,
  unit: WeatherUnit
): Promise<CurrentConditionsResponse> {
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('location.latitude', String(latitude));
  url.searchParams.set('location.longitude', String(longitude));
  url.searchParams.set('unitsSystem', unit === 'F' ? 'IMPERIAL' : 'METRIC');
  url.searchParams.set('languageCode', 'en');

  const response = await fetch(url);
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new HttpError(response.status, 'Current weather request failed.');
  }

  return data as CurrentConditionsResponse;
}

async function fetchDailyForecast(
  latitude: number,
  longitude: number,
  apiKey: string,
  unit: WeatherUnit,
  days: number
): Promise<ForecastDaysResponse> {
  const url = new URL('https://weather.googleapis.com/v1/forecast/days:lookup');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('location.latitude', String(latitude));
  url.searchParams.set('location.longitude', String(longitude));
  url.searchParams.set('unitsSystem', unit === 'F' ? 'IMPERIAL' : 'METRIC');
  url.searchParams.set('languageCode', 'en');
  url.searchParams.set('days', String(days));
  url.searchParams.set('pageSize', String(days));

  const response = await fetch(url);
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new HttpError(response.status, 'Daily forecast request failed.');
  }

  return data as ForecastDaysResponse;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await requireAuthenticatedUser(req);

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Use POST for weather requests.');
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      throw new HttpError(500, 'Missing GOOGLE_MAPS_API_KEY secret.');
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
    const days = Math.min(Math.max(body?.days ?? 5, 1), 7);

    let location: GeocodingResult;

    if (typeof body?.city === 'string' && body.city.trim()) {
      location = await geocodeCity(body.city.trim(), googleApiKey);
    } else if (typeof body?.latitude === 'number' && typeof body?.longitude === 'number') {
      location = {
        city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : 'Selected City',
        placeId: null,
        latitude: body.latitude,
        longitude: body.longitude,
      };
    } else {
      throw new HttpError(400, 'Provide either a city name or latitude/longitude coordinates.');
    }

    const [current, forecast] = await Promise.all([
      fetchCurrentConditions(location.latitude, location.longitude, googleApiKey, unit),
      fetchDailyForecast(location.latitude, location.longitude, googleApiKey, unit, days),
    ]);

    return json({
      city: location.city,
      placeId: location.placeId,
      lat: location.latitude,
      lng: location.longitude,
      current: {
        temperature: toDegrees(current.temperature),
        feelsLike: toDegrees(current.feelsLikeTemperature),
        humidity: typeof current.relativeHumidity === 'number' ? current.relativeHumidity : null,
        condition: toConditionText(current.weatherCondition),
        icon: current.weatherCondition?.type ?? null,
        isDaytime: Boolean(current.isDaytime),
      },
      daily: (forecast.forecastDays ?? []).map((day) => {
        const activeCondition = day.daytimeForecast?.weatherCondition ?? day.nighttimeForecast?.weatherCondition;

        return {
          date: toIsoDate(day.displayDate),
          min: toDegrees(day.minTemperature),
          max: toDegrees(day.maxTemperature),
          condition: toConditionText(activeCondition),
          icon: activeCondition?.type ?? null,
        };
      }),
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
