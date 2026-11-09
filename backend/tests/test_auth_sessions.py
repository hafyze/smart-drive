import unittest
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from app.repositories.session_repository import SessionRepository
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

    def test_logout_revokes_using_only_the_token_hash(self):
        service = self.make_service()

        class SessionRepository:
            async def revoke_by_token_hash(inner_self, token_hash):
                inner_self.revoked_hash = token_hash

        service.session_repository = SessionRepository()
        token = "unpredictable-session-token"

        result = run_immediate_coroutine(service.logout(token))

        self.assertEqual(result, {"success": True})
        self.assertEqual(
            service.session_repository.revoked_hash,
            service._hash_token(token),
        )
        self.assertNotEqual(service.session_repository.revoked_hash, token)

    def test_authentication_rejects_missing_or_expired_session_before_user_lookup(self):
        service = self.make_service()

        class SessionRepository:
            async def find_active_by_token_hash(self, _token_hash):
                return None

        class UserRepository:
            async def get_by_id(self, _user_id):
                raise AssertionError("User lookup must not happen for an invalid session")

        service.session_repository = SessionRepository()
        service.repository = UserRepository()

        with self.assertRaises(HTTPException) as caught:
            run_immediate_coroutine(
                service.get_current_user_by_token("expired-or-revoked")
            )

        self.assertEqual(caught.exception.status_code, 401)

    def test_session_lookup_requires_unrevoked_and_unexpired_hash(self):
        repository = SessionRepository.__new__(SessionRepository)

        async def find_one(query):
            repository.query = query
            return None

        repository.find_one = find_one
        before = datetime.now(timezone.utc)
        run_immediate_coroutine(repository.find_active_by_token_hash("hashed-token"))
        after = datetime.now(timezone.utc)

        self.assertEqual(repository.query["token_hash"], "hashed-token")
        self.assertIsNone(repository.query["revoked_at"])
        self.assertLessEqual(repository.query["expires_at"]["$gt"], after)
        self.assertGreaterEqual(repository.query["expires_at"]["$gt"], before)


if __name__ == "__main__":
    unittest.main()
