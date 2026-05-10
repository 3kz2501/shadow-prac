"""ShadowPrac backend - FastAPI application."""

import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import HOST, PORT, DATA_DIR
from db import init_db, close_db
from routers import import_router, sessions, chunks, scoring, vocab, tts, dictionary, annotations


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="ShadowPrac", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for audio access
app.mount("/static/data", StaticFiles(directory=str(DATA_DIR)), name="data")

# Register routers
app.include_router(import_router.router)
app.include_router(sessions.router)
app.include_router(chunks.router)
app.include_router(scoring.router)
app.include_router(vocab.router)
app.include_router(tts.router)
app.include_router(dictionary.router)
app.include_router(annotations.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
