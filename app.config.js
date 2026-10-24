// Toma lo que ya está en app.json y le agrega un dato extra.
// geminiApiKey sale de la variable GEMINI_API_KEY al arrancar Expo.
// Si esa variable no existe, queda un texto vacío. La clave no se escribe en este comentario.
const appJson = require('./app.json');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    },
  },
});
