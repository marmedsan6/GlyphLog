from pydantic import BaseModel

from app.models.entry import EntryType


class ExternalSearchResult(BaseModel):
    title: str
    year: int | None = None
    cover_image: str | None = None
    type: EntryType
    source: str


class ExternalSearchResponse(BaseModel):
    results: list[ExternalSearchResult]
