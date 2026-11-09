import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None
logger = logging.getLogger(__name__)

async def connect_mongodb():
    global client, database

    client  = AsyncIOMotorClient(settings.mongodb_uri)
    database = client[settings.mongodb_database]

    #Verify conn
    await client.admin.command("ping")
    try:
        await database["maintenance_knowledge"].create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="maintenance_knowledge_expiry",
        )
    except Exception:
        logger.exception("Unable to create maintenance knowledge cache expiry index")
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
