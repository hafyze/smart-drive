from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_database


class VehicleRepository:
    def __init__(self):
        db: AsyncIOMotorDatabase = get_database()
        self.collection = db["vehicles"]

    # Insert new document into collection
    async def insert(self, document: dict):
        result = await self.collection.insert_one(document)

        document["_id"] = result.inserted_id

        return document

    # Find multi document matched filter
    async def find_many(self, filter_query: dict):
        cursor = self.collection.find(filter_query)

        return await cursor.to_list(length=None)

    # Find one document matched filter
    async def find_one(self, vehicle_id: str):
        return await self.collection.find_one(
            {
                "_id": ObjectId(vehicle_id)
            }
        )

    # Update single document and return updated doc
    async def update(self, vehicle_id: str, update_data: dict):
        await self.collection.update_one(
            {
                "_id": ObjectId(vehicle_id)
            },
            {
                "$set": update_data
            }
        )

        return await self.find_one(vehicle_id)

    # Delete a doc
    async def delete(self, vehicle_id: str):
        result = await self.collection.delete_one(
            {
                "_id": ObjectId(vehicle_id)
            }
        )

        return result.deleted_count > 0