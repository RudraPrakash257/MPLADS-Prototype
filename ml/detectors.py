"""
MPLADS Forensic Detectors - Data-Supported Implementation

Implements detectors that can be supported by available data:
1. Cost Anomaly (statistical outlier on estimated_cost)
2. Payment Gap (totalPaid vs estimated_cost ratio)
3. Category Risk (unusual patterns per category)
4. Duplicate Detection (similarity on work_description)
5. Geographic Concentration (state-level distribution)
6. Statistical Anomaly (Isolation Forest on numerical features)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from collections import Counter


class DetectorResult:
    """Standard result object for all detectors."""
    def __init__(self, name, triggered, score, evidence, features=None):
        self.name = name
        self.triggered = triggered
        self.score = score  # 0.0 = normal, 1.0 = high anomaly
        self.evidence = evidence
        self.features = features or {}

    def to_dict(self):
        return {
            'detector': self.name,
            'triggered': self.triggered,
            'score': self.score,
            'evidence': self.evidence,
            'features': self.features
        }

    def __repr__(self):
        return f"DetectorResult({self.name}, triggered={self.triggered}, score={self.score:.4f})"


def detect_cost_anomaly(work_row, cost_stats_by_category):
    """
    A. Cost Anomaly Detection

    Compares work estimated_cost against expected range for its category.
    Uses Modified Z-Score based on Median Absolute Deviation (MAD).
    """
    category = work_row.get('category', 'Unknown')
    cost = work_row.get('estimated_cost', 0)

    if category not in cost_stats_by_category:
        return DetectorResult(
            name='cost_anomaly',
            triggered=False,
            score=0.0,
            evidence=f'No reference data for category: {category}',
            features={'category': category, 'cost': float(cost)}
        )

    stats = cost_stats_by_category[category]
    median_cost = stats['median']
    mad = stats['mad']

    # Calculate modified z-score (robust to outliers)
    if mad > 0:
        modified_z_score = 0.6745 * (cost - median_cost) / mad
    else:
        modified_z_score = 0.0 if cost == median_cost else 10.0

    # Flag if outside 3 MAD range
    is_anomaly = abs(modified_z_score) > 3
    score = min(abs(modified_z_score) / 10.0, 1.0)

    return DetectorResult(
        name='cost_anomaly',
        triggered=is_anomaly,
        score=score,
        evidence=f'Cost: Rs {cost:,} vs category median: Rs {median_cost:,}, modified-z: {modified_z_score:.2f}',
        features={
            'category': category,
            'cost': float(cost),
            'median_cost': float(median_cost),
            'mad': float(mad),
            'modified_z_score': float(modified_z_score)
        }
    )


def detect_payment_gap(work_row):
    """
    B. Payment Gap Detection

    Identifies unusual payment patterns (recommended but no payment).
    """
    cost = work_row.get('estimated_cost', 0)
    total_paid = work_row.get('totalPaid', 0)
    has_payments = work_row.get('hasPayments', False)

    # Payment gap ratio
    if cost > 0:
        payment_ratio = total_paid / cost
    else:
        payment_ratio = 0.0

    is_anomaly = False
    score = 0.0
    evidence = ''

    if not has_payments and cost > 500000:
        is_anomaly = True
        score = 0.8
        evidence = f'No payment initiated for high-cost work (Rs {cost:,})'
    elif has_payments and payment_ratio < 0.05 and total_paid > 0:
        is_anomaly = True
        score = 0.6
        evidence = f'Very low payment ratio: {payment_ratio:.4f} (Rs {total_paid:,} of Rs {cost:,})'
    elif has_payments:
        score = 0.2
        evidence = f'Payment initiated: Rs {total_paid:,} of Rs {cost:,}'

    return DetectorResult(
        name='payment_gap',
        triggered=is_anomaly,
        score=score,
        evidence=evidence,
        features={
            'estimated_cost': float(cost),
            'total_paid': float(total_paid),
            'hasPayments': bool(has_payments),
            'payment_ratio': float(payment_ratio)
        }
    )


def detect_category_risk(work_row, category_stats):
    """
    C. Category-Based Risk Assessment

    Some categories have higher inherent risk patterns.
    """
    category = work_row.get('category', 'Unknown')
    cost = work_row.get('estimated_cost', 0)

    if category not in category_stats:
        return DetectorResult(
            name='category_risk',
            triggered=False,
            score=0.0,
            evidence=f'No stats for category: {category}',
            features={'category': category}
        )

    stats = category_stats[category]
    baseline_payment_rate = stats['payment_rate']
    has_payments = work_row.get('hasPayments', False)

    is_anomaly = False
    score = 0.0
    evidence = ''

    if baseline_payment_rate > 0.5 and not has_payments:
        is_anomaly = True
        score = 0.7
        evidence = f'Category {category} has {baseline_payment_rate:.1%} payment rate but work shows no payment'
    elif cost < 50000 and category == 'Normal/Others':
        score = 0.3
        evidence = f'Low cost work in normal category: Rs {cost:,}'
    else:
        score = 0.1
        evidence = f'Category {category} baseline payment rate: {baseline_payment_rate:.1%}'

    return DetectorResult(
        name='category_risk',
        triggered=is_anomaly,
        score=score,
        evidence=evidence,
        features={
            'category': category,
            'baseline_payment_rate': float(baseline_payment_rate),
            'hasPayments': bool(has_payments)
        }
    )


def detect_duplicate_pattern(work_row, description_clusters, location_cost_map):
    """
    D. Duplicate Pattern Detection

    Uses work_description similarity and location-cost clustering.
    Limited implementation due to available data constraints.
    """
    description = work_row.get('work_description', '')
    cost = work_row.get('estimated_cost', 0)
    district = work_row.get('district', '')

    is_anomaly = False
    score = 0.0
    evidence = ''

    # Check if exact cost exists in same district
    if district in location_cost_map:
        cost_list = location_cost_map[district]
        exact_matches = sum(1 for c in cost_list if c == cost)

        if exact_matches > 1:
            is_anomaly = True
            score = 0.6
            evidence = f'{exact_matches} works in {district} with exact cost Rs {cost:,}'

    # Very short or generic descriptions
    if len(description) < 20:
        score = max(score, 0.5)
        evidence = 'Very short work description'

    return DetectorResult(
        name='duplicate_pattern',
        triggered=is_anomaly,
        score=score,
        evidence=evidence if evidence else 'No duplicate pattern detected',
        features={
            'district': district,
            'estimated_cost': float(cost),
            'description_length': len(description)
        }
    )


def detect_geographic_anomaly(work_row, state_stats):
    """
    E. Geographic Concentration Anomaly

    Detects unusual patterns for state/district combinations.
    """
    state = work_row.get('state', 'Unknown')
    cost = work_row.get('estimated_cost', 0)
    district = work_row.get('district', '')

    if state not in state_stats:
        return DetectorResult(
            name='geographic_anomaly',
            triggered=False,
            score=0.0,
            evidence=f'No stats for state: {state}',
            features={'state': state}
        )

    stats = state_stats[state]
    mean_cost = stats['mean_cost']
    std_cost = stats['std_cost']

    is_anomaly = False
    score = 0.0
    evidence = ''

    # Cost outlier within state
    if mean_cost > 0 and std_cost > 0:
        z_score = (cost - mean_cost) / std_cost
        if abs(z_score) > 3:
            is_anomaly = True
            score = 0.7
            evidence = f'Cost outlier for {state}: Rs {cost:,} (z={z_score:.2f})'

    return DetectorResult(
        name='geographic_anomaly',
        triggered=is_anomaly,
        score=score,
        evidence=evidence if evidence else f'Cost within normal range for {state}',
        features={
            'state': state,
            'district': district,
            'estimated_cost': float(cost),
            'state_mean_cost': float(mean_cost),
            'z_score': float(z_score) if 'z_score' in locals() else 0.0
        }
    )


class StatisticalAnomalyDetector:
    """
    F. Statistical Anomaly Detection using Isolation Forest

    Trained on numerical features of the dataset.
    """

    def __init__(self, contamination=0.15, random_state=42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = None
        self.scaler = None
        self.feature_columns = ['estimated_cost', 'expected_beneficiaries', 'lsTerm']

    def fit(self, df):
        """Fit the Isolation Forest model."""
        X = df[self.feature_columns].copy()

        # Log-transform cost to handle skewness
        X['estimated_cost'] = np.log1p(X['estimated_cost'])

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Fit Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=200,
            max_samples='auto'
        )
        self.model.fit(X_scaled)

        return self

    def predict_score(self, work_row):
        """Get anomaly score for a single work row."""
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        features = work_row[self.feature_columns].astype(float).to_frame().T
        features['estimated_cost'] = np.log1p(features['estimated_cost'])

        features_scaled = self.scaler.transform(features)
        raw_score = self.model.decision_function(features_scaled)[0]

        # Convert to 0-1 scale (higher = more anomalous)
        normalized_score = 1.0 / (1.0 + np.exp(raw_score))

        anomaly_label = self.model.predict(features_scaled)[0]
        is_anomaly = anomaly_label == -1

        return DetectorResult(
            name='isolation_forest',
            triggered=is_anomaly,
            score=float(normalized_score),
            evidence=f'Isolation Forest anomaly score: {raw_score:.4f}',
            features={
                'log_cost': float(np.log1p(work_row.get('estimated_cost', 0))),
                'beneficiaries': float(work_row.get('expected_beneficiaries', 0)),
                'ls_term': float(work_row.get('lsTerm', 0)),
                'raw_score': float(raw_score)
            }
        )


def get_category_stats(df):
    """Calculate category-level statistics."""
    stats = {}
    for cat, group in df.groupby('category'):
        stats[cat] = {
            'count': len(group),
            'payment_rate': float(group['hasPayments'].mean()),
            'median_cost': float(group['estimated_cost'].median()),
            'mean_cost': float(group['estimated_cost'].mean()),
            'std_cost': float(group['estimated_cost'].std()) if len(group) > 1 else 0
        }
    return stats


def get_cost_stats_by_category(df):
    """Calculate cost statistics by category with robust MAD."""
    stats = {}
    for cat, group in df.groupby('category'):
        costs = group['estimated_cost'].values
        median_cost = np.median(costs)
        mad = np.median(np.abs(costs - median_cost))

        stats[cat] = {
            'median': float(median_cost),
            'mad': float(mad),
            'count': len(costs)
        }
    return stats


def get_state_stats(df):
    """Calculate state-level statistics."""
    stats = {}
    for state, group in df.groupby('state'):
        costs = group['estimated_cost'].dropna()
        stats[state] = {
            'mean_cost': float(costs.mean()),
            'std_cost': float(costs.std()) if len(costs) > 1 else 0,
            'count': len(group)
        }
    return stats


def get_location_cost_patterns(df):
    """Get district-level cost patterns for duplicate detection."""
    patterns = {}
    for district, group in df.groupby('district'):
        patterns[district] = group['estimated_cost'].tolist()
    return patterns
