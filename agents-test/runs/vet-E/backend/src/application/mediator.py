"""Mediator pattern for command and query handling."""
from typing import Any, Callable, TypeVar, Generic

from .exceptions import HandlerNotFoundError


T = TypeVar("T")
R = TypeVar("R")


class Mediator:
    """Mediator for routing commands and queries to handlers."""

    def __init__(self) -> None:
        """Initialize mediator.
        
        Args: None
        Returns: None
        Raises: None
        """
        self._handlers: dict[type, Callable] = {}

    def register(self, message_type: type[T], handler: Callable[[T], R]) -> None:
        """Register a handler for a message type.
        
        Args:
            message_type: Type of message (command or query)
            handler: Handler function
        Returns: None
        Raises: None
        """
        self._handlers[message_type] = handler

    async def send(self, message: T) -> Any:
        """Send a message to its handler.
        
        Args:
            message: Command or query message
        Returns: Handler result
        Raises: HandlerNotFoundError
        """
        message_type = type(message)
        handler = self._handlers.get(message_type)
        if handler is None:
            raise HandlerNotFoundError(message_type.__name__)
        return await handler(message)
