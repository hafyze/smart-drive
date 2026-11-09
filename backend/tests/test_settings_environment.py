import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings


class SettingsEnvironmentTests(unittest.TestCase):
    def test_dotenv_local_overrides_dotenv_and_process_environment_overrides_both(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as directory:
            base_env = Path(directory) / ".env"
            local_env = Path(directory) / ".env.local"
            base_env.write_text(
                "APP_ENV=development\nAPP_NAME=from-base\nMONGODB_DATABASE=base_db\n",
                encoding="utf-8",
            )
            local_env.write_text(
                "APP_NAME=from-local\nMONGODB_DATABASE=local_db\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"MONGODB_DATABASE": "from-process"}, clear=True):
                settings = Settings(_env_file=(base_env, local_env))

        self.assertEqual(settings.app_name, "from-local")
        self.assertEqual(settings.mongodb_database, "from-process")

    def test_production_process_environment_ignores_dotenv_files(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as directory:
            base_env = Path(directory) / ".env"
            local_env = Path(directory) / ".env.local"
            base_env.write_text("APP_NAME=developer-base-secret-config\n", encoding="utf-8")
            local_env.write_text("APP_NAME=developer-local-secret-config\n", encoding="utf-8")
            production_environment = {
                "APP_ENV": "production",
                "JWT_SECRET": "test-only-production-shaped-secret-0123456789",
                "MONGODB_URI": "mongodb+srv://test.invalid/smartdrive",
                "MONGODB_DATABASE": "smartdrive",
                "CORS_ORIGINS": '["https://smartdrive.example"]',
            }
            with patch.dict(os.environ, production_environment, clear=True):
                settings = Settings(_env_file=(base_env, local_env))

        self.assertEqual(settings.app_name, "AutoCare API")
        self.assertEqual(settings.app_env, "production")
        self.assertEqual(settings.mongodb_database, "smartdrive")

    def test_dotenv_cannot_switch_app_into_production_mode(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as directory:
            dotenv_path = Path(directory) / ".env.local"
            dotenv_path.write_text(
                "APP_ENV=production\nAPP_NAME=developer-local-secret-config\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {}, clear=True):
                with self.assertRaisesRegex(ValueError, "process environment"):
                    Settings(_env_file=dotenv_path)


if __name__ == "__main__":
    unittest.main()
