# Claude Code Agents & Skills Collection

Repositorio de agentes y skills personalizados para Claude Code. Proporciona capacidades especializadas para desarrollo de software, testing, documentos y mejores practicas.

---

## Agents

| Agente | Descripcion |
|--------|-------------|
| **golang-pro** | Agente para construir aplicaciones Go con Clean Architecture, programacion concurrente, microservicios y sistemas de alto rendimiento. Soporta Echo, GORM, Kafka y patrones idiomaticos de Go. |
| **golang-ginkgo-tester** | Especialista en testing de Go usando el framework Ginkgo, Gomock y sqlmock. Crea suites de tests completas para servicios, repositorios y handlers HTTP. |
| **shadcn-ui-expert** | Experto en diseño e implementacion de componentes UI con shadcn/ui. Cubre layouts responsivos, formularios accesibles, dashboards y composicion de componentes. |

---

## Skills

### `frontend/` — Frontend & UI

| Skill | Descripcion |
|-------|-------------|
| **react-19** | Patrones de React 19 con React Compiler y optimizacion automatica sin useMemo/useCallback. |
| **nextjs-15** | Patrones de Next.js 15 App Router: routing, Server Actions y data fetching. |
| **nextjs-ui-builder** | Construccion de componentes UI production-ready con Next.js 15, shadcn/ui, Tailwind CSS 4 y React Hook Form. |
| **tailwind-4** | Patrones y mejores practicas de Tailwind CSS 4 incluyendo cn() y variables de tema. |
| **zustand-5** | Patrones de state management con Zustand 5 para React. |
| **zod-4** | Validacion de esquemas con Zod 4, patrones y breaking changes desde v3. |
| **ai-sdk-5** | Patrones del Vercel AI SDK 5 y breaking changes desde v4. |
| **typescript** | Patrones estrictos de TypeScript: tipos, interfaces y generics. |
| **vercel-react-best-practices** | Guias de optimizacion de rendimiento para React y Next.js del equipo de ingenieria de Vercel. |
| **angular/core** | Patrones core de Angular: standalone components, signals, inject, control flow y zoneless. |
| **angular/architecture** | Arquitectura Angular: scope rule, estructura de proyecto y convenciones de nombrado. |
| **angular/forms** | Formularios en Angular: Signal Forms (experimental) y Reactive Forms. |
| **angular/performance** | Optimizacion de rendimiento Angular: NgOptimizedImage, @defer, lazy loading y SSR. |

### `backend/` — Backend

| Skill | Descripcion |
|-------|-------------|
| **golang-expert** | Desarrollo backend en Go con Clean Architecture, principios SOLID y patrones idiomaticos. |
| **django-drf** | Patrones de Django REST Framework: ViewSets, Serializers y Filters. |

### `testing/` — Testing

| Skill | Descripcion |
|-------|-------------|
| **playwright** | Testing E2E con Playwright: Page Objects, selectores y flujo MCP. |
| **pytest** | Patrones de testing con Pytest para Python: fixtures, mocking y markers. |

### `documents/` — Documentos

| Skill | Descripcion |
|-------|-------------|
| **docx** | Creacion y edicion de documentos .docx con tracked changes y comentarios. |
| **pdf** | Manipulacion de PDFs: extraccion de texto/tablas, creacion, merge/split y formularios. |
| **pptx** | Creacion y edicion de presentaciones .pptx con layouts y speaker notes. |
| **xlsx** | Hojas de calculo: formulas, formato y visualizacion de datos. |

### `devops/` — DevOps & Integraciones

| Skill | Descripcion |
|-------|-------------|
| **github-pr** | Creacion de Pull Requests de alta calidad con conventional commits y descripciones adecuadas. |
| **jira-epic** | Creacion de epics en Jira siguiendo formato estandar. |
| **jira-task** | Creacion de tareas en Jira siguiendo formato estandar. |
| **mcp-builder** | Guia para crear servidores MCP de alta calidad para integrar servicios y APIs externas. |

### `superpowers/` — Metodologias y Workflows

| Skill | Descripcion |
|-------|-------------|
| **brainstorming** | Dialogo colaborativo para explorar intencion, requisitos y diseño antes de implementar. |
| **writing-plans** | Creacion de planes de implementacion detallados a partir de specs o requisitos, antes de tocar codigo. |
| **executing-plans** | Ejecucion de planes de implementacion escritos con checkpoints de revision. |
| **subagent-driven-development** | Ejecucion de planes despachando un subagente por tarea con revision en dos etapas (spec + calidad). |
| **dispatching-parallel-agents** | Despacho de agentes paralelos para tareas independientes sin estado compartido. |
| **test-driven-development** | Flujo TDD: escribir test, verlo fallar, escribir codigo minimo para pasar. |
| **systematic-debugging** | Debugging sistematico: encontrar la causa raiz antes de intentar fixes. |
| **verification-before-completion** | Verificacion obligatoria con evidencia antes de declarar trabajo completado. |
| **finishing-a-development-branch** | Guia para completar trabajo en rama: merge, PR o cleanup. |
| **using-git-worktrees** | Creacion de worktrees Git aislados para trabajo en features sin afectar el workspace actual. |
| **writing-skills** | Creacion y edicion de skills con enfoque TDD aplicado a documentacion de procesos. |
| **using-superpowers** | Skill base que establece como encontrar y usar otros skills automaticamente. |

### `meta/` — Productividad & Meta

| Skill | Descripcion |
|-------|-------------|
| **find-skills** | Descubrimiento e instalacion de skills del ecosistema abierto de agent skills. |
| **prompt-engineering-patterns** | Tecnicas avanzadas de prompt engineering para rendimiento, fiabilidad y razonamiento estructurado de LLMs. |
| **skill-creator** | Guia para crear nuevos skills de agentes IA siguiendo la especificacion de Agent Skills. |

---

## Estructura del Repositorio

```
.
├── agents/                  # Agentes especializados de Claude Code
│   ├── golang-pro.md
│   ├── golang-ginkgo-tester.md
│   └── shadcn-ui-expert.md
└── SKILLS/
    ├── frontend/                # Frontend & UI
    │   ├── angular/
    │   │   ├── architecture/
    │   │   ├── core/
    │   │   ├── forms/
    │   │   └── performance/
    │   ├── ai-sdk-5/
    │   ├── nextjs-15/
    │   ├── nextjs-ui-builder/
    │   ├── react-19/
    │   ├── tailwind-4/
    │   ├── typescript/
    │   ├── vercel-react-best-practices/
    │   ├── zod-4/
    │   └── zustand-5/
    ├── backend/                 # Backend
    │   ├── golang-expert/
    │   └── django-drf/
    ├── testing/                 # Testing
    │   ├── playwright/
    │   └── pytest/
    ├── documents/               # Documentos
    │   ├── docx/
    │   ├── pdf/
    │   ├── pptx/
    │   └── xlsx/
    ├── devops/                  # DevOps & Integraciones
    │   ├── github-pr/
    │   ├── jira-epic/
    │   ├── jira-task/
    │   └── mcp-builder/
    ├── superpowers/             # Metodologias y Workflows
    │   ├── brainstorming/
    │   ├── dispatching-parallel-agents/
    │   ├── executing-plans/
    │   ├── finishing-a-development-branch/
    │   ├── subagent-driven-development/
    │   ├── systematic-debugging/
    │   ├── test-driven-development/
    │   ├── using-git-worktrees/
    │   ├── using-superpowers/
    │   ├── verification-before-completion/
    │   ├── writing-plans/
    │   └── writing-skills/
    └── meta/                    # Productividad & Meta
        ├── find-skills/
        ├── prompt-engineering-patterns/
        └── skill-creator/
```

## Uso

### Instalar agentes

Copiar los archivos `.md` de `agents/` en tu directorio de agentes de Claude Code:

```bash
cp agents/*.md ~/.claude/agents/
```

### Instalar skills

Copiar los directorios de skills en tu directorio de skills de Claude Code:

```bash
cp -r SKILLS/* ~/.claude/skills/
```

### Ejemplos de uso (una vez instalados)

Dentro de Claude Code, usa `/skill-name` seguido de tu instruccion:

```
> /brainstorming Quiero hacer un dashboard de metricas para el equipo de ventas

  Claude te hara preguntas para refinar la idea antes de escribir codigo:
  - Que metricas necesitas? (revenue, conversiones, churn...)
  - Que stack usas? (Next.js, Angular, etc.)
  - Necesitas datos en tiempo real o reportes diarios?
  Una vez alineado el diseño, recien ahi comienza la implementacion.
```

```
> /github-pr Crea un PR con los cambios de esta rama

  Claude analiza los commits, genera titulo y descripcion, y crea el PR
  con resumen, test plan y labels apropiados.
```

```
> /writing-plans Necesito implementar autenticacion con JWT en el API de Go

  Claude genera un plan paso a paso: archivos a crear/modificar,
  dependencias necesarias, orden de implementacion y como testear cada parte.
```

```
> /playwright Agrega tests E2E para el flujo de checkout

  Claude crea los tests con Page Objects, selectores accesibles
  y assertions siguiendo las mejores practicas de Playwright.
```

```
> /systematic-debugging Los tests de integracion fallan intermitentemente

  Claude investiga la causa raiz sistematicamente antes de proponer fixes:
  reproduce el error, analiza logs, identifica race conditions o state leaks.
```

```
> /golang-expert Refactoriza el servicio de notificaciones con Clean Architecture

  Claude revisa el codigo actual, identifica violaciones de SOLID
  y propone la nueva estructura antes de implementar.
```

**Los agentes se invocan automaticamente.** No necesitas usar `/`, Claude Code detecta la tarea y despacha al agente adecuado:

```
> Agrega un endpoint GET /users/:id al proyecto Go
  → invoca automaticamente el agente golang-pro

> Crea tests para el UserRepository
  → invoca automaticamente el agente golang-ginkgo-tester

> Construye un formulario de login con shadcn
  → invoca automaticamente el agente shadcn-ui-expert
```

**Los skills tambien pueden activarse por contexto.** Por ejemplo, al trabajar en un archivo `.tsx` con imports de Next.js, los skills `react-19`, `nextjs-15` o `vercel-react-best-practices` se aplican automaticamente.
