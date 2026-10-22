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

# Comandos para Reconstruir la App:
### Android
En Windows, configura Java y Android SDK en PowerShell (ajusta `JAVA_HOME` si
Android Studio esta instalado en otra ruta). Instala tambien el NDK requerido:

```powershell
$env:JAVA_HOME = "$env:ProgramFiles\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --install "ndk;27.1.12297006"
```

Abre una terminal nueva si guardaste estas variables de forma permanente en
Windows.

npm run android

### iOS (se necesita mac con Xcode)
npm run ios

# Remoto con EAS:
eas build --profile development --platform android

# o para iOS
eas build --profile development --platform ios


# Pruebas aab:
npx eas-cli@latest build --platform android --profile production