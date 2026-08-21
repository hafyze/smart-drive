from app.services.vehicle_service import VehicleService
from app.services.auth_service import AuthService
from app.services.maintenance_service import MaintenanceService

def get_vehicle_service() -> VehicleService:
    return VehicleService()

def get_auth_service() -> AuthService:
    return AuthService()

def get_maintenance_service() -> MaintenanceService:
    return MaintenanceService()