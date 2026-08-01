from fastapi import FastAPI

async def get_current_user_id() -> str:
    """
    Temporary authentication dependency.

    Replace this with JWT authentication later.
    """
    return "demo-user"