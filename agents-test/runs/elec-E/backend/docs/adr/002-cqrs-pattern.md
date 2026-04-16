# ADR 002: CQRS (Command Query Responsibility Segregation)

## Status
Accepted

## Context
We need to separate read and write operations for:
- Optimizing read and write models independently
- Clearer intent in code (commands vs queries)
- Better scalability options
- Alignment with Event Sourcing

## Decision
Implement CQRS pattern with:

### Commands (Write Operations)
- **Purpose**: Modify state
- **Examples**: CreateDeviceCommand, UpdateDeviceCommand
- **Return**: DTOs or success indicators
- **Side Effects**: Emit domain events
- **Naming**: Verb-based (Create, Update, Delete)

```python
@dataclass(frozen=True)
class CreateDeviceCommand:
    name: str
    type: str
    wattage: int
    location: str
```

### Queries (Read Operations)
- **Purpose**: Retrieve data
- **Examples**: GetDeviceQuery, ListDevicesQuery
- **Return**: DTOs (never domain entities)
- **Side Effects**: None (idempotent)
- **Naming**: Noun-based (Get, List, Find)

```python
@dataclass(frozen=True)
class GetDeviceQuery:
    device_id: int
```

### Handlers
Separate handlers for each command/query:

```python
class CreateDeviceHandler:
    async def handle(self, command: CreateDeviceCommand) -> DeviceDTO:
        # Create device, emit events, return DTO
        pass

class GetDeviceHandler:
    async def handle(self, query: GetDeviceQuery) -> DeviceDTO:
        # Fetch and return DTO
        pass
```

### Mediator Pattern
Route all commands/queries through mediator:

```python
mediator = Mediator()
mediator.register(CreateDeviceCommand, CreateDeviceHandler(uow, events))
mediator.register(GetDeviceQuery, GetDeviceHandler(uow))

# Usage
result = await mediator.send(CreateDeviceCommand(...))
device = await mediator.send(GetDeviceQuery(device_id=1))
```

## Consequences

### Positive
- **Clear Intent**: Commands mutate, queries don't
- **Optimization**: Can optimize reads separately from writes
- **Scalability**: Can scale read and write models independently
- **Event Sourcing**: Commands naturally emit events
- **Testing**: Handlers are isolated and testable

### Negative
- **Complexity**: More files than traditional CRUD
- **Boilerplate**: Handler for each operation
- **Learning Curve**: Team needs to understand pattern

### Neutral
- **Consistency**: All operations follow same pattern
- **Predictability**: Easy to find where operations are handled

## Read vs Write Model Separation

### Write Model (Commands)
- Optimized for consistency and validation
- Uses domain entities with business logic
- Emits domain events
- Unit of Work for transactions

### Read Model (Queries)
- Optimized for performance
- Can use denormalized data structures
- No business logic
- Direct database queries (when needed)

## Guidelines

### Commands Should
1. Be immutable (frozen dataclasses)
2. Contain only primitive types or value objects
3. Have descriptive verb-based names
4. Be validated in handlers
5. Emit events on success

### Queries Should
1. Be immutable (frozen dataclasses)
2. Have descriptive noun-based names
3. Return DTOs, never entities
4. Have no side effects
5. Be cacheable when possible

### Handlers Should
1. Handle one command or query
2. Have single responsibility
3. Use dependency injection
4. Be async
5. Have comprehensive error handling

## Example Flow

### Command Flow
```
API → Command → Mediator → Handler → UnitOfWork → Repository → Database
                                   ↓
                                Events → EventBus → Subscribers
```

### Query Flow
```
API → Query → Mediator → Handler → UnitOfWork → Repository → Database
                                                            ↓
                                                          DTO
```

## Alternatives Considered

### 1. Traditional CRUD
- **Pros**: Simpler, less code
- **Cons**: Read and write concerns mixed
- **Rejected**: Doesn't support our scalability goals

### 2. Event Sourcing Only
- **Pros**: Complete audit trail
- **Cons**: Complex queries, eventual consistency
- **Rejected**: Too complex for current requirements

### 3. Separate Read/Write Databases
- **Pros**: Maximum optimization
- **Cons**: Complexity, eventual consistency
- **Deferred**: May implement later if needed

## Implementation Checklist

- [x] Define command and query base types
- [x] Implement Mediator
- [x] Create handler base classes
- [x] Implement DTOs for all operations
- [x] Wire up dependency injection
- [ ] Add caching for queries
- [ ] Implement query result pagination
- [ ] Add command validation decorators

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) by Martin Fowler
- [CQRS Journey](https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj554200(v=pandp.10)) by Microsoft

## Review Date
2026-07-14 (3 months from acceptance)
