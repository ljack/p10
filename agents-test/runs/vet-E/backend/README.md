# Vet Appointment API - Backend

## Architecture

This project implements **Clean Architecture** with **Hexagonal Ports & Adapters** pattern as specified in AGENTS.md.

### Layer Structure

```
backend/src/
├── domain/          # Core business logic (innermost layer)
│   ├── entities.py           # Aggregates: Pet, Treatment, Appointment
│   ├── value_objects.py      # Enums: Species, AppointmentStatus
│   ├── events.py             # Domain events for event sourcing
│   ├── protocols.py          # Repository protocols (using Protocol, not ABC)
│   ├── factories.py          # Factory protocols
│   ├── strategies.py         # Business rule strategies
│   └── exceptions.py         # Domain exceptions (base)
│
├── application/     # Use cases and CQRS handlers
│   ├── commands.py           # Write commands
│   ├── queries.py            # Read queries
│   ├── mediator.py           # Mediator pattern implementation
│   ├── exceptions.py         # Application exceptions
│   └── handlers/
│       ├── pet_commands.py
│       ├── pet_queries.py
│       ├── treatment_commands.py
│       ├── treatment_queries.py
│       ├── appointment_commands.py
│       └── appointment_queries.py
│
├── infrastructure/  # External concerns
│   ├── database.py           # SQLAlchemy models
│   ├── mappers.py            # Entity ↔ Model mappers
│   ├── uow.py                # Unit of Work implementation
│   ├── factories.py          # Factory implementations
│   ├── exceptions.py         # Infrastructure exceptions
│   └── repositories/
│       ├── pet_repository.py
│       ├── treatment_repository.py
│       └── appointment_repository.py
│
└── presentation/    # API layer
    ├── dtos.py               # Request/Response models + HATEOAS
    ├── errors.py             # Exception → HTTP mapping
    ├── dependencies.py       # Dependency injection container
    └── routes/
        ├── pets.py
        ├── treatments.py
        └── appointments.py
```

## Design Patterns Implemented

✅ **Repository Pattern** - All database access through repositories  
✅ **Unit of Work** - Transaction management  
✅ **CQRS** - Separate commands (write) and queries (read)  
✅ **Event Sourcing** - Domain events for state changes  
✅ **Mediator Pattern** - Command/query routing  
✅ **Factory Pattern** - Entity creation  
✅ **Strategy Pattern** - Business rules (e.g., ClinicHoursStrategy)  
✅ **Dependency Injection** - No direct layer coupling  

## Code Quality Standards

✅ **Max 10 lines per function** - Strict adherence  
✅ **Max 100 lines per file** - Files split when needed  
✅ **Protocol over ABC** - All interfaces use Protocol  
✅ **Full type annotations** - Every function typed  
✅ **Comprehensive docstrings** - Args, Returns, Raises documented  

## API Features

✅ **OpenAPI 3.1** - Auto-generated documentation at `/docs`  
✅ **Rate Limiting** - 10 requests/second per client (slowapi)  
✅ **HATEOAS** - Hypermedia links in all responses  
✅ **Structured Logging** - JSON logs (structlog)  
✅ **CORS** - Configured for frontend (localhost:5173)  
✅ **Error Handling** - 4-digit error codes, rich error responses  
✅ **API Versioning** - /api/v1 prefix  

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Application

```bash
uvicorn src.main:app --reload --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database

- **SQLite** with async support (aiosqlite)
- **Auto-initialization** - Tables created on first run
- **Seed data** - 5 sample treatments automatically seeded
- **Location** - `./vet.db` in backend directory

## Business Rules

### Clinic Hours
- **Hours**: 08:00 - 17:00
- **Days**: Monday - Friday (weekday 0-4)
- **Enforced by**: `ClinicHoursStrategy`

### Appointment Scheduling
- No overlapping appointments
- Respects treatment duration
- Validates against clinic hours
- Cancelled appointments free up slots

## Exception Hierarchy

```
DomainError (1xxx codes)
├── ValidationError (1001)
├── EntityNotFoundError (1002)
├── BusinessRuleViolation (1003)
└── ConflictError (1004)

ApplicationError (2xxx codes)
├── CommandValidationError (2001)
├── QueryValidationError (2002)
└── HandlerNotFoundError (2003)

InfrastructureError (3xxx codes)
├── DatabaseError (3001)
└── ConnectionError (3002)
```

## API Endpoints

### Pets
- `POST /api/v1/pets` - Create pet
- `GET /api/v1/pets` - List pets (filter by owner_name)
- `GET /api/v1/pets/{id}` - Get pet
- `PUT /api/v1/pets/{id}` - Update pet
- `DELETE /api/v1/pets/{id}` - Delete pet

### Treatments
- `POST /api/v1/treatments` - Create treatment
- `GET /api/v1/treatments` - List treatments
- `GET /api/v1/treatments/{id}` - Get treatment
- `PUT /api/v1/treatments/{id}` - Update treatment
- `DELETE /api/v1/treatments/{id}` - Delete treatment

### Appointments
- `POST /api/v1/appointments` - Book appointment
- `GET /api/v1/appointments` - List appointments (filter by date, pet_id, status)
- `GET /api/v1/appointments/{id}` - Get appointment
- `PUT /api/v1/appointments/{id}` - Update appointment
- `DELETE /api/v1/appointments/{id}` - Cancel appointment
- `GET /api/v1/appointments/available-slots` - Get available time slots

## What's Implemented vs AGENTS.md Requirements

### ✅ Fully Implemented
- Clean Architecture with Hexagonal Ports & Adapters
- All design patterns (Repository, UoW, CQRS, Event Sourcing, Mediator, Factory, Strategy)
- Code quality standards (10 lines/function, 100 lines/file, Protocol over ABC)
- Exception hierarchy with 4-digit codes
- HATEOAS links
- Rate limiting
- CORS configuration

### ⚠️ Partially Implemented
- **Testing**: Structure ready but tests not written (requires 100% coverage)
- **Circuit Breaker**: Pattern not implemented for DB operations
- **ETag Caching**: Not implemented on GET endpoints
- **Structured Logging**: structlog configured but not fully wired

### ❌ Not Implemented (Would Require)
- **Property-based testing** with Hypothesis
- **Integration tests** with testcontainers
- **Contract tests** for all endpoints
- **Mutation testing** with >95% score
- **Performance tests** (<50ms requirement)
- **Architecture Decision Records** (ADRs)
- **Mermaid diagrams** for components
- **Sequence diagrams** for API flows

## Development

### Adding a New Entity

1. **Domain Layer**: Create entity in `domain/entities.py`
2. **Events**: Add domain events in `domain/events.py`
3. **Repository**: Add protocol in `domain/protocols.py`
4. **Commands/Queries**: Add in `application/`
5. **Handlers**: Implement in `application/handlers/`
6. **Infrastructure**: Add SQLAlchemy model in `infrastructure/database.py`
7. **Mapper**: Create mapper in `infrastructure/mappers.py`
8. **Repository Impl**: Implement in `infrastructure/repositories/`
9. **DTOs**: Add request/response models in `presentation/dtos.py`
10. **Routes**: Create API routes in `presentation/routes/`

### Running Tests (When Implemented)

```bash
pytest --cov=src --cov-report=html
pytest --hypothesis-profile=thorough
```

## License

MIT
