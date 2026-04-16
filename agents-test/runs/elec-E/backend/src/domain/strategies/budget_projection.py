"""Budget projection strategy."""
from typing import Protocol
from datetime import datetime


class BudgetProjectionStrategy(Protocol):
    """Strategy for projecting budget usage."""
    
    def project_end_of_month(
        self, current_usage: float, days_elapsed: int, days_in_month: int
    ) -> float:
        """Project end-of-month usage based on current consumption.
        
        Args:
            current_usage: kWh used so far
            days_elapsed: Days passed in month
            days_in_month: Total days in month
            
        Returns:
            Projected end-of-month kWh
        """
        ...


class LinearProjectionStrategy:
    """Linear projection based on daily average."""
    
    def project_end_of_month(
        self, current_usage: float, days_elapsed: int, days_in_month: int
    ) -> float:
        """Project linearly from daily average.
        
        Args:
            current_usage: kWh used so far
            days_elapsed: Days passed in month
            days_in_month: Total days in month
            
        Returns:
            Projected end-of-month kWh
        """
        if days_elapsed == 0:
            return 0.0
        daily_avg = current_usage / days_elapsed
        return daily_avg * days_in_month
