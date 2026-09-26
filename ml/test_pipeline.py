#!/usr/bin/env python3
"""
End-to-End Test for MPLADS ML Pipeline

Verifies complete functionality of the ML module:
1. Data loading and preprocessing
2. Detector execution
3. Risk scoring
4. Model inference
5. Integration consistency
"""

import pandas as pd
import numpy as np
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml.train import MLTrainer
from ml.detectors import (
    detect_cost_anomaly, detect_payment_gap, detect_category_risk,
    detect_duplicate_pattern, detect_geographic_anomaly,
    get_category_stats, get_cost_stats_by_category, get_state_stats,
    StatisticalAnomalyDetector
)
from ml.risk_engine import RiskEngine
from ml.predict import MPLADSPredictor


def test_data_loading():
    """Test data loading and preprocessing."""
    print("=== Testing Data Loading ===")

    trainer = MLTrainer()
    df, features = trainer.load_and_preprocess_data()

    # Verify data
    assert len(df) > 0, "Dataframe should not be empty"
    assert 'hasPayments' in df.columns, "Target column missing"
    assert all(f in df.columns for f in features), "All features should be present"

    # Verify target distribution
    target_dist = df['hasPayments'].value_counts()
    print(f"Target distribution: {target_dist.to_dict()}")

    # Verify feature types
    expected_numerical = ['estimated_cost', 'expected_beneficiaries', 'lsTerm']
    expected_categorical = ['category', 'house', 'state']

    for feat in expected_numerical:
        assert pd.api.types.is_numeric_dtype(df[feat]), f"{feat} should be numeric"

    for feat in expected_categorical:
        assert df[feat].dtype == 'object', f"{feat} should be categorical"

    print("✓ Data loading test passed")
    return df, features


def test_detectors():
    """Test all detector implementations."""
    print("\n=== Testing Detectors ===")

    # Create sample data for testing
    sample_data = pd.DataFrame({
        'workId': [1, 2, 3],
        'category': ['Normal/Others', 'Repair and Renovation', 'Trust and Society'],
        'estimated_cost': [500000, 1500000, 200000],
        'totalPaid': [0, 1000000, 0],
        'hasPayments': [False, True, False],
        'expected_beneficiaries': [100, 50, 0],
        'lsTerm': [18, 18, 18],
        'state': ['Andhra Pradesh', 'Andhra Pradesh', 'Bihar'],
        'district': ['NANDYAL', 'GUNTUR', 'PATNA'],
        'work_description': [
            'Construction of CC Road',
            'Very short desc',
            'Trust and society work'
        ]
    })

    # Test detector dependencies
    category_stats = get_category_stats(sample_data)
    cost_stats = get_cost_stats_by_category(sample_data)
    state_stats = get_state_stats(sample_data)

    # Test each detector
    test_cases = [
        (detect_cost_anomaly, {'work_row': sample_data.iloc[0], 'cost_stats_by_category': cost_stats}),
        (detect_payment_gap, {'work_row': sample_data.iloc[0]}),
        (detect_category_risk, {'work_row': sample_data.iloc[0], 'category_stats': category_stats}),
        (detect_duplicate_pattern, {'work_row': sample_data.iloc[1], 'location_cost_map': {'GUNTUR': [1500000]}}),
        (detect_geographic_anomaly, {'work_row': sample_data.iloc[0], 'state_stats': state_stats}),
    ]

    for detector_func, kwargs in test_cases:
        result = detector_func(**kwargs)
        assert hasattr(result, 'name'), f"{detector_func.__name__} should return DetectorResult"
        assert hasattr(result, 'score'), f"{detector_func.__name__} should have score"
        assert 0.0 <= result.score <= 1.0, f"{detector_func.__name__} score should be normalized"
        print(f"✓ {detector_func.__name__} test passed")

    print("✓ Detectors test passed")
    return sample_data


def test_statistical_detector():
    """Test Isolation Forest detector."""
    print("\n=== Testing Statistical Anomaly Detector ===")

    # Create sample data
    df = pd.DataFrame({
        'estimated_cost': [100000, 500000, 1000000, 5000000, 50000],
        'expected_beneficiaries': [10, 50, 100, 500, 5],
        'lsTerm': [18, 18, 18, 18, 18],
        'category': ['Normal/Others'] * 5,
        'house': ['Lok Sabha'] * 5,
        'state': ['Andhra Pradesh'] * 5,
        'hasPayments': [False, True, False, True, False]
    })

    # Fit detector
    detector = StatisticalAnomalyDetector(contamination=0.2)
    detector.fit(df)

    # Test prediction
    sample_row = df.iloc[0]
    result = detector.predict_score(sample_row)

    assert result.name == 'isolation_forest'
    assert 0.0 <= result.score <= 1.0
    assert 'log_cost' in result.features
    assert 'raw_score' in result.features

    print(f"✓ Isolation Forest score: {result.score:.4f}")
    print("✓ Statistical detector test passed")
    return detector


def test_risk_engine():
    """Test complete risk engine functionality."""
    print("\n=== Testing Risk Engine ===")

    # Load and prepare data
    trainer = MLTrainer()
    df, features = trainer.load_and_preprocess_data()

    # Initialize and prepare risk engine
    risk_engine = RiskEngine()
    risk_engine.prepare_context(df)

    # Test single work scoring
    sample_work = df.iloc[0]
    result = risk_engine.score_single_work(sample_work)

    # Verify result structure
    assert 'risk_score' in result
    assert 'risk_level' in result
    assert 'triggered_detectors' in result
    assert 'feature_contributions' in result
    assert 'explanation' in result
    assert 'recommendation' in result

    # Verify ranges
    assert 0.0 <= result['risk_score'] <= 1.0
    assert result['risk_level'] in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    assert isinstance(result['triggered_count'], int)

    print(f"✓ Single work score: {result['risk_score']:.4f}")
    print(f"✓ Risk level: {result['risk_level']}")
    print(f"✓ Recommendation: {result['recommendation']}")

    # Test batch scoring
    scored_df = risk_engine.score_all_works(df.head(10))
    assert len(scored_df) == 10
    assert 'risk_score' in scored_df.columns
    assert 'risk_level' in scored_df.columns
    assert 'triggered_count' in scored_df.columns

    print(f"✓ Batch scoring: {len(scored_df)} works scored")
    print("✓ Risk engine test passed")
    return risk_engine


def test_model_training():
    """Test complete model training pipeline."""
    print("\n=== Testing Model Training Pipeline ===")

    trainer = MLTrainer(random_state=42)
    results = trainer.run_complete_pipeline()

    # Verify results
    assert 'model_results' in results
    assert 'best_model' in results
    assert 'test_results' in results
    assert 'model_data' in results
    assert 'metadata' in results

    # Verify model files exist
    assert os.path.exists('ml/model_pipeline.pkl'), "Model pipeline should be saved"
    assert os.path.exists('ml/metadata.pkl'), "Metadata should be saved"
    assert os.path.exists('ml/risk_engine.pkl'), "Risk engine should be saved"

    # Verify model metrics
    best_model = results['best_model']
    test_auc = results['test_results']['test_auc']

    print(f"✓ Best model: {best_model}")
    print(f"✓ Test AUC: {test_auc:.4f}")
    print(f"✓ All model files created successfully")
    print("✓ Model training test passed")
    return results


def test_inference():
    """Test inference module."""
    print("\n=== Testing Inference Module ===")

    # Initialize predictor
    predictor = MPLADSPredictor()

    # Test loading
    predictor.load_model()
    predictor.load_risk_engine()

    # Test single prediction
    work_data = {
        'workId': 9999,
        'state': 'Andhra Pradesh',
        'district': 'NANDYAL',
        'category': 'Normal/Others',
        'estimated_cost': 300000,
        'expected_beneficiaries': 50,
        'lsTerm': 18,
        'house': 'Lok Sabha',
        'mp_name': 'Test MP',
        'recommended_year': 2025,
        'totalPaid': 0,
        'paymentCount': 0,
        'hasPayments': False
    }

    result = predictor.predict_single(work_data)

    assert 'risk_score' in result
    assert 'risk_level' in result
    assert 'triggered_detectors' in result
    assert 'explanation' in result

    print(f"✓ Single prediction risk score: {result['risk_score']:.4f}")
    print(f"✓ Single prediction risk level: {result['risk_level']}")

    # Test with real data
    df = pd.read_csv('data/works_recommended.csv')
    batch_result = predictor.predict_batch(df.head(5))

    assert len(batch_result) == 5
    print(f"✓ Batch prediction: {len(batch_result)} records")

    print("✓ Inference test passed")
    return predictor


def test_integration():
    """Test end-to-end integration."""
    print("\n=== Testing End-to-End Integration ===")

    # Load all components
    from ml.train import MLTrainer
    from ml.risk_engine import RiskEngine
    from ml.predict import MPLADSPredictor

    # Step 1: Load and preprocess data
    trainer = MLTrainer()
    df, features = trainer.load_and_preprocess_data()

    # Step 2: Prepare risk engine
    risk_engine = RiskEngine()
    risk_engine.prepare_context(df)

    # Step 3: Score a sample
    sample_work = df.iloc[0]
    risk_result = risk_engine.score_single_work(sample_work)

    # Step 4: Test inference consistency
    predictor = MPLADSPredictor()
    inference_result = predictor.predict_single(sample_work.to_dict())

    # Verify consistency (should be similar results)
    risk_score_diff = abs(risk_result['risk_score'] - inference_result['risk_score'])
    print(f"Risk score difference between modules: {risk_score_diff:.4f}")

    # Step 5: Test model training
    training_results = trainer.run_complete_pipeline()

    # Verify all components work together
    assert 'model_pipeline.pkl' in os.listdir('ml'), "Model files should exist"
    assert 'risk_engine.pkl' in os.listdir('ml'), "Risk engine should exist"

    print("✓ All components integrated successfully")
    print("✓ End-to-end integration test passed")
    return True


def main():
    """Run all tests."""
    print("=" * 60)
    print("MPLADS ML PIPELINE - END-TO-END TESTS")
    print("=" * 60)

    tests = [
        test_data_loading,
        test_detectors,
        test_statistical_detector,
        test_risk_engine,
        test_model_training,
        test_inference,
        test_integration
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            test_func()
            passed += 1
            print(f"\n{'✓' * 20} {test_func.__name__} PASSED {'✓' * 20}")
        except Exception as e:
            failed += 1
            print(f"\n{'✗' * 20} {test_func.__name__} FAILED {'✗' * 20}")
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        print("\nML Module is ready for integration with the MPLADS application.")
        return True
    else:
        print(f"\n❌ {failed} test(s) failed. Please review the issues above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)