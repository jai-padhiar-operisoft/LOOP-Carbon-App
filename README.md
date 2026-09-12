# LOOP - Consumer Carbon Loop App 🌍

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
</p>

<p align="center">
  <strong>Not a carbon tracker. A carbon mirror that talks back.</strong>
</p>

<p align="center">
  Built for <strong>HackOut'26</strong> - DAU Hackathon
</p>

---

## 🎯 The Problem

- **72% of global emissions** come from household consumption, yet most people have no idea where their personal carbon comes from
- Existing carbon tracking apps require tedious manual entry
- Generic advice like "take public transport" ignores local availability
- Individual guilt without social context doesn't drive behavior change

## 💡 Our Solution

**LOOP** automatically parses your bank/UPI transaction CSV and calculates your carbon footprint using emission factors based on merchant categories. No manual entry. Just upload and see your impact.

### Key Features

| Feature | Description |
|---------|-------------|
| 📊 **Auto CSV Parsing** | Upload any bank/UPI CSV. AI classifies every transaction |
| 🎭 **Carbon Personality** | 6 evolving personas based on your Loop Score (0-1000) |
| 📅 **Carbon Calendar** | GitHub-style heatmap showing daily CO2 intensity |
| 🏆 **City Rankings** | See your percentile among all LOOP users in your city |
| 🗺️ **Local Action Map** | Recycling centers, e-waste drops, repair cafes near you |
| 📖 **AI Carbon Story** | Weekly narrative written by AI - specific, honest, actionable |
| 👥 **Social Circles** | Create groups with friends. Compete on leaderboards |
| ✍️ **Manual Logger** | Quick-add buttons for common expenses |
| 🏅 **Milestones** | 9 achievement badges with gamified progress |
| 🌓 **Dark/Light Mode** | System preference detection with smooth transitions |

## 🔐 Security Features

- **SHA-256 CSV Hash Verification** - Prevents re-uploading same file to game leaderboards
- **OTP Email Verification** - Prevents bot account creation
- **Password Hashing** - bcrypt for secure storage
- **JWT Sessions** - Secure token-based authentication

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  Next.js 16 + React + TypeScript + Recharts + Leaflet       │
│  Port: 3000                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND                                │
│  FastAPI + Python 3.12 + SQLite                             │
│  Port: 8000                                                  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ CSV Parser  │  │ AI Classify │  │ Story Gen   │         │
│  │             │  │ (OpenRouter)│  │ (Gemma LLM) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Carbon Calculation

We use emission factors derived from **GHG Protocol** and **DEFRA** standards:

| Category | Factor (kg CO2/₹) |
|----------|-------------------|
| Flights | 0.0035 |
| Fuel | 0.0025 |
| Electronics | 0.0015 |
| Ride Hailing | 0.0012 |
| Electricity | 0.00082 |
| Food Delivery | 0.0008 |
| Public Transport | 0.00015 |

**Formula:** `CO2 (kg) = Amount Spent (₹) × Emission Factor`

## 🎮 Loop Score & Personalities

| Score | Personality | Description |
|-------|-------------|-------------|
| 801-1000 | 🌟 Green Pioneer | Leading by example |
| 651-800 | 🏆 Conscious Optimizer | Sustainability is lifestyle |
| 501-650 | 🌿 Mindful Consumer | Above average |
| 351-500 | ⚡ Convenience Consumer | Aware but inconsistent |
| 201-350 | 📈 Habitual Spender | Convenient but heavy |
| 0-200 | 🔥 Carbon Heavy | Biggest wins ahead |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- Git

### Backend Setup

```bash
cd loop-backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd loop-frontend

# Install dependencies
npm install

# Build for production
npm run build

# Run server
npm run start
```

### Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## 📁 Project Structure

```
DAU Hackathon/
├── loop-frontend/           # Next.js Frontend
│   ├── app/                 # Pages (App Router)
│   ├── components/          # React Components
│   ├── lib/                 # Utilities
│   └── hooks/               # Custom Hooks
│
├── loop-backend/            # FastAPI Backend
│   ├── main.py              # API Routes
│   ├── auth.py              # Authentication
│   ├── csv_parser.py        # Transaction Parsing
│   ├── classifier.py        # AI Classification
│   ├── scoring.py           # Score Calculation
│   └── story_generator.py   # AI Narratives
│
├── sample-csvs/             # Test Data
├── context.md               # Project Documentation
├── LOOP_Presentation.pptx   # Hackathon Pitch Deck
└── README.md
```

## 🌍 Impact Equivalents

Your CO2 translated into India-relevant comparisons:

- 🌳 **Trees needed** to offset per month
- 🚗 **Kilometers driven** by petrol car
- 🛺 **Auto rides** (5km each)
- ☕ **Chai cups** (cutting chai)
- ❄️ **AC hours** (1.5 ton AC)
- 🚇 **Metro trips** (10km each)

## 📈 Metrics & Impact

| Metric | Value |
|--------|-------|
| Emission Reduction | 10-15% average for users who track |
| Engagement | 3x higher with social comparison |
| Retention | 5x better with gamification |

## 🛣️ Roadmap

### Now (MVP)
- ✅ CSV parsing & AI classification
- ✅ Loop Score & personalities
- ✅ City rankings & circles
- ✅ Manual expense logging

### Next
- 🔄 Bank API integration
- 🌱 Carbon offset marketplace
- 🏢 Corporate team features
- 📱 Mobile app (iOS/Android)

### Future
- 🇮🇳 Pan-India expansion
- 🗣️ Regional language support
- 🏛️ Government partnerships

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- GHG Protocol for emission factor standards
- DEFRA for UK greenhouse gas conversion factors
- OpenRouter for AI model access
- HackOut'26 organizers

---

<p align="center">
  <strong>"Close the Loop. See your impact. Understand it. Change it."</strong>
</p>
