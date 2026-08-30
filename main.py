from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

app = FastAPI(title="SAKSHI-AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict[str, list] = {}


def load_data(filepath: str, cache_key: str) -> list:
    if cache_key in _cache:
        return _cache[cache_key]
    if os.path.exists(filepath):
        df = pd.read_csv(filepath).fillna("")
        records = df.to_dict(orient="records")
        _cache[cache_key] = records
        return records
    return []


@app.get("/")
def health_check():
    return {"status": "SAKSHI-AI Backend is Live"}


@app.get("/api/anomalies")
def get_anomalies():
    cache_key = "anomalies"
    if cache_key in _cache:
        return _cache[cache_key]

    filepath = "scored_expenditures.csv"
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        anomalies = df[df["Anomaly_Flag"] == -1].fillna("")
        records = anomalies.to_dict(orient="records")
        _cache[cache_key] = records
        return records

    return []


@app.get("/api/duplicates")
def get_duplicates():
    return load_data("flagged_nlp_duplicates.csv", "duplicates")


@app.get("/api/mp-segments")
def get_mp_segments():
    return load_data("mp_risk_segments.csv", "segments")