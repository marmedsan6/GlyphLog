# MCP PostgreSQL — GlyphLog

## ¿Qué es?

El MCP de PostgreSQL permite al agente de IA ejecutar consultas SQL directamente contra la base de datos desde la conversación, sin necesidad de un cliente externo. El agente puede explorar el esquema, consultar datos, verificar el resultado de operaciones y debuggear problemas de base de datos.

---

## Propósito en GlyphLog

- Verificar que una migración de Alembic se aplicó correctamente
- Explorar y validar datos durante el desarrollo
- Debuggear queries o comportamientos inesperados del ORM
- Verificar constraints, índices y relaciones del esquema
- Limpiar datos de test creados por Playwright u otras herramientas

---

## Instalación y configuración

### Configuración en Zed

Añadir la siguiente configuración en `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "postgresql": {
      "command": {
        "path": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres"],
        "env": {
          "POSTGRES_CONNECTION_STRING": "postgresql://glyphlog:glyphlog@localhost:5432/glyphlog_dev"
        }
      }
    }
  }
}
```

> La connection string del ejemplo usa los valores de desarrollo local por defecto. Ajustar según la configuración real definida en el `.env` del proyecto.

### Requisito previo

El contenedor de PostgreSQL debe estar corriendo:

```bash
# Levantar solo la base de datos
docker compose up -d db

# Verificar que está activo
docker compose ps
```

---

## Casos de uso en GlyphLog

### 1. Verificar que una migración se aplicó correctamente

```
Usa el MCP de PostgreSQL para verificar que la migración de Alembic se aplicó:
- Lista las tablas existentes en la base de datos
- Muestra el esquema de la tabla "entries" (columnas, tipos, constraints)
- Verifica que la tabla "alembic_version" tiene el revision ID correcto
```

### 2. Explorar datos en desarrollo

```
Usa el MCP de PostgreSQL para ver el estado actual de los datos:
- Muestra todos los usuarios registrados
- Muestra las entradas de la colección del usuario con id 1
- Cuenta cuántas entradas hay por tipo (anime, manga, game)
```

### 3. Debuggear queries

```
Tengo un problema: el endpoint GET /entries devuelve resultados en orden
incorrecto. Usa el MCP de PostgreSQL para ejecutar directamente la query
que debería ejecutar SQLAlchemy y verificar el resultado.
```

### 4. Verificar constraints e índices

```
Usa el MCP de PostgreSQL para verificar que:
- El índice en entries.user_id existe y es del tipo correcto
- La foreign key de entries a users tiene ON DELETE CASCADE
- La columna entries.status solo acepta los valores del enum definido
```

---

## Queries útiles para GlyphLog

### Exploración del esquema

```sql
-- Listar todas las tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver columnas y tipos de una tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'entries'
ORDER BY ordinal_position;

-- Ver todas las constraints de una tabla
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'entries'::regclass;

-- Ver índices de una tabla
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'entries';
```

### Datos de desarrollo

```sql
-- Ver todos los usuarios (sin mostrar contraseñas)
SELECT id, email, created_at FROM users;

-- Ver entradas de la colección de un usuario
SELECT id, title, entry_type, status, created_at
FROM entries
WHERE user_id = 1
ORDER BY created_at DESC;

-- Contar entradas por tipo
SELECT entry_type, COUNT(*) as total
FROM entries
GROUP BY entry_type;

-- Ver el estado actual de las migraciones de Alembic
SELECT version_num FROM alembic_version;
```

### Limpieza de datos de test

```sql
-- Eliminar entradas de test (usar con cuidado)
DELETE FROM entries WHERE title LIKE 'test_%';

-- Eliminar usuario de test y sus entradas (si hay cascade)
DELETE FROM users WHERE email = 'test@glyphlog.dev';
```

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string completa para la API de FastAPI |
| `POSTGRES_CONNECTION_STRING` | Connection string para el MCP de PostgreSQL |

Ambas variables deben apuntar a la misma base de datos en desarrollo. Se definen en el archivo `.env` local del proyecto (no commitear).

Formato de la connection string:

```
postgresql://usuario:contraseña@host:puerto/nombre_bd
```

---

## Seguridad

- **Nunca usar contra la base de datos de producción** sin precaución extrema. El agente puede ejecutar cualquier query, incluyendo `DELETE` o `DROP TABLE`.
- **No exponer la connection string real en ningún archivo del repositorio.** Siempre usar variables de entorno.
- **En entornos de producción o staging,** usar un usuario de PostgreSQL con permisos de solo lectura si el propósito es únicamente exploración.
- El archivo `.env` debe estar en `.gitignore`. Verificar que esto es así antes de hacer commit.
