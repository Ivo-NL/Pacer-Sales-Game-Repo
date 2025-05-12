from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.websockets import WebSocket, WebSocketState
import jwt
import logging
import traceback
import time
import json

from . import models
from .database import engine, get_db
from .routers import auth, game, team, progress, content, recording
from .ai_service import AIService
from .auth import SECRET_KEY, ALGORITHM

# Configure logging
logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="PACER Sales Methodology Game API",
    description="API for the PACER Sales Methodology Game",
    version="2.0.0"
)

# Print environment variables for debugging
print("\n\n----- PACER SERVER ENVIRONMENT -----")
print(f"PACER_DATABASE_URL: {os.getenv('PACER_DATABASE_URL', 'Not set')}")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'Not set')}")
print(f"SECRET_KEY is set: {'Yes' if os.getenv('SECRET_KEY') else 'No'}")
print(f"ACCESS_TOKEN_EXPIRE_MINUTES: {os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30')}")
print("------------------------------------\n\n")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",  # React development server
    "http://localhost:3001",  # React alternate port
    "http://localhost:8000",
    "http://localhost:8001",  # Backend alternate port
    "https://vps-d067f247.vps.ovh.ca",  # Production VPS domain
    "https://vps-d067f247.vps.ovh.ca/pacer",  # Production VPS domain with path
    "https://vps-d067f247.vps.ovh.ca/pacer-api",  # Production VPS API path
]

# Get environment mode
env_mode = os.getenv("APP_ENV", "development")
print(f"Current environment mode: {env_mode}")

# Configure CORS middleware
# <<< REVERTED TEMPORARY CHANGE: Use environment-specific CORS >>>
if env_mode == "development":
    # In development mode, we still need to specify origins when using credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # Use the same origins list, which includes localhost ports
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicitly list methods
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
        expose_headers=["*"],
    )
    print("CORS configured for development mode with explicit origins")
else:
    # In production mode, only allow specified origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # Must specify exact origins when using credentials
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicitly list methods
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
        expose_headers=["*"],
    )
    print(f"CORS configured for production mode - allowing specified origins: {origins}")

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(game.router, prefix="/api/game", tags=["game"])
app.include_router(team.router, prefix="/api/team", tags=["team"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(content.router, prefix="/api", tags=["content"])
app.include_router(recording.router, prefix="/api", tags=["recordings"])

# Add root-level login endpoint for easier production access
@app.post("/login")
def root_login(user_data: auth.LoginRequest, db: Session = Depends(get_db)):
    """Root login endpoint that redirects to the auth router login endpoint"""
    print(f"Root login attempt with email: {user_data.email}")
    try:
        # Authenticate user directly without using the router
        user = auth.authenticate_user(db, user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Generate access token
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Return token and user data
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username,
            "is_manager": user.is_manager
        }
    except Exception as e:
        print(f"Root login error: {str(e)}")
        # Check if this is a validation error
        if isinstance(e, HTTPException):
            raise e
        # For any other unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

# Add root-level WebSocket token endpoint
@app.post("/api/auth/websocket-token")
async def root_websocket_token(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a dedicated token for WebSocket connections at the root level."""
    print(f"WebSocket token request for user: {current_user.email}")
    
    # Create token with user email as subject
    token_data = {"sub": current_user.email}
    
    # Set longer expiration for WebSocket tokens (60 minutes for frontend dev)
    expiration = timedelta(minutes=60)
    
    # Create the token with specific type claim for WebSockets
    token_data["token_type"] = "websocket"
    token = auth.create_access_token(token_data, expires_delta=expiration)
    
    return {"access_token": token, "token_type": "websocket"}

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the PACER Sales Methodology Game API", "version": "2.0.0"}

# Health check endpoint
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint that verifies database connection."""
    try:
        # Simple database query to check connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

# Add seed data for development (to be removed in production)
@app.get("/seed")
def seed_data(phase: int = 1, db: Session = Depends(get_db)):
    """
    Seed the database with initial data.
    
    Args:
        phase: The phase of seeding to perform:
            1: Initial MVP data
            2: Phase 2.1 & 2.2 content expansion
    """
    if phase == 1:
        return seed_initial_data(db)
    elif phase == 2:
        from app.seed_phase2_2 import seed_phase2_2_data
        initial_result = seed_initial_data(db)
        phase2_result = seed_phase2_2_data()
        return {
            "phase1": initial_result,
            "phase2": phase2_result
        }
    else:
        return {"error": "Invalid phase specified"}

def seed_initial_data(db: Session):
    # Check if there's already data
    existing_scenarios = db.query(models.Scenario).count()
    if existing_scenarios > 0:
        return {"message": "Database already contains data"}
    
    # Create sample scenarios
    scenario1 = models.Scenario(
        title="Introduction to Prospecting",
        description="Learn the basics of prospecting in the payment processing industry",
        difficulty=1,
        pacer_stage="P",
        product_type="Issuing Solutions",
        industry="Banking",
        region="Global"
    )
    
    scenario2 = models.Scenario(
        title="Needs Assessment for Retail",
        description="Practice assessing the needs of a retail client looking for payment solutions",
        difficulty=1,
        pacer_stage="A",
        product_type="Acceptance & Authorization",
        industry="Retail",
        region="Global"
    )
    
    scenario3 = models.Scenario(
        title="Challenging the Status Quo",
        description="Learn to challenge a client's current payment processing solution",
        difficulty=2,
        pacer_stage="C",
        product_type="Instant Payments",
        industry="Fintech",
        region="Global"
    )
    
    # Create Phase 2 multi-stakeholder scenarios
    scenario4 = models.Scenario(
        title="Enterprise Deal Navigation",
        description="Navigate a complex enterprise deal with multiple stakeholders",
        difficulty=3,
        pacer_stage="E",
        product_type="Account-to-Account Payments",
        industry="Banking",
        region="Europe",
        is_multi_stakeholder=True,
        scenario_type="multi_stakeholder"
    )
    
    scenario5 = models.Scenario(
        title="Competitive Retail Solution",
        description="Present My Company solutions against a competitive offering",
        difficulty=2,
        pacer_stage="C",
        product_type="Acceptance & Authorization",
        industry="Retail",
        region="North America",
        scenario_type="competitive"
    )
    
    db.add_all([scenario1, scenario2, scenario3, scenario4, scenario5])
    db.commit()
    
    # Create client personas for each scenario
    persona1 = models.ClientPersona(
        scenario_id=1,
        name="Alex Johnson",
        role="Head of Digital Banking",
        company="FinBank",
        personality_traits="Analytical, cautious, detail-oriented",
        pain_points="Legacy systems, high operational costs, customer complaints about card issuance time",
        decision_criteria="ROI, implementation timeline, compliance features"
    )
    
    persona2 = models.ClientPersona(
        scenario_id=2,
        name="Sarah Chen",
        role="VP of Operations",
        company="RetailPlus",
        personality_traits="Pragmatic, result-oriented, direct",
        pain_points="High transaction costs, chargebacks, integration with existing POS",
        decision_criteria="Cost reduction, customer experience, fraud prevention"
    )
    
    persona3 = models.ClientPersona(
        scenario_id=3,
        name="Michael Rodriguez",
        role="CTO",
        company="QuickPay",
        personality_traits="Innovative, skeptical, technically savvy",
        pain_points="Speed of transfers, API limitations, scalability concerns",
        decision_criteria="Technical capabilities, performance metrics, developer support"
    )
    
    db.add_all([persona1, persona2, persona3])
    db.commit()
    
    # Add stakeholders for multi-stakeholder scenario
    stakeholder1 = models.Stakeholder(
        scenario_id=4,
        name="James Wilson",
        role="CIO",
        influence_level=5,
        is_decision_maker=True,
        personality_traits="Analytical, risk-averse, detail-oriented",
        interests="System reliability, security, TCO reduction",
        concerns="Integration complexity, downtime risk, vendor lock-in",
        communication_style="analytical"
    )
    
    stakeholder2 = models.Stakeholder(
        scenario_id=4,
        name="Elena Martinez",
        role="Head of Finance",
        influence_level=4,
        is_decision_maker=True,
        personality_traits="Direct, numbers-focused, skeptical",
        interests="Cost reduction, payment reconciliation efficiency, fraud reduction",
        concerns="Implementation costs, ROI timeline, hidden fees",
        communication_style="driver"
    )
    
    stakeholder3 = models.Stakeholder(
        scenario_id=4,
        name="Thomas Lee",
        role="Product Manager",
        influence_level=3,
        is_decision_maker=False,
        personality_traits="Innovative, collaborative, customer-focused",
        interests="User experience, new features, competitive advantage",
        concerns="User adoption, training requirements, feature limitations",
        communication_style="expressive"
    )
    
    db.add_all([stakeholder1, stakeholder2, stakeholder3])
    db.commit()
    
    # Add competitor information
    competitor1 = models.CompetitorInfo(
        scenario_id=5,
        competitor_name="PayFast Solutions",
        product_offering="Integrated retail payment platform with POS hardware",
        strengths="Strong brand recognition, bundled hardware/software solution, aggressive pricing",
        weaknesses="Limited customization, basic fraud detection, regional support only",
        pricing_strategy="Low upfront cost with higher transaction fees and hardware lease",
        key_differentiators="Simplified all-in-one solution, fast deployment, mobile POS options"
    )
    
    db.add(competitor1)
    db.commit()
    
    # Create sample badges
    badge1 = models.Badge(
        name="Prospecting Pro",
        description="Achieved excellence in prospecting techniques",
        category="P",
        image_url="/badges/prospecting-pro.png",
        criteria={
            "min_prospect_level": 7,
            "min_skill_levels": {
                "lead_qualification": 6,
                "market_research": 5
            }
        }
    )
    
    badge2 = models.Badge(
        name="Needs Assessment Expert",
        description="Mastered the assessment phase of sales",
        category="A",
        image_url="/badges/assessment-expert.png",
        criteria={
            "min_assess_level": 7,
            "min_skill_levels": {
                "stakeholder_mapping": 6,
                "pain_point_identification": 6
            }
        }
    )
    
    badge3 = models.Badge(
        name="Digital Payments Specialist",
        description="Demonstrated expertise in digital payment solutions",
        category="Product",
        image_url="/badges/payments-specialist.png",
        criteria={
            "min_sessions_completed": 5,
            "product_focus": "Account-to-Account Payments"
        }
    )
    
    db.add_all([badge1, badge2, badge3])
    db.commit()
    
    return {"message": "Database seeded successfully with Phase 2 content"}

@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "ok", "service": "pacer-backend"}

# Debug endpoint to verify database connection
@app.get("/api/db-check")
def db_check(db: Session = Depends(get_db)):
    try:
        # Try to execute a simple query
        db.execute("SELECT 1")
        return {"status": "ok", "message": "Database connection successful"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}"
        )

# Direct WebSocket endpoint to bypass router authentication
# @app.websocket("/ws/game/sessions/{session_id}/audio-stream")
# async def audio_stream_direct(
#     websocket: WebSocket,
#     session_id: int,
#     token: str = None,
#     db: Session = Depends(get_db)
# ):
#     """Direct WebSocket endpoint for bidirectional audio streaming."""
#     logger.info(f"Direct WebSocket connection attempt for session {session_id}")
#     logger.info(f"Query params: {websocket.query_params}")
#     
#     if "token" in websocket.query_params:
#         token = websocket.query_params["token"]
#         logger.info(f"Token from query params: {token[:10]}...")
#     
#     # Accept the connection initially
#     await websocket.accept()
#     logger.info("WebSocket connection initially accepted")
#     
#     try:
#         # Check if token is provided
#         if not token:
#             logger.error("No token provided")
#             await websocket.send_json({"type": "error", "message": "No token provided"})
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="No token provided")
#             return
#
#         # Verify token
#         try:
#             logger.info(f"Verifying token starting with: {token[:10]}...")
#             payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#             logger.info(f"Token verified with payload: {payload}")
#             
#             # Check token type
#             if payload.get("token_type") != "websocket":
#                 logger.error(f"Invalid token type: {payload.get('token_type')}")
#                 await websocket.send_json({"type": "error", "message": "Invalid token type"})
#                 await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token type")
#                 return
#                 
#         except Exception as e:
#             logger.error(f"Token verification failed: {str(e)}")
#             await websocket.send_json({"type": "error", "message": f"Token verification failed: {str(e)}"})
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
#             return
#             
#         # Get user from token
#         user_email = payload.get("sub")
#         if not user_email:
#             logger.error("Token missing 'sub' claim")
#             await websocket.send_json({"type": "error", "message": "Token missing user information"})
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
#             return
#             
#         # Get user from database
#         logger.info(f"Looking up user with email: {user_email}")
#         user = db.query(models.User).filter(models.User.email == user_email).first()
#         if not user:
#             logger.error(f"User not found: {user_email}")
#             await websocket.send_json({"type": "error", "message": "User not found"})
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
#             return
#             
#         # Get game session
#         logger.info(f"Looking up session {session_id} for user {user.id}")
#         session = db.query(models.GameSession).filter(
#             models.GameSession.id == session_id,
#             models.GameSession.user_id == user.id
#         ).first()
#         
#         if not session:
#             logger.error(f"Session {session_id} not found for user {user.id}")
#             await websocket.send_json({"type": "error", "message": "Session not found"})
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found")
#             return
#             
#         # Authentication successful
#         logger.info(f"WebSocket connection authenticated for user {user.id}, session {session_id}")
#         await websocket.send_json({"type": "connection_status", "status": "connected"})
#         
#         # Get scenario and client persona
#         scenario = db.query(models.Scenario).filter(models.Scenario.id == session.scenario_id).first()
#         client_persona = db.query(models.ClientPersona).filter(
#             models.ClientPersona.scenario_id == scenario.id
#         ).first()
#         
#         # If no specific persona is found, create a default one
#         if not client_persona:
#             client_persona_dict = {
#                 "role": "decision maker",
#                 "company": "Example Corp",
#                 "name": "Client",
#                 "personality_traits": "Professional, analytical, busy",
#                 "pain_points": "Efficiency, cost management, security concerns",
#                 "decision_criteria": "ROI, ease of implementation, support quality"
#             }
#         else:
#             client_persona_dict = {
#                 "role": client_persona.role,
#                 "company": client_persona.company,
#                 "name": client_persona.name,
#                 "personality_traits": client_persona.personality_traits,
#                 "pain_points": client_persona.pain_points,
#                 "decision_criteria": client_persona.decision_criteria
#             }
#         
#         # Get conversation history
#         conversation_history = []
#         interactions = db.query(models.Interaction).filter(
#             models.Interaction.game_session_id == session_id
#         ).order_by(models.Interaction.sequence).all()
#         
#         for interaction in interactions:
#             conversation_history.append({
#                 "player_input": interaction.player_input,
#                 "ai_response": interaction.ai_response
#             })
#
#         # Main WebSocket processing loop
#         async for audio_data in websocket.iter_bytes():
#             # Save the audio data to a temporary file
#             temp_audio_path = f"temp_audio_{user.id}_{session_id}_{int(time.time())}.wav"
#             with open(temp_audio_path, "wb") as f:
#                 f.write(audio_data)
#             
#             try:
#                 # Transcribe the audio to text
#                 text = await AIService.transcribe_audio(temp_audio_path)
#                 
#                 # Send back the transcription for confirmation
#                 await websocket.send_json({"type": "transcription", "text": text})
#                 
#                 if text.strip():
#                     # Get AI response using the streaming method
#                     full_response = ""
#                     
#                     # Create a new interaction record
#                     sequence = len(interactions) + 1
#                     interaction = models.Interaction(
#                         game_session_id=session_id,
#                         sequence=sequence,
#                         player_input=text,
#                         ai_response="",  # Will be updated after streaming is complete
#                         pacer_stage=session.current_stage or scenario.pacer_stage,
#                         addressed_to=None,
#                         feedback_provided=True
#                     )
#                     db.add(interaction)
#                     db.commit()
#                     db.refresh(interaction)
#                     
#                     # Stream text response
#                     await websocket.send_json({"type": "text_response_start"})
#                     
#                     async for chunk in AIService.generate_client_response_stream(
#                         client_persona=client_persona_dict,
#                         pacer_stage=session.current_stage or scenario.pacer_stage,
#                         conversation_history=conversation_history,
#                         player_input=text,
#                         context=session.conversation_context or {}
#                     ):
#                         full_response += chunk
#                         await websocket.send_json({"type": "text_chunk", "text": chunk})
#                     
#                     # Update the interaction with the complete response
#                     interaction.ai_response = full_response
#                     db.commit()
#                     
#                     # Update the chat history for the next interaction
#                     conversation_history.append({
#                         "player_input": text,
#                         "ai_response": full_response
#                     })
#                     
#                     await websocket.send_json({"type": "text_response_end"})
#                     
#                     # Generate speech from the response
#                     audio_data = await AIService.generate_speech(
#                         text=full_response,
#                         voice="nova",  # Use a consistent voice for the client
#                         client_persona=client_persona_dict
#                     )
#                     
#                     # Send the audio in chunks
#                     chunk_size = 8192  # 8KB chunks
#                     for i in range(0, len(audio_data), chunk_size):
#                         chunk = audio_data[i:i+chunk_size]
#                         await websocket.send_bytes(chunk)
#                     
#                     # Evaluate the response
#                     evaluation = AIService.evaluate_player_response(
#                         player_input=text,
#                         ai_response=full_response,
#                         pacer_stage=session.current_stage or scenario.pacer_stage,
#                         client_persona=client_persona_dict,
#                         detailed_evaluation=True
#                     )
#                     
#                     # Store the evaluation
#                     if evaluation:
#                         interaction_eval = models.InteractionEvaluation(
#                             interaction_id=interaction.id,
#                             methodology_score=evaluation.get('methodology_score', 50),
#                             rapport_score=evaluation.get('rapport_score', 50),
#                             progress_score=evaluation.get('progress_score', 50),
#                             outcome_score=evaluation.get('outcome_score', 50),
#                             feedback=evaluation.get('feedback', 'No specific feedback available.'),
#                             skills_demonstrated=evaluation.get('skills_demonstrated', {})
#                         )
#                         db.add(interaction_eval)
#                         db.commit()
#                     
#                     # Send the evaluation to the client
#                     await websocket.send_json({"type": "evaluation", "data": evaluation})
#             finally:
#                 # Clean up the temporary file
#                 if os.path.exists(temp_audio_path):
#                     os.remove(temp_audio_path)
#
#     except WebSocketDisconnect:
#         logger.info(f"WebSocket disconnected for session {session_id}")
#     except Exception as e:
#         logger.error(f"WebSocket error: {str(e)}")
#         logger.error(f"Traceback: {traceback.format_exc()}")
#         
#         # Try to send an error message to the client if the connection is still open
#         if websocket.client_state != WebSocketState.DISCONNECTED:
#             try:
#                 await websocket.send_json({"type": "error", "message": str(e)})
#             except:
#                 pass
#             
#         # Close the connection with an internal error code
#         try:
#             await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
#         except:
#             pass 