# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack, requires node-compat.cjs shim)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
npm run setup        # Install deps + prisma generate + prisma migrate dev (first-time setup)
npm run db:reset     # Force reset Prisma database
```

To run a single test file: `npx vitest run src/path/to/test.ts`

## Architecture Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates them via tool calls that update a **Virtual File System (VFS)**, which is then rendered in an iframe.

### Virtual File System

`/src/lib/file-system.ts` — in-memory VFS that never writes to disk. All generated code lives here. It's serialized as JSON and sent with every `/api/chat` request so Claude always has the current file state. The VFS is managed via `FileSystemContext` (`/src/lib/contexts/file-system-context.tsx`).

### AI Integration

**API route**: `POST /api/chat` (`/src/app/api/chat/route.ts`)
- Uses Vercel AI SDK (`streamText`) with Anthropic's Claude Haiku 4.5
- System prompt is cache-controlled (Anthropic ephemeral prompt caching for cost/latency)
- Max 10,000 tokens, 40 tool-use steps per request
- On completion: saves project to DB if user is authenticated

**Tools** (`/src/lib/tools/`):
- `str_replace_editor`: view, create, str_replace, insert in VFS files
- `file_manager`: rename and delete VFS files

**Mock mode**: Automatically activates when `ANTHROPIC_API_KEY` is missing. Configured in `/src/lib/provider.ts`.

### State Management

Two primary React contexts:
- **ChatContext** (`/src/lib/contexts/chat-context.tsx`): Conversation state via `@ai-sdk/react`'s `useChat` hook
- **FileSystemContext** (`/src/lib/contexts/file-system-context.tsx`): VFS state; file changes trigger re-renders via a refresh signal integer

### JSX Preview Pipeline

`/src/lib/transform/jsx-transformer.ts` — Babel (client-side, `@babel/standalone`) transforms generated JSX, then creates an import map pointing to esm.sh CDN. Output is injected into an iframe (`/src/components/preview/PreviewFrame.tsx`) for safe, sandboxed execution.

### Layout

Resizable panel layout in `/src/app/main-content.tsx`:
- **Left (35%)**: Chat (MessageList + MessageInput)
- **Right (65%)**: Toggle between Preview (iframe) and Code (FileTree + Monaco Editor)

### Database

Prisma + SQLite (`prisma/dev.db`).

**Models**:
- `User`: id, email, password
- `Project`: id, name, userId (nullable — anonymous projects allowed), messages (JSON), data (JSON)

Prisma client is auto-generated into `/src/generated/`. Run `npx prisma generate` after schema changes.

### Authentication

JWT sessions (`/src/lib/auth.ts`) — HS256, 7-day expiry, stored in httpOnly cookies. Middleware (`/src/middleware.ts`) protects `/api/projects` and `/api/filesystem`. Projects can exist without a user (anonymous work tracked in `/src/lib/anon-work-tracker.ts`).

### Server Actions

`/src/actions/` — server-side functions for user/project CRUD (`getUser`, `getProjects`, `createProject`, `getProject`).

### Key Files

| File | Purpose |
|---|---|
| `src/app/api/chat/route.ts` | Core AI endpoint |
| `src/lib/file-system.ts` | VFS implementation |
| `src/lib/provider.ts` | Model selection (real vs mock) |
| `src/lib/prompts/` | System prompts sent to Claude |
| `src/lib/tools/` | AI tool definitions |
| `src/lib/transform/jsx-transformer.ts` | JSX → iframe HTML pipeline |
| `prisma/schema.prisma` | DB schema |

## Testing

Vitest with jsdom. Test files live in `__tests__` folders alongside source. Uses `@testing-library/react`.
