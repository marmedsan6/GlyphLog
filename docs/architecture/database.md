# Esquema de Base de Datos

## Herramientas

| Herramienta | Rol |
|---|---|
| PostgreSQL | Motor de base de datos relacional |
| SQLAlchemy 2.x | ORM para definir modelos y ejecutar queries en Python |
| Alembic | Gestión de migraciones incrementales del esquema |

---

## Diagrama ER — MVP

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR email UK
        VARCHAR hashed_password "NULL"
        VARCHAR provider
        VARCHAR provider_id "NULL"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    entries {
        UUID id PK
        UUID user_id FK
        VARCHAR title
        entry_type type
        entry_status status
        DECIMAL rating "NULL"
        INTEGER year "NULL"
        TEXT notes "NULL"
        VARCHAR cover_image "NULL"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    users ||--o{ entries : "tiene"
```

---

## Descripción de tablas

### `users`

Almacena las cuentas de usuario de la aplicación. Admite tanto registro/login local como login social (Google OAuth).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Identificador único del usuario |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE, INDEX | Dirección de email, usada como identificador de login |
| `hashed_password` | `VARCHAR(255)` | NULL | Contraseña hasheada con bcrypt (NULL para usuarios OAuth de Google) |
| `provider` | `VARCHAR(20)` | NOT NULL, default `'local'` | Proveedor de identidad: `'local'`, `'google'`, etc. |
| `provider_id` | `VARCHAR(255)` | NULL | ID único en el proveedor OAuth (`sub` de Google) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, default `now()` | Fecha y hora de creación del registro |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, default `now()` | Fecha y hora de última modificación |

### `entries`

Almacena cada ítem registrado en la colección de un usuario (anime, manga o videojuego).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Identificador único de la entrada |
| `user_id` | `UUID` | NOT NULL, FK → `users.id` ON DELETE CASCADE | Usuario propietario de la entrada |
| `title` | `VARCHAR(500)` | NOT NULL | Título del anime, manga o videojuego |
| `type` | `entry_type` (enum) | NOT NULL | Tipo de entrada: `anime`, `manga` o `game` |
| `status` | `entry_status` (enum) | NOT NULL | Estado actual de seguimiento |
| `rating` | `NUMERIC(3,1)` | NULL | Puntuación personal de 1.0 a 10.0 |
| `year` | `INTEGER` | NULL | Año de publicación/lanzamiento |
| `notes` | `TEXT` | NULL | Notas personales y reseñas del usuario |
| `cover_image` | `VARCHAR(500)` | NULL | Ruta relativa de la imagen de portada |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, default `now()` | Fecha y hora de creación del registro |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, default `now()` | Fecha y hora de última modificación |

---

## Enums

### `entry_type`

Define el tipo de contenido que representa una entrada.

| Valor | Descripción |
|---|---|
| `anime` | Serie o película de animación japonesa |
| `manga` | Cómic o novela gráfica japonesa |
| `game` | Videojuego |

### `entry_status`

Define el estado de seguimiento de una entrada.

| Valor | Descripción |
|---|---|
| `watching` | En progreso (viendo / leyendo / jugando) |
| `completed` | Finalizado |
| `on_hold` | En pausa |
| `dropped` | Abandonado |
| `plan_to_watch` | Pendiente (en la lista de "quiero ver/leer/jugar") |

Los enums se definen como tipos nativos de PostgreSQL y como `Enum` de Python usando SQLAlchemy para mantener consistencia en ambas capas.

---

## Índices y Restricciones de Unicidad

| Tabla | Nombre del Índice / Restricción | Columnas | Tipo | Justificación |
|---|---|---|---|---|
| `users` | `ix_users_email` | `email` | UNIQUE INDEX | Lookup ultrarrápido en login y garantía de unicidad. |
| `users` | `ix_users_provider_provider_id` | `provider`, `provider_id` | UNIQUE PARTIAL INDEX | Unicidad para cuentas vinculadas a OAuth (donde `provider_id IS NOT NULL`). |
| `entries` | `uq_entries_user_title_type` | `user_id`, `title`, `type` | UNIQUE CONSTRAINT | Evita que un mismo usuario duplique una entrada del mismo tipo. |
| `entries` | `ix_entries_user_id_created_at` | `user_id`, `created_at` | COMPOSITE INDEX | Optimiza los listados paginados ordenados por fecha de creación descendente. |
| `entries` | `ix_entries_user_id` | `user_id` | INDEX | Acelera búsquedas y cargas relacionadas por usuario. |

---

## Estrategia de migraciones con Alembic

Alembic gestiona los cambios de esquema de forma incremental. Cada cambio genera un archivo de migración versionado que puede aplicarse hacia adelante (`upgrade`) o deshacerse (`downgrade`).

### Comandos principales

```bash
# Desde apps/api/

# Generar una nueva migración automáticamente comparando modelos con el esquema actual
alembic revision --autogenerate -m "descripcion_corta_del_cambio"

# Aplicar todas las migraciones pendientes
alembic upgrade head

# Deshacer la última migración
alembic downgrade -1

# Ver el historial de migraciones
alembic history --verbose

# Ver la revisión actual aplicada en la BD
alembic current
```

### Convención de nombres para migraciones

El mensaje de revisión debe ser descriptivo y seguir el formato `verbo_sustantivo`:

```
create_users_table
add_status_column_to_entries
add_index_entries_user_id
rename_type_to_entry_type
```

Alembic genera el nombre del archivo con el formato `<timestamp>_<mensaje>.py`, por ejemplo: `2024_01_15_1430_create_users_table.py`.

### Regla importante

Nunca modificar manualmente una migración ya aplicada en producción. Si se necesita corregir un error, generar una nueva migración que aplique la corrección.
