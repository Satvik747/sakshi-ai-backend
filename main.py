from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

app = FastAPI(title="SAKSHI-AI API")

# Allow React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_data(filepath):
    if os.path.exists(filepath):
        df = pd.read_csv(filepath).fillna("")
        return df.to_dict(orient="records")
    return []

@app.get("/")
def health_check():
    return {"status": "SAKSHI-AI Backend is Live"}

@app.get("/api/anomalies")
def get_anomalies():
    # Load the scored data and return only the flagged frauds (-1)
    if os.path.exists("scored_expenditures.csv"):
        df = pd.read_csv("scored_expenditures.csv")
        anomalies = df[df['Anomaly_Flag'] == -1].fillna("")
        return anomalies.to_dict(orient="records")
    return {"error": "Scored data not found"}

@app.get("/api/duplicates")
def get_duplicates():
    return load_data("flagged_nlp_duplicates.csv")

@app.get("/api/mp-segments")
def get_mp_segments():
    return load_data("mp_risk_segments.csv")