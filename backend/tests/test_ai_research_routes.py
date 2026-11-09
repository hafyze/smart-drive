import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, Response, status

from app.ai.schemas import MaintenanceSummary, VehicleIdentity, VehicleIdentityConfidence
from app.dependencies.auth_dependencies import get_current_user
from app.routes.ai import get_cached_vehicle_research, research_vehicle, router
from app.routes.ai import get_cached_predictive_maintenance, research_predictive_maintenance
from app.ai.predictive_schemas import PredictiveMaintenanceRequest


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The route coroutine unexpectedly waited for I/O")


class AIResearchRouteTests(unittest.TestCase):
    def context(self):
        return SimpleNamespace(
            vehicle=SimpleNamespace(
                identity=VehicleIdentity(
                    manufacturer="Perodua", model="Myvi", year=2023,
                    confidence=VehicleIdentityConfidence.MEDIUM,
                ),
                current_mileage=50_000,
            ),
            maintenance=MaintenanceSummary(),
        )

    def test_research_routes_require_authenticated_user_dependency(self):
        routes = [route for route in router.routes if getattr(route, "path", "").startswith("/ai/research/")]
        self.assertEqual(len(routes), 2)
        for route in routes:
            self.assertIn(get_current_user, [dependency.call for dependency in route.dependant.dependencies])

    def test_cached_miss_is_204_and_does_not_start_provider_research(self):
        builder = SimpleNamespace(build=AsyncMock(return_value=self.context()))
        service = SimpleNamespace(get_cached_profile=AsyncMock(return_value=None))
        with patch("app.routes.ai.VehicleContextBuilder", return_value=builder), patch(
            "app.routes.ai.MaintenanceKnowledgeService", return_value=service,
        ) as service_factory:
            response = run_immediate_coroutine(get_cached_vehicle_research(
                "vehicle-1", current_user={"id": "owner-1"},
            ))

        self.assertIsInstance(response, Response)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        builder.build.assert_awaited_once_with(vehicle_id="vehicle-1", user_id="owner-1")
        service.get_cached_profile.assert_awaited_once()
        service_factory.assert_called_once()

    def test_owner_rejection_stops_before_research_service(self):
        builder = SimpleNamespace(build=AsyncMock(side_effect=HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.",
        )))
        with patch("app.routes.ai.VehicleContextBuilder", return_value=builder), patch(
            "app.routes.ai.MaintenanceKnowledgeService"
        ) as service_factory:
            with self.assertRaises(HTTPException) as caught:
                run_immediate_coroutine(research_vehicle(
                    "other-users-car", current_user={"id": "owner-1"},
                ))

        self.assertEqual(caught.exception.status_code, status.HTTP_403_FORBIDDEN)
        service_factory.assert_not_called()

    def test_malformed_vehicle_id_is_rejected_without_provider_call(self):
        builder = SimpleNamespace(build=AsyncMock(side_effect=HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format.",
        )))
        with patch("app.routes.ai.VehicleContextBuilder", return_value=builder), patch(
            "app.routes.ai.MaintenanceKnowledgeService"
        ) as service_factory:
            with self.assertRaises(HTTPException) as caught:
                run_immediate_coroutine(research_vehicle(
                    "not-an-object-id", current_user={"id": "owner-1"},
                ))

        self.assertEqual(caught.exception.status_code, status.HTTP_400_BAD_REQUEST)
        service_factory.assert_not_called()

    def test_predictive_routes_are_authenticated_and_cached_miss_is_provider_free(self):
        routes = [route for route in router.routes if getattr(route, "path", "").startswith("/ai/predictive-maintenance/")]
        self.assertEqual(len(routes), 2)
        for route in routes:
            self.assertIn(get_current_user, [dependency.call for dependency in route.dependant.dependencies])
        context = SimpleNamespace()
        builder = SimpleNamespace(build_conversation_context=AsyncMock(return_value=context))
        service = SimpleNamespace(get_cached_report=AsyncMock(return_value=None))
        with patch("app.routes.ai.VehicleContextBuilder", return_value=builder), patch(
            "app.routes.ai.PredictiveMaintenanceService", return_value=service,
        ) as service_factory:
            response = run_immediate_coroutine(get_cached_predictive_maintenance("vehicle-1", {"id": "owner-1"}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        builder.build_conversation_context.assert_awaited_once_with("vehicle-1", "owner-1")
        service_factory.assert_called_once()

    def test_predictive_owner_failure_stops_before_service(self):
        builder = SimpleNamespace(build_conversation_context=AsyncMock(side_effect=HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.",
        )))
        with patch("app.routes.ai.VehicleContextBuilder", return_value=builder), patch(
            "app.routes.ai.PredictiveMaintenanceService"
        ) as service_factory:
            with self.assertRaises(HTTPException) as caught:
                run_immediate_coroutine(research_predictive_maintenance(
                    "other-users-car", PredictiveMaintenanceRequest(refresh=True), {"id": "owner-1"},
                ))
        self.assertEqual(caught.exception.status_code, status.HTTP_403_FORBIDDEN)
        service_factory.assert_not_called()

    def test_predictive_refresh_is_forwarded_only_after_vehicle_ownership_check(self):
        context = SimpleNamespace()
        builder = SimpleNamespace(build_conversation_context=AsyncMock(return_value=context))
        report = {"vehicle_id": "vehicle-1"}
        service = SimpleNamespace(research=AsyncMock(return_value=report))
        with patch("app.routes.ai.VehicleContextBuilder", return_value=builder), patch(
            "app.routes.ai.PredictiveMaintenanceService", return_value=service,
        ):
            result = run_immediate_coroutine(research_predictive_maintenance(
                "vehicle-1", PredictiveMaintenanceRequest(refresh=True), {"id": "owner-1"},
            ))
        self.assertEqual(result, report)
        service.research.assert_awaited_once_with("owner-1", "vehicle-1", context, refresh=True)


if __name__ == "__main__":
    unittest.main()
