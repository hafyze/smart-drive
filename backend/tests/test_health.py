import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.routes.health import health


class FakeDatabase:
    def __init__(self, error=None):
        self.error = error
        self.commands = []

    async def command(self, command):
        self.commands.append(command)
        if self.error:
            raise self.error
        return {"ok": 1}


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


class HealthRouteTests(unittest.TestCase):
    def test_health_checks_database(self):
        database = FakeDatabase()

        with patch("app.routes.health.get_database", return_value=database):
            response = run_immediate_coroutine(health())

        self.assertEqual(database.commands, ["ping"])
        self.assertEqual(response["status"], "healthy")
        self.assertEqual(response["database"], "connected")

    def test_health_returns_503_when_database_ping_fails(self):
        database = FakeDatabase(error=ConnectionError("database unavailable"))

        with patch("app.routes.health.get_database", return_value=database):
            with self.assertRaises(HTTPException) as raised:
                run_immediate_coroutine(health())

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail["database"], "disconnected")


if __name__ == "__main__":
    unittest.main()
