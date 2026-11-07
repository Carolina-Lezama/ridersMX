# 1. Comandos:

## Iniciar la app y el chatbot

El chatbot usa el backend remoto configurado en la app; no es necesario iniciar
un servidor Python local.

La app requiere un development build en Android porque Expo Go no admite las
notificaciones push remotas desde Expo SDK 53. `expo-dev-client` ya está agregado
al proyecto.

Si ya existe una carpeta `android/` de una configuración anterior, sincronízala
una vez con la configuración actual. Esto regenera esa carpeta; respalda antes
cualquier cambio nativo manual:

```powershell
npx expo prebuild --clean --platform android
```

Después, con Android Studio y el emulador abiertos, compila e instala el
development build:

```powershell
npx expo run:android
```

Después, inicia Metro para el development build y pulsa `a` para abrirlo en el
emulador:

```powershell
npx expo start --dev-client
```

Si el puerto 8081 ya está ocupado, cierra el otro servidor Metro o usa
`npx expo start --dev-client --port 8082`.

No uses Expo Go ni pulses `a` si abre Expo Go. Como alternativa, genera el APK
de desarrollo en la nube con
`npx eas-cli@latest build --platform android --profile development`, instálalo
en el emulador y luego ejecuta `npx expo start --dev-client`.

Para web usa `npm run web`.

No necesitas Python para ejecutar la app. La app no lee `GEMINI_API_KEY`; esa
clave debe permanecer configurada únicamente en el backend remoto y nunca debe
incluirse en la app ni en variables `EXPO_PUBLIC_*`.

# Git

git pull origin main
git add .  
git commit -m "onboarding"
git push origin carolina

# Revisar vulnerabilidades (sin cambiar versiones)

npm audit fix

# No uses `npm audit fix --force`: puede bajar Expo/React Native a versiones incompatibles.

# Generar archivo aab:

npx eas-cli@latest build --platform android --profile production

# Generar archivo apk:

npx eas-cli@latest build --platform android --profile preview
