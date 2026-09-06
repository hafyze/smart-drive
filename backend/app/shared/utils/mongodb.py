from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status


def to_object_id(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID format.",
        )