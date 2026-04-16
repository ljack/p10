# ADR 001: Clean Architecture with Hexagonal Ports & Adapters

## Status
Accepted

## Context
We need an architecture that supports:
- Testability and maintainability
- Independence from frameworks and external tools
- Clear separation of concerns
- Flexibility to change infrastructure without affecting business logic

## Decision
Implement Clean Architecture with Hexagonal (Ports & Adapters) pattern with the following layers:

### 1. Domain Layer (innermost)
- **Purpose**: Core business logic, completely framework-independent
- **Contains**: Entities, Value Objects, Domain Events, Domain Services
- **Dependencies**: None (pure Python)
- **Rules**: 
  - No framework imports
  - No infrastructure dependencies
  - Defines Ports (interfaces) for required external services

### 2. Application Layer
- **Purpose**: Orchestrates use cases
- **Contains**: Commands, Queries, Handlers, DTOs, Mediator
- **Dependencies**: Domain layer only
- **Pattern**: CQRS (Command Query Responsibility Segregation)
- **Rules**:
  - Depends on domain ports, not implementations
  - No direct database access
  - Returns DTOs, not domain entities

### 3. Infrastructure Layer
- **Purpose**: Implements technical capabilities
- **Contains**: Repository implementations, Database, Event Bus, Circuit Breaker
- **Dependencies**: Domain layer (implements ports)
- **Pattern**: Adapter pattern
- **Rules**:
  - Implements domain ports
  - Handles all external I/O
  - No business logic

### 4. Presentation Layer (outermost)
- **Purpose**: API interface
- **Contains**: FastAPI routes, Pydantic schemas, Middleware
- **Dependencies**: Application layer (via Mediator)
- **Rules**:
  - No direct domain access
  - All requests go through Mediator
  - Handles HTTP concerns only

## Consequences

### Positive
- **Testability**: Each layer can be tested in isolation
- **Maintainability**: Clear boundaries and responsibilities
- **Flexibility**: Easy to swap implementations (e.g., SQLite → PostgreSQL)
- **Framework Independence**: Business logic doesn't depend on FastAPI
- **Scalability**: Clear structure for growing codebase

### Negative
- **Complexity**: More files and layers than simple CRUD
- **Learning Curve**: Team must understand the architecture
- **Boilerplate**: More code for simple operations

### Neutral
- **Development Speed**: Initially slower, faster long-term
- **File Count**: Many small, focused files instead of few large ones

## Alternatives Considered

### 1. Traditional MVC
- **Pros**: Simpler, familiar
- **Cons**: Business logic tends to leak into controllers
- **Rejected**: Doesn't provide sufficient separation

### 2. Layered Architecture
- **Pros**: Simpler than Clean Architecture
- **Cons**: Tight coupling to frameworks and database
- **Rejected**: Doesn't support our testability requirements

### 3. Microservices
- **Pros**: Maximum independence
- **Cons**: Overkill for this application size
- **Rejected**: Too complex for current requirements

## Implementation Notes

### Dependency Rule
Dependencies only point inward:
```
Presentation → Application → Domain
Infrastructure → Domain
```

### Interface Segregation
Use Protocol classes (not ABC) for all ports:
```python
from typing import Protocol

class DeviceRepositoryPort(Protocol):
    async def add(self, device: Device) -> Device: ...
```

### Dependency Injection
All dependencies injected via constructors:
```python
class CreateDeviceHandler:
    def __init__(self, uow: UnitOfWorkPort, event_bus: EventBusPort):
        self.uow = uow
        self.event_bus = event_bus
```

## References
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) by Robert C. Martin
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) by Alistair Cockburn
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) by Martin Fowler

## Review Date
2026-07-14 (3 months from acceptance)
