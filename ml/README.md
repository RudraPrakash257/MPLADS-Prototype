# MPLADS ML Module

## Overview

This directory contains the machine learning module for the MPLADS (Member of Parliament Local Area Development Scheme) Comprehensive Intelligence Platform. The ML module implements forensic anomaly detection and risk scoring for infrastructure works across India.

## Architecture

The ML module consists of three main components:

1. **Detectors** (`detectors.py`): 6 forensic detectors based on available data
2. **Risk Engine** (`risk_engine.py`): Work-level risk scoring system
3. **Training Pipeline** (`train.py`): Complete ML model training pipeline
4. **Inference Engine** (`predict.py`): Prediction module for new records

## Key Features

### ✅ Implemented Detectors

1. **Cost Anomaly** - Modified Z-score detection for cost outliers per category
2. **Payment Gap** - Identifies unusual payment patterns (recommended but no payment)
3. **Category Risk** - Category-level payment rate analysis
4. **Duplicate Pattern** - Cost and district clustering for potential duplicates
5. **Geographic Anomaly** - State-level cost distribution analysis
6. **Isolation Forest** - Statistical anomaly detection on numerical features

### ✅ Risk Scoring

- Composite risk scores (0.0-1.0) for each work
- Risk levels: Critical, High, Medium, Low
- Detailed evidence from triggered detectors
- Feature importance analysis
- Human-review recommendations

### ✅ Target Prediction

**Primary Target:** `hasPayments` (binary - payment initiation vs no payment)
- **Training samples:** 2,390 works
- **Test samples:** 495 works
- **Best model:** Random Forest (Test AUC: 0.7580)

## Key Metrics

| Model | Validation AUC | Test AUC | Test Precision | Test Recall |
|-------|---------------|----------|----------------|------------|
| Logistic Regression | 0.6171 | - | - | - |
| Random Forest | 0.7195 | **0.7580** | 0.5038 | 0.5276 |
| Gradient Boosting | 0.6935 | - | - | - |

## Installation

### Prerequisites
```bash
pip install pandas>=2.0.0 scikit-learn>=1.3.0 numpy>=1.24.0 joblib>=1.3.0
```

### Install from Repository
```bash
pip install -r ml/requirements.txt
```

## Usage

### 1. Train New Model
```bash
python ml/train.py
```

### 2. Test Inference
```bash
python ml/predict.py
```

### 3. Load Pre-trained Model
```python
from ml.predict import MPLADSPredictor

# Initialize predictor
predictor = MPLADSPredictor()

# Score single work
work_data = {
    'workId': 1845,
    'state': 'Andhra Pradesh',
    'district': 'NANDYAL',
    'category': 'Normal/Others',
    'estimated_cost': 500000,
    'expected_beneficiaries': 0,
    'lsTerm': 18,
    'house': 'Lok Sabha',
    'recommended_year': 2026,
    'totalPaid': 0,
    'paymentCount': 0,
    'hasPayments': False
}

result = predictor.predict_single(work_data)
print(f"Risk Score: {result['risk_score']:.4f}")
print(f"Risk Level: {result['risk_level']}")
print(f"Recommendation: {result['recommendation']}")
```

### 4. Batch Processing
```python
import pandas as pd
from ml.predict import MPLADSPredictor

# Load data
df = pd.read_csv('data/works_recommended.csv')

# Score all works
predictor = MPLADSPredictor()
scored_df = predictor.predict_batch(df)

# Save results
scored_df.to_csv('ml/scored_works.csv', index=False)
```

## Files Generated

After running `train.py`:

- `ml/model_pipeline.pkl` - Trained ML model with preprocessing
- `ml/metadata.pkl` - Model metadata and feature information
- `ml/risk_engine.pkl` - Trained risk engine for anomaly detection

## Detector Details

### Cost Anomaly
- **Method:** Modified Z-score (robust to outliers)
- **Features:** Cost vs category median
- **Threshold:** |Z| > 3 (3 MAD range)
- **Output:** ₹ cost vs benchmark, Z-score

### Payment Gap
- **Method:** Business rule analysis
- **Rules:**
  - High cost without payment (₹500K+)
  - Very low payment ratio (<5%)
- **Output:** Payment status, ratio analysis

### Category Risk
- **Method:** Category-level baseline analysis
- **Features:** Payment rates per category
- **Threshold:** Categories with >50% payment rate
- **Output:** Baseline comparison, anomaly detection

### Duplicate Pattern
- **Method:** Cost/district clustering
- **Features:** Exact cost matches, description length
- **Output:** Potential duplicates, evidence

### Geographic Anomaly
- **Method:** Z-score within state
- **Features:** State mean/std, district patterns
- **Threshold:** |Z| > 3 (3σ range)
- **Output:** State analysis, outlier detection

### Isolation Forest
- **Method:** Unsupervised anomaly detection
- **Features:** Estimated cost, beneficiaries, lsTerm
- **Method:** Log-transform + scaling
- **Output:** Statistical anomaly scores

## Risk Scoring Algorithm

1. **Detector Execution:** Run all 6 detectors
2. **Score Aggregation:** Combine detector scores
   - Isolation Forest (40% weight)
   - Business detectors (60% weight)
3. **Convergence Bonus:** +20% score if ≥2 detectors trigger
4. **Risk Classification:**
   - Critical: ≥75%
   - High: ≥60% and <75%
   - Medium: ≥40% and <60%
   - Low: <40%

## Model Limitations

### Data Constraints
- Limited MP identifier data (85% missing)
- No actual fraud/risk labels available
- Text analysis limited to basic heuristics
- Geographic resolution at district level

### Model Limitations
- Predictive power moderate (AUC ~0.75)
- Focus on payment initiation, not fraud
- Risk scores based on proxies for financial abuse
- Requires continuous validation with ground truth

## Testing

### Unit Tests
```bash
pytest ml/ -v
```

### Data Loading Tests
```python
from ml.train import MLTrainer

# Test data loading
trainer = MLTrainer()
df, features = trainer.load_and_preprocess_data()
assert len(df) == 2390  # Expected number of samples
assert 'hasPayments' in df.columns  # Target column exists
```

### Detector Tests
```python
from ml.detectors import detect_cost_anomaly
import pandas as pd

work_row = pd.Series({
    'category': 'Normal/Others',
    'estimated_cost': 500000
})

# Test with sample data
cost_stats = {'Normal/Others': {'median': 300000, 'mad': 200000}}
result = detect_cost_anomaly(work_row, cost_stats)
assert result.name == 'cost_anomaly'
```

## Integration with Application

The ML module integrates with the main MPLADS application through:

1. **FastAPI Endpoints** (to be implemented)
   - `/api/predict` - Risk scoring for new works
   - `/api/works` - List and filter works with risk scores
   - `/api/anomalies` - Browse detected anomalies
   - `/api/reviews` - Manage human review workflow

2. **Frontend Integration** (to be implemented)
   - Risk score display in work details
   - Anomaly explorer dashboard
   - Review queue management
   - Geographic visualization

## Deployment

### Local Development
```bash
# Install environment
pip install -r ml/requirements.txt

# Start training
python ml/train.py

# Test predictions
python ml/predict.py
```

### Production Deployment
1. Save trained models to production location
2. Configure API endpoints
3. Set up monitoring and logging
4. Implement security and access control
5. Validate with ground truth data

## Future Enhancements

### Phase 2 Enhancements
- Integration with existing Flask/FastAPI application
- Frontend dashboard development
- Human-in-the-loop review workflow
- Geographic mapping and visualization
- MP performance analytics

### Phase 3 Enhancements
- Advanced NLP for text analysis
- Real-time anomaly detection
- Multi-model ensemble methods
- Explainable AI (SHAP integration)
- Time-series anomaly detection

## Contributing

### Code Standards
- Python 3.8+
- PEP 8 compliance
- Type hints
- Comprehensive docstrings
- Unit tests included

### Best Practices
- CPU-efficient implementations
- Error handling and validation
- Reproducible results
- Clean, maintainable code
- Documentation included

## Support

For issues and questions:
1. Check README.md for setup instructions
2. Review detector methodology documentation
3. Consult model performance metrics
4. Test with sample data provided

## License

This ML module is part of the MPLADS Comprehensive Intelligence Platform for SIH 2026.

---

**Generated:** September 26, 2026
**Version:** 1.0.0
**Target:** hasPayments prediction
**Models:** Random Forest (primary), Logistic Regression, Gradient Boosting