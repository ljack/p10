"""Mediator for command and query handling."""
from typing import Any, TypeVar, Generic, Callable
from dataclasses import dataclass

TRequest = TypeVar('TRequest')
TResponse = TypeVar('TResponse')


@dataclass
class Handler(Generic[TRequest, TResponse]):
    """Handler wrapper."""
    
    handle: Callable[[TRequest], TResponse]


class Mediator:
    """Mediator for routing commands and queries to handlers."""
    
    def __init__(self) -> None:
        """Initialize mediator."""
        self._handlers: dict[type, Handler] = {}
    
    def register(self, request_type: type, handler: Handler) -> None:
        """Register a handler for a request type.
        
        Args:
            request_type: Type of request
            handler: Handler instance
        """
        self._handlers[request_type] = handler
    
    async def send(self, request: TRequest) -> TResponse:
        """Send request to appropriate handler.
        
        Args:
            request: Command or query
            
        Returns:
            Handler response
            
        Raises:
            ValueError: If no handler registered
        """
        request_type = type(request)
        if request_type not in self._handlers:
            raise ValueError(f"No handler registered for {request_type}")
        
        handler = self._handlers[request_type]
        return await handler.handle(request)
