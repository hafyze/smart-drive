from app.services.vehicle_service import VehicleService
from app.services.auth_service import AuthService
from app.services.maintenance_service import MaintenanceService
from app.services.service_history_service import ServiceHistoryService

def get_vehicle_service() -> VehicleService:
    return VehicleService()

def get_auth_service() -> AuthService:
    return AuthService()

def get_maintenance_service() -> MaintenanceService:
    return MaintenanceService()

def get_service_history_service() -> ServiceHistoryService:
    return ServiceHistoryService()