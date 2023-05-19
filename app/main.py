import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from router import router

load_dotenv()

if os.environ.get("MODE") == "dev":
    app = FastAPI()
    origins = ["*"]
else:
    app = FastAPI(docs_url=None, redoc_url=None)
    origins = [
        "https://manki.herokuapp.com",
        "http://manki.herokuapp.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.mount("/static", StaticFiles(directory="static"), name="static")
