from app.services.vehicle_service import VehicleService

def get_vehicle_service() -> VehicleService:
    return VehicleService()