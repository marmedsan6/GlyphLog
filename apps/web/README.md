# GlyphLog Web

Frontend de GlyphLog. Aplicación web para registrar, organizar y seguir animes, mangas y videojuegos.

## Stack

| Tecnología | Versión | Rol |
|------------|---------|-----|
| React | 18+ | UI framework |
| Vite | 5+ | Build tool y dev server |
| TypeScript | 5+ | Tipado estático |
| Tailwind CSS | 3+ | Utilidades CSS |
| shadcn/ui | latest | Componentes accesibles |
| React Router | 6+ | Routing |

## Estructura prevista

```
apps/web/
├── src/
│   ├── components/    # Componentes reutilizables
│   ├── pages/         # Páginas / vistas
│   ├── hooks/         # Custom hooks
│   ├── services/      # Llamadas a la API
│   ├── types/         # Tipos TypeScript
│   ├── utils/         # Utilidades
│   └── lib/           # Configuración de librerías
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

## Estado

> ⏳ Pendiente de scaffold. Ver [backlog](../../docs/tasks/backlog.md).

## Próximos pasos

- [ ] Inicializar proyecto Vite con template React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Instalar y configurar shadcn/ui
- [ ] Configurar React Router
- [ ] Crear layout base
