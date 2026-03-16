# Weather Edge Function

This function keeps the OpenWeather API key on the server and returns a simplified weather payload for the Expo app.

Required secrets:

- `OPENWEATHER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Recommended setup:

1. Create an OpenWeather API key.
2. Set the key in Supabase:

```bash
supabase secrets set OPENWEATHER_API_KEY=your-server-key
```

3. Push the migration and deploy the function:

```bash
supabase db push
supabase functions deploy weather
```

Implementation notes:

- City search uses OpenWeather Geocoding API.
- Current conditions use `data/2.5/weather`.
- Forecast uses `data/2.5/forecast`.
- The mobile app still calls this through `supabase.functions.invoke('weather')`.
