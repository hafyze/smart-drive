from app.repositories.base_repository import BaseRepository


class VehicleRepository(BaseRepository):
    def __init__(self):
        super().__init__("vehicles")