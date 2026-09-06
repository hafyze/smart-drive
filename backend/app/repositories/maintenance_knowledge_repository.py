from app.repositories.base_repository import BaseRepository


class MaintenanceKnowledgeRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance_knowledge")