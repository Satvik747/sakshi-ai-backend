# SAKSHI-AI Backend

A FastAPI backend that analyzes MPLADS (Members of Parliament Local Area Development Scheme) expenditure data to flag anomalies, detect duplicate/suspicious entries via NLP, and cluster MPs into risk segments.

Live app: https://sakshi-ai-backend.vercel.app

## Pipeline

The project runs as a sequential data pipeline, each stage producing a CSV consumed by the next:

| Step | Script | Purpose |
|------|--------|---------|
| 1 | `step1_cleaner.py` | Cleans raw MPLADS expenditure data → `cleaned_expenditures.csv` |
| 2 | `step2_anomaly_engine.py` | Flags anomalous expenditures → `scored_expenditures.csv` |
| 3 | `step3_kmeans.py` | Clusters MPs into risk segments (K-Means) → `mp_risk_segments.csv` |
| 4 | `step4_nlp_engine.py` | Detects duplicate/similar entries via NLP → `flagged_nlp_duplicates.csv` |

`main.py` serves the resulting CSVs through a REST API.

## Requirements

- Python 3.10+
- fastapi >= 0.115
- uvicorn[standard] >= 0.30
- pandas >= 2.0
- scikit-learn >= 1.4
- numpy >= 1.26

## Setup

```bash
git clone https://github.com/Satvik747/sakshi-ai-backend.git
cd sakshi-ai-backend
pip install -r requirements.txt
```

## Running the pipeline

Run the steps in order to (re)generate the data files consumed by the API:

```bash
python step1_cleaner.py
python step2_anomaly_engine.py
python step3_kmeans.py
python step4_nlp_engine.py
```

## Running the API

```bash
uvicorn main:app --reload
```

The server starts at `http://127.0.0.1:8000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/` | Health check — returns API status |
| GET | `/api/anomalies` | Returns expenditure records flagged as anomalies |
| GET | `/api/duplicates` | Returns records flagged as NLP-detected duplicates |
| GET | `/api/mp-segments` | Returns MPs grouped into risk segments |

Responses are cached in memory after the first read of each CSV.

## Project Structure

```
sakshi-ai-backend/
├── main.py                          # FastAPI app & API routes
├── step1_cleaner.py                 # Data cleaning
├── step2_anomaly_engine.py          # Anomaly detection
├── step3_kmeans.py                  # MP risk clustering
├── step4_nlp_engine.py              # NLP duplicate detection
├── cleaned_expenditures.csv
├── scored_expenditures.csv
├── mp_risk_segments.csv
├── flagged_nlp_duplicates.csv
├── mplads_expenditures_2026-08-22.csv  # Raw source data
├── frontend/                        # Frontend app
├── requirements.txt
└── .gitignore
```


