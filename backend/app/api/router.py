from fastapi import APIRouter
from app.api.endpoints import monitors, diffs, logs

api_router = APIRouter()

api_router.include_router(monitors.router, prefix="/monitors", tags=["Monitors"])
api_router.include_router(diffs.router, tags=["Diffs"])
api_router.include_router(logs.router, tags=["Logs & Errors"])
