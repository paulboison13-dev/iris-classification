from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import json
from fastapi.responses import FileResponse

# Create FastAPI application
app = FastAPI(
    title="Iris Flower Classification API",
    description="An API that predicts Iris flower species using Machine Learning.",
    version="1.0.0"
)

# Allow communication with our frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained machine learning model
BASE_DIR = Path(__file__).resolve().parent

model = joblib.load(BASE_DIR / "iris_model.pkl")
# Load model evaluation results
with open(BASE_DIR / "evaluation_results.json", "r") as file:
    evaluation_results = json.load(file)

# Define the input data structure
class IrisInput(BaseModel):
    sepal_length: float = Field(gt=0, le=20)
    sepal_width: float = Field(gt=0, le=20)
    petal_length: float = Field(gt=0, le=20)
    petal_width: float = Field(gt=0, le=20)

# Home endpoint
@app.get("/")
def home():
    return FileResponse(BASE_DIR.parent / "frontend" / "index.html")
    
@app.get("/metrics")
def get_metrics():
    return evaluation_results

# Prediction endpoint
@app.post("/predict")
def predict_species(data: IrisInput):

    # Arrange measurements in the correct feature order
    input_data = np.array([[
        data.sepal_length,
        data.sepal_width,
        data.petal_length,
        data.petal_width
    ]])

    # Predict flower species
    prediction = model.predict(input_data)[0]

    # Get prediction probabilities
    probabilities = model.predict_proba(input_data)[0]

    # Get the highest prediction probability
    confidence = float(np.max(probabilities)) * 100

    return {
        "predicted_species": str(prediction).capitalize(),
        "confidence": round(confidence, 2),
        "message": f"The predicted Iris species is {str(prediction).capitalize()}."
    }
