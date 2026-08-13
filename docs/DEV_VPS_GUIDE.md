# Guía: Entorno DEV de GlyphLog + Herdr en VPS de Oracle Cloud

## Estado actual del entorno

Todo está configurado y corriendo en tu VPS (`143.47.48.211`):

| Componente | Estado | Puerto |
|---|---|---|
| PostgreSQL | ✅ Healthy | 127.0.0.1:5433 |
| FastAPI Backend | ✅ Healthy | 127.0.0.1:8000 |
| React Frontend | ✅ Running | 127.0.0.1:5173 |
| Herdr Server | ✅ Running | Socket: `~/.config/herdr/herdr.sock` |
| Command Code CLI | ✅ Instalado (v1.15.1) | En pane de Herdr |

---

## Cómo conectarte

### Desde tu desktop (Linux/macOS)

```bash
ssh ubuntu@143.47.48.211
# Luego, dentro del VPS:
herdr
```

O usa el alias SSH si lo configuras en `~/.ssh/config`:

```bash
Host glyphlog-vps
    HostName 143.47.48.211
    User ubuntu
    IdentityFile ~/.ssh/mario-oracle.key
```

Luego: `ssh glyphlog-vps` y dentro `herdr`.

### Desde tu móvil (iPhone/Android)

1. Instala un cliente SSH:
   - **iPhone**: [moshi](https://getmoshi.app/) (recomendado por Fazt) o Termius
   - **Android**: Termius o JuiceSSH

2. Conéctate al VPS:
   ```
   Host: 143.47.48.211
   User: ubuntu
   Auth: tu llave SSH
   ```

3. Inicia Herdr:
   ```bash
   herdr
   ```

La TUI de Herdr se adapta a pantallas estrechas. Puedes navegar panes con clics o con atajos de teclado.

### Opción avanzada: Cliente local delgado

Desde tu desktop, puedes usar Herdr como cliente delgado del VPS:

```bash
herdr --remote glyphlog-vps
```

Esto hace que la TUI de Herdr corra localmente pero conectada al servidor del VPS.

---

## Estructura de Herdr (workspace `w1`)

```
Workspace: glyphlog-dev (w1)
├── Tab "1" (w1:t1) - pane w1:p1 - Shell principal
├── Tab "agents" (w1:t2) - Command Code corriendo
│   ├── w1:p2 - Command Code (agente principal)
│   ├── w1:p5 - Docker logs (monitor)
│   └── w1:p6 - Git tools
├── Tab "servers" (w1:t3) - pane w1:p3 - Shell para comandos
└── Tab "git-tools" (w1:t4) - pane w1:p4 - Shell para git/tests
```

### Atajos de teclado de Herdr

| Acción | Tecla |
|---|---|
| Entrar en modo prefix | `ctrl+b` |
| Detach (salir sin matar) | `ctrl+b q` |
| Split derecha | `ctrl+b v` |
| Split abajo | `ctrl+b -` |
| Nuevo tab | `ctrl+b c` |
| Siguiente tab | `ctrl+b n` |
| Anterior tab | `ctrl+b p` |
| Navegar workspaces | `ctrl+b w` |
| Nuevo workspace | `ctrl+b shift+n` |
| Ir al siguiente pane | `ctrl+b →` |
| Ir al anterior pane | `ctrl+b ←` |

---

## Autenticación de Command Code

Command Code está corriendo en el pane `w1:p2` y está esperando tu API key.

### Opción 1: Pegar API key (recomendado para VPS)

1. En el pane de Command Code, verás:
   ```
   API Key: Paste your API key...
   ```

2. Obtén tu API key en: https://commandcode.ai/studio/api-keys

3. Pega la key y presiona Enter.

### Opción 2: Login en navegador

1. Si el navegador se abre automáticamente, completa el login.
2. Si no, visita el enlace que aparece en la terminal:
   ```
   https://commandcode.ai/studio/auth/cli?callback=...
   ```

---

## Cómo usar el entorno

### Flujo de trabajo diario

1. **Conéctate al VPS y abre Herdr**:
   ```bash
   ssh ubuntu@143.47.48.211
   herdr
   ```

2. **Navega al pane de Command Code** (w1:p2 en la pestaña "agents"):
   - Usa `ctrl+b` luego `w` para navegar workspaces
   - O haz clic en el pane desde el sidebar

3. **Trabaja en GlyphLog**:
   - Command Code ya está en el directorio `~/GlyphLog`
   - Puedes darle instrucciones como: `"Implementa el endpoint GET /api/v1/entries"`
   - Usa `--trust` para saltar el prompt de permisos

4. **Monitorea servicios**:
   - En el pane w1:p5 ves los logs de Docker en tiempo real
   - En el pane w1:p6 puedes correr comandos de git

5. **Detach cuando te vayas**:
   - `ctrl+b q` — los agentes y servidores siguen corriendo
   - Vuelve a conectar con `herdr`

### Comandos útiles

```bash
# Ver estado de los servicios
docker compose -f docker-compose.dev.yml ps

# Ver logs de un servicio
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml logs -f web

# Ejecutar migraciones
docker compose -f docker-compose.dev.yml exec -T glyphlog-dev-api alembic upgrade head

# Iniciar/continuar Command Code
cmd --trust --add-dir ~/GlyphLog

# Iniciar Claude Code (si está instalado)
claude

# Iniciar Codex (si está instalado)
codex
```

---

## Scripts de conveniencia

```bash
# Conectarte a Herdr
~/GlyphLog/scripts/herdr-attach.sh

# (Re)iniciar agentes en los panes
~/GlyphLog/scripts/start-agents.sh
```

---

## Túnel SSH para acceso web (opcional)

Si quieres acceder al frontend y API desde tu máquina local (no desde el VPS):

```bash
# En tu máquina local (no en el VPS)
ssh -L 5173:127.0.0.1:5173 -L 8000:127.0.0.1:8000 ubuntu@143.47.48.211
```

Luego accede a:
- Frontend: http://localhost:5173
- API: http://localhost:8000
- Health: http://localhost:8000/health

---

## Solución de problemas

### Herdr no responde
```bash
ssh ubuntu@143.47.48.211
herdr server stop  # Si está colgado
herdr  # Reinicia
```

### Docker Compose no levanta
```bash
cd ~/GlyphLog
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build
```

### Command Code no detecta el proyecto
Asegúrate de estar en `~/GlyphLog` y usa `--add-dir ~/GlyphLog`.

### No ves los cambios en el frontend
El dev server de Vite tiene HMR. Si no funciona, reinicia el contenedor:
```bash
docker compose -f docker-compose.dev.yml restart web
```
