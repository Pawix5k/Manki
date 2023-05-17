from __future__ import annotations

from bson import ObjectId
from pydantic import BaseModel, Field, conlist


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class Card(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    question: str = Field(...)
    answer: str = Field(...)
    date: str = "2020-01-01T00:00:00.000Z"
    last_was_wrong: bool = True
    last_interval: int = -1

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "question": "horse",
                "answer": "kon",
            }
        }


class CardRequest(BaseModel):
    question: str = Field(..., max_length=64)
    answer: str = Field(..., max_length=64)


class Deck(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(...)
    cards: list[Card] = []

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "name": "english 101",
            }
        }


class DeckRequest(BaseModel):
    name: str = Field(..., max_length=64)


class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str = Field(..., max_length=20)
    hashed_password: str = Field(...)
    decks: list[Deck] = []

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "username": "Jane Doe",
                "hashed_password": "jdoe@example.com",
            }
        }


class CardUpdateRequest(BaseModel):
    card_id: str = Field(..., max_length=64)
    new_question: str = Field(..., max_length=64)
    new_answer: str = Field(..., max_length=64)
    new_date: str = Field(..., max_length=64)
    new_last_was_wrong: bool
    new_last_interval: int


class CardUpdateRequests(BaseModel):
    deck_id: str = Field(..., max_length=64)
    requests: conlist(CardUpdateRequest, max_items=30)
