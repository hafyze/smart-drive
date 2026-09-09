from pydantic import BaseModel, HttpUrl

class SearchResult(BaseModel):
    title: str
    url: HttpUrl
    content: str | None = None
    score: float | None = None
    query: str | None = None
    