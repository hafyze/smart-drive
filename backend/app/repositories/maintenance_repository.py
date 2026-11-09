from app.repositories.base_repository import BaseRepository

class MaintenanceRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance")

    async def find_by_action_id(self, maintenance_action_id: str):
        return await self.collection.find_one({"maintenance_action_id": maintenance_action_id})
