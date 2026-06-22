# Conocimiento Backend — GlyphLog

> Conocimiento acumulado sobre la capa backend del proyecto (`apps/api`).
> Este archivo se irá completando durante el desarrollo. Por ahora es un placeholder estructurado.
> Actualizar al resolver problemas técnicos relevantes o establecer patrones específicos del backend.

---

## Decisiones de setup

> Estado: pendiente de scaffold de `apps/api`.

Cuando se complete el scaffold, documentar aquí:

- Versión exacta de FastAPI, SQLAlchemy y Alembic
- Gestión de dependencias Python (pip + `requirements.txt` o Poetry)
- Cómo está configurada la sesión de base de datos (sync vs async, `get_db` dependency)
- Configuración de Alembic (`alembic.ini`, `env.py`)
- Variables de entorno requeridas y cómo cargarlas (python-dotenv, pydantic-settings)
- Middleware configurado (CORS, logging, etc.)
- Estructura del sistema de autenticación cuando se implemente

---

## Endpoints implementados

> Estado: ninguno todavía. El scaffold de `apps/api` está pendiente.

Cuando se implementen endpoints, documentar aquí los relevantes:

```
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| —      | —    | —           | —              |
```

---

## Modelos de base de datos

> Estado: ninguno todavía. Pendiente de primera migración.

Cuando se definan modelos SQLAlchemy, documentar aquí su estructura:

```
| Modelo | Tabla | Campos principales | Relaciones |
|--------|-------|-------------------|------------|
| —      | —     | —                 | —          |
```

---

## Problemas conocidos

> Estado: ninguno todavía.

Cuando se encuentren problemas técnicos en el backend (bugs de librerías, comportamientos inesperados de SQLAlchemy, edge cases de FastAPI), documentarlos aquí con su solución o estado.

---

## Tips y aprendizajes

> Estado: vacío. Se irá completando durante el desarrollo.

Ejemplos de lo que se documenta aquí:

- Cómo gestionar la sesión de SQLAlchemy en tests (fixtures, rollback)
- Cómo configurar correctamente CORS para el frontend en desarrollo
- Cómo usar `pydantic-settings` para manejar variables de entorno con tipado
- Comportamiento de Alembic con enums de PostgreSQL al hacer downgrade

---

*Este archivo se irá completando durante el desarrollo. Actualizarlo al finalizar cada sesión de trabajo relevante para el backend.*
