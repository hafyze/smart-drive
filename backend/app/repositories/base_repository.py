from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_database


class BaseRepository:
    def __init__(self, collection_name: str):
        db: AsyncIOMotorDatabase = get_database()
        self.collection = db[collection_name]

    async def insert(self, document: dict) -> dict:
        result = await self.collection.insert_one(document)

        document["_id"] = result.inserted_id

        return document

    async def find_one(self, filter_query: dict):
        return await self.collection.find_one(filter_query)

    async def find_many(
        self,
        filter_query: dict = {},
        limit: int | None = None,
    ):
        cursor = self.collection.find(filter_query)

        if limit:
            cursor = cursor.limit(limit)

        return await cursor.to_list(length=limit)

    async def update(
        self,
        filter_query: dict,
        update_data: dict,
    ):
        await self.collection.update_one(
            filter_query,
            {
                "$set": update_data,
            },
        )

        return await self.find_one(filter_query)

    async def delete(self, filter_query: dict):
        result = await self.collection.delete_one(filter_query)

        return result.deleted_count > 0