# 1. Comandos:

## Iniciar la app y el chatbot

El chatbot usa el backend remoto configurado en la app; no es necesario iniciar
un servidor Python local.

```powershell
npm start
```

Con Android Studio y el emulador abiertos, presiona `a` en esa misma terminal.
Para compilar e iniciar Android directamente usa `npm run android`; para web,
`npm run web`.

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
