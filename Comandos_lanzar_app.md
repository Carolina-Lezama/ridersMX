# 1. Comandos:

## Iniciar la app y el chatbot

El comando de desarrollo inicia automáticamente el servidor Python del chatbot y
después Expo. Ya no es necesario abrir otra terminal para lanzar Flask:

```powershell
npm start
```

Con Android Studio y el emulador abiertos, presiona `a` en esa misma terminal.
Para compilar e iniciar Android directamente usa `npm run android`; para web,
`npm run web`.

La primera vez, instala Python 3 y las dependencias del backend:

```powershell
py -3 -m pip install -r requirements.txt
```

Agrega `GEMINI_API_KEY` a `.env` (puedes usar `.env.example` como referencia).
La clave solo se usa en Python; no la agregues a variables `EXPO_PUBLIC_*`.
Si el comando `py` no está disponible, define `PYTHON_EXECUTABLE` con la ruta
de `python.exe` antes de ejecutar npm.

El teléfono/emulador debe poder acceder por la red local a la computadora que
ejecuta Expo. En desarrollo, el cliente móvil obtiene la IP del servidor Expo y
la versión web usa `http://localhost:5000`; por eso inicia la app con `npm start`
o `npm run web`, que también levanta el backend.

Para una app distribuida, publica el backend en un servidor HTTPS y define
`EXPO_PUBLIC_GEMINI_API_URL` con la URL base (origen) del servidor al compilar,
por ejemplo `https://chat.ejemplo.com`. La app agrega `/api/chat` a esa URL.
Esta variable es pública y queda incluida en la app; nunca guardes aquí
`GEMINI_API_KEY` ni otra clave privada. Si cambias variables de entorno, reinicia
Expo y recarga completamente la app; normalmente no hace falta limpiar la caché.

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