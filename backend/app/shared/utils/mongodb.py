from bson import ObjectId

def to_object_id(id: str) -> ObjectId:
    return ObjectId(id)