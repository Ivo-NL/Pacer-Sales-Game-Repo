# PACER Sales Methodology Game

PACER is an AI-powered simulation game designed to train sales representatives in the PACER sales methodology (Prospect, Assess, Challenge, Execute, Retain) through realistic, AI-generated customer interactions.

## Features

- AI-powered sales scenario simulations
- Interactive conversation interface
- Real-time evaluation and scoring
- Performance tracking and analytics
- Team challenges and leaderboards
- Progress tracking with skill development visualization

## Tech Stack

- **Backend**: Python/FastAPI with SQLite database
- **Frontend**: React with Material-UI
- **AI**: OpenAI o1-mini model integration

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- OpenAI API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-username/pacer-sales-game.git
cd pacer-sales-game
```

2. **Backend Setup**

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate  # On Windows
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your OpenAI API key
```

3. **Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install
```

### Running the Application

#### Using the start script (Windows PowerShell)

```powershell
# Start both backend and frontend
.\start_pacer.ps1

# Start only backend
.\start_pacer.ps1 -Component backend

# Start only frontend
.\start_pacer.ps1 -Component frontend
```

#### Manual startup

1. **Start the backend**

```bash
cd backend
python run.py
```

2. **Start the frontend**

```bash
cd frontend
npm start
```

3. **Access the application**

The application will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs

### Initial Setup

To create teams and manage the system, you need a manager account:

1. Register a new user through the UI
2. Run the admin script to grant manager privileges:
   ```
   cd backend
   python make_admin.py your_email@example.com
   ```

## Test User Credentials

For testing purposes, use:
- **Email**: testuser@example.com
- **Password**: Password123!

## License

This project is proprietary and confidential. 