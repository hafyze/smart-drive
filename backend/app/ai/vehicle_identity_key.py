from app.ai.schemas import VehicleIdentity

def create_vehicle_identity_key(identity: VehicleIdentity) -> str:
    values = [
        identity.manufacturer,
        identity.model,
        identity.variant or "",
        str(identity.year or ""),
        identity.transmission or "",
    ]

    return "|".join(value.strip().upper() 
                        for value in values
                    ) 