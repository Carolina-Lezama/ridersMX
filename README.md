npm start

Este comando inicia automáticamente el servidor Python del chatbot junto con
Expo. Con el emulador abierto, presiona `a` en esa misma terminal.

Asegúrate de tener Android Studio Panda 4 abierto con tu emulador corriendo.


codigos para github

# Guía Práctica de Comandos de Git y GitHub

Esta guía contiene los comandos esenciales de Git para gestionar ramas, sincronizar cambios con GitHub y resolver problemas comunes durante el desarrollo.

---

## 1. Verificación y Estado

* **`git status`**
  Muestra el estado actual del repositorio: la rama activa, archivos modificados, pendientes de commit y archivos sin rastrear.

* **`git branch`**
  Lista todas las ramas locales existentes. La rama marcada con un asterisco (`*`) es en la que te encuentras trabajando.

* **`git branch -a`**
  Muestra la lista de todas las ramas, tanto locales como remotas en GitHub.

* **`git log --oneline`**
  Muestra el historial reciente de commits de forma resumida en una sola línea.

---

## 2. Flujo de Trabajo Básico (Guardar y Subir)

1. **`git add .`**
   Agrega todos los archivos modificados y nuevos al área de preparación (*staging*).

2. **`git commit -m "Descripción de los cambios"`**
   Guarda los cambios preparados localmente con un mensaje descriptivo.

3. **`git push origin <rama>`**
   Sube los commits locales a la rama correspondiente en GitHub.
   *Ejemplo:* `git push origin joshua`

---

## 3. Sincronización desde GitHub

* **`git fetch origin`**
  Descarga la información más reciente de todas las ramas del servidor sin modificar tus archivos locales.

* **`git pull origin <rama>`**
  Descarga e integra directamente los cambios de la rama remota en tu rama actual.
  *Ejemplo:* `git pull origin main`

* **`git merge origin/<rama>`**
  Combina los cambios de una rama remota especificada en tu rama actual.
  *Ejemplo (estando en `joshua`):* `git merge origin/main`

* **`git pull --rebase origin <rama>`**
  Actualiza tu rama manteniendo un historial limpio y lineal sin generar commits de merge innecesarios.

---

## 4. Gestión de Ramas

* **`git checkout -b <nueva-rama>`**
  Crea una rama nueva y cambia a ella automáticamente.

* **`git checkout <rama>`**
  Cambia a una rama ya existente.
  *Ejemplo:* `git checkout main`

* **`git push -u origin <nueva-rama>`**
  Sube por primera vez una rama creada localmente hacia GitHub y establece el rastreo.

---

## 5. Limpieza y Sobreescritura

* **`git reset --hard origin/<rama>`**
  Descarta todos los cambios locales y fuerz la rama a ser exactamente igual a la rama en GitHub.
  *(⚠️ **Atención:** Usa este comando con precaución, ya que borra cambios no subidos).*

* **`git checkout -- <archivo>`**
  Descarta los cambios locales en un archivo específico y lo restaura al estado del último commit.

---

## 6. Solución de Problemas y Dependencias (React Native / Expo)

* **`npm install`**
  Instala todas las librerías indicadas en el archivo `package.json` dentro de `node_modules`.

* **`npx expo install <paquete>`**
  Instala librerías garantizando la versión compatible con el SDK de Expo.
  *Ejemplo:* `npx expo install expo-image-picker`