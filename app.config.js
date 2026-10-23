const appJson = require('./app.json');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    },
  },
});
