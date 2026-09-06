from app.ai.schemas import (
    VehicleIdentity,
    VehicleIdentityConfidence,
)


class VehicleIdentityResolver:
    def resolve(
        self,
        vehicle: dict,
    ) -> VehicleIdentity:
        manufacturer = vehicle.get("manufacturer")
        model = vehicle.get("model")
        variant = vehicle.get("variant")
        year = vehicle.get("year")
        transmission = vehicle.get("transmission")

        if not isinstance(manufacturer, str):
            raise ValueError(
                "Vehicle manufacturer is missing or invalid."
            )

        if not isinstance(model, str):
            raise ValueError(
                "Vehicle model is missing or invalid."
            )

        transmission_value = (
            str(transmission)
            if transmission is not None
            else None
        )

        confidence = self._calculate_confidence(
            manufacturer=manufacturer,
            model=model,
            variant=variant,
            year=year,
            transmission=transmission_value,
        )

        return VehicleIdentity(
            manufacturer=manufacturer,
            model=model,
            variant=(
                variant
                if isinstance(variant, str)
                else None
            ),
            year=(
                year
                if isinstance(year, int)
                else None
            ),
            transmission=transmission_value,
            confidence=confidence,
        )

    def _calculate_confidence(
        self,
        manufacturer: str | None,
        model: str | None,
        variant: str | None,
        year: int | None,
        transmission: str | None,
    ) -> VehicleIdentityConfidence:
        if all(
            [
                manufacturer,
                model,
                variant,
                year,
                transmission,
            ]
        ):
            return VehicleIdentityConfidence.HIGH

        if all(
            [
                manufacturer,
                model,
                year,
            ]
        ):
            return VehicleIdentityConfidence.MEDIUM

        return VehicleIdentityConfidence.LOW