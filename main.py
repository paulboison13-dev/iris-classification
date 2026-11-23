from backend.main import app

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from backend.main import app

# Locate the frontend directory
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Serve the frontend after registering the API routes
app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIR, html=True),
    name="frontend"
)

