from typing import Any
from bson import ObjectId


def serialize_document(document: dict[str, Any] | None) -> dict[str, Any]:
    """
    Convert MongoDB document into JSON-friendly format.

    - Converts MongoDB ObjectId values to strings.
    - Converts the document's `_id` field into `id`.
    - Handles ObjectId values inside nested dictionaries and lists.
    """

    if document is None:
        raise ValueError("Document cannot be None")

    def convert(value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)

        if isinstance(value, dict):
            return {
                key: convert(val)
                for key, val in value.items()
            }

        if isinstance(value, list):
            return [
                convert(item)
                for item in value
            ]

        return value

    document = document.copy()

    if "_id" in document:
        document["id"] = str(document.pop("_id"))

    return convert(document)