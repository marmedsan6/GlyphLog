# GlyphLog Companion (Chrome Extension)

Extensión de Chrome para registrar y actualizar el progreso de tus animes, mangas y videojuegos sin necesidad de abrir la aplicación web completa.

## 🚀 Cómo instalar en Google Chrome (Modo Desarrollador)

1. Abre Google Chrome y navega a `chrome://extensions/`.
2. Activa el **Modo de desarrollador** (interruptor en la esquina superior derecha).
3. Haz clic en **Cargar descomprimida** (Load unpacked).
4. Selecciona la carpeta `apps/extension` de este repositorio.
5. Haz clic en el icono del rompecabezas en la barra de Chrome y fija **GlyphLog Companion**.

## 🔑 Cómo emparejar la extensión

1. En GlyphLog (SPA web), ve a tu **Perfil** (`/profile`).
2. En la sección **Dispositivos**, haz clic en **Emparejar nuevo dispositivo**.
3. Copia el código de 6 caracteres generado (ej. `A3X9K2`).
4. Abre la extensión en Chrome e introduce el código en la pantalla de inicio.
5. ¡Listo! La extensión quedará emparejada de forma segura sin compartir las credenciales ni el JWT de la aplicación web.

## 🛡️ Seguridad

- La extensión **NO** solicita permisos para leer las páginas web que visitas (`no <all_urls>`).
- Utiliza **tokens de dispositivo (Device Tokens)** independientes y revocables en cualquier momento desde tu perfil en GlyphLog.
- El token expira automáticamente tras 90 días de inactividad.
