# Guía de NutriTrack

NutriTrack es una app móvil hecha con Expo y React Native. El usuario crea una cuenta, arma su perfil, recibe una meta diaria de calorías y macros, registra comidas con una descripción escrita y compara lo que comió con esa meta. Los datos viven en Firebase.

## 1. Cómo funciona, de punta a punta

1. La persona abre la app y ve la pantalla de bienvenida.
2. Crea una cuenta o inicia sesión con correo y contraseña. Eso lo resuelve **Firebase Authentication**.
3. Si todavía no tiene perfil, la app pide edad, sexo, peso, estatura, nivel de actividad, peso objetivo y fecha.
4. Con esos datos calcula las calorías, proteína, carbohidratos y grasas del día.
5. En **Inicio** ve cuánto lleva consumido hoy frente a esa meta.
6. En **Registrar comida** escribe algo como `2 huevos, frijoles, 3 tortillas y aguacate`.
7. Gemini estima los alimentos, las porciones y los macros. La persona puede corregir los números y después guardar. Si Gemini no responde, puede agregarlos a mano.
8. **Comidas** muestra el historial. Se puede abrir una comida y eliminarla.
9. **Progreso** guarda el peso y dibuja los últimos registros.
10. **Perfil** deja editar los datos y cerrar sesión.

Si cierra la app y la vuelve a abrir, la sesión sigue activa. En el celular se guarda con AsyncStorage.

## 2. Qué se usó

| Pieza | Para qué |
| --- | --- |
| Expo SDK 57 y React Native | La app en iOS, Android y web |
| Expo Router | Las pantallas salen de los archivos en `src/app` |
| Firebase Authentication | Registro e inicio de sesión con correo y contraseña |
| Cloud Firestore | Perfil, comidas y peso |
| AsyncStorage | Mantener la sesión al cerrar la app en el celular |
| TypeScript | Tipos del perfil, las comidas y las metas |

La estimación de una comida escrita la hace Gemini. La clave queda en la configuración local del proyecto y no se muestra en la pantalla. Si la petición falla, la persona reintenta o escribe los alimentos a mano.

## 3. Cómo está organizado el código

```text
src/
  app/                          Pantallas y navegación
    index.tsx                   Bienvenida. Si ya hay sesión, manda al perfil o al inicio
    login.tsx                   Reexporta la pantalla de login
    register.tsx                Reexporta la pantalla de registro
    onboarding.tsx              Primer perfil, obligatorio antes de entrar
    _layout.tsx                 Arranque, sesión y stack principal
    (app)/
      _layout.tsx               Solo entra quien ya tiene cuenta y perfil
      new-meal.tsx              Escribir, revisar y guardar una comida
      (tabs)/
        home.tsx                Consumo de hoy contra la meta
        meals.tsx               Historial
        progress.tsx            Peso y últimos registros
        profile.tsx             Ver y editar perfil, cerrar sesión

  auth/                         Formularios de login y registro
  context/auth-context.tsx      Usuario actual y perfil, en tiempo real
  services/firebase.ts          Conexión a Firebase
  services/user-data.ts         Guardar y borrar perfil, comidas y peso
  services/gemini-meal.ts       Pide a Gemini la estimación de una comida
  lib/nutrition.ts              Meta diaria
  components/                   Botones, campos y formulario de perfil
```

Las carpetas entre paréntesis, como `(app)` y `(tabs)`, organizan la navegación y no aparecen en la dirección de la pantalla.

## 4. Cómo se guardan los datos

Todo cuelga del id del usuario que devuelve Authentication.

```text
users/{uid}                     Un documento con el perfil
users/{uid}/meals/{id}          Una comida
users/{uid}/weights/{id}        Un registro de peso
```

Perfil (`users/{uid}`):

- `name`, `email`, `sex` (`female` o `male`)
- `age`, `weightKg`, `heightCm`
- `activityLevel`: `sedentary`, `light`, `moderate`, `active` o `very_active`
- `goalWeightKg`, `goalDeadline` (fecha `AAAA-MM-DD`)
- `updatedAt`

Comida:

- `description`: el texto original
- `items`: alimentos con nombre, cantidad, gramos, calorías, proteína, carbohidratos, grasas y si se reconoció
- `calories`, `protein`, `carbs`, `fat`
- `eatenAt`: fecha en milisegundos

Peso:

- `weightKg`
- `recordedAt`

La app no crea colecciones vacías en la consola. El primer perfil crea `users/{uid}`. La primera comida crea `meals`. El primer peso crea `weights`. Al guardar el perfil inicial también se guarda ese peso como primer registro.

Las pantallas escuchan los cambios con `onSnapshot`, así que Inicio, Comidas y Progreso se actualizan al guardar.

## 5. Cómo sale la meta diaria

Está en `src/lib/nutrition.ts`.

1. Calcula el metabolismo con la fórmula de Mifflin-St Jeor, usando peso, estatura, edad y sexo.
2. Lo multiplica por el nivel de actividad para obtener las calorías de mantenimiento.
3. Reparte el cambio de peso hasta la fecha elegida. Usa 7700 kcal por kilogramo.
4. Limita el ajuste: como máximo 1000 kcal menos o 750 kcal más al día.
5. No baja de 1500 kcal en hombres ni de 1200 kcal en mujeres.
6. Reparte proteína según el objetivo (bajar, subir o mantener), deja cerca del 28 % de las calorías para grasa y el resto para carbohidratos.

## 6. Cómo interpreta una comida

Está en `src/services/gemini-meal.ts` y se usa desde `src/app/(app)/new-meal.tsx`.

1. La persona escribe la comida, por ejemplo `2 huevos, frijoles, 3 tortillas y aguacate`.
2. La app envía ese texto a Gemini y pide una lista en JSON: nombre, cantidad, gramos, calorías, proteína, carbohidratos y grasas.
3. Si la respuesta es válida, muestra «Estimación de Gemini». Los números se pueden corregir, quitar o completar antes de guardar.
4. Si Gemini falla, la pantalla explica el motivo. Se puede volver a interpretar o usar **Agregar alimento** y escribir nombre, cantidad y macros.
5. No se guarda una comida vacía, ni un alimento sin nombre, ni un valor que no sea un número de 0 o más.

## 7. Configurar Firebase para que quede usable

El proyecto de la app ya está en el código: `nutritrack-93d74`. La configuración está en `src/services/firebase.ts`. Falta activar los servicios en la consola. Sin esos pasos, el registro y el guardado fallan.

Abre [Firebase Console](https://console.firebase.google.com/) y entra a **nutritrack-93d74**.

### Paso 1. Activar el correo y la contraseña

1. Menú **Build** → **Authentication**.
2. Si pide empezar, pulsa **Get started**.
3. Pestaña **Sign-in method**.
4. Elige **Correo electrónico/contraseña** (Email/Password).
5. Activa la primera opción, **Email/Password**. No hace falta el enlace por correo.
6. Guarda.

### Paso 2. Crear Cloud Firestore

1. Menú **Build** → **Firestore Database**.
2. **Create database**.
3. Elige una ubicación y confírmala. Después no se puede cambiar. `nam5` (Estados Unidos) o `southamerica-east1` (São Paulo) sirven.
4. Si pregunta el modo, elige **producción**. En el paso siguiente vas a publicar las reglas del proyecto. Si solo deja empezar en modo de prueba, también sirve: esas reglas abiertas caducan y hay que reemplazarlas enseguida con las del paso 3.

No crees colecciones a mano. La app las crea al guardar el primer perfil.

### Paso 3. Publicar las reglas

1. En Firestore, abre la pestaña **Rules**.
2. Borra lo que haya y pega el contenido de `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /meals/{mealId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /weights/{weightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Pulsa **Publish**.

Con eso, una persona solo puede leer y escribir su propio perfil, sus comidas y su peso. Otra cuenta no ve esos documentos.

No hace falta crear índices. Las consultas ordenan un solo campo dentro de la subcolección de ese usuario.

### Paso 4. Comprobar que la app apunta a ese proyecto

En `src/services/firebase.ts`, `projectId` debe decir `nutritrack-93d74`. Si creas otro proyecto en Firebase, sustituye todo el objeto `firebaseConfig` por el que te da la consola en **Project settings** → tu app web → **SDK setup and configuration**.

## 8. Correr la app y comprobar que quedó al 100 %

En la carpeta del proyecto:

```bash
npm install
npx expo start
```

Abre el proyecto en Expo Go (escaneando el QR), en un simulador o en el navegador con la tecla `w`.

Recorre esto una vez. Si los nueve puntos pasan, la app está lista para usarse:

1. **Crear cuenta** con un correo real y una contraseña de al menos 6 caracteres.
2. **Completar el perfil.** Al guardar debe aparecer la meta, por ejemplo `2100 kcal`.
3. En Firebase → Firestore debe existir `users` y, dentro, un documento con tu uid. También debe aparecer `weights` con el peso inicial.
4. **Registrar comida** con `2 huevos, frijoles, 3 tortillas y aguacate`. Revisa los cuatro alimentos, cambia un número si quieres y guarda.
5. En **Inicio** esa comida suma al día. En **Comidas** aparece en Hoy.
6. En Firestore, dentro de tu usuario, debe existir `meals` con esa descripción.
7. En **Progreso**, guarda otro peso. La cifra de “peso actual” cambia y aparece una barra nueva. En el perfil de Firestore, `weightKg` también cambia.
8. Edita un dato del perfil y confírmalo al volver a abrir la pantalla.
9. Cierra sesión, cierra la app, ábrela e **inicia sesión** con el mismo correo. El perfil y las comidas siguen ahí.

## 9. Si algo falla

| Qué ves | Qué revisar |
| --- | --- |
| `auth/operation-not-allowed` o no deja crear la cuenta | El método Correo/contraseña no está activado |
| `auth/email-already-in-use` | Ese correo ya tiene cuenta: entra por Iniciar sesión |
| `auth/invalid-credential` | Correo o contraseña incorrectos |
| `auth/network-request-failed` | El teléfono no tiene internet, o el emulador no tiene red |
| “No se pudo guardar” al crear el perfil o una comida | Firestore no existe, o las reglas no están publicadas |
| La comida se guarda pero Inicio no la muestra | En Reglas, publica otra vez el archivo `firestore.rules` y confirma que estás en el proyecto `nutritrack-93d74` |
| Gemini no estima la comida | El aviso indica el motivo. Se puede volver a interpretar o agregar los alimentos a mano con **Agregar alimento** |
| Pide el perfil cada vez que entras | El documento `users/{uid}` no se guardó. Revisa las reglas y vuelve a completar el formulario |
