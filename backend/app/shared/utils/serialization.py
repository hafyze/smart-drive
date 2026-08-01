from typing import Any

def serialize_document(document: dict[str, Any] | None) -> dict[str, Any]:    
    """
    Convert MongoDB document into JSON-friendly format.
    """

    if document is None:
        raise ValueError("Document cannot be None")

    document = document.copy()

    if "_id" in document:
        document["id"] = str(document.pop("_id"))

    if "user_id" in document:
        document["user_id"] = str(document["user_id"])

    return document