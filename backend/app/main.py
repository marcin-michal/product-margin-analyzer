from fastapi import FastAPI, File, HTTPException, UploadFile

from app.db.database import engine
from app.models import models
from app.services.spreadsheet_parser import process_preview

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Product Margin Analyzer API")


@app.post("/api/imports/preview")
async def preview_spreadsheet(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        return process_preview(contents, file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")
