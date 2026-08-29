from datetime import date

from app.schemas.maintenance import (
    MaintenanceScheduleStatus,
    MaintenanceStatus,
    MaintenanceType
)

# Maintenance types where the next service is primarily
# determined by mileage.
MILEAGE_BASED_TYPES = {
    MaintenanceType.OIL_FILTER,
    MaintenanceType.AIR_FILTER,
    MaintenanceType.CABIN_FILTER,
    MaintenanceType.BRAKE_SERVICE,
    MaintenanceType.TRANSMISSION,
    MaintenanceType.BATTERY,
    MaintenanceType.TYRE,
    MaintenanceType.ALIGNMENT,
    MaintenanceType.SPARK_PLUG,
    MaintenanceType.TIMING_BELT,
}

# Maintenance types where the next service is primarily
# determined by date.
DATE_BASED_TYPES = {
    MaintenanceType.BRAKE_FLUID,
    MaintenanceType.COOLANT,
    MaintenanceType.INSPECTION,
}

def calculate_maintenance_status(
    maintenance_type: MaintenanceType,
    next_due_date: date | None,
    next_due_mileage: int | None,
    current_mileage: int,
    today: date | None = None,
) -> MaintenanceScheduleStatus | None:
    
    """
    Determine the current status of a maintenance schedule.

    Rules:
    - No next due date or mileage -> COMPLETED
    - Mileage-based maintenance -> check next due mileage
    - Date-based maintenance -> check next due date
    - Engine oil -> check whichever comes first
    - OTHER -> use whichever due value is provided
    """
    if next_due_date is None and next_due_mileage is None:
        return None

    today = today or date.today()

    # Engine oil can be either due type
    if maintenance_type == MaintenanceType.ENGINE_OIL:
        if(next_due_date is not None and today >= next_due_date):
            return MaintenanceScheduleStatus.OVERDUE
        if(next_due_mileage is not None and current_mileage >= next_due_mileage):
            return MaintenanceScheduleStatus.OVERDUE
        return MaintenanceScheduleStatus.UPCOMING

    # Mileage based maintenance
    if maintenance_type in MILEAGE_BASED_TYPES:
        if (next_due_mileage is not None and current_mileage >= next_due_mileage):
            return MaintenanceScheduleStatus.OVERDUE
        return MaintenanceScheduleStatus.UPCOMING

    if maintenance_type in DATE_BASED_TYPES:
        if(next_due_date is not None and today >= next_due_date):
            return MaintenanceScheduleStatus.OVERDUE
        return MaintenanceScheduleStatus.UPCOMING

    # OTHER:
    # If no specific rule exists, use whichever interval
    # the user provided.
    if (
        next_due_date is not None
        and today >= next_due_date
    ):
        return MaintenanceScheduleStatus.OVERDUE

    if (
        next_due_mileage is not None
        and current_mileage >= next_due_mileage
    ):
        return MaintenanceScheduleStatus.OVERDUE

    return MaintenanceScheduleStatus.UPCOMING
