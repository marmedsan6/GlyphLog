# Conocimiento Base de Datos — GlyphLog

> Conocimiento acumulado sobre la base de datos PostgreSQL del proyecto.
> Este archivo se irá completando durante el desarrollo. Por ahora es un placeholder estructurado.
> Actualizar al aplicar migraciones, optimizar queries o resolver problemas de base de datos.

---

## Esquema actual

> Estado: pendiente de primera migración. No hay tablas definidas todavía.

Cuando se aplique la primera migración, documentar aquí el esquema:

```
| Tabla | Descripción | Columnas principales | Relaciones |
|-------|-------------|---------------------|------------|
| —     | —           | —                   | —          |
```

El esquema detallado en SQL vive en los modelos de SQLAlchemy en `apps/api/app/models/` y en los archivos de migración en `apps/api/alembic/versions/`.

---

## Migraciones aplicadas

> Estado: ninguna todavía. Alembic pendiente de configuración.

Cuando se apliquen migraciones, documentar aquí el historial:

```
| ID (revision) | Descripción | Fecha | Aplica |
|---------------|-------------|-------|--------|
| —             | —           | —     | —      |
```

Para ver el historial actualizado en tiempo real:

```bash
# Desde apps/api/
alembic history --verbose
alembic current
```

---

## Índices y optimizaciones

> Estado: ninguno todavía.

Cuando se añadan índices o se realicen optimizaciones de base de datos, documentarlos aquí:

```
| Tabla | Columna(s) | Tipo de índice | Razón |
|-------|-----------|----------------|-------|
| —     | —         | —              | —     |
```

---

## Queries frecuentes

> Estado: ninguna todavía.

Cuando se identifiquen queries frecuentes o importantes en el desarrollo, documentarlas aquí para referencia rápida:

```sql
-- Ejemplo de formato:
-- Descripción: qué hace esta query
-- SELECT * FROM entries WHERE user_id = $1 ORDER BY created_at DESC;
```

---

## Tips y aprendizajes

> Estado: vacío. Se irá completando durante el desarrollo.

Ejemplos de lo que se documenta aquí:

- Cómo manejar enums de PostgreSQL con SQLAlchemy y Alembic (los enums tienen comportamiento especial en downgrade)
- Cómo verificar que las constraints de foreign key están activas
- Cómo conectarse a la BD de desarrollo desde fuera de Docker para debugging
- Comandos útiles de psql para explorar el esquema

---

## Conexión a la base de datos

### Desarrollo local (Docker)

La base de datos de desarrollo corre en Docker. La connection string se define en las variables de entorno del proyecto.

```bash
# Variable de entorno (definida en .env, nunca en el repositorio)
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/glyphlog_dev
```

> La connection string real vive en el archivo `.env` local (no commitear al repositorio).

### Conectarse con psql

```bash
# Desde dentro del contenedor Docker
docker compose exec db psql -U glyphlog -d glyphlog_dev

# Comandos útiles de psql
\dt           -- listar tablas
\d nombre     -- describir una tabla
\l            -- listar bases de datos
\q            -- salir
```

---

*Este archivo se irá completando durante el desarrollo. Actualizarlo al aplicar migraciones o resolver problemas de base de datos.*
