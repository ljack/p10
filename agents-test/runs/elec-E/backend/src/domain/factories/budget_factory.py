"""Budget factory."""
from domain.entities.budget import Budget
from domain.exceptions import InvalidBudgetError


class BudgetFactory:
    """Factory for creating Budget entities."""
    
    @staticmethod
    def create(
        year_month: str,
        budget_kwh: float,
        price_per_kwh: float,
        budget_id: int | None = None,
        alert_threshold_percent: int = 80,
    ) -> Budget:
        """Create a new budget.
        
        Args:
            year_month: Month identifier (YYYY-MM)
            budget_kwh: Budget in kWh
            price_per_kwh: Price per kWh in EUR
            budget_id: Optional ID for existing budget
            alert_threshold_percent: Alert threshold percentage
            
        Returns:
            New Budget instance
            
        Raises:
            InvalidBudgetError: If parameters are invalid
        """
        if budget_kwh <= 0:
            raise InvalidBudgetError("Budget must be positive", {"budget_kwh": budget_kwh})
        if price_per_kwh <= 0:
            raise InvalidBudgetError("Price must be positive", {"price_per_kwh": price_per_kwh})
        if not (0 <= alert_threshold_percent <= 100):
            raise InvalidBudgetError(
                "Threshold must be 0-100",
                {"threshold": alert_threshold_percent}
            )
        
        return Budget(
            id=budget_id,
            year_month=year_month,
            budget_kwh=budget_kwh,
            price_per_kwh=price_per_kwh,
            alert_threshold_percent=alert_threshold_percent,
        )
