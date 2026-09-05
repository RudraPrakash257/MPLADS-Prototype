import os
import json
import datetime
import pandas as pd


def validate_dataset(df: pd.DataFrame) -> None:
    """Validate data quality without modifying the CSV."""
    required_cols = [
        "work_id",
        "agency_name",
        "category",
        "sanction_date",
        "sanctioned_amount",
        "released_amount",
        "expenditure_amount",
        "progress_percent",
        "completion_status",
    ]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Data Quality Error: Missing required columns: {missing_cols}")

    if df["work_id"].duplicated().any():
        dupes = df[df["work_id"].duplicated()]["work_id"].tolist()
        raise ValueError(f"Data Quality Error: Duplicate work IDs detected: {dupes}")

    if ((df["progress_percent"] < 0) | (df["progress_percent"] > 100)).any():
        invalid = df[(df["progress_percent"] < 0) | (df["progress_percent"] > 100)]
        raise ValueError(f"Data Quality Error: Invalid progress values found in {len(invalid)} rows.")

    monetary_cols = ["sanctioned_amount", "released_amount", "expenditure_amount"]
    for col in monetary_cols:
        if (df[col] < 0).any():
            invalid = df[df[col] < 0]
            raise ValueError(f"Data Quality Error: Negative values in {col} in {len(invalid)} rows.")

    print(f"Data Quality Check Passed: {len(df)} rows verified.")


def compute_risk_scoring(csv_path: str, output_path: str) -> list[dict]:
    df = pd.read_csv(csv_path)
    validate_dataset(df)

    today = datetime.date.today()
    scored_works = []

    for _, row in df.iterrows():
        work_id = str(row["work_id"])
        agency_name = str(row["agency_name"])
        category = str(row["category"])
        sanction_date_str = str(row["sanction_date"])
        sanction_date = pd.to_datetime(sanction_date_str).date()

        sanctioned_amount = float(row["sanctioned_amount"])
        released_amount = float(row["released_amount"])
        expenditure_amount = float(row["expenditure_amount"])
        progress_percent = float(row["progress_percent"])
        completion_status = str(row["completion_status"])

        # Core Metrics calculation (safe division)
        expenditure_to_released = expenditure_amount / released_amount if released_amount > 0 else 0.0
        expenditure_to_sanctioned = expenditure_amount / sanctioned_amount if sanctioned_amount > 0 else 0.0
        progress_ratio = progress_percent / 100.0
        utilization_gap = expenditure_to_sanctioned - progress_ratio
        elapsed_days = (today - sanction_date).days

        # Derived Analytical/Display Features
        budget_remaining = sanctioned_amount - expenditure_amount
        budget_remaining_percent = (budget_remaining / sanctioned_amount * 100.0) if sanctioned_amount > 0 else 0.0
        release_utilization_percent = (expenditure_amount / released_amount * 100.0) if released_amount > 0 else 0.0
        progress_gap_percent = (expenditure_to_sanctioned * 100.0) - progress_percent
        days_overdue = max(0, elapsed_days - 365)
        expected_progress_percent = min(100.0, (elapsed_days / 365.0) * 100.0)
        progress_vs_expected_gap = progress_percent - expected_progress_percent

        triggered_rules = []
        triggered_scores = []
        reasons = []

        # Rule A: Expenditure exceeds released funds
        if expenditure_to_released > 1.0:
            score_A = 90.0
            triggered_rules.append("A")
            triggered_scores.append(score_A)
            pct_over = (expenditure_to_released - 1.0) * 100.0
            reasons.append(
                f"Expenditure (₹{expenditure_amount:,.0f}) exceeds released amount (₹{released_amount:,.0f}) by {pct_over:.1f}%."
            )

        # Rule B: High utilization vs physical progress gap (> 30%)
        if utilization_gap > 0.30:
            score_B = min(100.0, 50.0 + utilization_gap * 100.0)
            triggered_rules.append("B")
            triggered_scores.append(score_B)
            util_pct = expenditure_to_sanctioned * 100.0
            reasons.append(
                f"Expenditure utilization ({util_pct:.1f}%) outpaces physical progress ({progress_percent:.1f}%) with a gap of {utilization_gap * 100.0:.1f}%."
            )

        # Rule C: Elapsed days exceeds 365 days while incomplete
        if elapsed_days > 365 and completion_status != "Complete":
            score_C = min(100.0, 40.0 + ((elapsed_days - 365) / 365.0) * 60.0)
            triggered_rules.append("C")
            triggered_scores.append(score_C)
            reasons.append(
                f"Elapsed duration of {elapsed_days} days exceeds the 365-day standard norm while project is incomplete ({progress_percent:.1f}% progress)."
            )

        # Overall Score calculation
        if not triggered_rules:
            overall_score = 0.0
            base_score = 0.0
            corroboration_bonus = 0.0
        else:
            base_score = round(max(triggered_scores), 1)
            corroboration_bonus = float(10 * (len(triggered_rules) - 1)) if len(triggered_rules) > 1 else 0.0
            overall_score = min(
                100.0,
                base_score + corroboration_bonus,
            )
        overall_score = round(overall_score, 1)

        # Risk Band & Priority Level assignment
        if overall_score >= 85.0:
            risk_band = "CRITICAL"
            priority_level = "Critical"
        elif overall_score >= 65.0:
            risk_band = "HIGH"
            priority_level = "High"
        elif overall_score >= 40.0:
            risk_band = "MEDIUM"
            priority_level = "Medium"
        else:
            risk_band = "LOW"
            priority_level = "Low"

        # Project Health Status
        if risk_band == "CRITICAL":
            project_health = "Critical Review"
        elif risk_band == "HIGH":
            project_health = "High Attention"
        elif risk_band == "MEDIUM":
            project_health = "Monitor"
        else:
            project_health = "On Track"

        # Recommended Action with priority A -> B -> C -> None
        if "A" in triggered_rules:
            recommended_action = "Halt further releases and verify expenditure records before proceeding."
        elif "B" in triggered_rules:
            recommended_action = "Verify latest physical progress against expenditure records before releasing next installment."
        elif "C" in triggered_rules:
            recommended_action = "Request a status update from the implementing agency on the cause of delay."
        else:
            recommended_action = "No action required."

        primary_reason = reasons[0] if reasons else "Within normal parameters."

        work_record = {
            # Raw fields
            "work_id": work_id,
            "agency_name": agency_name,
            "category": category,
            "sanction_date": sanction_date_str,
            "sanctioned_amount": sanctioned_amount,
            "released_amount": released_amount,
            "expenditure_amount": expenditure_amount,
            "progress_percent": progress_percent,
            "completion_status": completion_status,
            # Core and Derived Metrics
            "metrics": {
                "expenditure_to_released": round(expenditure_to_released, 4),
                "expenditure_to_sanctioned": round(expenditure_to_sanctioned, 4),
                "progress_ratio": round(progress_ratio, 4),
                "utilization_gap": round(utilization_gap, 4),
                "elapsed_days": elapsed_days,
                # Derived analytical metrics
                "budget_remaining": round(budget_remaining, 2),
                "budget_remaining_percent": round(budget_remaining_percent, 2),
                "release_utilization_percent": round(release_utilization_percent, 2),
                "progress_gap_percent": round(progress_gap_percent, 2),
                "days_overdue": days_overdue,
                "expected_progress_percent": round(expected_progress_percent, 2),
                "progress_vs_expected_gap": round(progress_vs_expected_gap, 2),
            },
            # Risk assessment & Health Status
            "overall_score": overall_score,
            "base_score": base_score,
            "corroboration_bonus": corroboration_bonus,
            "risk_band": risk_band,
            "priority_level": priority_level,
            "project_health": project_health,
            "triggered_rules": triggered_rules,
            "reasons": reasons,
            "primary_reason": primary_reason,
            "recommended_action": recommended_action,
        }

        scored_works.append(work_record)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scored_works, f, indent=2)

    # Also keep frontend/src/data/risk_scored_works.json in sync
    frontend_data_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "risk_scored_works.json")
    try:
        os.makedirs(os.path.dirname(frontend_data_path), exist_ok=True)
        with open(frontend_data_path, "w", encoding="utf-8") as f:
            json.dump(scored_works, f, indent=2)
    except Exception:
        pass

    print(f"Scored {len(scored_works)} works. Output saved to {output_path}")
    return scored_works


if __name__ == "__main__":
    csv_file = os.path.join(os.path.dirname(__file__), "..", "data", "works_synthetic.csv")
    out_file = os.path.join(os.path.dirname(__file__), "..", "output", "risk_scored_works.json")
    compute_risk_scoring(csv_file, out_file)
