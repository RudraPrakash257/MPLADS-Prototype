"""
MPLADS Intelligence Platform - FastAPI Server

Phase 3: API endpoints for ML integration
- GET /api/dashboard - Executive dashboard data
- GET /api/works - List and filter works
- GET /api/works/{work_id} - Work detail with risk evidence
- GET /api/anomalies - Anomaly explorer with filters
- GET /api/detectors - Detector inventory
- GET /api/risk-summary - Risk level distribution
- POST /api/review - Submit human review label
- GET /api/reviews - List review queue
- POST /api/predict - Score single work
"""

import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib

from ml.risk_engine import RiskEngine
from ml.predict import MPLADSPredictor

# --- Global state ---
risk_engine = None
predictor = None
works_df = None
global_scored_df = None


def _load_data():
    """Load the recommended works dataset."""
    path = PROJECT_ROOT / "data" / "works_recommended.csv"
    df = pd.read_csv(path)
    return df


def _load_models():
    """Load models and data at startup."""
    global risk_engine, predictor, works_df, global_scored_df
    if works_df is not None and risk_engine is not None and global_scored_df is not None:
        print("[STARTUP] Models already loaded — skipping reload.")
        return

    try:
        print("[STARTUP] Loading risk engine...")
        risk_engine = RiskEngine.load(str(PROJECT_ROOT / "ml" / "risk_engine.pkl"))
        print("[STARTUP] Risk engine loaded.")
    except Exception as e:
        print(f"[STARTUP] Could not load risk_engine.pkl: {e}")
        risk_engine = None

    try:
        print("[STARTUP] Loading predictor...")
        predictor = MPLADSPredictor()
        predictor.load_model()
        predictor.load_risk_engine()
        print("[STARTUP] Predictor loaded.")
    except Exception as e:
        print(f"[STARTUP] Could not load model pipeline: {e}")
        predictor = None

    try:
        works_df = _load_data()
        print(f"[STARTUP] Loaded {len(works_df)} works from CSV.")
    except Exception as e:
        print(f"[STARTUP] Could not load works CSV: {e}")
        works_df = None

    if risk_engine and works_df is not None:
        print("[STARTUP] Pre-scoring all works for faster API response...")
        try:
            scores = risk_engine.score_all_works(works_df)
            # workId is not unique — merge would cartesian-explode rows.
            # Align scores by row position instead.
            base = works_df.reset_index(drop=True)
            score_cols = scores.reset_index(drop=True)
            if "work_id" in score_cols.columns:
                score_cols = score_cols.drop(columns=["work_id"])
            global_scored_df = pd.concat([base, score_cols], axis=1)
            global_scored_df["work_id"] = global_scored_df["workId"].astype(int)
            global_scored_df["row_id"] = global_scored_df.index.astype(int)
            print(f"[STARTUP] Scoring complete ({len(global_scored_df)} works).")
        except Exception as e:
            print(f"[STARTUP] Error during scoring: {e}")
            global_scored_df = None
    else:
        global_scored_df = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load models; shutdown: cleanup."""
    _load_models()
    yield
    # shutdown
    global risk_engine, predictor, works_df, global_scored_df
    risk_engine = None
    predictor = None
    works_df = None
    global_scored_df = None
    print("[SHUTDOWN] Cleaned up.")


# Initialize models when the module is imported (for development/testing)
# This ensures they're available even when running outside FastAPI startup
print("[INIT] Initializing models for development/testing...")
_load_models()
print("[INIT] Models initialization complete.")


app = FastAPI(
    title="MPLADS Intelligence API",
    description="Anomaly detection and risk scoring for MPLADS infrastructure works",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class ReviewInput(BaseModel):
    work_id: int = Field(..., description="Work identifier")
    label: str = Field(..., description="Review label: CLEARED_OR_LEGITIMATE | SUSPICIOUS_UNCONFIRMED | CONFIRMED_FRAUD")
    reviewer: str = Field(..., description="Reviewer identifier")
    notes: Optional[str] = None


class ReviewRecord(BaseModel):
    work_id: int
    label: str
    reviewer: str
    notes: Optional[str]
    timestamp: str


class PredictInput(BaseModel):
    workId: int
    state: str
    district: str
    category: str
    estimated_cost: float
    expected_beneficiaries: int
    lsTerm: int
    house: str
    mp_name: Optional[str] = None
    recommended_year: int
    totalPaid: float = 0
    paymentCount: int = 0
    hasPayments: bool = False


# --- In-memory review store (SQLite-ready placeholder) ---
_review_store: List[ReviewRecord] = []


# --- Utility ---

def _to_jsonable(value):
    """Convert pandas/numpy values to JSON-safe Python values."""
    if isinstance(value, dict):
        return {str(key): _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return None
    if pd.isna(value):
        return None
    return value


def _work_to_dict(row: pd.Series) -> dict:
    """Convert a DataFrame row to a JSON-serializable dict."""
    return _to_jsonable(row.to_dict())


def _safe_float(v):
    """Convert a value to a finite Python float, or None."""
    try:
        converted = float(v)
    except (TypeError, ValueError):
        return None
    return converted if np.isfinite(converted) else None


# --- Endpoints ---

@app.get("/api/dashboard")
def api_dashboard():
    """Executive dashboard KPIs and distributions."""
    if works_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    total_works = len(works_df)
    flagged = 0
    flagged_expenditure = 0.0
    risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    total_expenditure = float(works_df["estimated_cost"].sum()) if "estimated_cost" in works_df.columns else 0.0
    state_dist = works_df["state"].value_counts().to_dict() if "state" in works_df.columns else {}
    detector_freq = {}
    detector_overlap = {}

    # Compute risk scores for all works
    scored = global_scored_df

    if scored is not None:
        flagged_mask = scored["risk_level"].isin(["CRITICAL", "HIGH"])
        flagged = int(flagged_mask.sum())
        flagged_expenditure = float(scored.loc[flagged_mask, "estimated_cost"].sum())
        risk_counts = scored["risk_level"].value_counts().to_dict()
        # Ensure all keys present
        for k in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            risk_counts.setdefault(k, 0)

        # Detector frequency
        for _, row in scored.iterrows():
            detectors = str(row.get("triggered_detectors", "")).split(", ")
            for d in detectors:
                if d:
                    detector_freq[d] = detector_freq.get(d, 0) + 1

        # Detector overlap (count of works with multiple detectors)
        overlap_counts = scored["triggered_count"].value_counts()
        detector_overlap = {int(k): int(v) for k, v in overlap_counts.items()}

    recent_anomalies = []
    if scored is not None:
        top = scored.nlargest(5, "risk_score")
        for _, row in top.iterrows():
            recent_anomalies.append({
                "work_id": int(row["work_id"]),
                "risk_score": _safe_float(row["risk_score"]),
                "risk_level": row["risk_level"],
                "triggered_detectors": row["triggered_detectors"],
            })

    return {
        "total_works": total_works,
        "flagged": flagged,
        "flagged_expenditure": flagged_expenditure,
        "risk_level_distribution": risk_counts,
        "total_estimated_expenditure": total_expenditure,
        "geographic_distribution": state_dist,
        "detector_frequency": detector_freq,
        "detector_overlap": detector_overlap,
        "recent_high_priority_anomalies": recent_anomalies,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/works")
def api_works(
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    category: Optional[str] = Query(None, description="Filter by category"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (CRITICAL/HIGH/MEDIUM/LOW)"),
    detector: Optional[str] = Query(None, description="Filter by triggered detector name"),
    sort_by_risk: bool = Query(False, description="Sort by risk score descending"),
    limit: int = Query(100, ge=1, le=1000, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """List and filter works with optional risk scoring."""
    if works_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    df = works_df.copy()

    # Risk scoring
    if global_scored_df is not None:
        result_df = global_scored_df.copy()
        
        # Apply filters
        if state:
            result_df = result_df[result_df["state"].str.lower() == state.lower()]
        if district:
            result_df = result_df[result_df["district"].str.lower() == district.lower()]
        if category:
            result_df = result_df[result_df["category"].str.lower() == category.lower()]
            
        if risk_level:
            result_df = result_df[result_df["risk_level"] == risk_level.upper()]
        if detector:
            result_df = result_df[result_df["triggered_detectors"].str.contains(detector, case=False, na=False)]
        if sort_by_risk:
            result_df = result_df.sort_values("risk_score", ascending=False)
    else:
        # Apply filters
        if state:
            df = df[df["state"].str.lower() == state.lower()]
        if district:
            df = df[df["district"].str.lower() == district.lower()]
        if category:
            df = df[df["category"].str.lower() == category.lower()]
            
        result_df = df.reset_index(drop=True)
        result_df["risk_score"] = None
        result_df["risk_level"] = "UNKNOWN"
        result_df["triggered_detectors"] = ""
        result_df["triggered_count"] = 0
        result_df["recommendation"] = "N/A"

    # Paginate
    total = len(result_df)
    page = result_df.iloc[offset : offset + limit]

    records = []
    for idx, row in page.iterrows():
        rec = {
            "work_id": int(row.get("workId", row.get("work_id", 0))),
            "row_id": int(row.get("row_id", idx)),
            "state": row.get("state", ""),
            "district": row.get("district", ""),
            "category": row.get("category", ""),
            "estimated_cost": _safe_float(row.get("estimated_cost", 0)),
            "recommended_year": int(row["recommended_year"]) if pd.notna(row.get("recommended_year")) else None,
            "hasPayments": bool(row.get("hasPayments", False)),
            "risk_score": _safe_float(row.get("risk_score")),
            "risk_level": row.get("risk_level", ""),
            "triggered_detectors": row.get("triggered_detectors", ""),
            "recommendation": row.get("recommendation", ""),
        }
        records.append(rec)

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "records": records,
    }


@app.get("/api/works/{work_id}")
def api_work_detail(work_id: int, row_id: Optional[int] = Query(None, description="Optional unique row index")):
    """Work detail with risk score and triggered detector evidence."""
    if works_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    if row_id is not None and global_scored_df is not None and "row_id" in global_scored_df.columns:
        matches = global_scored_df[global_scored_df["row_id"] == row_id]
        if matches.empty:
            raise HTTPException(status_code=404, detail=f"Work row {row_id} not found")
        row = matches.iloc[0]
    else:
        matches = works_df[works_df["workId"] == work_id]
        if matches.empty:
            raise HTTPException(status_code=404, detail=f"Work {work_id} not found")
        row = matches.iloc[0]

    base = _work_to_dict(row)

    # Ensure numeric NaNs do not leak into the response
    base = {k: _to_jsonable(v) for k, v in base.items()}

    # Compute risk score
    risk_result = None
    if risk_engine:
        risk_result = risk_engine.score_single_work(row)

    if risk_result:
        base["risk_score"] = risk_result["risk_score"]
        base["risk_level"] = risk_result["risk_level"]
        base["recommendation"] = risk_result["recommendation"]
        base["explanation"] = risk_result["explanation"]
        base["triggered_detectors"] = risk_result["triggered_detectors"]
        base["feature_contributions"] = risk_result["feature_contributions"]
    else:
        base["risk_score"] = None
        base["risk_level"] = "UNKNOWN"
        base["recommendation"] = "Risk engine not available"
        base["triggered_detectors"] = []
        base["feature_contributions"] = {}

    base["work_id"] = int(row.get("workId", row.get("work_id", work_id)))
    return _to_jsonable(base)


@app.get("/api/anomalies")
def api_anomalies(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    detector: Optional[str] = Query(None, description="Filter by detector name"),
    sort_by_risk: bool = Query(True, description="Sort by risk score descending"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Anomaly explorer with filters, sorting, and drilldown support."""
    if works_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    df = works_df.copy()

    # Filter
    if state:
        df = df[df["state"].str.lower() == state.lower()]
    if district:
        df = df[df["district"].str.lower() == district.lower()]
    if category:
        df = df[df["category"].str.lower() == category.lower()]

    # Score
    scored = risk_engine.score_all_works(df) if risk_engine else None
    if scored is not None:
        if risk_level:
            scored = scored[scored["risk_level"] == risk_level.upper()]
        if detector:
            scored = scored[scored["triggered_detectors"].str.contains(detector, case=False, na=False)]
        if sort_by_risk:
            scored = scored.sort_values("risk_score", ascending=False)
        result = scored
    else:
        result = df.reset_index(drop=True)
        result["risk_score"] = None
        result["risk_level"] = "UNKNOWN"
        result["triggered_detectors"] = ""

    total = len(result)
    page = result.iloc[offset : offset + limit]

    records = []
    for _, r in page.iterrows():
        records.append({
            "work_id": int(r.get("work_id", 0)),
            "risk_score": _safe_float(r.get("risk_score")),
            "risk_level": r.get("risk_level", ""),
            "triggered_detectors": r.get("triggered_detectors", ""),
            "triggered_count": int(r.get("triggered_count", 0)),
            "recommendation": r.get("recommendation", ""),
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "records": records,
    }


@app.get("/api/detectors")
def api_detectors():
    """Return the inventory of implemented detectors with methodology."""
    return {
        "detectors": [
            {
                "name": "cost_anomaly",
                "category": "Financial",
                "method": "Modified Z-score on estimated_cost vs category median (MAD-based)",
                "threshold": "|Z| > 3",
                "data_supported": True,
            },
            {
                "name": "payment_gap",
                "category": "Financial",
                "method": "Business rules: high-cost without payment, low payment ratio",
                "threshold": "cost > 500K with no payment",
                "data_supported": True,
            },
            {
                "name": "category_risk",
                "category": "Statistical",
                "method": "Category-level payment rate baseline comparison",
                "threshold": "baseline payment rate > 50%",
                "data_supported": True,
            },
            {
                "name": "duplicate_pattern",
                "category": "Content",
                "method": "Exact cost match within district + short description heuristic",
                "threshold": ">1 exact cost match in district",
                "data_supported": True,
            },
            {
                "name": "geographic_anomaly",
                "category": "Statistical",
                "method": "Z-score within state distribution",
                "threshold": "|Z| > 3",
                "data_supported": True,
            },
            {
                "name": "isolation_forest",
                "category": "Statistical",
                "method": "Unsupervised Isolation Forest on log(cost), beneficiaries, lsTerm",
                "threshold": "decision_function < 0",
                "data_supported": True,
            },
        ],
        "total_count": 6,
        "data_supported_count": 6,
        "note": "All 6 detectors use only data present in the repository. No fabricated data or labels.",
    }


@app.get("/api/risk-summary")
def api_risk_summary():
    """Return risk-level distribution across all works."""
    if works_df is None or not risk_engine:
        raise HTTPException(status_code=503, detail="Data or risk engine not loaded")

    scored = risk_engine.score_all_works(works_df)
    total = len(scored)
    dist = scored["risk_level"].value_counts().to_dict()

    return {
        "total_works_scored": total,
        "risk_distribution": dist,
        "critical_count": dist.get("CRITICAL", 0),
        "high_count": dist.get("HIGH", 0),
        "medium_count": dist.get("MEDIUM", 0),
        "low_count": dist.get("LOW", 0),
        "flagged_count": dist.get("CRITICAL", 0) + dist.get("HIGH", 0),
    }


@app.post("/api/review")
def api_submit_review(review: ReviewInput):
    """Submit a human review label for a work."""
    allowed = {"CLEARED_OR_LEGITIMATE", "SUSPICIOUS_UNCONFIRMED", "CONFIRMED_FRAUD"}
    if review.label not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid label. Must be one of: {', '.join(sorted(allowed))}",
        )

    record = ReviewRecord(
        work_id=review.work_id,
        label=review.label,
        reviewer=review.reviewer,
        notes=review.notes,
        timestamp=datetime.utcnow().isoformat() + "Z",
    )
    _review_store.append(record)

    return {
        "status": "submitted",
        "review": record.model_dump(),
        "total_reviews": len(_review_store),
    }


@app.get("/api/reviews")
def api_list_reviews(work_id: Optional[int] = Query(None)):
    """List submitted reviews, optionally filtered by work_id."""
    reviews = _review_store
    if work_id is not None:
        reviews = [r for r in reviews if r.work_id == work_id]

    return {
        "total": len(reviews),
        "reviews": [r.model_dump() for r in reviews],
    }


@app.post("/api/predict")
def api_predict(input_data: PredictInput):
    """Score a single work record for risk."""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not loaded")

    work_dict = input_data.model_dump()
    try:
        result = predictor.predict_single(work_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

    return _to_jsonable(result)


# --- Health check ---
@app.get("/api/health")
def api_health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "risk_engine_loaded": risk_engine is not None,
        "predictor_loaded": predictor is not None,
        "works_loaded": works_df is not None,
        "works_count": len(works_df) if works_df is not None else 0,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }