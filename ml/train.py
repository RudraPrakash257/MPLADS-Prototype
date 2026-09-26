#!/usr/bin/env python3
"""
MPLADS ML Training Pipeline

Trains and validates ML models for work risk prediction and payment initiation
using only data-supported targets and features.

Target: hasPayments (binary - payment initiation vs no payment)
"""

import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, precision_score, recall_score, confusion_matrix
import joblib
from pathlib import Path
import sys

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import from ml module
from ml.detectors import get_category_stats, get_cost_stats_by_category, get_state_stats


class MLTrainer:
    """
    Complete ML training pipeline for MPLADS work prediction.

    Trains and compares 2 CPU-friendly models on the payment initiation target.
    """

    def __init__(self, random_state=42):
        self.random_state = random_state
        self.target = 'hasPayments'
        self.numerical_features = ['estimated_cost', 'expected_beneficiaries', 'lsTerm']
        self.categorical_features = ['category', 'house', 'state']
        self.models = {}
        self.results = {}

    def load_and_preprocess_data(self, data_path='data/works_recommended.csv'):
        """
        Load and preprocess training data.

        Args:
            data_path: path to CSV data file

        Returns:
            df: processed DataFrame with features and target
            features: list of feature names used
        """
        print(f"Loading data from {data_path}...")
        df = pd.read_csv(data_path)

        # Validate required columns
        required_cols = ['estimated_cost', 'expected_beneficiaries', 'lsTerm',
                        'category', 'house', 'state', self.target]
        missing_cols = set(required_cols) - set(df.columns)
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")

        # Filter valid samples
        df = df.dropna(subset=[self.target])

        # Remove outliers (cost > ₹5 crores or < ₹10,000)
        df = df[(df['estimated_cost'] >= 10000) & (df['estimated_cost'] <= 50000000)]

        print(f"Processed dataset: {len(df)} samples")
        print(f"Target distribution: {df[self.target].value_counts().to_dict()}")

        # Prepare feature list
        features = self.numerical_features + self.categorical_features

        return df, features

    def build_preprocessor(self):
        """Build preprocessing pipeline for mixed data types."""
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, self.numerical_features),
                ('cat', categorical_transformer, self.categorical_features)
            ],
            remainder='drop'
        )

        return preprocessor

    def create_models(self):
        """Create and configure CPU-friendly ML models."""
        models = {
            'logistic_regression': LogisticRegression(
                random_state=self.random_state,
                max_iter=1000,
                class_weight='balanced'
            ),
            'random_forest': RandomForestClassifier(
                n_estimators=200,
                random_state=self.random_state,
                class_weight='balanced',
                n_jobs=-1
            ),
            'gradient_boosting': GradientBoostingClassifier(
                random_state=self.random_state
            )
        }

        return models

    def train_and_evaluate(self, df, features, X_train, y_train, X_val, y_val):
        """
        Train and evaluate all models on validation set.

        Args:
            df: full dataframe (for context statistics)
            features: feature list
            X_train, y_train: training data
            X_val, y_val: validation data

        Returns:
            results: dict with model performance metrics
        """
        preprocessor = self.build_preprocessor()
        models = self.create_models()

        results = {}

        for model_name, model in models.items():
            print(f"\n--- Training {model_name} ---")

            pipeline = Pipeline(steps=[
                ('preprocessor', preprocessor),
                ('classifier', model)
            ])

            pipeline.fit(X_train, y_train)

            y_pred_proba = pipeline.predict_proba(X_val)[:, 1]
            y_pred = pipeline.predict(X_val)

            auc_score = roc_auc_score(y_val, y_pred_proba)
            precision = precision_score(y_val, y_pred, zero_division=0)
            recall = recall_score(y_val, y_pred, zero_division=0)
            cm = confusion_matrix(y_val, y_pred)

            results[model_name] = {
                'pipeline': pipeline,
                'auc': auc_score,
                'precision': precision,
                'recall': recall,
                'confusion_matrix': cm,
                'y_pred': y_pred,
                'y_pred_proba': y_pred_proba
            }

            print(f"  AUC: {auc_score:.4f}")
            print(f"  Precision: {precision:.4f}")
            print(f"  Recall: {recall:.4f}")

        return results

    def select_best_model(self, results):
        """Select best model based on AUC score."""
        best_model_name = max(results.keys(), key=lambda x: results[x]['auc'])
        best_result = results[best_model_name]

        print(f"\n=== Best Model Selected: {best_model_name} ===")
        print(f"Validation AUC: {best_result['auc']:.4f}")

        self.models = {best_model_name: best_result['pipeline']}
        self.results = results

        return best_model_name, best_result

    def evaluate_on_test_set(self, df, best_model_name, best_pipeline, test_features):
        """Final evaluation on untouched test set."""
        print("\n=== Final Test Set Evaluation ===")

        # Create test split
        X = df[test_features]
        y = df[self.target]

        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=0.21, random_state=2026, stratify=y
        )

        preprocessor = self.build_preprocessor()

        # Get the right model class
        if best_model_name == 'logistic_regression':
            model = LogisticRegression(
                random_state=self.random_state,
                max_iter=1000,
                class_weight='balanced'
            )
        elif best_model_name == 'random_forest':
            model = RandomForestClassifier(
                n_estimators=200,
                random_state=self.random_state,
                class_weight='balanced',
                n_jobs=-1
            )
        else:
            model = GradientBoostingClassifier(
                random_state=self.random_state
            )

        full_pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])

        full_pipeline.fit(X_train_val, y_train_val)

        y_test_pred_proba = full_pipeline.predict_proba(X_test)[:, 1]
        y_test_pred = full_pipeline.predict(X_test)

        test_auc = roc_auc_score(y_test, y_test_pred_proba)
        test_precision = precision_score(y_test, y_test_pred, zero_division=0)
        test_recall = recall_score(y_test, y_test_pred, zero_division=0)
        test_cm = confusion_matrix(y_test, y_test_pred)

        print(f"Test AUC: {test_auc:.4f}")
        print(f"Test Precision: {test_precision:.4f}")
        print(f"Test Recall: {test_recall:.4f}")
        print(f"Test Confusion Matrix:\n{test_cm}")

        return {
            'test_auc': test_auc,
            'test_precision': test_precision,
            'test_recall': test_recall,
            'test_confusion_matrix': test_cm,
            'final_pipeline': full_pipeline,
            'X_test': X_test,
            'y_test': y_test
        }

    def save_model_and_metadata(self, df, features, test_results, preprocessor, best_model_name):
        """
        Save trained model, metadata, and create inference module.

        Args:
            df: original dataframe
            features: feature list
            test_results: test evaluation results
            preprocessor: fitted preprocessor
            best_model_name: name of best model
        """
        print("\n=== Saving Model and Metadata ===")

        # Get feature names after preprocessing
        sample_df = df[features]
        preprocessor.fit(sample_df)

        # Extract feature names from preprocessor
        numeric_names = self.numerical_features
        categorical_names = list(preprocessor.named_transformers_['cat']
                                .named_steps['encoder']
                                .get_feature_names_out(self.categorical_features))

        all_feature_names = numeric_names + list(categorical_names)

        # Create model pipeline
        model_data = {
            'model': test_results['final_pipeline'].named_steps['classifier'],
            'preprocessor': preprocessor,
            'scaler': preprocessor.named_transformers_['num'].named_steps['scaler'],
            'encoder': preprocessor.named_transformers_['cat'].named_steps['encoder'],
            'feature_names': all_feature_names,
            'target': {
                'name': self.target,
                'description': 'Binary target indicating if work initiates payments',
                'labels': {0: 'No Payment', 1: 'Payment Initiated'}
            },
            'metadata': {
                'training_samples': len(df),
                'model_name': best_model_name,
                'validation_auc': self.results[best_model_name]['auc'],
                'test_auc': test_results['test_auc'],
                'test_precision': test_results['test_precision'],
                'test_recall': test_results['test_recall'],
                'features': {
                    'numerical': self.numerical_features,
                    'categorical': self.categorical_features
                },
                'preprocessing': {
                    'numeric': 'median imputer + standard scaler',
                    'categorical': 'constant imputer + one-hot encoding'
                },
                'data_quality': {
                    'missing_values_handled': True,
                    'outlier_removed': True,
                    'class_distribution': df[self.target].value_counts().to_dict()
                }
            }
        }

        # Save model pipeline
        joblib.dump(model_data, 'ml/model_pipeline.pkl')
        print("[OK] Model pipeline saved to ml/model_pipeline.pkl")

        # Save metadata separately
        metadata = {
            'target': model_data['target'],
            'features': all_feature_names,
            'model_details': model_data['metadata']
        }
        joblib.dump(metadata, 'ml/metadata.pkl')
        print("[OK] Metadata saved to ml/metadata.pkl")

        # Create risk engine
        from ml.risk_engine import RiskEngine
        risk_engine = RiskEngine(random_state=self.random_state)
        risk_engine.prepare_context(df)
        risk_engine.save('ml/risk_engine.pkl')
        print("[OK] Risk engine saved to ml/risk_engine.pkl")

        return model_data, metadata

    def run_complete_pipeline(self):
        """Execute complete ML training pipeline."""
        print("=" * 60)
        print("MPLADS ML TRAINING PIPELINE")
        print("=" * 60)
        print(f"Target: {self.target}")
        print(f"Models: Logistic Regression, Random Forest, Gradient Boosting")
        print(f"CPU-friendly: YES")
        print("=" * 60)

        # Step 1: Load and preprocess data
        df, features = self.load_and_preprocess_data()

        # Step 2: Split data (80% train/val, 21% test)
        X = df[features]
        y = df[self.target]

        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=self.random_state, stratify=y
        )

        print(f"Training samples: {len(X_train)}, Validation samples: {len(X_val)}")

        # Step 3: Train and evaluate models
        results = self.train_and_evaluate(df, features, X_train, y_train, X_val, y_val)

        # Step 4: Select best model
        best_model_name, best_result = self.select_best_model(results)

        # Step 5: Final test evaluation
        test_results = self.evaluate_on_test_set(
            df, best_model_name, best_result['pipeline'], features
        )

        # Step 6: Save model and metadata
        model_data, metadata = self.save_model_and_metadata(
            df, features, test_results, best_result['pipeline'].named_steps['preprocessor'],
            best_model_name
        )

        print("\n" + "=" * 60)
        print("PIPELINE COMPLETION SUMMARY")
        print("=" * 60)
        print(f"[OK] Best model: {best_model_name}")
        print(f"[OK] Validation AUC: {best_result['auc']:.4f}")
        print(f"[OK] Test AUC: {test_results['test_auc']:.4f}")
        print(f"[OK] Features used: {len(model_data['feature_names'])}")
        print(f"[OK] Model saved: ml/model_pipeline.pkl")
        print(f"[OK] Metadata saved: ml/metadata.pkl")
        print(f"[OK] Risk engine saved: ml/risk_engine.pkl")
        print("=" * 60)

        return {
            'model_results': results,
            'best_model': best_model_name,
            'test_results': test_results,
            'model_data': model_data,
            'metadata': metadata
        }


if __name__ == "__main__":
    trainer = MLTrainer()
    results = trainer.run_complete_pipeline()

    print("\nTraining completed successfully!")
    print("\nNext steps:")
    print("1. Run ml/predict.py for inference testing")
    print("2. Check ml/detectors.py for detector implementations")
    print("3. Use ml/risk_engine.py for risk scoring")