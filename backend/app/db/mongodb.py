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
    try:
        await database["ai_research_cooldowns"].create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ai_research_cooldown_expiry",
        )
    except Exception:
        logger.exception("Unable to create AI research cooldown expiry index")
    try:
        await database["ai_conversations"].create_index(
            [("user_id", 1), ("vehicle_id", 1), ("updated_at", -1)],
            name="ai_conversations_by_owner_vehicle",
        )
        await database["ai_conversations"].create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ai_conversations_expiry",
        )
        await database["ai_conversation_turns"].create_index(
            [("conversation_id", 1), ("client_message_id", 1)],
            unique=True,
            name="ai_conversation_turn_idempotency",
        )
        await database["ai_conversation_turns"].create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ai_conversation_turns_expiry",
        )
        await database["ai_conversation_usage"].create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ai_conversation_usage_expiry",
        )
        await database["ai_conversation_cooldowns"].create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ai_conversation_cooldowns_expiry",
        )
    except Exception as exc:
        logger.exception("Unable to create required AI conversation indexes")
        raise RuntimeError("AI conversation storage indexes are unavailable.") from exc
    try:
        await database["maintenance_plans"].create_index(
            [("user_id", 1), ("vehicle_id", 1), ("updated_at", -1)],
            name="maintenance_plans_by_owner_vehicle",
        )
        await database["maintenance_plans"].create_index(
            [("user_id", 1), ("vehicle_id", 1)],
            unique=True,
            partialFilterExpression={"status": "ACTIVE"},
            name="one_active_maintenance_plan_per_vehicle",
        )
        await database["maintenance"].create_index(
            "maintenance_action_id",
            unique=True,
            partialFilterExpression={"maintenance_action_id": {"$type": "string"}},
            name="service_visit_by_maintenance_action",
        )
    except Exception as exc:
        logger.exception("Unable to create maintenance planner indexes")
        raise RuntimeError("Maintenance planner storage indexes are unavailable.") from exc
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
