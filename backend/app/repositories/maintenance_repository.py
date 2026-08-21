from app.repositories.base_repository import BaseRepository

class MaintenanceRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance")