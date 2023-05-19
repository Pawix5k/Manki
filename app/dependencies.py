import os
from datetime import datetime, timedelta
from typing import Annotated, Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status, Request
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from jose import JWTError, jwt
from passlib.context import CryptContext
import motor.motor_asyncio

from models import User, TokenData, CardUpdateRequests, Deck, Card

load_dotenv()
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = os.environ["ALGORITHM"]
MONGODB_URL = os.environ["MONGODB_URL"]

client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.manki_test


class OAuth2PasswordBearerWithCookie(OAuth2):
    def __init__(
        self,
        tokenUrl: str,
        scheme_name: Optional[str] = None,
        scopes: Optional[dict[str, str]] = None,
        auto_error: bool = True,
    ):
        if not scopes:
            scopes = {}
        flows = OAuthFlowsModel(password={"tokenUrl": tokenUrl, "scopes": scopes})
        super().__init__(flows=flows, scheme_name=scheme_name, auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[str]:
        authorization: str = request.cookies.get("access_token")

        scheme, param = get_authorization_scheme_param(authorization)
        if not authorization or scheme.lower() != "bearer":
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                return None
        return param


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


async def get_user(username: str):
    user = await db["users"].find_one({"username": username})
    if user:
        return User(**user)
    return None


async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy() 
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes = 15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(access_token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return str(user.id)


def create_update_query(card_update_requests: CardUpdateRequests) -> dict | None:
    if len(card_update_requests.requests) == 0:
        return None
    to_set = {}
    array_filters = [{"deckfil._id": card_update_requests.deck_id}]
    for i, card_update in enumerate(card_update_requests.requests):
        to_set[f"decks.$[deckfil].cards.$[cardfil{i}].question"] = card_update.new_question
        to_set[f"decks.$[deckfil].cards.$[cardfil{i}].answer"] = card_update.new_answer
        to_set[f"decks.$[deckfil].cards.$[cardfil{i}].date"] = card_update.new_date
        to_set[f"decks.$[deckfil].cards.$[cardfil{i}].last_was_wrong"] = card_update.new_last_was_wrong
        to_set[f"decks.$[deckfil].cards.$[cardfil{i}].last_interval"] = card_update.new_last_interval
        array_filters.append({f"cardfil{i}._id": card_update.card_id})
    return to_set, array_filters


def get_sample_deck() -> Deck:
    sample_cards = [
        Card(question="flag", answer="flaga"),
        Card(question="cricket", answer="świerszcz"),
        Card(question="flock", answer="stado"),
        Card(question="pulverize", answer="sproszkować"),
        Card(question="prevarication", answer="krętactwo"),
    ]
    sample_deck = Deck(name= "🇬🇧-🇵🇱 sample", cards=sample_cards)
    return sample_deck
