const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      ...(config.ios && config.ios.config),
      googleMapsApiKey: GOOGLE_MAPS_KEY,
    },
  },
  android: {
    ...config.android,
    config: {
      ...(config.android && config.android.config),
      googleMaps: {
        apiKey: GOOGLE_MAPS_KEY,
      },
    },
  },
});
