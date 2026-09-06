from app.repositories.base_repository import BaseRepository

class ReceiptRepository(BaseRepository):
    def __init__(self):
        super().__init__("receipts")