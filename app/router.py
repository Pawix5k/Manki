
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.security import OAuth2PasswordRequestForm

from config import ACCESS_TOKEN_EXPIRE_MINUTES
from dependencies import db, authenticate_user, create_access_token, get_current_user, create_update_query, get_password_hash
from models import User, Token, Deck, Card


router = APIRouter()


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authentiate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    content = {"access_token": access_token, "token_type": "bearer"}
    response = JSONResponse(content=content)
    response.set_cookie(key="access_token", value=f"Bearer {access_token}", httponly=True)
    return response


# @router.post("/user", response_description="Add new user", response_model=User)
# async def create_user(user: User = Body(...)):
#     user = jsonable_encoder(user)
#     new_user = await db["users"].insert_one(user)
#     print(type(new_user.inserted_id))
#     created_user = await db["users"].find_one({"_id": new_user.inserted_id})
#     return JSONResponse(status_code=status.HTTP_201_CREATED, content=created_user)


@router.post("/user", response_description="Add new user", response_model=User)
async def register(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    print(form_data.client_secret)
    code = await db["codes"].find_one({"code": form_data.client_secret})
    if code and not code.get("used"):
        hashed_password = get_password_hash(form_data.password)
        user = User(username=form_data.username, hashed_password=hashed_password)
        user = jsonable_encoder(user)
        new_user = await db["users"].insert_one(user)
        updated_code = await db["codes"].update_one({"code": form_data.client_secret}, {"$set": {"used": True}})
        return Response(status_code=204)
    raise HTTPException(status_code=404, detail=f"Incorrect invite code")



@router.delete("/deck/{deck_id}")
async def delete_deck(user_id: Annotated[str, Depends(get_current_user)], deck_id: str):
    result = await db["users"].update_one({"_id": user_id}, {"$pull": {"decks": {"_id": deck_id}}})
    if result.modified_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    raise HTTPException(status_code=404, detail=f"Deck {deck_id} not found")


@router.get("/deck/{deck_id}")
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
    raise HTTPException(status_code=404, detail=f"Deck {deck_id} not found")



@router.post("/deck", response_description="Add new deck", response_model=Deck)
async def create_deck(user_id: Annotated[str, Depends(get_current_user)], deck: Deck = Body(...)):
    print(deck)
    deck = jsonable_encoder(deck)
    new_deck = await db["users"].update_one({'_id': user_id}, {"$push" : {"decks" : deck} })
    created_deck = await db["users"].find_one({"_id": user_id})
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=created_deck)


@router.get("/decks", response_description="read decks", response_model=User)
async def read_own_items(user_id: Annotated[str, Depends(get_current_user)]):
    # decks = await db["users"].find_one(user_id)
    decks = await db["users"].find_one({"_id": user_id}, {"decks._id": 1, "decks.name": 1})
    decks = decks["decks"]
    decks = jsonable_encoder(decks)
    return JSONResponse(status_code=200, content=decks)


@router.post("/card/{deck_id}", response_description="Add new card")
async def create_card(user_id: Annotated[str, Depends(get_current_user)], deck_id: str, card: Card = Body(...)):
    card = jsonable_encoder(card)
    fil = {"_id": user_id}
    update = {"$push": {"decks.$[deck].cards": card}}
    arr_fil = [{"deck._id": deck_id}]
    updated_user = await db["users"].update_one(fil, update, array_filters=arr_fil)
    return Response(status_code=201)


@router.delete("/card/{card_id}", response_description="Delete card")
async def delete_card(user_id: Annotated[str, Depends(get_current_user)], card_id: str):
    result = await db["users"].update_one(
        {
            "_id": user_id,
            "decks.cards._id": card_id
        },
        {
            "$pull":
            {
                "decks.$.cards": {
                "_id": card_id
            }
        }
    })

    if result.modified_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    raise HTTPException(status_code=404, detail=f"Deck {card_id} not found")


@router.post("/deck_update", response_description="Update cards in deck")
async def update_deck(user_id: Annotated[str, Depends(get_current_user)], update_dicts: Annotated[tuple, Depends(create_update_query)]):
    to_set, array_filters = update_dicts
    print(to_set)
    print(array_filters)
    fil = {"_id": user_id}
    update = {"$set": to_set}
    updated_user = await db["users"].update_one(fil, update, array_filters=array_filters)
    updated_user = await db["users"].find_one({"_id": user_id})
    return JSONResponse(status_code=201, content=updated_user)


@router.get("/")
async def get_starting_page():
    return FileResponse("static/index.html")
