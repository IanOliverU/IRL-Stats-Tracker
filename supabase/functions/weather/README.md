# Weather Edge Function

This function keeps the Google Weather API key on the server and returns a simplified weather payload for the Expo app.

Required secrets:

- `GOOGLE_MAPS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Recommended setup:

1. Enable Google `Weather API` and `Geocoding API` in your Google Cloud project.
2. Set the Google key in Supabase:

```bash
supabase secrets set GOOGLE_MAPS_API_KEY=your-server-key
```

3. Push the migration and deploy the function:

```bash
supabase db push
supabase functions deploy weather
```

The mobile app calls this function through `supabase.functions.invoke('weather')`.
