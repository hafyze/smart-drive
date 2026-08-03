from app.repositories.base_repository import BaseRepository
from bson.objectid import ObjectId

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    async def get_by_email(self, email:str):
        return await self.find_one(
            {
                "email": email.lower(),
            }
        )

    async def get_by_id(self, user_id: str):
        return await self.find_one(
            {
                "_id": ObjectId(user_id)
            }
        )

