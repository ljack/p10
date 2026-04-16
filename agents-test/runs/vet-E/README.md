# Vet Appointment Application

A full-stack veterinary appointment management system built with Clean Architecture.

## Project Structure

```
.
├── backend/              # Python FastAPI backend
│   ├── src/
│   │   ├── domain/       # Core business logic
│   │   ├── application/  # Use cases & CQRS
│   │   ├── infrastructure/  # Database & external services
│   │   └── presentation/    # API routes & DTOs
│   ├── requirements.txt
│   └── README.md
│
├── frontend/             # Svelte 5 + SvelteKit frontend
│   ├── src/
│   │   ├── lib/          # Reusable components
│   │   └── routes/       # Page routes
│   ├── package.json
│   └── README.md
│
└── AGENTS.md            # Architectural requirements
```

## Tech Stack

### Backend
- **Python 3.12+**
- **FastAPI** - Modern async web framework
- **SQLAlchemy** - ORM with async support
- **SQLite** - Database (aiosqlite)
- **Pydantic** - Data validation
- **slowapi** - Rate limiting
- **structlog** - Structured logging

### Frontend
- **Svelte 5** - Reactive UI framework
- **SvelteKit** - Application framework
- **TypeScript** - Type safety
- **XState** - State machine management
- **Vite** - Build tool

## Architecture

This project implements **Clean Architecture** with **Hexagonal Ports & Adapters** pattern:

### Layers (Backend)

1. **Domain** (Core Business Logic)
   - Entities with event sourcing
   - Value objects
   - Repository protocols (using Protocol, not ABC)
   - Factory protocols
   - Business rule strategies
   - Domain exceptions

2. **Application** (Use Cases)
   - CQRS (Commands & Queries)
   - Command/Query handlers
   - Mediator pattern
   - Application exceptions

3. **Infrastructure** (External Concerns)
   - SQLAlchemy repositories
   - Unit of Work implementation
   - Database models & mappers
   - Factory implementations

4. **Presentation** (API)
   - FastAPI routes
   - DTOs with HATEOAS links
   - Error handlers
   - Dependency injection

### Design Patterns

✅ **Repository Pattern** - All DB access through repositories  
✅ **Unit of Work** - Transaction management  
✅ **CQRS** - Separate read/write models  
✅ **Event Sourcing** - Domain events for state changes  
✅ **Mediator** - Command/query routing  
✅ **Factory** - Entity creation  
✅ **Strategy** - Business rules (e.g., clinic hours)  
✅ **Dependency Injection** - No direct layer coupling  

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Access:
- API: http://localhost:8000
- OpenAPI Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Access: http://localhost:5173

## API Endpoints

### Pets
- `POST /api/v1/pets` - Create pet
- `GET /api/v1/pets` - List pets (filter by owner_name)
- `GET /api/v1/pets/{id}` - Get pet details
- `PUT /api/v1/pets/{id}` - Update pet
- `DELETE /api/v1/pets/{id}` - Delete pet

### Treatments
- `POST /api/v1/treatments` - Create treatment
- `GET /api/v1/treatments` - List all treatments
- `GET /api/v1/treatments/{id}` - Get treatment details
- `PUT /api/v1/treatments/{id}` - Update treatment
- `DELETE /api/v1/treatments/{id}` - Delete treatment

### Appointments
- `POST /api/v1/appointments` - Book appointment
- `GET /api/v1/appointments` - List appointments (filter: date, pet_id, status)
- `GET /api/v1/appointments/{id}` - Get appointment details
- `PUT /api/v1/appointments/{id}` - Update appointment (reschedule, change status)
- `DELETE /api/v1/appointments/{id}` - Cancel appointment
- `GET /api/v1/appointments/available-slots` - Get available time slots

Query parameters for available slots:
- `date` (YYYY-MM-DD) - Required
- `treatment_id` - Required

## Business Rules

### Clinic Hours
- **Operating Hours**: 08:00 - 17:00
- **Operating Days**: Monday - Friday
- **Enforced**: All appointment scheduling validates against these hours

### Appointment Scheduling
- No overlapping appointments
- Respects treatment duration
- Cancelled appointments free up time slots
- Available slots calculated based on existing appointments

## Data Models

### Pet
- Name, species (dog/cat/bird/rabbit/other), breed
- Age in years
- Owner name and phone
- Notes

### Treatment
- Name (e.g., Vaccination, Dental cleaning)
- Duration in minutes
- Price
- Description

### Appointment
- Pet (foreign key)
- Treatment (foreign key)
- Scheduled datetime
- Status (scheduled/in-progress/completed/cancelled)
- Notes

## Error Handling

All errors follow a consistent format:

```json
{
  "code": "1002",
  "message": "Pet with id 123 not found",
  "details": {
    "entity_type": "Pet",
    "id": 123
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "trace_id": 140234567890,
  "suggestion": "Check if Pet exists"
}
```

### Error Code Ranges
- **1xxx**: Domain errors (validation, not found, business rules, conflicts)
- **2xxx**: Application errors (command/query validation, handler not found)
- **3xxx**: Infrastructure errors (database, connection)

## Features Implemented

### Backend ✅
- Clean Architecture with Hexagonal Ports & Adapters
- Full CQRS pattern (separate commands/queries)
- Event sourcing for domain entities
- Repository pattern with Protocol interfaces
- Unit of Work pattern for transactions
- Strategy pattern for business rules
- Factory pattern for entity creation
- Mediator pattern for command/query routing
- Custom exception hierarchy with 4-digit codes
- Rich error responses
- HATEOAS links in responses
- Rate limiting (10 req/s per client)
- CORS configuration
- Auto database initialization
- Seed data (5 sample treatments)
- OpenAPI 3.1 documentation

### Code Quality ✅
- Max 10 lines per function (strict)
- Max 100 lines per file
- Protocol over ABC for all interfaces
- Full type annotations
- Comprehensive docstrings (Args, Returns, Raises)
- No code comments (self-documenting code)

## AGENTS.md Compliance Status

### ✅ Fully Implemented
- Clean Architecture
- Hexagonal Ports & Adapters
- All required design patterns
- Code style requirements
- Exception hierarchy
- API versioning
- HATEOAS
- Rate limiting

### ⚠️ Partially Implemented
- Structured logging (configured but not fully wired)
- Testing infrastructure (structure ready, tests not written)

### ❌ Not Implemented (Would Require Significant Additional Work)

#### Backend
- Circuit breaker pattern for DB operations
- ETag-based caching on GET endpoints
- 100% test coverage
- Property-based testing with Hypothesis
- Integration tests with testcontainers
- Contract tests
- Mutation testing (>95% score)
- Performance tests (<50ms per endpoint)
- Architecture Decision Records (ADRs)
- Mermaid component diagrams
- Sequence diagrams for API flows

#### Frontend
- Atomic Design pattern (atoms/molecules/organisms/templates/pages)
- Finite state machines with XState
- Storybook stories for all components
- WCAG 2.1 AA accessibility compliance
- Internationalization (i18n) ready
- Design tokens (no hardcoded CSS values)
- Component library
- State management
- Form validation
- Loading states
- Error boundaries

#### Documentation
- ADRs for design decisions
- Complete API documentation with examples
- Deployment guide
- Troubleshooting guide
- Contributing guide
- Code of conduct

## Estimated Effort for Full Compliance

Based on AGENTS.md requirements:

- **Testing Suite**: ~40 hours
  - 100% coverage with pytest
  - Property-based tests with Hypothesis
  - Integration tests with testcontainers
  - Contract tests
  - Mutation testing
  - Performance tests

- **Frontend (Full)**: ~60 hours
  - Atomic Design implementation
  - XState state machines
  - Storybook setup and stories
  - WCAG 2.1 AA compliance
  - i18n setup
  - Design system with tokens
  - All pages and components

- **Infrastructure**: ~20 hours
  - Circuit breaker implementation
  - ETag caching
  - Enhanced logging
  - Monitoring setup

- **Documentation**: ~15 hours
  - ADRs
  - Diagrams (Mermaid, sequence)
  - Complete guides

**Total**: ~135 additional hours for full AGENTS.md compliance

## What This Implementation Demonstrates

1. **Clean Architecture** - Proper layer separation with no direct dependencies
2. **CQRS** - Clear separation of read/write operations
3. **Event Sourcing** - Domain events track all state changes
4. **Repository Pattern** - Database abstraction
5. **Dependency Injection** - Loose coupling between layers
6. **Code Quality** - Strict adherence to line limits and documentation
7. **API Design** - RESTful with HATEOAS
8. **Error Handling** - Consistent, informative error responses
9. **Business Logic** - Proper domain modeling with strategies

## Development

### Adding a New Feature

1. **Domain**: Define entities, events, protocols
2. **Application**: Create commands/queries and handlers
3. **Infrastructure**: Implement repositories, mappers
4. **Presentation**: Add DTOs and routes
5. **Wire**: Register in dependency container

### Testing (Structure Ready)

```bash
# Backend
cd backend
pytest --cov=src --cov-report=html
pytest --hypothesis-profile=thorough

# Frontend
cd frontend
npm test
npm run test:unit
npm run test:integration
```

## License

MIT

## Notes

This implementation demonstrates Clean Architecture and core design patterns while maintaining strict code quality standards. For a production-ready system meeting 100% of AGENTS.md requirements, the additional work items listed above would need to be completed.

The current implementation provides a **solid architectural foundation** that can be extended with:
- Comprehensive test coverage
- Full frontend implementation
- Production-grade infrastructure (circuit breakers, caching, monitoring)
- Complete documentation suite
