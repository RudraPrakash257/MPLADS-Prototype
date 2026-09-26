"""
MPLADS Risk Scoring Engine

Computes transparent, work-level risk scores using multiple forensic detectors.
Each flagged work includes:
- Risk score (0.0-1.0)
- Risk level (Low/Medium/High/Critical)
- Triggered detectors with evidence
- Feature contributions
- Explanation
- Recommendation for human review
"""

import pandas as pd
import numpy as np
import joblib
from collections import OrderedDict

from ml.detectors import (
    StatisticalAnomalyDetector,
    detect_cost_anomaly,
    detect_payment_gap,
    detect_category_risk,
    detect_duplicate_pattern,
    detect_geographic_anomaly,
    get_category_stats,
    get_cost_stats_by_category,
    get_state_stats,
    get_location_cost_patterns,
    DetectorResult
)


# Risk thresholds
RISK_THRESHOLDS = {
    'CRITICAL': 0.75,
    'HIGH': 0.60,
    'MEDIUM': 0.40,
    'LOW': 0.0
}


class RiskEngine:
    """
    Work-level risk scoring engine.

    Combines statistical anomaly scores with business-rule-based indicators
    to produce transparent risk assessments.
    """

    def __init__(self, random_state=42):
        self.random_state = random_state
        self.category_stats = None
        self.cost_stats_by_category = None
        self.state_stats = None
        self.location_patterns = None
        self.isolation_detector = None

    def prepare_context(self, df):
        """Pre-compute reference statistics for detectors."""
        self.category_stats = get_category_stats(df)
        self.cost_stats_by_category = get_cost_stats_by_category(df)
        self.state_stats = get_state_stats(df)
        self.location_patterns = get_location_cost_patterns(df)

        # Fit Isolation Forest on numerical features
        self.isolation_detector = StatisticalAnomalyDetector(
            contamination=0.15,
            random_state=self.random_state
        )
        self.isolation_detector.fit(df)

    def score_single_work(self, work_row):
        """
        Compute risk score for a single work record.

        Args:
            work_row: pandas Series with work data

        Returns:
            dict with risk score, level, evidence, recommendations
        """
        if self.isolation_detector is None:
            raise RuntimeError("Risk engine not prepared. Call prepare_context() first.")

        # Run all detectors
        detectors_results = [
            detect_cost_anomaly(work_row, self.cost_stats_by_category),
            detect_payment_gap(work_row),
            detect_category_risk(work_row, self.category_stats),
            detect_duplicate_pattern(work_row, {}, self.location_patterns),
            detect_geographic_anomaly(work_row, self.state_stats),
            self.isolation_detector.predict_score(work_row)
        ]

        # Calculate composite risk score
        triggered_results = [r for r in detectors_results if r.triggered]

        if triggered_results:
            detector_score = np.mean([r.score for r in triggered_results])
            isolation_score = next(
                (r.score for r in detectors_results if r.name == 'isolation_forest'),
                0.0
            )

            composite_score = 0.4 * isolation_score + 0.6 * detector_score

            # Boost for multi-detector convergence
            if len(triggered_results) >= 2:
                composite_score *= 1.2
                composite_score = min(composite_score, 1.0)
        else:
            isolation_result = next(
                (r for r in detectors_results if r.name == 'isolation_forest'), None
            )
            if isolation_result:
                composite_score = isolation_result.score * 0.5
            else:
                composite_score = 0.0

        # Determine risk level
        risk_level = self._classify_risk(composite_score)

        # Build recommendation
        recommendation = self._generate_recommendation(
            composite_score, risk_level, triggered_results
        )

        # Feature contributions
        feature_contributions = self._compute_feature_contributions(
            work_row, detectors_results
        )

        # Explanation
        explanation = self._generate_explanation(
            composite_score, risk_level, detectors_results
        )

        return {
            'risk_score': float(composite_score),
            'risk_level': risk_level,
            'triggered_detectors': [r.to_dict() for r in triggered_results],
            'all_detector_scores': [r.to_dict() for r in detectors_results],
            'feature_contributions': feature_contributions,
            'explanation': explanation,
            'recommendation': recommendation
        }

    def _classify_risk(self, score):
        """Map risk score to risk level."""
        for level, threshold in RISK_THRESHOLDS.items():
            if score >= threshold:
                return level
        return 'LOW'

    def _generate_recommendation(self, score, level, triggered_detectors):
        """Generate recommendation for human review."""
        if level in ['CRITICAL', 'HIGH']:
            return 'Review required - high-risk work identified'
        elif level == 'MEDIUM':
            return 'Conditional review - moderate risk indicators'
        else:
            return 'Monitor - no immediate concerns'

    def _compute_feature_contributions(self, work_row, detectors_results):
        """Identify which features contribute most to risk score."""
        contributions = {}

        for result in detectors_results:
            if result.triggered or result.score > 0.1:
                for feat_name, feat_value in result.features.items():
                    if isinstance(feat_value, (int, float)):
                        contributions[feat_name] = contributions.get(feat_name, 0) + result.score

        if contributions:
            max_val = max(contributions.values())
            if max_val > 0:
                contributions = {k: v / max_val for k, v in contributions.items()}

        return dict(sorted(contributions.items(), key=lambda x: x[1], reverse=True)[:5])

    def _generate_explanation(self, score, level, detectors_results):
        """Generate human-readable explanation of risk score."""
        triggered_names = [r.name for r in detectors_results if r.triggered]

        if not triggered_names:
            iso_score = next(
                (r.score for r in detectors_results if r.name == 'isolation_forest'), 0
            )
            return (
                f'Work scored {level} risk ({score:.2f}). No specific anomalies detected, '
                f'but statistical anomaly score is {iso_score:.2f}.'
            )

        return (
            f'Work scored {level} risk ({score:.2f}) due to: {", ".join(triggered_names)}. '
            f'Composite score combines statistical anomaly detection with business-rule indicators.'
        )

    def score_all_works(self, df):
        """
        Score all works in a dataframe.

        Args:
            df: DataFrame of works to score

        Returns:
            DataFrame with risk scores and evidence
        """
        if self.isolation_detector is None:
            self.prepare_context(df)

        results = []

        for idx, row in df.iterrows():
            score_result = self.score_single_work(row)
            results.append({
                'work_id': row.get('workId', row.get('work_id', idx)),
                'risk_score': score_result['risk_score'],
                'risk_level': score_result['risk_level'],
                'triggered_detectors': ', '.join(
                    [d['detector'] for d in score_result['triggered_detectors']]
                ),
                'triggered_count': len(score_result['triggered_detectors']),
                'recommendation': score_result['recommendation'],
                'explanation': score_result['explanation'],
                **{f'evidence_{d["detector"]}': d['evidence']
                   for d in score_result['triggered_detectors']}
            })

        return pd.DataFrame(results)

    def save(self, path):
        """Save the risk engine state."""
        import os
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({
            'category_stats': self.category_stats,
            'cost_stats_by_category': self.cost_stats_by_category,
            'state_stats': self.state_stats,
            'location_patterns': self.location_patterns,
            'isolation_detector': self.isolation_detector
        }, path)
        print(f'Risk engine saved to {path}')

    @classmethod
    def load(cls, path):
        """Load a saved risk engine."""
        data = joblib.load(path)
        engine = cls()
        engine.category_stats = data['category_stats']
        engine.cost_stats_by_category = data['cost_stats_by_category']
        engine.state_stats = data['state_stats']
        engine.location_patterns = data['location_patterns']
        engine.isolation_detector = data['isolation_detector']
        return engine
