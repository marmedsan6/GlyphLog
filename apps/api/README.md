# GlyphLog API

Backend de GlyphLog. API REST construida con FastAPI para gestionar la colección multimedia del usuario.

## Stack

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Python | 3.11+ | Lenguaje |
| FastAPI | 0.110+ | Framework web |
| Pydantic | 2+ | Validación de datos |
| SQLAlchemy | 2+ | ORM |
| Alembic | latest | Migraciones de BD |
| PostgreSQL | 16+ | Base de datos |

## Estructura prevista

```
apps/api/
├── app/
│   ├── routers/       # Endpoints agrupados por recurso
│   ├── services/      # Lógica de negocio
│   ├── repositories/  # Acceso a base de datos
│   ├── schemas/       # Modelos Pydantic (request/response)
│   ├── models/        # Modelos SQLAlchemy
│   ├── core/          # Config, seguridad, dependencias
│   └── main.py        # Entrada de la aplicación
├── alembic/           # Migraciones
├── tests/             # Tests unitarios e integración
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Estado

> ⏳ Pendiente de scaffold. Ver [backlog](../../docs/tasks/backlog.md).

## Próximos pasos

- [ ] Inicializar estructura FastAPI
- [ ] Configurar SQLAlchemy + Alembic
- [ ] Crear modelo User
- [ ] Crear modelo Entry
- [ ] Dockerizar
