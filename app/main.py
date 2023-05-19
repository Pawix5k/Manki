import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from router import router

load_dotenv()

if os.environ.get("MODE") == "dev":
    app = FastAPI()
else:
    app = FastAPI(docs_url=None, redoc_url=None)   

app.include_router(router)
app.mount("/static", StaticFiles(directory="static"), name="static")
