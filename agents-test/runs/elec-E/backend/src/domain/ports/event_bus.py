"""Event bus port."""
from typing import Protocol
from domain.events.base import DomainEvent


class EventBusPort(Protocol):
    """Port for event bus operations."""
    
    async def publish(self, event: DomainEvent) -> None:
        """Publish domain event.
        
        Args:
            event: Event to publish
        """
        ...
    
    async def publish_many(self, events: list[DomainEvent]) -> None:
        """Publish multiple events.
        
        Args:
            events: Events to publish
        """
        ...
