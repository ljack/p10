# AGENTS.md

## Architecture Requirements

This project MUST use Clean Architecture with Hexagonal Ports & Adapters pattern.
Separate domain, application, infrastructure, and presentation layers.
Use dependency injection for ALL service instantiation. No direct imports between layers.

## Code Style

- Maximum function length: 10 lines (strict — no exceptions)
- Maximum file length: 100 lines (split into modules if needed)
- Every function must have a comprehensive docstring with Args, Returns, Raises
- No comments in code — code must be self-documenting (docstrings are not comments)
- All functions must have full type annotations including generics
- Use Protocol classes instead of ABC for all interfaces

## Design Patterns (required)

- **Repository Pattern** for ALL database access — no raw SQL in business logic
- **Unit of Work** pattern for transaction management
- **CQRS**: Separate read models from write models for every entity
- **Event Sourcing**: All state changes must emit domain events
- **Mediator Pattern**: Use a mediator for all inter-component communication
- **Factory Pattern**: All entity creation must go through factories
- **Strategy Pattern**: All business rules must be implemented as strategies

## API Requirements

- Full OpenAPI 3.1 documentation with examples for every endpoint
- Rate limiting on all endpoints (10 req/s per client)
- Request/response logging with structured JSON output
- Circuit breaker pattern for all database operations
- API versioning (v1 prefix) with deprecation headers
- HATEOAS links in all responses
- ETag-based caching on all GET endpoints

## Error Handling

- Custom exception hierarchy: DomainError → ApplicationError → InfrastructureError
- Every possible error must have a unique error code (4-digit, documented)
- Error responses must include: code, message, details, timestamp, trace_id, suggestion
- Never return raw exceptions — always map through error handlers

## Testing

- 100% code coverage required (not 99%, not 99.5% — exactly 100%)
- Property-based testing with Hypothesis for all domain logic
- Integration tests with testcontainers
- Contract tests for all API endpoints
- Mutation testing must pass with >95% score
- Performance tests: every endpoint must respond in <50ms

## Documentation

- Architecture Decision Records (ADR) for every design choice
- Component diagram in Mermaid for every module
- Sequence diagrams for all API flows
- README must include: architecture overview, setup, development guide, deployment guide,
  troubleshooting, contributing guide, and code of conduct

## Frontend Requirements

- Atomic Design pattern (atoms, molecules, organisms, templates, pages)
- State management via finite state machines (XState or equivalent)
- Every component must have Storybook stories
- Accessibility: WCAG 2.1 AA compliance on all components
- Internationalization ready (i18n) even though only English is needed now
- CSS must use design tokens, no hardcoded values
