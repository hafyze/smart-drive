from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None

async def connect_mongodb():
    global client, database

    client  = AsyncIOMotorClient(settings.mongodb_uri)
    database = client[settings.mongodb_database]

    #Verify conn
    await client.admin.command("ping")
    print("Connected to MongoDB...")

async def disconnect_mongodb():
    global client

    if client:
        client.close()
        print("MongoDB connection closed...")

def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("Database not initalized...")

    return database