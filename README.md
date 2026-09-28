# MPLADS Prototype

> **Live Demo:** [🚀 View Deployed Application](https://mplads-prototype-d41c.vercel.app)

# MPLADS Comprehensive Intelligence Platform

![MPLADS](https://img.shields.io/badge/SIH-2026-blue.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi)

## Overview

The **MPLADS Comprehensive Intelligence Platform** is a full-stack application developed for the Smart India Hackathon (SIH) 2026. It is designed to provide forensic anomaly detection, risk scoring, and intelligent insights into the Members of Parliament Local Area Development Scheme (MPLADS) infrastructure works across India.

The platform aims to enhance transparency, detect potential financial irregularities (like cost anomalies, duplicate patterns, and geographical outliers), and predict payment initiation status using machine learning.

## System Architecture

The project is structured into three main modules:

1. **Frontend (`/frontend`)**: A modern, responsive user interface built with React, Vite, and Lucide Icons.
2. **API Backend (`/api`)**: A high-performance RESTful API built with FastAPI to serve the frontend and interface with the ML models.
3. **Machine Learning Module (`/ml`)**: The core analytical engine featuring data preprocessing, forensic detectors, risk scoring, and ML inference pipelines.

## Features

- **Forensic Anomaly Detection**: 6 active detectors analyzing cost outliers, payment gaps, category risks, potential duplicates, geographic anomalies, and overall statistical anomalies (Isolation Forest).
- **Risk Scoring Engine**: Generates a composite risk score (0.0 to 1.0) and assigns a risk level (Critical, High, Medium, Low) for each infrastructure work.
- **Predictive Analytics**: Predicts the likelihood of payment initiation using a pre-trained Random Forest model (Test AUC: 0.7580).
- **Modern UI/UX**: Interactive dashboard to view works, anomalies, risk scores, and manage human reviews.

## Installation and Setup

### Prerequisites

- Node.js (v18+)
- Python (3.8+)
- npm or yarn

### 1. Backend & ML Setup

Navigate to the project root and install the Python dependencies:

```bash
# It is recommended to use a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
pip install -r ml/requirements.txt
```

### 2. Frontend Setup

Navigate to the frontend directory and install Node dependencies:

```bash
cd frontend
npm install
```

## Running the Application

### Start the API Server

From the root directory, start the FastAPI server:

```bash
# (Ensure your virtual environment is activated)
python api/server.py
# or using uvicorn directly:
uvicorn api.server:app --reload
```

### Start the Frontend Server

In a new terminal window, start the Vite development server:

```bash
cd frontend
npm run dev
```

The frontend will typically be accessible at `http://localhost:5173`.

## Machine Learning Module

For detailed instructions on training new models, running batch inference, and testing the detectors, please refer to the dedicated [ML Module README](ml/README.md).

## Project Structure

```text
MPLADS/
├── api/                  # FastAPI backend source code
│   ├── index.py
│   ├── server.py
│   └── test_api.py
├── frontend/             # React + Vite frontend application
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── ml/                   # Machine Learning and Risk Engine
│   ├── detectors.py
│   ├── predict.py
│   ├── risk_engine.py
│   ├── train.py
│   └── README.md         # Detailed ML documentation
├── data/                 # Raw and processed datasets
├── requirements.txt      # Python dependencies for API/Backend
└── README.md             # Project documentation (this file)
```

## License

This project is developed for the Smart India Hackathon (SIH) 2026.
