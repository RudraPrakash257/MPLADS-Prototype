"""
MPLADS Risk Prediction / Inference Module

Loads trained model and risk engine, provides inference for new records.
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))


class MPLADSPredictor:
    """
    Inference engine for MPLADS risk prediction.
    """

    def __init__(self, model_path=None, risk_engine_path=None):
        self.model_path = model_path or 'ml/model_pipeline.pkl'
        self.risk_engine_path = risk_engine_path or 'ml/risk_engine.pkl'
        self.model_data = None
        self.risk_engine = None

    def load_model(self):
        """Load trained model and metadata."""
        print(f'Loading model from {self.model_path}...')
        self.model_data = joblib.load(self.model_path)
        print('Model loaded successfully')

    def load_risk_engine(self):
        """Load risk engine."""
        from ml.risk_engine import RiskEngine
        print(f'Loading risk engine from {self.risk_engine_path}...')
        self.risk_engine = RiskEngine.load(self.risk_engine_path)
        print('Risk engine loaded successfully')

    def predict_single(self, work_data):
        """
        Predict risk for a single work record.

        Args:
            work_data: dict or DataFrame row with work features

        Returns:
            dict with risk score, level, and evidence
        """
        if self.risk_engine is None:
            self.load_risk_engine()

        if isinstance(work_data, dict):
            work_row = pd.Series(work_data)
        else:
            work_row = work_data.iloc[0]

        return self.risk_engine.score_single_work(work_row)

    def predict_batch(self, works_df):
        """
        Predict risk for multiple works.

        Args:
            works_df: DataFrame with work records

        Returns:
            DataFrame with risk scores and evidence
        """
        if self.risk_engine is None:
            self.load_risk_engine()

        return self.risk_engine.score_all_works(works_df)

    def get_feature_schema(self):
        """Return the expected feature schema."""
        if self.model_data:
            return self.model_data.get('features', {})
        return None

    def get_model_metadata(self):
        """Return model metadata."""
        if self.model_data:
            return self.model_data.get('metadata', {})
        return None


def predict_payment_initiation(work_data, model_path='ml/model_pipeline.pkl'):
    """
    Convenience function: predict payment initiation probability.

    Args:
        work_data: dict with work features
        model_path: path to saved model

    Returns:
        dict with prediction and probability
    """
    model_data = joblib.load(model_path)
    pipeline = model_data['model']
    scaler = model_data['scaler']
    feature_names = model_data['feature_names']
    target_info = model_data['target']

    if isinstance(work_data, dict):
        input_df = pd.DataFrame([work_data])
    else:
        input_df = work_data.copy()

    missing_cols = set(feature_names) - set(input_df.columns)
    if missing_cols:
        raise ValueError(f'Missing required columns: {missing_cols}')

    input_df = input_df[feature_names]
    input_scaled = scaler.transform(input_df)
    prediction = pipeline.predict(input_scaled)[0]
    probability = pipeline.predict_proba(input_scaled)[0]

    return {
        'prediction': int(prediction),
        'prediction_label': target_info['labels'][int(prediction)],
        'probability': {
            'no_payment': float(probability[0]),
            'payment_initiated': float(probability[1])
        },
        'confidence': float(max(probability))
    }


if __name__ == '__main__':
    # Test inference with example data
    example_work = {
        'workId': 1845,
        'state': 'Andhra Pradesh',
        'district': 'NANDYAL',
        'category': 'Normal/Others',
        'estimated_cost': 500000,
        'expected_beneficiaries': 0,
        'lsTerm': 18,
        'house': 'Lok Sabha',
        'mp_name': 'DR BYREDDY SHABARI',
        'recommended_year': 2026,
        'totalPaid': 0,
        'paymentCount': 0,
        'hasPayments': False
    }

    print('=== Testing Risk Engine ===')
    from ml.risk_engine import RiskEngine

    risk_engine = RiskEngine()
    df = pd.read_csv('data/works_recommended.csv')
    risk_engine.prepare_context(df)

    result = risk_engine.score_single_work(pd.Series(example_work))

    print(f'\nWork ID: {example_work["workId"]}')
    print(f'Risk Score: {result["risk_score"]:.4f}')
    print(f'Risk Level: {result["risk_level"]}')
    print(f'Recommendation: {result["recommendation"]}')
    print(f'\nTriggered Detectors:')
    for d in result['triggered_detectors']:
        print(f'  - {d["detector"]}: score={d["score"]:.4f}')
        print(f'    Evidence: {d["evidence"]}')

    print(f'\nFeature Contributions:')
    for feat, contrib in result['feature_contributions'].items():
        print(f'  - {feat}: {contrib:.2f}')
