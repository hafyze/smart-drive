from datetime import datetime

from app.ai.schemas import (
    MaintenanceItemSummary,
    MaintenanceSummary,
)


class MaintenanceAnalyzer:
    def analyze(
        self,
        service_visits: list[dict],
        current_mileage: int,
    ) -> MaintenanceSummary:

        if not service_visits:
            return MaintenanceSummary()

        sorted_visits = sorted(
            service_visits,
            key=lambda visit: visit["service_date"],
        )

        item_history: dict[str, dict] = {}

        total_items = 0
        total_cost = 0.0

        for visit in sorted_visits:
            service_date = visit.get("service_date")
            mileage = visit.get("mileage_at_service")

            for item in visit.get("items", []):
                total_items += 1

                maintenance_type = item.get("type")

                if hasattr(maintenance_type, "value"):
                    maintenance_type = maintenance_type.value

                if not maintenance_type:
                    continue

                cost = item.get("cost") or 0

                total_cost += cost

                if maintenance_type not in item_history:
                    item_history[maintenance_type] = {
                        "type": maintenance_type,
                        "last_done_date": None,
                        "last_done_mileage": None,
                        "times_recorded": 0,
                        "total_recorded_cost": 0.0,
                    }

                summary = item_history[
                    maintenance_type
                ]

                summary["times_recorded"] += 1

                summary[
                    "total_recorded_cost"
                ] += cost

                summary[
                    "last_done_date"
                ] = self._to_date(
                    service_date
                )

                last_done_mileage = summary[
                    "last_done_mileage"
                ]

                summary["mileage_since_last_done"] = (
                    current_mileage - last_done_mileage
                    if last_done_mileage is not None
                    else None
                )

        first_visit = sorted_visits[0]
        last_visit = sorted_visits[-1]

        last_service_mileage = last_visit.get(
            "mileage_at_service"
        )

        first_service_mileage = first_visit.get(
            "mileage_at_service"
        )

        mileage_since_last_service = (
            current_mileage - last_service_mileage
            if last_service_mileage is not None
            else None
        )

        history_coverage_km = (
            current_mileage - first_service_mileage
            if first_service_mileage is not None
            else None
        )

        return MaintenanceSummary(
            total_service_visits=len(sorted_visits),
            total_maintenance_items=total_items,
            total_recorded_cost=total_cost,

            first_service_date=self._to_date(
                first_visit.get("service_date")
            ),
            last_service_date=self._to_date(
                last_visit.get("service_date")
            ),

            first_service_mileage=first_service_mileage,
            last_service_mileage=last_service_mileage,

            mileage_since_last_service=(
                mileage_since_last_service
            ),
            history_coverage_km=history_coverage_km,

            maintenance_items=[
                MaintenanceItemSummary(**summary)
                for summary in item_history.values()
            ],
        )

    @staticmethod
    def _to_date(
        value,
    ):
        if isinstance(
            value,
            datetime,
        ):
            return value.date()

        return value