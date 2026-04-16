"""Event bus implementation."""
import logging
from domain.events.base import DomainEvent

logger = logging.getLogger(__name__)


class InMemoryEventBus:
    """Simple in-memory event bus implementation."""
    
    def __init__(self) -> None:
        """Initialize event bus."""
        self._handlers: list = []
    
    async def publish(self, event: DomainEvent) -> None:
        """Publish single event.
        
        Args:
            event: Event to publish
        """
        logger.info(f"Event published: {event.event_type}", extra=event.to_dict())
        for handler in self._handlers:
            await handler(event)
    
    async def publish_many(self, events: list[DomainEvent]) -> None:
        """Publish multiple events.
        
        Args:
            events: Events to publish
        """
        for event in events:
            await self.publish(event)
    
    def subscribe(self, handler) -> None:
        """Subscribe to events.
        
        Args:
            handler: Event handler function
        """
        self._handlers.append(handler)
