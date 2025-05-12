# PACER Sales Methodology Game - pm

PACER is an AI-powered simulation game designed to train sales representatives in the PACER sales methodology (Prospect, Assess, Challenge, Execute, Retain) through realistic, AI-generated customer interactions.

## Executive Summary

The PACER Sales Methodology Game is an AI-powered simulation game designed to train sales representatives at My Company in the PACER sales methodology. Through realistic, AI-generated customer interactions, salespeople will practice and master the five stages of the PACER approach: Prospect, Assess, Challenge, Execute, and Retain. The game leverages OpenAI's o1-mini model to create dynamic, personalized scenarios that adapt to the player's actions and decisions, providing an engaging and effective learning experience.

### Key Goals:
- Accelerate adoption of the PACER sales methodology across all regions
- Provide a risk-free environment for sales representatives to practice complex sales interactions
- Drive competitive engagement through leaderboards and gamification
- Capture data on sales training effectiveness and individual salesperson strengths/weaknesses
- Reduce time-to-productivity for new sales hires

## Problem Statement & Opportunity

My Company faces challenges in rapidly training its sales force on the new PACER methodology while adapting to rapidly changing market conditions. Traditional training methods are often:

- Time-consuming and expensive, requiring in-person workshops
- Inconsistent across regions and teams
- Limited in providing practical, hands-on experience
- Unable to simulate the complexity of real-world payment processing sales scenarios
- Difficult to track comprehension and application

The opportunity is to leverage GenAI to create an immersive, adaptive learning environment that scales across the organization, accelerates skill development, and provides data-driven insights into sales capability.

## Product Overview

### Product Description
The PACER Sales Methodology Game is an interactive, browser-based simulation platform where sales representatives engage with AI-generated prospects and clients in realistic payment processing sales scenarios. Players navigate through the entire sales cycle, making decisions that impact outcomes while the system provides feedback and scoring based on adherence to the PACER methodology.

### Target Users
- **Primary:** Sales representatives at My Company (all experience levels)
- **Secondary:** Sales managers and team leaders
- **Tertiary:** Sales enablement and training teams

### Key Features Overview
- AI-generated sales scenarios customized to My Company's product portfolio
- Dynamic simulated client interactions powered by OpenAI's o1-mini
- Role-playing across all five PACER stages
- Scoring system aligned with PACER best practices
- Global and regional leaderboards
- Scenario library focused on payment processing solutions
- Progress tracking and skills assessment
- Manager dashboards for team performance analysis

## Project Development Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1.0: Core Infrastructure** | Foundational backend and frontend setup | COMPLETED |
| **Phase 1.1: Basic Functionality** | Initial conversation interface and models | COMPLETED |
| **Phase 1.2: User Authentication** | Login, registration, and user management | COMPLETED |
| **Phase 2.0: Game Mechanics** | Game sessions, scenarios, and evaluation | COMPLETED |
| **Phase 2.1: Dashboard & Analytics** | User progress tracking and visualization | COMPLETED |
| **Phase 2.2: Enhanced AI Interactions** | Improved conversation quality and contextual awareness | COMPLETED |
| **Phase 2.3: Performance Metrics** | Comprehensive scoring and skill evaluation | COMPLETED |
| **Phase 2.4: Social & Team Features** | Team management and collaborative features | COMPLETED |
| **Phase 2.5: Responsive Design** | Mobile optimization and UX improvements | COMPLETED |
| **Phase 3.0: Preparation for Production** | Performance optimizations and stabilization | IN PROGRESS |
| **Phase 3.1: Advanced Gameplay Mechanics** | Time-based challenges, events, adaptive difficulty | COMPLETED |
| **Phase 3.2: Recording & Review** | Session playback and analysis features | COMPLETED |
| **Phase 3.3: Enhanced Gameplay UI** | Improved session interface with methodology guidance | COMPLETED |
| **Phase 3.4: Session Management Enhancements** | Improved session navigation and management | COMPLETED |
| **Phase 3.5: Real-time Streaming Features** | Text and audio streaming for conversations | IN PROGRESS |
| **Phase 3.6: Mobile Experience** | Native mobile application development | PLANNED |
| **Phase 3.7: Advanced AI & Analytics** | Improved AI models and analytics | PLANNED |
| **Phase 3.8: Technical Infrastructure** | Scaling and enterprise integration | PLANNED |
| **Phase 3.9: Multilingual Support** | Multiple language support across the platform | PLANNED |
| **Phase 3.10: Extended Reality Integration** | AR/VR simulation environments | PLANNED |

## Phase Details

### Phase 1: Core Development (COMPLETED)

#### Phase 1.0: Core Infrastructure
- Backend setup with FastAPI and SQLAlchemy
- Frontend initialization with React and Material-UI
- Database schema design and implementation
- API endpoints for basic functionality
- Authentication framework
- Development environment configuration

#### Phase 1.1: Basic Functionality
- Simple conversation interface
- Basic AI response generation
- Initial PACER methodology integration
- User profile creation
- Static scenario content

#### Phase 1.2: User Authentication
- Secure login and registration
- Password management
- Session handling
- User roles and permissions
- Profile management

### Phase 2: Enhanced Gameplay (COMPLETED)

#### Phase 2.0: Game Mechanics
- Scenario-based gameplay
- Conversation flow and turn-based interactions
- Initial scoring system
- Basic feedback on user performance
- Simple progress tracking

#### Phase 2.1: Dashboard & Analytics
- User dashboard for tracking progress
- Visual representation of skills
- Performance history
- Achievement system
- Personalized recommendations

#### Phase 2.2: Enhanced AI Interactions
- Improved AI response quality
- Context-aware conversations
- Persona-based client simulation
- Variable difficulty levels
- Natural language processing improvements

#### Phase 2.3: Performance Metrics
- Detailed performance evaluation
- Skill breakdown by PACER stage
- Comparative analysis against peers
- Trend analysis over time
- Actionable feedback and coaching

**Scoring Mechanism**

The PACER application implements a sophisticated real-time scoring system that evaluates user performance across multiple dimensions:

1. **Score Components**:
   - **Overall Score**: Composite score of all components (0-100)
   - **Methodology Score**: Evaluation of PACER methodology application (0-100)
   - **Rapport Score**: Measures relationship building effectiveness (0-100)
   - **Progress Score**: Tracks advancement through sales stages (0-100)
   - **Outcome Score**: Evaluates likelihood of successful deal closure (0-100)

2. **Scoring Formula**:
   ```
   final_score = round(quality * time_bonus * difficulty_factor) + goal_bonus
   ```
   Where:
   - `quality`: Base score calculated as weighted average of component scores (methodology: 40%, rapport: 25%, progress: 20%, outcome: 15%)
   - `goal_bonus`: Points added based on goal achievement (0, 8, or 15 points)
   - `time_bonus`: Multiplier for efficient time management (0.9-1.1x)
   - `difficulty_factor`: Adjustment based on scenario complexity (1.0-2.0x)
   - Final score is clamped between 0 and 100

3. **Real-time Scoring**:
   - Active sessions receive score updates as the conversation progresses
   - First score fetch happens immediately upon session start
   - Subsequent fetches are throttled to prevent excessive API calls (max once every 3 seconds)
   - Score updates are visualized with animations and delta indicators
   - Pillar scores (Execution, Methodology, Progress) are derived from the component scores

4. **API Integration**:
   - `/api/game/sessions/{session_id}/current-score` - Provides real-time score for active sessions
   - `/api/game/sessions/{session_id}/score` - Returns final score for completed sessions
   - Scores are calculated server-side based on AI evaluation of conversation quality

5. **Score Persistence**:
   - Scores are stored in the database for historical tracking
   - Performance over time is visualized in the dashboard
   - Session scores contribute to leaderboard rankings and team challenges

6. **Feedback System**:
   - Detailed score breakdown is presented upon session completion
   - Actionable feedback is provided based on scoring analysis
   - Areas for improvement are highlighted with specific recommendations
   - Feedback can be saved and reviewed later in the recordings section

The scoring system uses intelligent throttling mechanisms to balance UI responsiveness with server load. Active sessions query scores frequently but with rate limiting, while completed sessions fetch final scores only when needed for display.

#### Phase 2.4: Social & Team Features
- Team management functionality
- Team-based challenges and competitions
- Leaderboards (individual and team)
- Peer comparison tools
- Achievement sharing

**Key Features:**
- Team listings with search and filtering
- Team creation with customizable profiles
- Join/leave team functionality
- Team avatar system
- Challenge creation with specific PACER focus areas
- Progress tracking during challenges
- Results visualization
- Achievement badges for challenge completion
- Overall team performance metrics
- PACER stage breakdowns at team level
- Member contribution insights
- Skill gap analysis
- Trend indicators and historical performance
- Detailed skill benchmarking
- PACER stage comparison via radar charts
- Skill gap identification
- Personalized improvement recommendations
- Toggle between team and individual views
- Multiple sorting and filtering options
- Performance trend indicators
- Historical ranking changes
- Multiple time period views (weekly, monthly, quarterly)

#### Phase 2.5: Responsive Design
- Mobile-friendly interface
- Cross-device compatibility
- Touch-optimized controls
- Responsive layouts
- Offline capabilities

### Phase 3: Advanced Features & Production (IN PROGRESS)

#### Phase 3.1: Advanced Gameplay Mechanics (COMPLETED)
- Time-based challenges with countdown timer
- Unexpected events during scenarios
- Adaptive difficulty based on player skill level
- Special competitions and tournaments
- Seasonal and event-based scenarios

**Features Being Implemented:**
- **Timer System**: Added timer tracking and display for timed game sessions
- **Countdown Functionality**: Implemented real-time countdown with pause/resume capabilities
- **Timed Challenge Modal**: Created UI for timed challenges with specialized scoring
- **Random Events**: Implemented AI-driven unexpected events during scenarios
- **Event Types**: Added competitor interventions, market changes, and client emergencies
- **Response Options**: Provided multi-option response UI with difficulty indicators
- **Impact Evaluation**: Added evaluation of player's response to events
- **Player Performance Tracking**: System that tracks player skill level across sessions
- **Dynamic Difficulty Adjustment**: AI adjusts difficulty based on player performance
- **Difficulty Settings**: User-configurable difficulty preferences
- **Performance-Based Scaling**: More challenging scenarios for high-performing players
- **Tournament Mode**: Added tournament functionality with special rules
- **Unique Scoring Criteria**: Specialized scoring for tournaments and challenges
- **Leaderboards**: Enhanced competitive engagement
- **Seasonal Content**: Added time-limited content that appears seasonally
- **Special Events**: Created event-based scenarios tied to industry events
- **Rotating Content**: Management system for introducing and retiring content
- **Connected Frontend to Backend**: Replaced mock data with real API integration
- **Enhanced AI Service**: Extended AI capabilities for new gameplay features
- **Data Persistence**: Added storage for all new gameplay elements

#### Phase 3.2: Recording & Review System (COMPLETED)
- Session recording functionality
- Playback and review capabilities
- Annotated feedback on recordings
- Coach/mentor review interface
- Export and sharing options

**Features Implemented:**
- **Session Recording**: Implemented system to record and store complete game sessions with metadata
- **Playback Interface**: Created an interactive timeline with play, pause, skip and speed controls
- **Annotation System**: Added ability to comment on specific moments in recordings with feedback
- **Bookmark System**: Implemented feature to mark and quickly access important moments
- **PACER Tagging**: Enabled tagging interactions with relevant PACER methodology stages
- **Review Dashboard**: Built interface for coaches/mentors to review sessions and provide feedback
- **Sharing Controls**: Added permission-based sharing options for collaborative learning
- **Export Options**: Implemented PDF and video export functionality
- **Database Models**: Created models for recordings, annotations, bookmarks, shares, and exports
- **API Endpoints**: Built comprehensive API for managing all recording system functionality
- **User Interface**: Developed intuitive interfaces for recording management and playback

#### Phase 3.3: Enhanced Gameplay UI (COMPLETED)
- PACER methodology reference and guidance
- Session goal tracking and visualization
- Time management features
- Flexible session ending options
- Improved feedback and evaluation display

**Features Implemented:**
- **PACER Methodology Reference**: Added detailed tooltips with stage-specific guidance and techniques
- **Session Goals**: Implemented clear goal setting based on current PACER stage
- **Goal Progress Tracking**: Visual progress indicators showing advancement toward session goals
- **Session Timer**: Added a visible timer to track session duration for better time management
- **Flexible Session Ending**: Multiple options for ending sessions (goal completion, time constraints, client availability)
- **Enhanced Feedback System**: Improved feedback display with tooltips containing evaluations and improvement tips
- **Contextual Assistance**: Added stage-specific guidance to help sales representatives apply appropriate techniques
- **Real-time Evaluation**: Enhanced the real-time feedback system with more detailed assessments
- **Improved UI Layout**: Reorganized the interface for better information hierarchy and usability
- **Progress Visualization**: Clearer visualization of progress toward session objectives

#### Phase 3.4: Session Management Enhancements (COMPLETED)
- Improved session navigation and management
- Session lifecycle controls
- Enhanced user experience

**Features Implemented:**
- **Navigation Re-ordering**: Repositioned Sessions menu item right after Dashboard for improved workflow
- **Session Deletion**: Added ability to delete unwanted sessions with confirmation dialog
- **Session Restart**: Implemented functionality to restart a session with the same scenario from scratch
- **Visual Feedback**: Added clear visual indicators for session actions with tooltips
- **Confirmation Dialogs**: Implemented safety measures to prevent accidental deletions
- **Backend Support**: Created dedicated API endpoints for session management:
  - DELETE /api/game/sessions/{session_id}
  - POST /api/game/sessions/{session_id}/restart
- **Data Cleanup**: Proper cascade deletion of all related session data
- **Session Preservation**: Maintained key settings when restarting sessions (difficulty, time limits)
- **Permission Controls**: Ensured users can only manage their own sessions

#### Phase 3.5: Real-time Streaming Features (IN PROGRESS)
- Real-time text streaming of AI responses (**now supported in the UI via `streamInteractFetch`**)
- Audio streaming for conversation playback
- Text-to-speech integration for AI-voiced responses
- Streaming API endpoints for efficient data delivery
- WebSocket implementation for live conversations
- Optimized response chunking for immediate feedback
- Enhanced user engagement through incremental content display
- Configurable streaming settings for different connection speeds
- Adaptive streaming based on network conditions

#### Phase 3.6: Mobile Experience (PLANNED)
- Native mobile application
- Mobile-specific UX enhancements
- Push notifications
- Offline training mode
- Touch-optimized interactions
- Responsive design for various screen sizes
- Mobile-specific navigation patterns
- Device capability adaptation
- Cross-platform compatibility
- Secure biometric authentication

#### Phase 3.7: Advanced AI & Analytics (PLANNED)
- Enhanced AI conversation models
- Predictive performance analytics
- Personalized learning paths
- AI-generated coaching
- Dynamic scenario adaptation

#### Phase 3.8: Technical Infrastructure (PLANNED)
- Scalability improvements
- Enterprise integration capabilities
- Advanced security features
- SSO and directory service integration
- High availability and disaster recovery

#### Phase 3.9: Multilingual Support (PLANNED)
- Multiple language interfaces
- Language detection and switching
- Localized content and scenarios
- Culture-specific sales approaches
- Internationalization infrastructure

#### Phase 3.10: Extended Reality Integration (PLANNED)
- AR/VR simulation environments
- Immersive sales scenarios
- Spatial computing interfaces
- Virtual customer meetings
- 3D product demonstrations

## PACER Methodology Details

The PACER sales methodology comprises five stages that guide sales representatives through the complete sales cycle:

### P - Prospect
- Use AI-enhanced prospecting techniques (automated searches, market intelligence)
- Identify high-potential leads through referrals and networks
- Leverage personalized outreach strategies
- Apply content marketing as lead generation
- Monitor market triggers for sales opportunities

### A - Assess
- Apply MEDDIC framework for qualification (Metrics, Economic Buyer, Decision criteria/process, Identify pain, Champion)
- Map stakeholders and relationships
- Use SPIN questioning techniques (Situation, Problem, Implication, Need-payoff)
- Apply neuroscience-backed interaction techniques
- Qualify with AI-driven insights

### C - Challenge
- Present configurable solutions tailored to client needs
- Apply the Challenger approach to shape buyer perceptions
- Reframe problems and offer unique insights
- Use AI-assisted content personalization
- Teach customers something new about their business

### E - Execute
- Manage long sales cycles with Mutual Action Plans
- Navigate multiple decision-makers effectively
- Handle objections with data-driven insights
- Use AI-driven negotiation support
- Structure deals creatively to overcome obstacles

### R - Retain
- Implement AI-powered customer retention strategies
- Conduct effective Quarterly Business Reviews
- Leverage executive sponsorship appropriately
- Apply continuous training and knowledge sharing
- Execute targeted upselling strategies

## My Company Product Portfolio

The simulation game includes scenarios covering My Company's complete product portfolio:

### 1. Issuing Solutions
- Traditional card issuing
- Corporate and commercial cards
- Digital-first cardholder lifecycle management

### 2. Acceptance & Authorization
- Omni-channel payments (e-commerce, m-commerce, in-store, and ATM)
- Acquiring processing

### 3. Account-to-Account Payments (A2A)
- Open banking payment solutions

### 4. Central Bank Digital Currencies (CBDC) / Digital Euro
- Solutions for both central and commercial banks

### 5. Instant Payments
- SaaS-based end-to-end instant payment processing

### 6. Fraud Risk Management
- Multi-rail fraud detection and prevention solutions
- AI and rule-based technologies

### 7. Digital Services
- Authentication solutions
- Digital currency services
- Financial market solutions

## Project Structure

```
PACER/
├── backend/                      # Python FastAPI backend
│   ├── app/                      # Main application code
│   │   ├── data/                 # Data files and resources
│   │   ├── routers/              # API route definitions
│   │   ├── ai_service.py         # AI integration service
│   │   ├── auth.py               # Authentication logic
│   │   ├── database.py           # Database connection and models
│   │   └── main.py               # Application entry point
│   ├── venv/                     # Python virtual environment
│   ├── .env.example              # Example environment variables
│   ├── make_admin.py             # Utility to create admin users
│   ├── requirements.txt          # Python dependencies
│   └── run.py                    # Server startup script
│
├── frontend/                     # React frontend
│   ├── public/                   # Static assets
│   ├── src/                      # Source code
│   │   ├── components/           # Reusable UI components
│   │   │   ├── BadgesDisplay.js  # User achievement badges
│   │   │   ├── ChallengeSystem.js # Team challenges functionality
│   │   │   ├── EventSystem.js    # Game events system
│   │   │   ├── Header.js         # App header and navigation
│   │   │   ├── RecordingsList.js # Recordings management
│   │   │   ├── RecordingPlayback.js # Session playback interface
│   │   │   ├── SeasonalContent.js # Seasonal content display
│   │   │   ├── TeamsList.js      # Teams management
│   │   │   └── TimerSystem.js    # Game timer functionality
│   │   ├── context/              # React context providers
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # Main application pages
│   │   │   ├── Challenges.js     # Team challenges page
│   │   │   ├── Dashboard.js      # User dashboard
│   │   │   ├── GameSession.js    # Main game interface
│   │   │   ├── Leaderboard.js    # Leaderboards
│   │   │   ├── Login.js          # User authentication
│   │   │   ├── ProgressDashboard.js # Detailed progress tracking
│   │   │   ├── Recordings.js     # Recordings management page
│   │   │   ├── ReviewDashboard.js # Coach review interface
│   │   │   ├── Sessions.js       # Game sessions list
│   │   │   └── Teams.js          # Team management
│   │   ├── services/             # API and service integrations
│   │   └── utils/                # Utility functions
│   ├── package.json              # NPM dependencies and scripts
│   └── start_frontend.js         # Frontend start script
│
├── .gitignore                    # Git ignore file
├── phase2_4_summary.md           # Phase 2.4 documentation
├── phase3_1_summary.md           # Phase 3.1 documentation
├── README.md                     # This file
└── start_pacer.ps1               # Script to start the application
```

## Technical Features

### Backend
- **Framework**: FastAPI with SQLAlchemy
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: JWT-based with refresh tokens
- **AI Integration**: OpenAI models for conversation and evaluation

### Frontend
- **Framework**: React with Material-UI
- **State Management**: React Context API
- **Responsive Design**: Flexbox and Grid layouts
- **Visualization**: Chart.js for analytics and progress tracking

### AI Components
- Conversation generation
- Performance evaluation
- Skill assessment
- Adaptive difficulty
- Content recommendation

## Admin Features
- User management
- Scenario creation and editing
- Performance monitoring
- System configuration
- Content management

## API Endpoints

### Core API
- **GET /api** - Welcome message and API version
- **GET /health** - Health check endpoint that verifies database connection
- **GET /seed** - Seed the database with initial data (development only)

### Authentication Endpoints (/api)
- **POST /api/register** - Register a new user
- **POST /api/token** - Get authentication token
- **POST /api/login** - User login
- **GET /api/me** - Get current user information
- **POST /api/test-auth** - Test authentication
- **POST /api/admin/make-manager/{email}** - Promote user to manager role

### Game Endpoints (/api/game)
- **GET /api/game/scenarios** - List all scenarios
- **GET /api/game/scenarios/{scenario_id}** - Get specific scenario
- **POST /api/game/scenarios** - Create new scenario
- **POST /api/game/scenarios/{scenario_id}/stakeholders** - Add stakeholder to scenario
- **POST /api/game/scenarios/{scenario_id}/competitor** - Add competitor to scenario
- **POST /api/game/sessions** - Create new game session
- **GET /api/game/sessions/{session_id}** - Get specific session
- **GET /api/game/sessions** - List all sessions
- **POST /api/game/sessions/{session_id}/interact** - Send message in game session
- **POST /api/game/sessions/{session_id}/multi-interact** - Interact with multiple stakeholders
- **POST /api/game/sessions/{session_id}/analyze-competitor** - Get competitor analysis
- **POST /api/game/sessions/{session_id}/meeting-summary** - Generate meeting summary
- **POST /api/game/sessions/{session_id}/complete** - Complete game session
- **DELETE /api/game/sessions/{session_id}** - Delete a game session
- **POST /api/game/sessions/{session_id}/restart** - Restart a session with the same scenario
- **GET /api/game/leaderboard** - Get leaderboard data

#### Game Events and Challenges
- **POST /api/game/game-events** - Create game event
- **GET /api/game/game-events/{scenario_id}** - Get events for scenario
- **POST /api/game/sessions/{session_id}/trigger-event** - Trigger game event
- **POST /api/game/sessions/{session_id}/event-response** - Respond to event
- **POST /api/game/timed-challenges** - Create timed challenge
- **GET /api/game/timed-challenges/{session_id}** - Get timed challenges for session
- **PUT /api/game/timed-challenges/{challenge_id}** - Update timed challenge

#### Timer Management
- **POST /api/game/sessions/{session_id}/start-timer** - Start session timer
- **POST /api/game/sessions/{session_id}/pause-timer** - Pause session timer
- **GET /api/game/sessions/{session_id}/timer-status** - Get timer status

#### Difficulty Settings
- **POST /api/game/difficulty-settings** - Create difficulty settings
- **GET /api/game/difficulty-settings** - Get difficulty settings
- **PUT /api/game/difficulty-settings** - Update difficulty settings

#### Seasonal Content
- **POST /api/game/seasonal-content** - Create seasonal content
- **GET /api/game/seasonal-content** - List seasonal content

### Recording Endpoints (/api/recordings)
- **GET /api/recordings** - Get all recordings for the current user
- **POST /api/recordings** - Create a new recording
- **GET /api/recordings/{recording_id}** - Get a specific recording
- **PUT /api/recordings/{recording_id}** - Update a recording
- **DELETE /api/recordings/{recording_id}** - Delete a recording
- **POST /api/recordings/{recording_id}/request-review** - Request a review
- **GET /api/recordings/reviews/pending** - Get recordings pending review (managers)
- **POST /api/recordings/{recording_id}/review** - Submit a review for a recording

#### Recording Annotations
- **GET /api/recordings/{recording_id}/annotations** - Get all annotations
- **POST /api/recordings/{recording_id}/annotations** - Create an annotation

#### Recording Bookmarks
- **GET /api/recordings/{recording_id}/bookmarks** - Get all bookmarks
- **POST /api/recordings/{recording_id}/bookmarks** - Create a bookmark

#### Recording Sharing & Export
- **POST /api/recordings/{recording_id}/share** - Share a recording
- **POST /api/recordings/{recording_id}/export** - Export a recording

### Team Endpoints (/api/team)
- **POST /api/team/teams** - Create new team
- **GET /api/team/teams** - List all teams
- **GET /api/team/teams/{team_id}** - Get specific team with members
- **POST /api/team/teams/{team_id}/members** - Add member to team
- **DELETE /api/team/teams/{team_id}/members/{user_id}** - Remove member from team

#### Team Challenges
- **POST /api/team/challenges** - Create team challenge
- **GET /api/team/challenges** - List all team challenges
- **GET /api/team/challenges/{challenge_id}** - Get specific team challenge
- **GET /api/team/challenges/{challenge_id}/results** - Get challenge results
- **PUT /api/team/challenges/{challenge_id}** - Update team challenge

### Progress Endpoints (/api/progress)
- **GET /api/progress/progress** - Get user progress
- **GET /api/progress/progress/detailed** - Get detailed user progress
- **GET /api/progress/badges** - List all badges
- **GET /api/progress/badges/user** - Get user badges
- **POST /api/progress/badges** - Create new badge
- **POST /api/progress/badges/award** - Award badge to user
- **POST /api/progress/progress/check-achievements** - Check and award achievements
- **GET /api/progress/skills/recommendations** - Get skill recommendations

### Content Endpoints (/api)
- **GET /api/pacer_methodology** - Get PACER methodology information
- **GET /api/industry_applications** - Get industry applications
- **GET /api/regional_considerations** - Get regional considerations

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn
- OpenAI API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/pm78/pacer-sales-game.git
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

### Backend Models

The following models are defined in the backend:

- **User**: Represents a user in the system (player, coach, manager)
- **Team**: Represents a team of players
- **Game**: Represents a game session
- **Question**: Represents a question in the game
- **Answer**: Represents a player's answer to a question
- **Score**: Represents a player's score in a game
- **ScoreHistory**: Tracks changes in a player's score over time
- **Achievement**: Represents an achievement a player can earn
- **UserAchievement**: Links users to their earned achievements
- **Leaderboard**: Aggregates player scores for ranking
- **Challenge**: Custom challenges created by coaches
- **UserChallenge**: Links users to their assigned challenges
- **SeasonalContent**: Special game content tied to real-world events
- **Recording**: Session recording of a player's game
- **Annotation**: Comments/feedback on specific moments in a recording
- **Bookmark**: Marked timestamp in a recording for easy navigation
- **RecordingTags**: PACER methodology tags applied to recordings
- **RecordingReview**: Formal review of a recording by a coach/manager
- **SharingPermission**: Controls who can access a recording

## Deployment Information

### Server Configuration

The application is deployed to an OVH VPS with the following configuration:
- NGINX as a reverse proxy
- Docker containers for the application components
- PostgreSQL database

### NGINX Configuration

The NGINX server is configured to serve the application at:
- Frontend: https://vps-d067f247.vps.ovh.ca/pacer/
- Backend API: https://vps-d067f247.vps.ovh.ca/pacer-api/
- API Documentation: https://vps-d067f247.vps.ovh.ca/pacer-docs/

### Deployment Process

The application is deployed using a GitHub Actions workflow that:
1. Builds Docker images for the frontend and backend
2. Pushes the images to GitHub Container Registry
3. Sends a deployment package to the server
4. Updates the NGINX configuration
5. Starts the Docker containers

### Recent Fixes

The following issues were fixed in the most recent update:
1. Added JSON login support to the auth endpoint
2. Updated the main.py CORS configuration to include the VPS domain
3. Fixed NGINX configuration with proper location blocks and trailing slashes
4. Updated GitHub workflow to include proper deployment commands

### Troubleshooting

If you encounter issues with the deployment:
1. Check the NGINX configuration: `/etc/nginx/sites-available/default`
2. Verify the Docker containers are running: `docker ps`
3. Check the container logs: `docker logs pacer_backend`
4. Ensure the backend can connect to the database
5. Verify CORS is properly configured

## Troubleshooting Common Issues

### The Double Path Issue (`/pacer/pacer/`)

#### Description
The PACER application may experience a "double path" issue where URLs are incorrectly formed with `/pacer/pacer/` instead of just `/pacer/`. This occurs because:

1. The application is deployed at the `/pacer/` path on the server using NGINX
2. The React Router configuration in `frontend/src/index.js` also has a `basename="/pacer"` setting
3. This double configuration causes all client-side routes to be prefixed with `/pacer/pacer/`

#### Solution
The issue has been fixed by:

1. Removing the `basename="/pacer"` from the `BrowserRouter` in `frontend/src/index.js`
2. Adding a redirect rule in the NGINX configuration to handle any existing `/pacer/pacer/` URLs
3. Ensuring proper routing in `App.js` without `/pacer` prefixes

If you're still experiencing this issue in an existing deployment, you can run the `fix-pacer-routing` GitHub workflow, which will:

1. Apply the patch to the compiled JavaScript files
2. Update the NGINX configuration with the redirect rule
3. Reload the NGINX service

#### For Local Development
Make sure you don't have `basename="/pacer"` in your `BrowserRouter` if you're testing with the application at the root URL.

### Frontend API: Streaming AI Responses

#### `apiService.sessions.streamInteractFetch(sessionId, data, onMessage)`

- **Purpose:**
  - Enables real-time streaming of AI responses from the backend to the UI, allowing the user to see the AI's reply as it is generated.
- **Parameters:**
  - `sessionId` (string or number): The game session ID.
  - `data` (object): The message payload to send (e.g., `{ message: 'Hello' }`).
  - `onMessage` (function): Callback function invoked for each streamed chunk (parsed as JSON if possible, otherwise as a string).
- **Returns:**
  - Returns a Promise that resolves when the stream is complete. The `onMessage` callback is called for each chunk.
- **Example Usage:**
  ```js
  apiService.sessions.streamInteractFetch(sessionId, { message: 'Hello' }, (chunk) => {
    // Handle each streamed chunk (string or parsed JSON)
    console.log('Received chunk:', chunk);
    // You can append chunk to the UI as it arrives
  });
  ```

- **Notes:**
  - This function uses the Fetch API and ReadableStream to process streaming responses from the backend `/game/sessions/{sessionId}/stream-interact` endpoint.
  - It is recommended for use in the main game session UI to provide a more interactive and responsive user experience.

## Performance Tips

### Moving Voice Flow to a Web Worker

For optimal UI responsiveness, especially during continuous speech input, consider moving the entire voice flow (microphone capture, down-sampling, encoding, and sending audio data) into a Web Worker. This approach keeps the main UI thread butter-smooth, even when the user speaks continuously. Use `postMessage` to send base64 payloads or audio buffers back to the main thread for further processing or UI updates.

**Benefits:**
- Prevents UI jank and React re-mounts during heavy audio processing
- Ensures real-time feedback and smooth animations
- Scales well for advanced audio features (e.g., live waveform, VAD, etc.)

**Implementation Outline:**
- Move all audio processing logic into a dedicated Web Worker file
- Use `postMessage` to communicate between the main thread and the worker
- Handle all encoding, down-sampling, and network transmission in the worker
- Only update the UI from the main thread based on worker messages

This is a recommended next step for teams seeking maximum performance in real-time voice scenarios.