from app.services.vehicle_service import VehicleService
from app.services.auth_service import AuthService

def get_vehicle_service() -> VehicleService:
    return VehicleService()

def get_auth_service() -> AuthService:
    return AuthService()