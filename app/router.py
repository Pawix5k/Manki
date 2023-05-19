
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.security import OAuth2PasswordRequestForm

from config import ACCESS_TOKEN_EXPIRE_MINUTES, NUMBER_OF_CARDS_LIMIT, NUMBER_OF_DECKS_LIMIT
from dependencies import db, authenticate_user, create_access_token, get_current_user, create_update_query, get_password_hash, get_sample_deck
from models import User, Token, Deck, Card, CardRequest, DeckRequest


router = APIRouter()


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    content = {"access_token": access_token, "token_type": "bearer"}
    response = JSONResponse(status_code=200, content=content)
    response.set_cookie(key="access_token", value=f"Bearer {access_token}", httponly=True)
    return response


@router.post("/user")
async def register(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    code = await db["codes"].find_one({"code": form_data.client_secret})

    if not code or code.get("used"):
        raise HTTPException(status_code=401, detail=f"Invite code incorrect or already used")
    user_exists = await db["users"].find_one({"username": form_data.username})

    if user_exists:
        raise HTTPException(status_code=409, detail=f"Username already taken")
    
    hashed_password = get_password_hash(form_data.password)
    user = User(username=form_data.username, hashed_password=hashed_password, decks = [get_sample_deck()])
    user = jsonable_encoder(user)
    await db["users"].insert_one(user)
    await db["codes"].update_one({"code": form_data.client_secret}, {"$set": {"used": True}})
    return Response(status_code=204)
    

@router.post("/logout")
async def logout():
    response = Response(status_code=204)
    response.delete_cookie(key="access_token")
    return response


@router.get("/decks")
async def read_decks(user_id: Annotated[str, Depends(get_current_user)]):
    user = await db["users"].find_one({"_id": user_id}, {"decks._id": 1, "decks.name": 1})
    if user:
        decks = jsonable_encoder(user.get("decks"))
        return JSONResponse(status_code=200, content=decks)
    raise HTTPException(status_code=404, detail=f"Something went wrong")


@router.get("/decks/{deck_id}")
async def read_deck(user_id: Annotated[str, Depends(get_current_user)], deck_id: str):
    pipeline = [
        {"$match": {"_id": user_id}},
        {"$unwind": "$decks"},
        {"$match": {"decks._id": deck_id}},
        {"$project": {"_id": 0, "deck": "$decks"}},
    ]
    deck = await db["users"].aggregate(pipeline).to_list(length=1)
    if deck:
        deck = jsonable_encoder(deck[0]["deck"]) # 
        return JSONResponse(status_code=200, content=deck)
    raise HTTPException(status_code=404, detail=f"Deck not found")


@router.post("/decks")
async def create_deck(user_id: Annotated[str, Depends(get_current_user)], deck_request: DeckRequest = Body(...)):
    pipeline = [
        {"$match": {"_id": user_id}},
        {"$project": {"_id": 0, "numberOfDecks": {"$size": "$decks"}}},
    ]
    numbers_of_decks = await db["users"].aggregate(pipeline).to_list(length=1)
    number_of_decks = numbers_of_decks[0]["numberOfDecks"]
    if number_of_decks >= NUMBER_OF_DECKS_LIMIT:
        raise HTTPException(status_code=403, detail=f"Limit of number of decks reached")
    
    deck = Deck(**deck_request.dict())
    deck = jsonable_encoder(deck)
    await db["users"].update_one({'_id': user_id}, {"$push" : {"decks" : deck} })
    return Response(status_code=201)


@router.delete("/decks/{deck_id}")
async def delete_deck(user_id: Annotated[str, Depends(get_current_user)], deck_id: str):
    result = await db["users"].update_one({"_id": user_id}, {"$pull": {"decks": {"_id": deck_id}}})
    if result.modified_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    raise HTTPException(status_code=404, detail=f"Deck {deck_id} not found")


@router.post("/cards/{deck_id}")
async def create_card(user_id: Annotated[str, Depends(get_current_user)], deck_id: str, card_request: CardRequest = Body(...)):
    pipeline = [
        {"$match": {"_id": user_id}},
        {"$unwind": "$decks"},
        {"$match": {"decks._id": deck_id}},
        {"$project": {"_id": 0, "numberOfCards": {"$size": "$decks.cards"}}}
    ]
    numbers_of_cards = await db["users"].aggregate(pipeline).to_list(length=1)
    if not numbers_of_cards:
        raise HTTPException(status_code=404, detail=f"No deck matching")
    number_of_cards = numbers_of_cards[0]["numberOfCards"]
    if number_of_cards is None:
        raise HTTPException(status_code=404, detail=f"Something went wrong")
    if number_of_cards >= NUMBER_OF_CARDS_LIMIT:
        raise HTTPException(status_code=403, detail=f"Limit of number of cards in this deck reached")

    card = Card(**card_request.dict())
    card = jsonable_encoder(card)
    fil = {"_id": user_id}
    update = {"$push": {"decks.$[deck].cards": card}}
    arr_fil = [{"deck._id": deck_id}]
    result = await db["users"].update_one(fil, update, array_filters=arr_fil)
    if result.modified_count == 1:
        return Response(status_code=201)
    raise HTTPException(status_code=404, detail=f"Something went wrong")


@router.put("/decks")
async def update_cards(user_id: Annotated[str, Depends(get_current_user)], update_dicts: Annotated[tuple, Depends(create_update_query)]):
    if not update_dicts:
        return Response(status_code=204)
    to_set, array_filters = update_dicts
    filter_ = {"_id": user_id}
    update = {"$set": to_set}
    await db["users"].update_one(filter_, update, array_filters=array_filters)
    return Response(status_code=204)


@router.delete("/cards/{card_id}")
async def delete_card(user_id: Annotated[str, Depends(get_current_user)], card_id: str):
    result = await db["users"].update_one(
        {"_id": user_id, "decks.cards._id": card_id},
        {"$pull": {"decks.$.cards": {"_id": card_id}}
    })
    if result.modified_count == 1:
        return Response(status_code=204)
    raise HTTPException(status_code=404, detail=f"Card {card_id} not found")


@router.get("/")
async def get_starting_page():
    return FileResponse("static/index.html")
