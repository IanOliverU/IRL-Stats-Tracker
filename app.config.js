const { expo } = require('./app.json');

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      config: googleMapsApiKey
        ? {
            ...(expo.android?.config ?? {}),
            googleMaps: {
              apiKey: googleMapsApiKey,
            },
          }
        : expo.android?.config,
    },
  },
};
