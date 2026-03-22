from pydantic import BaseModel


class PaginatedResponse[T](BaseModel):
    data: list[T]
    total: int
    skip: int
    limit: int
