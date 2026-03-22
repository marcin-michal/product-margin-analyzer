from fastapi import FastAPI

from app.api.routers import imports
from app.db.database import engine
from app.models import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Product Margin Analyzer API")

app.include_router(imports.router)
