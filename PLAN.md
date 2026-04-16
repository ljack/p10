# Development Plan - Note-Taking App

## Overview

This document outlines the technical implementation plan for the note-taking application, including architecture decisions, database design, and phased delivery schedule.

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  React Web   │    │ React Native │    │ React Native │              │
│  │  Application │    │  iOS App     │    │ Android App  │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                    ┌────────┴────────┐                                  │
│                    │  Shared State   │                                  │
│                    │  (React Query)  │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ HTTPS/WSS
┌─────────────────────────────┼───────────────────────────────────────────┐
│                       API GATEWAY                                        │
├─────────────────────────────┼───────────────────────────────────────────┤
│                    ┌────────┴────────┐                                  │
│                    │   Nginx/ALB     │                                  │
│                    │  Load Balancer  │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────────┐
│                      APPLICATION LAYER                                   │
├─────────────────────────────┼───────────────────────────────────────────┤
│                             │                                           │
│  ┌──────────────────────────┴──────────────────────────┐               │
│  │                   Node.js / Express                  │               │
│  │                    REST API Server                   │               │
│  ├──────────────────────────────────────────────────────┤               │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │               │
│  │  │  Auth   │ │  Notes  │ │ Search  │ │  Users  │   │               │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │   │               │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │               │
│  └──────────────────────────────────────────────────────┘               │
│                             │                                           │
│  ┌──────────────────────────┴──────────────────────────┐               │
│  │              WebSocket Server (Socket.io)            │               │
│  │           Real-time sync & collaboration             │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────────┐
│                        DATA LAYER                                        │
├─────────────────────────────┼───────────────────────────────────────────┤
│                             │                                           │
│  ┌──────────────┐    ┌──────┴───────┐    ┌──────────────┐              │
│  │ PostgreSQL   │    │    Redis     │    │  S3/MinIO    │              │
│  │  Database    │◄───┤    Cache     │    │ File Storage │              │
│  │              │    │              │    │              │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend (React Web Application)
```
Framework:        React 18+ with TypeScript
State Management: React Query (TanStack Query) + Zustand
Routing:          React Router v6
UI Components:    Tailwind CSS + Headless UI
Rich Text Editor: Tiptap (ProseMirror-based)
Build Tool:       Vite
Testing:          Vitest + React Testing Library + Playwright
```

#### Backend (REST API)
```
Runtime:          Node.js 20 LTS
Framework:        Express.js with TypeScript
Authentication:   Passport.js + JWT
Validation:       Zod
ORM:              Prisma
Real-time:        Socket.io
API Docs:         OpenAPI/Swagger
Testing:          Jest + Supertest
```

#### Database & Storage
```
Primary DB:       PostgreSQL 15+
Caching:          Redis 7+
Search:           PostgreSQL Full-Text Search (upgradeable to Elasticsearch)
File Storage:     AWS S3 / MinIO (self-hosted option)
```

#### DevOps & Infrastructure
```
Containerization: Docker + Docker Compose
CI/CD:            GitHub Actions
Hosting:          AWS (ECS/EKS) or Railway/Render
Monitoring:       Prometheus + Grafana
Logging:          Winston + ELK Stack
```

---

## REST API Design

### Base URL
```
Production:  https://api.noteapp.com/v1
Development: http://localhost:3000/api/v1
```

### Authentication Endpoints
```
POST   /auth/register          Register new user
POST   /auth/login             User login (returns JWT)
POST   /auth/logout            User logout (invalidate token)
POST   /auth/refresh           Refresh access token
POST   /auth/forgot-password   Request password reset
POST   /auth/reset-password    Reset password with token
GET    /auth/me                Get current user profile
```

### Notes Endpoints
```
GET    /notes                  List all notes (paginated)
POST   /notes                  Create new note
GET    /notes/:id              Get note by ID
PUT    /notes/:id              Update note
DELETE /notes/:id              Soft delete note (move to trash)

GET    /notes/:id/versions     Get note version history
GET    /notes/:id/versions/:v  Get specific version
POST   /notes/:id/restore      Restore note from trash

POST   /notes/:id/share        Share note with users
DELETE /notes/:id/share/:uid   Remove share access
GET    /notes/:id/collaborators List note collaborators
```

### Search Endpoints
```
GET    /search                 Full-text search notes
       ?q=query                Search query
       &tags=tag1,tag2         Filter by tags
       &from=2024-01-01        Date range start
       &to=2024-12-31          Date range end
       &sort=relevance|date    Sort order
       &page=1&limit=20        Pagination
```

### Tags Endpoints
```
GET    /tags                   List all user tags
POST   /tags                   Create new tag
PUT    /tags/:id               Update tag
DELETE /tags/:id               Delete tag
GET    /tags/:id/notes         Get notes by tag
```

### Folders Endpoints
```
GET    /folders                List all folders
POST   /folders                Create new folder
PUT    /folders/:id            Update folder
DELETE /folders/:id            Delete folder
GET    /folders/:id/notes      Get notes in folder
```

### User Endpoints
```
GET    /users/profile          Get user profile
PUT    /users/profile          Update user profile
PUT    /users/password         Change password
DELETE /users/account          Delete user account
GET    /users/settings         Get user settings
PUT    /users/settings         Update user settings
```

### API Response Format
```json
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "NOTE_NOT_FOUND",
    "message": "The requested note does not exist",
    "details": { ... }
  }
}
```

---

## Database Schema

### Entity Relationship Diagram
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │     notes       │       │     tags        │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │    ┌──│ id (PK)         │
│ email           │  │    │ user_id (FK)    │◄───┘  │ user_id (FK)    │
│ password_hash   │  │    │ folder_id (FK)  │       │ name            │
│ name            │  └───►│ title           │       │ color           │
│ avatar_url      │       │ content         │       │ created_at      │
│ settings        │       │ content_text    │       └────────┬────────┘
│ created_at      │       │ is_deleted      │                │
│ updated_at      │       │ deleted_at      │                │
└────────┬────────┘       │ is_pinned       │       ┌────────┴────────┐
         │                │ created_at      │       │   note_tags     │
         │                │ updated_at      │       ├─────────────────┤
         │                └────────┬────────┘       │ note_id (FK)    │
         │                         │                │ tag_id (FK)     │
         │                         │                └─────────────────┘
         │                         │
         │                ┌────────┴────────┐
         │                │ note_versions   │
         │                ├─────────────────┤
         │                │ id (PK)         │
         │                │ note_id (FK)    │
         │                │ version         │
         │                │ title           │
         │                │ content         │
         │                │ created_at      │
         │                │ created_by (FK) │
         │                └─────────────────┘
         │
         │                ┌─────────────────┐
         │                │    folders      │
         │                ├─────────────────┤
         └───────────────►│ id (PK)         │
                          │ user_id (FK)    │
                          │ parent_id (FK)  │──┐ (self-reference)
                          │ name            │◄─┘
                          │ color           │
                          │ position        │
                          │ created_at      │
                          │ updated_at      │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  note_shares    │       │  attachments    │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ note_id (FK)    │       │ note_id (FK)    │
│ user_id (FK)    │       │ user_id (FK)    │
│ permission      │       │ filename        │
│ created_at      │       │ file_path       │
│ created_by (FK) │       │ file_size       │
└─────────────────┘       │ mime_type       │
                          │ created_at      │
                          └─────────────────┘
```

### SQL Schema Definitions

```sql
-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    settings        JSONB DEFAULT '{}',
    email_verified  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Folders table
CREATE TABLE folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES folders(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7) DEFAULT '#6B7280',
    position        INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);

-- Notes table
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id       UUID REFERENCES folders(id) ON DELETE SET NULL,
    title           VARCHAR(500),
    content         JSONB NOT NULL DEFAULT '{}',    -- Rich text as JSON (Tiptap format)
    content_text    TEXT,                            -- Plain text for search
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE,
    is_pinned       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full-text search vector
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(content_text, '')), 'B')
    ) STORED
);

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_deleted ON notes(is_deleted);
CREATE INDEX idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

-- Tags table
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    color           VARCHAR(7) DEFAULT '#3B82F6',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user ON tags(user_id);

-- Note-Tags junction table
CREATE TABLE note_tags (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_note ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);

-- Note versions table (for history)
CREATE TABLE note_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    title           VARCHAR(500),
    content         JSONB NOT NULL,
    content_text    TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(note_id, version)
);

CREATE INDEX idx_note_versions_note ON note_versions(note_id);

-- Note shares table (for collaboration)
CREATE TABLE note_shares (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission      VARCHAR(20) NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(note_id, user_id)
);

CREATE INDEX idx_note_shares_note ON note_shares(note_id);
CREATE INDEX idx_note_shares_user ON note_shares(user_id);

-- Attachments table
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_note ON attachments(note_id);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  name          String
  avatarUrl     String?   @map("avatar_url")
  settings      Json      @default("{}")
  emailVerified Boolean   @default(false) @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  notes          Note[]
  folders        Folder[]
  tags           Tag[]
  attachments    Attachment[]
  refreshTokens  RefreshToken[]
  sharedNotes    NoteShare[]    @relation("SharedWith")
  createdShares  NoteShare[]    @relation("CreatedBy")
  noteVersions   NoteVersion[]

  @@map("users")
}

model Folder {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  parentId  String?  @map("parent_id")
  name      String
  color     String   @default("#6B7280")
  position  Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent   Folder?   @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children Folder[]  @relation("FolderHierarchy")
  notes    Note[]

  @@map("folders")
}

model Note {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  folderId    String?   @map("folder_id")
  title       String?
  content     Json      @default("{}")
  contentText String?   @map("content_text")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")
  isPinned    Boolean   @default(false) @map("is_pinned")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  folder      Folder?       @relation(fields: [folderId], references: [id], onDelete: SetNull)
  tags        NoteTag[]
  versions    NoteVersion[]
  shares      NoteShare[]
  attachments Attachment[]

  @@map("notes")
}

model Tag {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  color     String   @default("#3B82F6")
  createdAt DateTime @default(now()) @map("created_at")

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes NoteTag[]

  @@unique([userId, name])
  @@map("tags")
}

model NoteTag {
  noteId    String   @map("note_id")
  tagId     String   @map("tag_id")
  createdAt DateTime @default(now()) @map("created_at")

  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([noteId, tagId])
  @@map("note_tags")
}

model NoteVersion {
  id          String   @id @default(uuid())
  noteId      String   @map("note_id")
  version     Int
  title       String?
  content     Json
  contentText String?  @map("content_text")
  createdAt   DateTime @default(now()) @map("created_at")
  createdBy   String?  @map("created_by")

  note User? @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  Note Note  @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@unique([noteId, version])
  @@map("note_versions")
}

model NoteShare {
  id         String   @id @default(uuid())
  noteId     String   @map("note_id")
  userId     String   @map("user_id")
  permission String   @default("read")
  createdAt  DateTime @default(now()) @map("created_at")
  createdById String? @map("created_by")

  note      Note  @relation(fields: [noteId], references: [id], onDelete: Cascade)
  user      User  @relation("SharedWith", fields: [userId], references: [id], onDelete: Cascade)
  createdBy User? @relation("CreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  @@unique([noteId, userId])
  @@map("note_shares")
}

model Attachment {
  id        String   @id @default(uuid())
  noteId    String   @map("note_id")
  userId    String   @map("user_id")
  filename  String
  filePath  String   @map("file_path")
  fileSize  BigInt   @map("file_size")
  mimeType  String   @map("mime_type")
  createdAt DateTime @default(now()) @map("created_at")

  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("attachments")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @map("token_hash")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal**: Set up project infrastructure and core backend

#### Week 1: Project Setup
- [ ] Initialize monorepo structure (Turborepo or Nx)
- [ ] Set up backend project with Express + TypeScript
- [ ] Set up frontend project with Vite + React + TypeScript
- [ ] Configure ESLint, Prettier, and Husky
- [ ] Set up Docker Compose for local development
- [ ] Initialize PostgreSQL database with schema
- [ ] Configure CI/CD pipeline (GitHub Actions)

#### Week 2: Authentication System
- [ ] Implement user registration endpoint
- [ ] Implement user login with JWT
- [ ] Set up refresh token rotation
- [ ] Add password hashing (bcrypt)
- [ ] Create auth middleware for protected routes
- [ ] Implement logout functionality
- [ ] Add basic rate limiting

#### Week 3: Core Data Models
- [ ] Set up Prisma ORM with migrations
- [ ] Create CRUD services for Users
- [ ] Create CRUD services for Notes
- [ ] Create CRUD services for Folders
- [ ] Create CRUD services for Tags
- [ ] Add input validation with Zod
- [ ] Write unit tests for services

### Phase 2: Core Features (Weeks 4-6)
**Goal**: Implement note management and basic UI

#### Week 4: Notes API
- [ ] GET /notes - List notes with pagination
- [ ] POST /notes - Create new note
- [ ] GET /notes/:id - Get single note
- [ ] PUT /notes/:id - Update note
- [ ] DELETE /notes/:id - Soft delete note
- [ ] Implement note versioning
- [ ] Add note restore from trash
- [ ] API integration tests

#### Week 5: Frontend Foundation
- [ ] Set up React Router navigation
- [ ] Create authentication pages (login/register)
- [ ] Implement auth context and protected routes
- [ ] Build main application layout
- [ ] Create note list component
- [ ] Build note card component
- [ ] Implement loading and error states

#### Week 6: Note Editor
- [ ] Integrate Tiptap editor
- [ ] Implement rich text formatting toolbar
- [ ] Add markdown support
- [ ] Create auto-save functionality
- [ ] Build note metadata panel (tags, folder)
- [ ] Implement note creation flow
- [ ] Build note editing view

### Phase 3: Search & Organization (Weeks 7-9)
**Goal**: Add search, filtering, and organization features

#### Week 7: Search Implementation
- [ ] Implement PostgreSQL full-text search
- [ ] Create search API endpoint
- [ ] Add search filters (date, tags)
- [ ] Build search results ranking
- [ ] Create search UI component
- [ ] Implement search highlighting
- [ ] Add recent searches feature

#### Week 8: Tags & Folders
- [ ] Tags CRUD API endpoints
- [ ] Folders CRUD API endpoints
- [ ] Folder hierarchy support
- [ ] Tag management UI
- [ ] Folder tree navigation
- [ ] Drag-and-drop organization
- [ ] Bulk note operations

#### Week 9: Filtering & Views
- [ ] List/Grid view toggle
- [ ] Sort options (date, title, modified)
- [ ] Filter by tags
- [ ] Filter by date range
- [ ] Favorites/pinned notes
- [ ] Trash view with restore
- [ ] Empty states and onboarding

### Phase 4: Polish & Launch (Weeks 10-12)
**Goal**: Finalize MVP features and prepare for launch

#### Week 10: Performance & UX
- [ ] Implement React Query caching
- [ ] Add optimistic updates
- [ ] Infinite scroll for note list
- [ ] Keyboard shortcuts
- [ ] Responsive design polish
- [ ] Dark mode support
- [ ] Loading skeletons

#### Week 11: Testing & Security
- [ ] End-to-end tests with Playwright
- [ ] Security audit and fixes
- [ ] Input sanitization
- [ ] CSRF protection
- [ ] Rate limiting refinement
- [ ] Error handling improvements
- [ ] Logging and monitoring setup

#### Week 12: Deployment & Launch
- [ ] Production environment setup
- [ ] Database migration to production
- [ ] SSL/TLS configuration
- [ ] CDN setup for static assets
- [ ] Monitoring dashboards
- [ ] Backup procedures
- [ ] Documentation completion
- [ ] Beta testing and bug fixes

---

## Development Timeline

```
Week  1 ████████ Project Setup & Infrastructure
Week  2 ████████ Authentication System
Week  3 ████████ Core Data Models & Services
Week  4 ████████ Notes API Development
Week  5 ████████ Frontend Foundation
Week  6 ████████ Note Editor Implementation
Week  7 ████████ Search Functionality
Week  8 ████████ Tags & Folders
Week  9 ████████ Filtering & Views
Week 10 ████████ Performance & UX Polish
Week 11 ████████ Testing & Security
Week 12 ████████ Deployment & Launch

        ├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
        Phase 1           Phase 2           Phase 3           Phase 4
        Foundation        Core Features     Search & Org      Polish & Launch
```

### Milestones

| Milestone | Target Date | Deliverables |
|-----------|-------------|--------------|
| **M1: Backend Ready** | End of Week 3 | Auth system, database, core APIs |
| **M2: Basic App** | End of Week 6 | Working note CRUD with editor |
| **M3: Feature Complete** | End of Week 9 | Search, tags, folders, filters |
| **M4: MVP Launch** | End of Week 12 | Production deployment, documentation |

---

## Project Structure

```
noteapp/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── config/         # Configuration files
│   │   │   ├── controllers/    # Route handlers
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── models/         # Prisma models
│   │   │   ├── routes/         # API routes
│   │   │   ├── services/       # Business logic
│   │   │   ├── utils/          # Helper functions
│   │   │   ├── validators/     # Zod schemas
│   │   │   └── app.ts          # Express app setup
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── hooks/          # Custom hooks
│       │   ├── pages/          # Page components
│       │   ├── services/       # API client
│       │   ├── stores/         # Zustand stores
│       │   ├── styles/         # Global styles
│       │   ├── types/          # TypeScript types
│       │   └── utils/          # Helper functions
│       ├── tests/
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types & utilities
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
│
├── docs/
│   ├── api/                    # API documentation
│   └── guides/                 # User guides
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── turbo.json
├── package.json
└── README.md
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep | High | Medium | Strict MVP definition, feature freeze dates |
| Performance issues | Medium | Medium | Early load testing, caching strategy |
| Security vulnerabilities | High | Low | Security reviews, penetration testing |
| Technical debt | Medium | High | Code reviews, refactoring sprints |
| Team availability | High | Low | Cross-training, documentation |

---

## Definition of Done

A feature is considered complete when:
- [ ] Code is written and follows style guidelines
- [ ] Unit tests written with >80% coverage
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No critical or high-severity bugs
- [ ] Performance benchmarks met
- [ ] Accessibility requirements met
- [ ] Deployed to staging environment
- [ ] QA sign-off received