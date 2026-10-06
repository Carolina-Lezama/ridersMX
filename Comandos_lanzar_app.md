# 1. Comandos:

npx expo start
npx expo start --web --clear // reiniciando cache

# Git

git pull origin main
git add .  
git commit -m "onboarding"
git push origin carolina


# Ver problemas que requieren atencion
npm audit fix
# Ver todos los problemas
npm audit fix --force

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

npx expo run:android

### iOS (se necesita mac con Xcode)
npx expo run:ios

# Remoto con EAS:
eas build --profile development --platform android

# o para iOS
eas build --profile development --platform ios
