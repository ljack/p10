# Architecture Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "Frontend (Svelte)"
        UI[User Interface]
        Pages[Pages/Routes]
        Organisms[Organisms]
        Molecules[Molecules]
        Atoms[Atoms]
        API[API Client]
        
        UI --> Pages
        Pages --> Organisms
        Organisms --> Molecules
        Molecules --> Atoms
        Pages --> API
    end
    
    subgraph "Backend (FastAPI)"
        Router[API Routes]
        Middleware[Middleware]
        Mediator[Mediator]
        
        subgraph "Application Layer"
            Commands[Commands]
            Queries[Queries]
            Handlers[Handlers]
            DTOs[DTOs]
        end
        
        subgraph "Domain Layer"
            Entities[Entities]
            ValueObjects[Value Objects]
            Events[Domain Events]
            Ports[Ports/Interfaces]
            Factories[Factories]
            Strategies[Strategies]
        end
        
        subgraph "Infrastructure Layer"
            Repositories[Repositories]
            UnitOfWork[Unit of Work]
            Database[Database]
            EventBus[Event Bus]
            CircuitBreaker[Circuit Breaker]
        end
        
        Router --> Middleware
        Middleware --> Mediator
        Mediator --> Handlers
        Handlers --> Commands
        Handlers --> Queries
        Handlers --> DTOs
        Handlers --> UnitOfWork
        Handlers --> EventBus
        
        UnitOfWork --> Repositories
        Repositories --> Database
        
        Handlers ..-> Ports
        Repositories ..|> Ports
        
        Factories --> Entities
        Factories --> ValueObjects
        Handlers --> Factories
        
        Events --> EventBus
        Entities --> Events
    end
    
    API -.->|HTTP/JSON| Router
    Database[(SQLite)]
    
    style "Domain Layer" fill:#e1f5ff
    style "Application Layer" fill:#fff4e1
    style "Infrastructure Layer" fill:#f0f0f0
    style "Frontend (Svelte)" fill:#ffe1e1
```

## Clean Architecture Layers

```mermaid
graph LR
    subgraph "Outer Layer"
        Presentation[Presentation<br/>FastAPI Routes<br/>Schemas<br/>Middleware]
        Infrastructure[Infrastructure<br/>Database<br/>Repositories<br/>Event Bus]
    end
    
    subgraph "Middle Layer"
        Application[Application<br/>Commands<br/>Queries<br/>Handlers<br/>DTOs]
    end
    
    subgraph "Inner Layer"
        Domain[Domain<br/>Entities<br/>Value Objects<br/>Events<br/>Ports]
    end
    
    Presentation --> Application
    Infrastructure --> Domain
    Application --> Domain
    
    style Domain fill:#4CAF50,color:#fff
    style Application fill:#2196F3,color:#fff
    style Presentation fill:#FF9800,color:#fff
    style Infrastructure fill:#9C27B0,color:#fff
```

## CQRS Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Mediator
    participant Handler
    participant UoW as Unit of Work
    participant Repo as Repository
    participant DB as Database
    participant Events as Event Bus
    
    Note over Client,Events: Command Flow (Write)
    Client->>API: POST /api/v1/devices
    API->>Mediator: send(CreateDeviceCommand)
    Mediator->>Handler: handle(command)
    Handler->>UoW: __aenter__()
    Handler->>Repo: add(device)
    Repo->>DB: INSERT
    Handler->>UoW: commit()
    Handler->>Events: publish(DeviceCreated)
    Handler-->>Mediator: DeviceDTO
    Mediator-->>API: DeviceDTO
    API-->>Client: 201 Created
    
    Note over Client,Events: Query Flow (Read)
    Client->>API: GET /api/v1/devices/1
    API->>Mediator: send(GetDeviceQuery)
    Mediator->>Handler: handle(query)
    Handler->>UoW: __aenter__()
    Handler->>Repo: get_by_id(1)
    Repo->>DB: SELECT
    DB-->>Repo: Row
    Repo-->>Handler: Device
    Handler-->>Mediator: DeviceDTO
    Mediator-->>API: DeviceDTO
    API-->>Client: 200 OK
```

## Component Dependencies

```mermaid
graph TD
    Routes[API Routes] --> Mediator
    Mediator --> CommandHandler[Command Handler]
    Mediator --> QueryHandler[Query Handler]
    
    CommandHandler --> UoW[Unit of Work]
    QueryHandler --> UoW
    CommandHandler --> EventBus[Event Bus]
    
    UoW --> DeviceRepo[Device Repository]
    UoW --> ConsumptionRepo[Consumption Repository]
    UoW --> ScheduleRepo[Schedule Repository]
    UoW --> BudgetRepo[Budget Repository]
    
    DeviceRepo --> DB[(Database)]
    ConsumptionRepo --> DB
    ScheduleRepo --> DB
    BudgetRepo --> DB
    
    CommandHandler --> Factory[Entity Factory]
    Factory --> Entity[Domain Entity]
    
    Entity --> ValueObject[Value Object]
    Entity --> DomainEvent[Domain Event]
    
    DomainEvent --> EventBus
    
    CommandHandler ..-> Port[Repository Port]
    DeviceRepo ..|> Port
    
    style Routes fill:#FF6B6B
    style Mediator fill:#4ECDC4
    style CommandHandler fill:#45B7D1
    style QueryHandler fill:#45B7D1
    style UoW fill:#96CEB4
    style DB fill:#FFEAA7
    style Entity fill:#DFE6E9
    style Port fill:#A29BFE
```

## Atomic Design Structure

```mermaid
graph TD
    Page[Page<br/>Dashboard] --> Template[Template<br/>Layout]
    Template --> Organism1[Organism<br/>DeviceList]
    Template --> Organism2[Organism<br/>StatsSummary]
    
    Organism1 --> Molecule1[Molecule<br/>DeviceCard]
    Organism2 --> Molecule2[Molecule<br/>StatCard]
    
    Molecule1 --> Atom1[Atom<br/>Card]
    Molecule1 --> Atom2[Atom<br/>Button]
    Molecule2 --> Atom1
    Molecule2 --> Atom3[Atom<br/>Text]
    
    Atom1 -.-> Tokens[Design Tokens<br/>Colors, Spacing]
    Atom2 -.-> Tokens
    Atom3 -.-> Tokens
    
    style Page fill:#E74C3C,color:#fff
    style Template fill:#E67E22,color:#fff
    style Organism1 fill:#F39C12,color:#fff
    style Organism2 fill:#F39C12,color:#fff
    style Molecule1 fill:#3498DB,color:#fff
    style Molecule2 fill:#3498DB,color:#fff
    style Atom1 fill:#2ECC71,color:#fff
    style Atom2 fill:#2ECC71,color:#fff
    style Atom3 fill:#2ECC71,color:#fff
    style Tokens fill:#9B59B6,color:#fff
```

## API Request Flow

```mermaid
graph LR
    Client[Client] -->|HTTP Request| RateLimit[Rate Limiter]
    RateLimit --> ErrorHandler[Error Handler]
    ErrorHandler --> CORS[CORS Middleware]
    CORS --> Route[Route Handler]
    Route --> Mediator[Mediator]
    Mediator --> Handler[Command/Query Handler]
    Handler --> UoW[Unit of Work]
    UoW -->|Begin Transaction| DB[(Database)]
    Handler --> EventBus[Event Bus]
    Handler -->|DTO| Route
    Route -->|HTTP Response| Client
    
    style RateLimit fill:#E74C3C,color:#fff
    style ErrorHandler fill:#E67E22,color:#fff
    style CORS fill:#F39C12,color:#fff
    style Route fill:#3498DB,color:#fff
    style Mediator fill:#2ECC71,color:#fff
    style Handler fill:#1ABC9C,color:#fff
    style UoW fill:#9B59B6,color:#fff
    style DB fill:#34495E,color:#fff
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        Browser[Web Browser]
    end
    
    subgraph "Frontend Server"
        SvelteKit[SvelteKit<br/>Port 5173]
    end
    
    subgraph "Backend Server"
        FastAPI[FastAPI<br/>Port 8000]
        App[Application Layer]
        Domain[Domain Layer]
        Infra[Infrastructure Layer]
        SQLite[(SQLite DB)]
        
        FastAPI --> App
        App --> Domain
        Infra --> Domain
        Infra --> SQLite
    end
    
    Browser -->|HTTP| SvelteKit
    SvelteKit -->|API Proxy| FastAPI
    
    style Browser fill:#4A90E2
    style SvelteKit fill:#FF6B6B
    style FastAPI fill:#4ECDC4
    style SQLite fill:#FFEAA7
```
