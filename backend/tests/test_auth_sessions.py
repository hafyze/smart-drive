import unittest
from datetime import timedelta

from app.services.auth_service import AuthService


def run_immediate_coroutine(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as completed:
        return completed.value
    raise AssertionError("The test coroutine unexpectedly waited for I/O")


class AuthSessionTests(unittest.TestCase):
    def make_service(self):
        service = AuthService.__new__(AuthService)

        class SessionRepository:
            async def insert(inner_self, document):
                inner_self.document = document

        service.session_repository = SessionRepository()
        return service

    def assert_session(self, remember_me, expected_lifetime):
        service = self.make_service()
        token = run_immediate_coroutine(
            service._create_session_token("user-id", remember_me)
        )
        session = service.session_repository.document

        self.assertNotEqual(session["token_hash"], token)
        self.assertEqual(session["token_hash"], service._hash_token(token))
        self.assertEqual(session["user_id"], "user-id")
        self.assertEqual(session["remember_me"], remember_me)
        self.assertEqual(session["revoked_at"], None)
        self.assertAlmostEqual(
            (session["expires_at"] - session["created_at"]).total_seconds(),
            expected_lifetime.total_seconds(),
            delta=0.01,
        )

    def test_short_session_stores_only_token_hash_and_expires_in_twelve_hours(self):
        self.assert_session(False, timedelta(hours=12))

    def test_remembered_session_expires_in_seven_days(self):
        self.assert_session(True, timedelta(days=7))


if __name__ == "__main__":
    unittest.main()
