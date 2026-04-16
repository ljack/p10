"""Budget repository port."""
from typing import Protocol
from domain.entities.budget import Budget


class BudgetRepositoryPort(Protocol):
    """Port for budget repository operations."""
    
    async def add(self, budget: Budget) -> Budget:
        """Add budget.
        
        Args:
            budget: Budget to add
            
        Returns:
            Budget with assigned ID
        """
        ...
    
    async def get_by_id(self, budget_id: int) -> Budget | None:
        """Get budget by ID.
        
        Args:
            budget_id: Budget identifier
            
        Returns:
            Budget if found, None otherwise
        """
        ...
    
    async def get_by_month(self, year_month: str) -> Budget | None:
        """Get budget by month.
        
        Args:
            year_month: Month identifier (YYYY-MM)
            
        Returns:
            Budget if found, None otherwise
        """
        ...
    
    async def get_all(self) -> list[Budget]:
        """Get all budgets.
        
        Returns:
            List of all budgets
        """
        ...
    
    async def update(self, budget: Budget) -> Budget:
        """Update budget.
        
        Args:
            budget: Budget to update
            
        Returns:
            Updated budget
        """
        ...
