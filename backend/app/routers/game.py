# game.py
import logging
import traceback
import asyncio
import websockets
import json
import os
import time
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse # Added imports
# from websockets import WebSocketDisconnect
from websockets.connection import State # Try importing from here
from websockets.protocol import State as OpenAIWebSocketState
from websockets.protocol import State as WebSocketState
from websockets.protocol import State as WebSocketStateProtocol
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError

from typing import List, Optional, Dict, Union, Any

from fastapi import (
    APIRouter, 
    Depends, 
    HTTPException, 
    status, 
    Query, 
    Body, 
    WebSocket, 
    WebSocketDisconnect,
    Form, 
    File, 
    UploadFile,
    BackgroundTasks,
    Path
)

from fastapi.websockets import WebSocketState
from sqlalchemy.orm import Session, joinedload, selectinload
from .. import models, schemas, auth
from ..database import get_db, SessionLocal  # Assuming SessionLocal is your session factory
from ..ai_service import AIService, WebSocketConnectionClosedException # Ensure AIService is imported

# Import necessary modules for WebSocket authentication
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import WebSocketDisconnect
from websockets import WebSocketClientProtocol
from ..auth import get_current_active_user_ws # <<< Import the new WebSocket auth dependency

# Create async session factory for WebSockets
async def get_async_db():
    """Get an async database session."""
    from ..database import async_engine
    from sqlalchemy.ext.asyncio import AsyncSession

    async with AsyncSession(async_engine) as session:
        yield session

# Helper function to get a user by token for WebSockets
async def get_user_by_token(token: str) -> models.User:
    """Get a user by token without depending on the request object."""
    if not token:
        return None
    
    try:
        # Verify the token
        payload = auth.verify_token(token)
        email = payload.get("sub")
        if not email:
            return None
        
        # Use synchronous database since async might not be available
        # or have configuration issues
        from sqlalchemy.orm import Session
        from ..database import SessionLocal
        
        # Create a synchronous session
        db = SessionLocal()
        try:
            # Get the user with synchronous query
            user = db.query(models.User).filter(models.User.email == email).first()
            return user
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error getting user by token: {e}")
        return None

# Helper function to get a game session by ID
async def get_game_session_by_id(db: AsyncSession, session_id: int) -> models.GameSession:
    """Get a game session by ID using async database session."""
    try:
        result = await db.execute(
            select(models.GameSession).where(models.GameSession.id == session_id)
        )
        return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Error getting game session: {e}")
        return None

# Create async session factory
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import async_engine

async def async_session_factory():
    """Create an async database session."""
    async with AsyncSession(async_engine) as session:
        yield session
        await session.commit()

logger = logging.getLogger(__name__)

router = APIRouter(tags=["game"])

# Helper function to enhance session data with metadata
def enhance_session_with_metadata(session):
    """Add derived metadata to session object for consistent frontend display."""
    if not session:
        return session
    
    # Ensure scenario is loaded
    if session.scenario:
        # Add difficulty from scenario, with special handling for introductory scenarios
        if "Introduction to" in session.scenario.title:
            # Override difficulty for Introduction scenarios - they should always be level 1
            session.difficulty = 1
        else:
            session.difficulty = session.scenario.difficulty
        
        # Add PACER focus array from scenario's pacer_stage string
        # pacer_stage might be a single letter or multiple letters (e.g., "P" or "PAC")
        if session.scenario.pacer_stage:
            session.pacer_focus = list(session.scenario.pacer_stage)
        else:
            session.pacer_focus = []
            
        # Add scenario type
        session.scenario_type = session.scenario.scenario_type
        
        # Add duration if session is completed
        if session.is_completed and session.start_time and session.end_time:
            duration_seconds = int((session.end_time - session.start_time).total_seconds())
            session.duration = duration_seconds
    
    return session

# Scenarios
@router.get("/scenarios", response_model=List[schemas.ScenarioResponse])
def get_scenarios(
    skip: int = 0, 
    limit: int = 100, 
    difficulty: Optional[int] = None,
    pacer_stage: Optional[str] = None,
    product_type: Optional[str] = None,
    industry: Optional[str] = None,
    region: Optional[str] = None,
    is_multi_stakeholder: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get available scenarios with various filter options."""
    query = db.query(models.Scenario)
    
    # Apply filters if provided
    if difficulty:
        query = query.filter(models.Scenario.difficulty == difficulty)
    
    if pacer_stage:
        query = query.filter(models.Scenario.pacer_stage.contains(pacer_stage))
    
    if product_type:
        query = query.filter(models.Scenario.product_type == product_type)
    
    if industry:
        query = query.filter(models.Scenario.industry == industry)
    
    if region:
        query = query.filter(models.Scenario.region == region)
    
    if is_multi_stakeholder is not None:
        query = query.filter(models.Scenario.is_multi_stakeholder == is_multi_stakeholder)
    
    scenarios = query.offset(skip).limit(limit).all()
    return scenarios

@router.get("/scenarios/{scenario_id}", response_model=schemas.ScenarioResponse)
def get_scenario(
    scenario_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a specific scenario by ID."""
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@router.post("/scenarios", response_model=schemas.ScenarioResponse)
def create_scenario(
    scenario: schemas.ScenarioCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can create scenarios
):
    """Create a new scenario (manager only)."""
    db_scenario = models.Scenario(**scenario.dict())
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario

@router.post("/scenarios/{scenario_id}/stakeholders", response_model=schemas.StakeholderResponse)
def create_stakeholder(
    scenario_id: int,
    stakeholder: schemas.StakeholderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can create stakeholders
):
    """Add a stakeholder to a scenario (manager only)."""
    # Check if scenario exists
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Create stakeholder
    db_stakeholder = models.Stakeholder(**stakeholder.dict())
    db.add(db_stakeholder)
    db.commit()
    db.refresh(db_stakeholder)
    
    # Update scenario to indicate it has multiple stakeholders if needed
    if not scenario.is_multi_stakeholder and db.query(models.Stakeholder).filter(
        models.Stakeholder.scenario_id == scenario_id
    ).count() > 1:
        scenario.is_multi_stakeholder = True
        db.commit()
    
    return db_stakeholder

@router.post("/scenarios/{scenario_id}/competitor", response_model=schemas.CompetitorInfoResponse)
def add_competitor_info(
    scenario_id: int,
    competitor_info: schemas.CompetitorInfoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can add competitor info
):
    """Add competitor information to a scenario (manager only)."""
    # Check if scenario exists
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Check if scenario already has competitor info
    existing_info = db.query(models.CompetitorInfo).filter(
        models.CompetitorInfo.scenario_id == scenario_id
    ).first()
    
    if existing_info:
        raise HTTPException(status_code=400, detail="Scenario already has competitor information")
    
    # Create competitor info
    db_competitor_info = models.CompetitorInfo(**competitor_info.dict())
    db.add(db_competitor_info)
    db.commit()
    db.refresh(db_competitor_info)
    
    return db_competitor_info

# Game Sessions
@router.post("/sessions", response_model=schemas.GameSessionResponse)
def create_game_session(
    session: schemas.GameSessionCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new game session for a scenario"""
    # Get the scenario to ensure it exists
    scenario = db.query(models.Scenario).filter(models.Scenario.id == session.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Determine time limit based on scenario difficulty
    # Default time limits in seconds: easy=5min, normal=4min, hard=3min
    time_limits = {
        1: 5*60,  # Easy: 5 minutes
        2: 4*60,  # Normal: 4 minutes
        3: 3*60   # Hard: 3 minutes
    }
    
    # Use provided time_limit_seconds if available, otherwise calculate from difficulty
    time_limit_seconds = None
    if session.time_limit_seconds is not None:
        # User explicitly provided a time limit
        time_limit_seconds = session.time_limit_seconds
        logger.info(f"Using user-specified time limit of {time_limit_seconds} seconds")
    else:
        # Calculate time limit from scenario difficulty
        difficulty = scenario.difficulty or 2  # Default to normal if not specified
        time_limit_seconds = time_limits.get(difficulty, 4*60)  # Default to 4 minutes
        logger.info(f"Using calculated time limit of {time_limit_seconds} seconds based on difficulty {difficulty}")
    
    # Create new session
    db_session = models.GameSession(
        user_id=current_user.id,
        scenario_id=session.scenario_id,
        start_time=datetime.utcnow(),
        timer_started_at=datetime.utcnow(),
        time_limit_seconds=time_limit_seconds,
        is_timed=session.is_timed,  # Use the provided is_timed value
        current_stage=scenario.pacer_stage,
        difficulty_factor=scenario.difficulty / 2 if scenario.difficulty else 1.0,  # Convert 1-3 to 0.5-1.5
        remaining_time_seconds=time_limit_seconds  # Initialize remaining time to the full time limit
    )
    
    # Log the session creation details for debugging
    logger.info(f"Creating new session with time_limit_seconds={time_limit_seconds}, is_timed={session.is_timed}, start_time={db_session.start_time.isoformat()}Z")
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Now ensure session is enhanced with additional data
    enhanced_session = enhance_session_with_metadata(db_session)
    
    return enhanced_session

@router.get("/sessions/{session_id}", response_model=schemas.GameSessionResponse)
def get_game_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a specific game session."""
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id  # Users can only see their own sessions
    ).options(
        joinedload(models.GameSession.scenario),
        joinedload(models.GameSession.interactions).joinedload(models.Interaction.evaluation)  # Include evaluations
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    return enhance_session_with_metadata(session)

@router.get("/sessions", response_model=List[schemas.GameSessionResponse])
def get_user_sessions(
    skip: int = 0, 
    limit: int = 100, 
    completed: Optional[bool] = None,
    challenge_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all game sessions for the current user."""
    query = db.query(models.GameSession).filter(
        models.GameSession.user_id == current_user.id
    )
    
    # Filter by completion status if specified
    if completed is not None:
        query = query.filter(models.GameSession.is_completed == completed)
    
    # Filter by challenge if specified
    if challenge_id is not None:
        query = query.filter(models.GameSession.challenge_id == challenge_id)
    
    # Join with scenario to include scenario details
    query = query.options(joinedload(models.GameSession.scenario))
    
    # Get sessions with most recent first
    sessions = query.order_by(models.GameSession.start_time.desc()).offset(skip).limit(limit).all()
    
    return [enhance_session_with_metadata(session) for session in sessions]

# Game Interactions
@router.delete("/sessions/{session_id}", response_model=dict)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Delete a game session.
    
    This will:
    1. Verify the session belongs to the current user
    2. Delete all associated data (interactions, etc.)
    3. Remove the session itself
    """
    # Get the session and check permissions
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or belongs to another user"
        )
    
    # Delete associated data
    # Delete conversation history (interactions)
    db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).delete()
    
    # Delete any evaluation records
    db.query(models.Score).filter(
        models.Score.game_session_id == session_id
    ).delete()
    
    # Delete any challenges associated with this session
    db.query(models.TimedChallenge).filter(
        models.TimedChallenge.session_id == session_id
    ).delete()
    
    # Delete any event occurrences
    db.query(models.EventOccurrence).filter(
        models.EventOccurrence.game_session_id == session_id
    ).delete()
    
    # Delete any stakeholder responses
    db.query(models.StakeholderResponse).filter(
        models.StakeholderResponse.game_session_id == session_id
    ).delete()
    
    # Delete the session itself
    db.delete(session)
    db.commit()
    
    return {"message": "Session deleted successfully"}

@router.post("/sessions/{session_id}/restart", response_model=schemas.GameSessionResponse)
def restart_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Restart a session by creating a new one with the same scenario.
    
    This will:
    1. Get the original session's scenario
    2. Create a new session with that scenario
    3. Return the new session data
    """
    # Get the original session
    original_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not original_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original session not found or belongs to another user"
        )
    
    # Create a new session with the same scenario
    new_session = models.GameSession(
        user_id=current_user.id,
        scenario_id=original_session.scenario_id,
        start_time=datetime.now(),
        is_timed=original_session.is_timed,  # Preserve timed status
        time_limit_seconds=original_session.time_limit_seconds,  # Preserve time limit
        difficulty_factor=original_session.difficulty_factor,  # Preserve difficulty
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Add initial system interaction
    system_interaction = models.Interaction(
        game_session_id=new_session.id,
        sequence=1,
        player_input="",
        ai_response="Welcome to your sales simulation. You are now connected with the AI client. Start the conversation to practice your sales skills.",
        pacer_stage=original_session.scenario.pacer_stage[0] if original_session.scenario.pacer_stage else "P",
        timestamp=datetime.now()
    )
    db.add(system_interaction)
    db.commit()
    
    # Load the enhanced session with scenario data
    enhanced_session = db.query(models.GameSession).options(
        joinedload(models.GameSession.scenario)
    ).filter(models.GameSession.id == new_session.id).first()
    
    return enhance_session_with_metadata(enhanced_session)

@router.post("/sessions/{session_id}/interact", response_model=schemas.AIResponse)
def player_interaction(
    session_id: int,
    input_data: schemas.PlayerInput, # Ensure this schema can receive role, modality, generate
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    logger.info(f"Player interaction for session {session_id}. Input data: role='{input_data.role}', modality='{input_data.modality}', generate='{getattr(input_data, 'generate', 'NotSet')}', message_present={bool(input_data.message)}")

    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()

    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    if game_session.is_completed:
        raise HTTPException(status_code=400, detail="Session is already completed")

    # Handle assistant voice transcript persistence (generate=False)
    if (
        input_data.role == "assistant"
        and getattr(input_data, "generate", None) is False
        and (input_data.modality in {None, "voice", "audio"})
    ):
        pending_interaction = (
            db.query(models.Interaction)
            .filter(
                models.Interaction.game_session_id == session_id,
                models.Interaction.ai_response.is_(None),
            )
            .order_by(models.Interaction.sequence.desc())
            .first()
        )
        if pending_interaction:
            pending_interaction.ai_response = input_data.message or ""
            pending_interaction.modality = input_data.modality or pending_interaction.modality
            db.commit()
            db.refresh(pending_interaction)
            return {
                "message": "Assistant 'voice' transcript attached to existing interaction.",
                "evaluation": None,
                "ai_response_skipped": True,
            }
        # If no pending interaction without ai_response, continue to default logic

    interaction_timestamp = datetime.utcnow() # Use a Python datetime object

    interaction_sequence = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).count() + 1

    new_interaction = models.Interaction(
        game_session_id=session_id,
        player_input=input_data.message if input_data.role == 'user' else None, # Only store player_input if role is user
        ai_response=input_data.message if input_data.role == 'assistant' else None, # Store message as ai_response if role is assistant
        pacer_stage=game_session.current_stage or "P",
        sequence=interaction_sequence,
        addressed_to=input_data.addressed_to,
        modality=input_data.modality or "text",
        timestamp=interaction_timestamp # Store Python datetime object
    )
    db.add(new_interaction)
    db.commit()
    db.refresh(new_interaction)
    logger.info(f"Saved interaction {new_interaction.id} (Role: {input_data.role}, Modality: {input_data.modality})")

    # Conditional AI Response Generation
    # Default to True, set to False if conditions for skipping are met
    should_generate_ai_response = True

    if hasattr(input_data, 'generate') and input_data.generate is False:
        logger.info(f"Received generate=False for interaction {new_interaction.id}.")
        # This covers persisting AI's spoken response (modality='voice', role='assistant')
        # and persisting User's voice transcript (modality='voice', role='user')
        # In both these voice cases, the actual AI response is handled via WebSocket.
        if input_data.modality == 'voice' or input_data.modality == 'audio':
            should_generate_ai_response = False
            logger.info(f"Modality is '{input_data.modality}'. AI response generation via HTTP will be SKIPPED for interaction {new_interaction.id}.")
            # If it was an assistant message being persisted, we already stored it in new_interaction.ai_response above
            return {"message": f"{input_data.role.capitalize()} '{input_data.modality}' transcript part persisted. AI response via WebSocket.", "evaluation": None, "ai_response_skipped": True}
        else:
            # generate=False but modality is not voice/audio (e.g. text).
            # This case might not be used, but if it is, we honor generate=False.
            logger.info(f"Modality is '{input_data.modality}' with generate=False. AI response generation via HTTP will be SKIPPED for interaction {new_interaction.id}.")
            return {"message": "Message persisted, AI response generation skipped (generate=False).", "evaluation": None, "ai_response_skipped": True}


    # If we reach here, it's typically a text-based user input needing a new AI response.
    if input_data.role != 'user':
        logger.warning(f"Attempting to generate AI response for non-user role ('{input_data.role}') in HTTP interact. This should not happen if generate=False was intended.")
        # This case should ideally not be reached if frontend logic is correct for assistant messages
        return {"message": "AI response generation skipped for non-user role in this flow.", "evaluation": None, "ai_response_skipped": True}


    logger.info(f"Proceeding to generate NEW AI response for text interaction {new_interaction.id} (Role: {input_data.role}, Modality: {input_data.modality})")
    
    scenario = db.query(models.Scenario).filter(models.Scenario.id == game_session.scenario_id).first()
    if not scenario:
        logger.error(f"Scenario not found for session {session_id}, cannot generate AI response.")
        raise HTTPException(status_code=404, detail="Scenario not found for session")

    client_persona_model = db.query(models.ClientPersona).filter(models.ClientPersona.scenario_id == scenario.id).first()
    client_persona = {
        "name": client_persona_model.name if client_persona_model else "Alex Johnson",
        "role": client_persona_model.role if client_persona_model else "Procurement Manager",
        "company": client_persona_model.company if client_persona_model else "TechCorp",
        "personality_traits": client_persona_model.personality_traits if client_persona_model else "Professional, analytical, detail-oriented",
        "pain_points": client_persona_model.pain_points if client_persona_model else "Legacy payment systems, high transaction costs, security concerns",
        "decision_criteria": client_persona_model.decision_criteria if client_persona_model else "Security, cost-effectiveness, integration capabilities"
    }
    
    previous_interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id,
        models.Interaction.id != new_interaction.id
    ).order_by(models.Interaction.sequence).all()
    
    conversation_history = []
    system_persona_message = {
        "role": "system", 
        "content": f"""
You are roleplaying as {client_persona.get('name', 'Unknown')}, a {client_persona.get('role', 'Unknown')} at {client_persona.get('company', 'Unknown')}.
Your personality traits: {client_persona.get('personality_traits', 'Unknown')}
Your primary pain points: {client_persona.get('pain_points', 'Unknown')}
Your decision criteria: {client_persona.get('decision_criteria', 'Unknown')}
Current sales stage: {game_session.current_stage or "P"}
You MUST maintain consistent persona and memory of the entire conversation history.
Respond naturally as {client_persona.get('name', 'the client')} would, keeping consistent with your persona traits.
"""
    }
    conversation_history.append(system_persona_message)
    
    for interaction_item in previous_interactions:
        if interaction_item.player_input: # User's turn
            conversation_history.append({"role": "user", "content": interaction_item.player_input})
        if interaction_item.ai_response: # Assistant's turn
            conversation_history.append({"role": "assistant", "content": interaction_item.ai_response})
            
    # Add current user input to history for AI context
    conversation_history.append({"role": "user", "content": input_data.message})

    logger.info(f"Building TEXT conversation for AI with {len(conversation_history)} messages.")

    try:
        ai_service = AIService()
        context_for_ai = { # Renamed to avoid conflict with 'context' module
            "session_id": session_id,
            "interaction_id": new_interaction.id, # ID of the current user interaction
            "scenario": {"title": scenario.title, "description": scenario.description, "pacer_stage": scenario.pacer_stage, "difficulty": scenario.difficulty},
            "current_stage": game_session.current_stage or "P",
            "modality": "text" # Explicitly text for this path
        }
        
        # This call is for generating a NEW text-based response
        response_obj_from_ai = ai_service.generate_client_response(
            client_persona=client_persona,
            pacer_stage=game_session.current_stage or "P",
            conversation_history=conversation_history, # Includes current user message
            player_input=input_data.message, # Current user message
            context=context_for_ai
        )
        
        ai_text_response = response_obj_from_ai["response"] if isinstance(response_obj_from_ai, dict) and "response" in response_obj_from_ai else str(response_obj_from_ai)
        
        new_interaction.ai_response = ai_text_response
        # new_interaction.timestamp_ai_response = datetime.utcnow() # Optional
        db.commit()
        db.refresh(new_interaction)
        logger.info(f"Generated and saved TEXT AI response for interaction {new_interaction.id}: '{ai_text_response[:100]}...'")

        evaluation = None
        if interaction_sequence % 2 == 0 or interaction_sequence > 3: # Evaluate more frequently for text
            evaluation = ai_service.evaluate_player_response(
                player_input=input_data.message,
                ai_response=ai_text_response,
                pacer_stage=game_session.current_stage or "P",
                client_persona=client_persona
            )
            if evaluation:
                eval_record = models.InteractionEvaluation(
                    interaction_id=new_interaction.id,
                    methodology_score=evaluation.get("methodology_score", 0),
                    rapport_score=evaluation.get("rapport_score", 0),
                    progress_score=evaluation.get("progress_score", 0),
                    outcome_score=evaluation.get("outcome_score", 0),
                    feedback=evaluation.get("feedback", ""),
                    # ... (other evaluation fields)
                )
                db.add(eval_record)
                new_interaction.feedback_provided = True
                db.commit()
        
        return {"message": ai_text_response, "evaluation": evaluation}

    except Exception as e:
        logger.error(f"Error in AI response generation for text: {e}", exc_info=True)
        # Safely try to update the interaction with an error message
        try:
            db.rollback() # Rollback any partial changes from the try block
            interaction_to_update_error = db.query(models.Interaction).filter(models.Interaction.id == new_interaction.id).first()
            if interaction_to_update_error:
                interaction_to_update_error.ai_response = f"Error in text AI: {str(e)}"
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to save error to interaction record: {db_error}")

        raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")
@router.post("/sessions/{session_id}/stream-interact")
async def stream_player_interaction(
    session_id: int,
    input_data: schemas.PlayerInput,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Process player interaction and generate streaming AI response
    """
    from fastapi.responses import StreamingResponse
    logger.info(f"Streaming player interaction for session {session_id}")
    
    # Verify the session exists and belongs to the user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Check if session is completed
    if game_session.is_completed:
        raise HTTPException(status_code=400, detail="Session is already completed")
    
    # Get scenario information
    scenario = db.query(models.Scenario).filter(models.Scenario.id == game_session.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Get client persona from database
    client_persona = {}
    client_personas = db.query(models.ClientPersona).filter(
        models.ClientPersona.scenario_id == scenario.id
    ).all()
    
    if client_personas:
        # Convert to dictionary
        persona = client_personas[0]
        client_persona = {
            "name": persona.name,
            "role": persona.role,
            "company": persona.company,
            "personality_traits": persona.personality_traits,
            "pain_points": persona.pain_points,
            "decision_criteria": persona.decision_criteria
        }
    else:
        # Use default client_persona if none found
        client_persona = {
            'name': 'Alex Johnson',
            'role': 'Procurement Manager',
            'company': 'TechCorp',
            'personality_traits': 'Professional, analytical, detail-oriented',
            'pain_points': 'Legacy payment systems, high transaction costs, security concerns',
            'decision_criteria': 'Security, cost-effectiveness, integration capabilities'
        }
    
    # Create new interaction record
    interaction_sequence = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).count() + 1
    
    new_interaction = models.Interaction(
        game_session_id=session_id,
        player_input=input_data.message,
        pacer_stage=game_session.current_stage or "P",  # Default to 'P' if no current stage
        sequence=interaction_sequence,
        addressed_to=input_data.addressed_to,
        modality=input_data.modality or "text"  # Default to text if not specified
    )
    
    db.add(new_interaction)
    db.commit()
    db.refresh(new_interaction)
    
    # Initialize AI service
    ai_service = AIService()
    
    # Prepare context dictionary with interaction and session details
    context = {
        "session_id": session_id,
        "interaction_id": new_interaction.id,
        "scenario": {
            "title": scenario.title,
            "description": scenario.description,
            "pacer_stage": scenario.pacer_stage,
            "difficulty": scenario.difficulty
        },
        "current_stage": game_session.current_stage or "P",
        "addressed_to": input_data.addressed_to,
        "modality": input_data.modality or "text",
        "role": input_data.role or "user"
    }
    
    # Get previous interactions for context
    previous_interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id,
        models.Interaction.id != new_interaction.id
    ).order_by(models.Interaction.sequence).all()
    
    conversation_history = []
    for interaction in previous_interactions:
        conversation_history.append({
            "role": "user",
            "content": interaction.player_input
        })
        if interaction.ai_response:
            conversation_history.append({
                "role": "assistant",
                "content": interaction.ai_response
            })
    
    # Simple response for non-streaming needs
    async def simple_response():
        return {"message": "Streaming response started", "context": {}}
    
    # Generate streaming response
    async def generate_stream():
        # Add import for SessionLocal at the top of the function
        from ..database import SessionLocal
        
        # Create a fresh database session that will live throughout the stream
        db_live = SessionLocal()
        
        # Start the stream
        full_response = ""
        
        try:
            # Stream the response
            async for response_chunk in ai_service.generate_client_response_stream(
                client_persona=client_persona,
                pacer_stage=game_session.current_stage or "P",
                conversation_history=conversation_history,
                player_input=input_data.message,
                context=context
            ):
                # 1️⃣ Handle control messages first
                if isinstance(response_chunk, dict) or (
                        isinstance(response_chunk, str) and response_chunk.lstrip().startswith('{')
                ):
                    # Try to parse as JSON if it's a string
                    chunk_data = response_chunk if isinstance(response_chunk, dict) else json.loads(response_chunk)
                    
                    # If this is the final chunk with evaluation data
                    if chunk_data.get('is_final') and chunk_data.get('evaluation'):
                        # Store the evaluation
                        evaluation = chunk_data['evaluation']
                        
                        # CRITICAL FIX: Get a fresh instance of the interaction bound to the new session
                        # This avoids trying to work with a detached object from another session
                        interaction_db = db_live.get(models.Interaction, new_interaction.id)
                        if interaction_db:
                            # Update the fresh instance with the response text
                            interaction_db.ai_response = full_response
                            interaction_db.feedback_provided = True
                            
                            # Create evaluation record
                            try:
                                eval_record = models.InteractionEvaluation(
                                    interaction_id=interaction_db.id,
                                    methodology_score=evaluation.get("methodology_score", 0),
                                    rapport_score=evaluation.get("rapport_score", 0),
                                    progress_score=evaluation.get("progress_score", 0),
                                    outcome_score=evaluation.get("outcome_score", 0),
                                    feedback=evaluation.get("feedback", ""),
                                    skills_demonstrated=evaluation.get("skills_demonstrated", {}),
                                    strength=evaluation.get("strength", ""),
                                    improvement=evaluation.get("improvement", ""),
                                    methodology_feedback=evaluation.get("methodology_feedback", ""),
                                    rapport_feedback=evaluation.get("rapport_feedback", ""),
                                    progress_feedback=evaluation.get("progress_feedback", ""),
                                    outcome_feedback=evaluation.get("outcome_feedback", "")
                                )
                                
                                # Add only the evaluation record to the session
                                db_live.add(eval_record)
                                
                                # Improved error handling for commit
                                try:
                                    db_live.commit()
                                    logger.info(f"Saved final AI response to database (length: {len(full_response)}) with evaluation data")
                                except Exception as commit_err:
                                    db_live.rollback()
                                    logger.exception(f"Failed to commit AI response and evaluation: {commit_err}")
                                    raise
                            except Exception as eval_err:
                                logger.error(f"Error creating evaluation record: {str(eval_err)}")
                        else:
                            logger.error(f"Failed to retrieve interaction with ID {new_interaction.id} from database")
                    
                    # ADDED: Handle final chunk without evaluation data
                    elif chunk_data.get('is_final') and 'text' in chunk_data:
                        # If there's a final chunk with text but no evaluation, still save to database
                        final_text = chunk_data.get('text', full_response)
                        
                        # Get a fresh instance of the interaction
                        interaction_db = db_live.get(models.Interaction, new_interaction.id)
                        if interaction_db:
                            interaction_db.ai_response = final_text
                            
                            # Improved error handling for commit
                            try:
                                db_live.commit()
                                logger.info(f"Saved final AI response to database (length: {len(final_text)}) from text field")
                            except Exception as commit_err:
                                db_live.rollback()
                                logger.exception(f"Failed to commit AI response: {commit_err}")
                                raise
                        else:
                            logger.error(f"Failed to retrieve interaction with ID {new_interaction.id} from database")
                    
                    # Send the chunk as JSON
                    yield f"{json.dumps(chunk_data)}\n"
                
                # 2️⃣ Handle plain text chunks
                else:
                    full_response += response_chunk
                    yield f"{response_chunk}\n"
            
            # Redundant storage as fallback - will only execute if no final chunk was received
            # This might happen in certain error conditions or if the API changes
            if not new_interaction.ai_response:
                logger.info(f"No ai_response set yet - storing via fallback mechanism (length: {len(full_response)})")
                
                # Get a fresh instance of the interaction
                interaction_db = db_live.get(models.Interaction, new_interaction.id)
                if interaction_db:
                    interaction_db.ai_response = full_response
                    
                    # Improved error handling for commit
                    try:
                        db_live.commit()
                        logger.info(f"Saved final AI response to database (length: {len(full_response)}) via fallback")
                    except Exception as commit_err:
                        db_live.rollback()
                        logger.exception(f"Failed to commit AI response via fallback: {commit_err}")
                        raise
                else:
                    logger.error(f"Failed to retrieve interaction with ID {new_interaction.id} from database")
            
        except Exception as e:
            error_msg = f"Error in stream generation: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            
            # Update interaction record with error message
            interaction_db = db_live.get(models.Interaction, new_interaction.id)
            if interaction_db:
                interaction_db.ai_response = f"Error generating response: {str(e)}"
                
                # Improved error handling for commit
                try:
                    db_live.commit()
                    logger.info("Saved error message to database")
                except Exception as commit_err:
                    db_live.rollback()
                    logger.exception(f"Failed to commit error message: {commit_err}")
            else:
                logger.error(f"Failed to retrieve interaction with ID {new_interaction.id} from database")
            
            # Return error to client
            yield json.dumps({"error": error_msg}) + "\n"
        finally:
            # Close the fresh database session
            db_live.close()
            logger.info("Database session closed after stream completion")
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain"
    )

@router.post("/sessions/{session_id}/multi-interact", response_model=schemas.MultiStakeholderResponse)
def multi_stakeholder_interaction(
    session_id: int,
    input_data: schemas.PlayerInput,
    stakeholder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Process a player's interaction in a multi-stakeholder scenario."""
    # Get the game session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Game session is already completed")
    
    # Get the scenario
    scenario = db.query(models.Scenario).filter(models.Scenario.id == session.scenario_id).first()
    
    # Verify this is a multi-stakeholder scenario
    if not scenario.is_multi_stakeholder:
        raise HTTPException(
            status_code=400, 
            detail="This is not a multi-stakeholder scenario. Use the standard interaction endpoint."
        )
    
    # Get all stakeholders for this scenario
    stakeholders = db.query(models.Stakeholder).filter(
        models.Stakeholder.scenario_id == scenario.id
    ).all()
    
    if not stakeholders:
        raise HTTPException(status_code=404, detail="No stakeholders found for this scenario")
    
    # Verify the target stakeholder exists
    target_stakeholder = None
    stakeholder_list = []
    
    for s in stakeholders:
        stakeholder_dict = {
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "influence_level": s.influence_level,
            "is_decision_maker": s.is_decision_maker,
            "personality_traits": s.personality_traits,
            "interests": s.interests,
            "concerns": s.concerns,
            "communication_style": s.communication_style
        }
        stakeholder_list.append(stakeholder_dict)
        
        if s.id == stakeholder_id:
            target_stakeholder = stakeholder_dict
    
    if not target_stakeholder:
        raise HTTPException(status_code=404, detail="Target stakeholder not found")
    
    # Get conversation history
    conversation_history = []
    
    # Get regular interactions
    interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).order_by(models.Interaction.sequence).all()
    
    # Get stakeholder responses
    stakeholder_responses = db.query(models.StakeholderResponse).filter(
        models.StakeholderResponse.game_session_id == session_id
    ).order_by(models.StakeholderResponse.sequence).all()
    
    # Combine and sort by sequence
    for interaction in interactions:
        conversation_history.append({
            "speaker_type": "sales_rep",
            "text": interaction.player_input,
            "addressed_to": interaction.addressed_to,
            "sequence": interaction.sequence
        })
    
    for response in stakeholder_responses:
        # Get stakeholder info
        stakeholder = next((s for s in stakeholder_list if s["id"] == response.stakeholder_id), None)
        if stakeholder:
            conversation_history.append({
                "speaker_type": "stakeholder",
                "speaker_id": stakeholder["id"],
                "speaker_name": stakeholder["name"],
                "text": response.response_text,
                "sequence": response.sequence
            })
    
    # Sort by sequence
    conversation_history.sort(key=lambda x: x["sequence"])
    
    # Determine the current sequence number
    sequence = max([i.sequence for i in interactions] + [0]) + 1
    
    # Get current conversation context (for AI memory)
    context = session.conversation_context or {}
    
    # Generate AI response from the stakeholder
    response_data = AIService.generate_multi_stakeholder_response(
        stakeholders=stakeholder_list,
        active_stakeholder_id=stakeholder_id,
        pacer_stage=session.current_stage or scenario.pacer_stage,
        conversation_history=conversation_history,
        player_input=input_data.message,
        context=context
    )
    
    # Store the player's interaction
    interaction = models.Interaction(
        game_session_id=session_id,
        sequence=sequence,
        player_input=input_data.message,
        ai_response="",  # No direct AI response in multi-stakeholder mode
        pacer_stage=session.current_stage or scenario.pacer_stage,
        addressed_to=str(stakeholder_id)
    )
    db.add(interaction)
    db.commit()
    
    # Store the stakeholder's response
    stakeholder_response = models.StakeholderResponse(
        game_session_id=session_id,
        stakeholder_id=stakeholder_id,
        sequence=sequence + 1,  # Stakeholder response comes after player input
        response_text=response_data.get("response", "")
    )
    db.add(stakeholder_response)
    db.commit()
    
    # Update conversation context with new information
    if not session.conversation_context:
        session.conversation_context = {}
    
    # Update context
    context_update = {
        "latest_stakeholder_interaction": {
            "stakeholder_id": stakeholder_id,
            "sequence": sequence,
            "timestamp": datetime.utcnow().isoformat(),
            "thoughts": response_data.get("thoughts", "")
        }
    }
    
    # Update the session context
    session.conversation_context.update(context_update)
    db.commit()
    
    # Return the stakeholder's response
    return {
        "stakeholder_id": stakeholder_id,
        "response": response_data.get("response", ""),
        "thoughts": response_data.get("thoughts", ""),
        "next_speaker_id": response_data.get("next_speaker_id")
    }

@router.post("/sessions/{session_id}/analyze-competitor", response_model=schemas.CompetitorAnalysisResponse)
def analyze_competitor(
    session_id: int,
    client_needs: List[str],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Analyze competitor information in context of the current client's needs."""
    # Get the game session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get the scenario
    scenario = db.query(models.Scenario).filter(models.Scenario.id == session.scenario_id).first()
    
    # Get competitor info
    competitor_info = db.query(models.CompetitorInfo).filter(
        models.CompetitorInfo.scenario_id == scenario.id
    ).first()
    
    if not competitor_info:
        raise HTTPException(status_code=404, detail="No competitor information available for this scenario")
    
    # Convert to dict
    competitor_dict = {
        "competitor_name": competitor_info.competitor_name,
        "product_offering": competitor_info.product_offering,
        "strengths": competitor_info.strengths,
        "weaknesses": competitor_info.weaknesses,
        "pricing_strategy": competitor_info.pricing_strategy,
        "key_differentiators": competitor_info.key_differentiators
    }
    
    # Analyze competitor
    analysis = AIService.analyze_competitor(
        competitor_info=competitor_dict,
        product_type=scenario.product_type,
        client_needs=client_needs
    )
    
    return analysis

@router.post("/sessions/{session_id}/meeting-summary", response_model=schemas.MeetingSummaryResponse)
def generate_meeting_summary(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Generate a summary of a multi-stakeholder meeting."""
    # Get the game session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get the scenario
    scenario = db.query(models.Scenario).filter(models.Scenario.id == session.scenario_id).first()
    
    # Check if this is a multi-stakeholder scenario
    if not scenario.is_multi_stakeholder:
        raise HTTPException(
            status_code=400, 
            detail="Meeting summaries are only available for multi-stakeholder scenarios."
        )
    
    # Get all stakeholders for this scenario
    stakeholders = db.query(models.Stakeholder).filter(
        models.Stakeholder.scenario_id == scenario.id
    ).all()
    
    stakeholder_list = []
    for s in stakeholders:
        stakeholder_list.append({
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "is_decision_maker": s.is_decision_maker
        })
    
    # Get conversation history
    conversation_history = []
    
    # Get regular interactions
    interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).order_by(models.Interaction.sequence).all()
    
    # Get stakeholder responses
    stakeholder_responses = db.query(models.StakeholderResponse).filter(
        models.StakeholderResponse.game_session_id == session_id
    ).order_by(models.StakeholderResponse.sequence).all()
    
    # Combine and sort by sequence
    for interaction in interactions:
        conversation_history.append({
            "speaker_type": "sales_rep",
            "text": interaction.player_input,
            "addressed_to": interaction.addressed_to,
            "sequence": interaction.sequence
        })
    
    for response in stakeholder_responses:
        # Get stakeholder info
        stakeholder = next((s for s in stakeholder_list if s["id"] == response.stakeholder_id), None)
        if stakeholder:
            conversation_history.append({
                "speaker_type": "stakeholder",
                "speaker_id": stakeholder["id"],
                "speaker_name": stakeholder["name"],
                "text": response.response_text,
                "sequence": response.sequence
            })
    
    # Sort by sequence
    conversation_history.sort(key=lambda x: x["sequence"])
    
    # Generate meeting summary
    summary = AIService.generate_meeting_summary(
        conversation_history=conversation_history,
        stakeholders=stakeholder_list,
        scenario_context={
            "title": scenario.title,
            "description": scenario.description,
            "pacer_stage": scenario.pacer_stage
        }
    )
    
    return summary

@router.post("/sessions/{session_id}/complete")
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Complete a game session and calculate final score"""
    # Get session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Game session is already completed")
    
    # Mark as complete
    session.is_completed = True
    session.end_time = datetime.utcnow()
    
    # 1. Calculate the aggregate quality score (average of all per-turn scores)
    interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).all()
    
    # Define score weights
    weights = {
        "methodology": 0.40,  # 40%
        "rapport": 0.25,      # 25%
        "progress": 0.20,     # 20%
        "outcome": 0.15       # 15%
    }
    
    # Get all interaction scores
    interaction_scores = []
    
    for interaction in interactions:
        evaluation = db.query(models.InteractionEvaluation).filter(
            models.InteractionEvaluation.interaction_id == interaction.id
        ).first()
        
        if evaluation:
            # Calculate weighted score for this interaction
            score = (
                weights["methodology"] * evaluation.methodology_score +
                weights["rapport"] * evaluation.rapport_score +
                weights["progress"] * evaluation.progress_score +
                weights["outcome"] * evaluation.outcome_score
            )
            interaction_scores.append(score)
    
    # Calculate aggregate quality (average of all scores)
    quality = sum(interaction_scores) / len(interaction_scores) if interaction_scores else 0
    
    # 2. Goal completion bonus
    # Check the outcome scores of the last few interactions to determine if goal was achieved
    goal_bonus = 0
    GOAL_INTERACTIONS_TO_CHECK = 3  # Check last 3 interactions
    
    recent_interactions = interactions[-GOAL_INTERACTIONS_TO_CHECK:] if len(interactions) >= GOAL_INTERACTIONS_TO_CHECK else interactions
    
    # Average outcome score from recent interactions
    recent_outcome_scores = []
    for interaction in recent_interactions:
        evaluation = db.query(models.InteractionEvaluation).filter(
            models.InteractionEvaluation.interaction_id == interaction.id
        ).first()
        if evaluation:
            recent_outcome_scores.append(evaluation.outcome_score)
    
    avg_outcome_score = sum(recent_outcome_scores) / len(recent_outcome_scores) if recent_outcome_scores else 0
    
    # Determine goal bonus based on outcome score
    if avg_outcome_score >= 80:
        goal_bonus = 15  # Goal fully achieved
    elif avg_outcome_score >= 50:
        goal_bonus = 8   # Goal partially achieved
    
    # 3. Time management bonus - MODIFIED to account for paused time
    # Calculate actual active time excluding pauses
    active_seconds = 0
    
    if session.is_timed:
        # For timed sessions, use the time calculated by timer system
        # Calculate based on remaining time vs time limit
        if session.time_limit_seconds:
            if session.remaining_time_seconds is not None:
                time_used = session.time_limit_seconds - session.remaining_time_seconds
                active_seconds = time_used
            else:
                # Fall back to end_time - start_time if no remaining time data
                active_seconds = (session.end_time - session.start_time).total_seconds()
    else:
        # Regular calculation for non-timed sessions
        active_seconds = (session.end_time - session.start_time).total_seconds()
    
    time_limit = session.time_limit_seconds
    
    # Check if time_limit is None and handle appropriately
    if time_limit is None:
        # If no time limit is set, use a default bonus factor (no bonus/penalty)
        time_bonus = 1.0
    elif active_seconds <= time_limit:
        # Under time limit - bonus up to 10%
        time_bonus = 1 + (time_limit - active_seconds) / time_limit * 0.10
    else:
        # Over time limit - penalty up to 10%
        time_bonus = 1 - (active_seconds - time_limit) / time_limit * 0.10
    
    # Clamp time bonus between 0.9 and 1.1
    time_bonus = min(max(time_bonus, 0.9), 1.1)
    
    # 4. Difficulty multiplier
    difficulty_factor = session.difficulty_factor or 1.0
    
    # 5. Calculate final score
    final_score = round(
        quality * time_bonus * difficulty_factor
    ) + goal_bonus
    
    # Clamp final score between 0 and 100
    final_score = min(max(final_score, 0), 100)
    
    # Update session with final score
    session.total_score = final_score
    
    # Create or update Score record
    score = db.query(models.Score).filter(models.Score.game_session_id == session_id).first()
    
    if not score:
        # Create new score record
        score = models.Score(
            user_id=current_user.id,
            game_session_id=session_id,
            total_score=final_score,
            # Store detailed scores
            methodology_score=weights["methodology"] * quality,
            rapport_score=weights["rapport"] * quality,
            progress_score=weights["progress"] * quality,
            outcome_score=weights["outcome"] * quality,
            # Store detailed breakdown
            detailed_breakdown={
                "quality": quality,
                "goal_bonus": goal_bonus,
                "time_bonus": time_bonus,
                "difficulty_factor": difficulty_factor,
                "final_score": final_score,
                "active_seconds": active_seconds
            }
        )
        db.add(score)
    else:
        # Update existing score record
        score.total_score = final_score
        score.methodology_score = weights["methodology"] * quality
        score.rapport_score = weights["rapport"] * quality
        score.progress_score = weights["progress"] * quality
        score.outcome_score = weights["outcome"] * quality
        score.detailed_breakdown = {
            "quality": quality,
            "goal_bonus": goal_bonus,
            "time_bonus": time_bonus,
            "difficulty_factor": difficulty_factor,
            "final_score": final_score,
            "active_seconds": active_seconds
        }
    
    # Update user progress (PACER levels, etc.) - existing logic
    
    db.commit()
    
    # Return final score data
    return {
        "message": "Session completed successfully", 
        "final_score": final_score,
        "detail": {
            "quality": quality,
            "goal_bonus": goal_bonus,
            "time_bonus": time_bonus,
            "difficulty_factor": difficulty_factor,
            "active_seconds": active_seconds
        }
    }

# Leaderboard
@router.get("/leaderboard", response_model=List[dict])
def get_leaderboard(
    region: Optional[str] = None,
    team_id: Optional[int] = None,
    challenge_id: Optional[int] = None,
    limit: int = Query(10, gt=0, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get the leaderboard, optionally filtered by region, team, or challenge."""
    if challenge_id:
        # Challenge-specific leaderboard
        challenge = db.query(models.TeamChallenge).filter(models.TeamChallenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get challenge results
        results = db.query(
            models.User.username,
            models.User.region,
            models.ChallengeResult.score,
            models.ChallengeResult.completed_sessions
        ).join(
            models.ChallengeResult, 
            models.User.id == models.ChallengeResult.user_id
        ).filter(
            models.ChallengeResult.challenge_id == challenge_id
        ).order_by(models.ChallengeResult.score.desc()).limit(limit).all()
        
        leaderboard = []
        for username, region, score, completed_sessions in results:
            leaderboard.append({
                "username": username,
                "region": region,
                "score": score,
                "completed_sessions": completed_sessions
            })
        
        return leaderboard
    
    elif team_id:
        # Team-specific leaderboard
        team = db.query(models.Team).filter(models.Team.id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get team members and their progress
        results = db.query(
            models.User.username,
            models.User.region,
            models.Progress.total_score,
            models.Progress.rank,
            models.Progress.total_sessions_completed
        ).join(
            models.Progress,
            models.User.id == models.Progress.user_id
        ).join(
            models.TeamMember,
            models.User.id == models.TeamMember.user_id
        ).filter(
            models.TeamMember.team_id == team_id
        ).order_by(models.Progress.total_score.desc()).limit(limit).all()
        
        leaderboard = []
        for username, region, score, rank, sessions in results:
            leaderboard.append({
                "username": username,
                "region": region,
                "total_score": score,
                "rank": rank,
                "sessions_completed": sessions
            })
        
        return leaderboard
    
    else:
        # Regular leaderboard
        query = db.query(
            models.User.username,
            models.User.region,
            models.Progress.total_score,
            models.Progress.rank
        ).join(models.Progress)
        
        # Filter by region if specified
        if region:
            query = query.filter(models.User.region == region)
        
        leaderboard = query.order_by(models.Progress.total_score.desc()).limit(limit).all()
        
        result = []
        for username, region, score, rank in leaderboard:
            result.append({
                "username": username,
                "region": region,
                "total_score": score,
                "rank": rank
            })
        
        return result 

# Game Events API Endpoints
@router.post("/game-events", response_model=schemas.GameEventResponse)
def create_game_event(
    game_event: schemas.GameEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can create events
):
    """Create a new game event (manager only)."""
    # Check if scenario exists
    scenario = db.query(models.Scenario).filter(models.Scenario.id == game_event.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Create the game event
    db_game_event = models.GameEvent(**game_event.dict())
    db.add(db_game_event)
    db.commit()
    db.refresh(db_game_event)
    
    return db_game_event

@router.get("/game-events/{scenario_id}", response_model=List[schemas.GameEventResponse])
def get_scenario_events(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all events for a specific scenario."""
    # Check if scenario exists
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Get all events for this scenario
    events = db.query(models.GameEvent).filter(models.GameEvent.scenario_id == scenario_id).all()
    return events

@router.post("/sessions/{session_id}/trigger-event", response_model=schemas.EventOccurrenceResponse)
def trigger_event(
    session_id: int,
    event_data: schemas.TriggerEventRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Trigger a specific event during a game session."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Create a temporary event or use an existing one
    if event_data.scenario_id == 0:  # Temporary event
        # Create a temporary event just for this session
        event = models.GameEvent(**event_data.dict())
        event.scenario_id = game_session.scenario_id
        db.add(event)
        db.commit()
        db.refresh(event)
    else:
        # Use an existing event
        event = db.query(models.GameEvent).filter(models.GameEvent.id == event_data.scenario_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
    
    # Record this event occurrence
    event_occurrence = models.EventOccurrence(
        game_event_id=event.id,
        game_session_id=session_id
    )
    db.add(event_occurrence)
    db.commit()
    db.refresh(event_occurrence)
    
    # Get conversation history for context
    interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).order_by(models.Interaction.sequence).all()
    
    conversation_history = [
        {
            "player_input": interaction.player_input,
            "ai_response": interaction.ai_response
        }
        for interaction in interactions
    ]
    
    # Get scenario context
    scenario = db.query(models.Scenario).filter(
        models.Scenario.id == game_session.scenario_id
    ).first()
    
    # Get client persona from database
    client_persona = {}
    client_personas = db.query(models.ClientPersona).filter(
        models.ClientPersona.scenario_id == scenario.id
    ).all()
    
    if client_personas:
        # Convert to dictionary
        persona = client_personas[0]
        client_persona = {
            "name": persona.name,
            "role": persona.role,
            "company": persona.company,
            "personality_traits": persona.personality_traits,
            "pain_points": persona.pain_points,
            "decision_criteria": persona.decision_criteria
        }
    else:
        # Use default client_persona if none found
        client_persona = {
            'name': 'Alex Johnson',
            'role': 'Procurement Manager',
            'company': 'TechCorp',
            'personality_traits': 'Professional, analytical, detail-oriented',
            'pain_points': 'Legacy payment systems, high transaction costs, security concerns',
            'decision_criteria': 'Security, cost-effectiveness, integration capabilities'
        }
    
    scenario_context = {
        "description": scenario.description,
        "client_persona": client_persona
    }
    
    # Generate event details using AI
    ai_service = AIService()
    event_response = ai_service.handle_unexpected_event(
        event_type=event.event_type,
        event_data=event.event_data,
        conversation_history=conversation_history,
        scenario_context=scenario_context,
        player_difficulty_factor=game_session.difficulty_factor
    )
    
    # Store event response in event_occurrence
    event_occurrence.resolution = json.dumps(event_response)
    db.commit()
    
    return event_occurrence

@router.post("/sessions/{session_id}/event-response", response_model=Dict)
def handle_event_response(
    session_id: int,
    event_data: Dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Process a player's response to an event."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get the event occurrence
    event_occurrence = db.query(models.EventOccurrence).filter(
        models.EventOccurrence.id == event_data.get("event_occurrence_id")
    ).first()
    
    if not event_occurrence:
        raise HTTPException(status_code=404, detail="Event occurrence not found")
    
    # Store the player's response
    event_occurrence.player_response = event_data.get("player_response", "")
    db.commit()
    
    # Get the event
    event = db.query(models.GameEvent).filter(
        models.GameEvent.id == event_occurrence.game_event_id
    ).first()
    
    # Get scenario context
    scenario = db.query(models.Scenario).filter(
        models.Scenario.id == game_session.scenario_id
    ).first()
    
    scenario_context = {
        "description": scenario.description,
        "pacer_stage": game_session.current_stage
    }
    
    # Evaluate the player's response
    ai_service = AIService()
    event_resolution = json.loads(event_occurrence.resolution) if event_occurrence.resolution else {}
    
    evaluation = ai_service.evaluate_player_event_response(
        event_type=event.event_type,
        event_description=event.description,
        player_response=event_occurrence.player_response
    )
    
    # Store the evaluation
    event_occurrence.impact_score = evaluation.get("overall_score", 50) / 100.0  # Convert to 0.0-1.0 scale
    db.commit()
    
    # Update game session difficulty based on event response
    # Events that are handled well can slightly reduce difficulty, poorly handled events increase it
    impact_adjustment = (0.5 - evaluation.get("overall_score", 50) / 100.0) * 0.2
    game_session.difficulty_factor = max(0.5, min(2.0, game_session.difficulty_factor + impact_adjustment))
    db.commit()
    
    # Generate AI response based on event handling
    ai_response = {
        "client_response": f"In response to your handling of the {event.event_type}, the client says: '{evaluation.get('feedback')}'",
        "evaluation": evaluation,
        "difficulty_adjustment": impact_adjustment
    }
    
    return ai_response

# Timed Challenges API Endpoints
@router.post("/timed-challenges", response_model=schemas.TimedChallengeResponse)
def create_timed_challenge(
    challenge: schemas.TimedChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new timed challenge for a game session."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == challenge.session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Create the challenge
    db_challenge = models.TimedChallenge(**challenge.dict())
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    
    return db_challenge

@router.get("/timed-challenges/{session_id}", response_model=List[schemas.TimedChallengeResponse])
def get_session_challenges(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all timed challenges for a specific game session."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get all challenges for this session
    challenges = db.query(models.TimedChallenge).filter(
        models.TimedChallenge.session_id == session_id
    ).all()
    
    return challenges

@router.put("/timed-challenges/{challenge_id}", response_model=schemas.TimedChallengeResponse)
def update_timed_challenge(
    challenge_id: int,
    challenge_data: schemas.TimedChallengeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a timed challenge (e.g., mark it as completed)."""
    # Get the challenge
    challenge = db.query(models.TimedChallenge).filter(
        models.TimedChallenge.id == challenge_id
    ).first()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if session belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == challenge.session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=403, detail="Not authorized to update this challenge")
    
    # Update the challenge fields
    for key, value in challenge_data.dict(exclude_unset=True).items():
        setattr(challenge, key, value)
    
    db.commit()
    db.refresh(challenge)
    
    return challenge

# Timed Session Management
@router.post("/sessions/{session_id}/start-timer")
def start_session_timer(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Start or resume the timer for a timed game session."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if not game_session.is_timed:
        raise HTTPException(status_code=400, detail="This is not a timed session")
    
    # Check if timer was previously paused
    if game_session.timer_paused_at:
        # Calculate remaining time when paused
        elapsed_time = (game_session.timer_paused_at - game_session.timer_started_at).total_seconds()
        game_session.remaining_time_seconds = max(0, game_session.time_limit_seconds - int(elapsed_time))
        game_session.timer_paused_at = None
    else:
        # First time starting the timer
        game_session.remaining_time_seconds = game_session.time_limit_seconds
    
    game_session.timer_started_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Timer started", "remaining_seconds": game_session.remaining_time_seconds}

@router.post("/sessions/{session_id}/pause-timer")
def pause_session_timer(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Pause the timer for a timed game session."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if not game_session.is_timed:
        raise HTTPException(status_code=400, detail="This is not a timed session")
    
    if not game_session.timer_started_at:
        raise HTTPException(status_code=400, detail="Timer has not been started")
    
    # Calculate remaining time
    current_time = datetime.utcnow()
    elapsed_time = (current_time - game_session.timer_started_at).total_seconds()
    game_session.remaining_time_seconds = max(0, game_session.remaining_time_seconds - int(elapsed_time))
    
    # Set pause time
    game_session.timer_paused_at = current_time
    db.commit()
    
    return {"message": "Timer paused", "remaining_seconds": game_session.remaining_time_seconds}

@router.get("/sessions/{session_id}/timer-status")
def get_timer_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get the current status of the timer for a timed game session."""
    # Check if session exists and belongs to the current user
    game_session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if not game_session.is_timed:
        return {
            "is_timed": False,
            "message": "This is not a timed session"
        }
    
    # If timer is running, calculate remaining time
    remaining_seconds = game_session.remaining_time_seconds or 0
    is_running = False
    
    if game_session.timer_started_at and not game_session.timer_paused_at:
        is_running = True
        current_time = datetime.utcnow()
        elapsed_time = (current_time - game_session.timer_started_at).total_seconds()
        remaining_seconds = max(0, game_session.remaining_time_seconds - int(elapsed_time))
    
    return {
        "is_timed": True,
        "is_running": is_running,
        "time_limit_seconds": game_session.time_limit_seconds,
        "remaining_seconds": remaining_seconds,
        "is_completed": game_session.is_completed
    }

# Difficulty Management
@router.post("/difficulty-settings", response_model=schemas.DifficultySettingsResponse)
def create_difficulty_settings(
    settings: schemas.DifficultySettingsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create or update difficulty settings for a user."""
    # Check if settings already exist for this user
    existing_settings = db.query(models.DifficultySettings).filter(
        models.DifficultySettings.user_id == current_user.id
    ).first()
    
    if existing_settings:
        # Update existing settings
        for key, value in settings.dict(exclude={"user_id"}).items():
            setattr(existing_settings, key, value)
        db.commit()
        db.refresh(existing_settings)
        return existing_settings
    
    # Create new settings
    db_settings = models.DifficultySettings(**settings.dict(), user_id=current_user.id)
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    
    return db_settings

@router.get("/difficulty-settings", response_model=schemas.DifficultySettingsResponse)
def get_difficulty_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get difficulty settings for the current user."""
    settings = db.query(models.DifficultySettings).filter(
        models.DifficultySettings.user_id == current_user.id
    ).first()
    
    if not settings:
        # Create default settings if none exist
        settings = models.DifficultySettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@router.put("/difficulty-settings", response_model=schemas.DifficultySettingsResponse)
def update_difficulty_settings(
    settings: schemas.DifficultySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update difficulty settings for the current user."""
    db_settings = db.query(models.DifficultySettings).filter(
        models.DifficultySettings.user_id == current_user.id
    ).first()
    
    if not db_settings:
        raise HTTPException(status_code=404, detail="Difficulty settings not found")
    
    # Update fields
    for key, value in settings.dict(exclude_unset=True).items():
        setattr(db_settings, key, value)
    
    db.commit()
    db.refresh(db_settings)
    
    return db_settings

# Seasonal Content
@router.post("/seasonal-content", response_model=schemas.SeasonalContentResponse)
def create_seasonal_content(
    content: schemas.SeasonalContentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can create seasonal content
):
    """Create new seasonal content (manager only)."""
    db_content = models.SeasonalContent(**content.dict())
    db.add(db_content)
    db.commit()
    db.refresh(db_content)
    
    return db_content

@router.get("/seasonal-content", response_model=List[schemas.SeasonalContentResponse])
def get_active_seasonal_content(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all currently active seasonal content."""
    current_time = datetime.utcnow()
    
    content = db.query(models.SeasonalContent).filter(
        models.SeasonalContent.is_active == True,
        models.SeasonalContent.start_date <= current_time,
        models.SeasonalContent.end_date >= current_time
    ).all()
    
    return content

@router.get("/sessions/{session_id}/score")
def get_session_score(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get the detailed score for a game session."""
    # First, check if the session exists and belongs to the user
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get the score from the Score table
    score = db.query(models.Score).filter(
        models.Score.game_session_id == session_id
    ).first()
    
    if not score:
        # If no score exists but the session is completed, return the total score from the session
        if session.is_completed:
            return {
                "total_score": session.total_score,
                "methodology_score": 0,
                "rapport_score": 0,
                "progress_score": 0,
                "outcome_score": 0,
                "detailed_breakdown": {}
            }
        raise HTTPException(status_code=404, detail="Score not found for this session")
    
    return score

@router.post("/sessions/{session_id}/speech-to-text")
async def speech_to_text(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
    audio_file: UploadFile = File(...)
):
    """Convert speech to text using OpenAI's Whisper model."""
    # Get the game session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Game session is already completed")
    
    # Save the audio file temporarily
    temp_audio_path = f"temp_audio_{current_user.id}_{session_id}_{int(time.time())}.wav"
    with open(temp_audio_path, "wb") as buffer:
        buffer.write(await audio_file.read())
    
    try:
        # Process with OpenAI Whisper
        transcript = await AIService.transcribe_audio(temp_audio_path)
        
        return {"text": transcript}
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

@router.post("/sessions/{session_id}/text-to-speech")
async def text_to_speech(
    session_id: int,
    input_data: schemas.TextToSpeechInput,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Convert AI response text to speech."""
    from fastapi.responses import StreamingResponse
    import io
    
    # Get the game session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get text to convert
    text = input_data.text
    voice = input_data.voice or "alloy"  # Default voice
    
    # Get client persona for voice customization
    client_persona = None
    if session.scenario_id:
        client_persona = db.query(models.ClientPersona).filter(
            models.ClientPersona.scenario_id == session.scenario_id
        ).first()
    
    # Generate speech from text
    audio_stream = await AIService.generate_speech(
        text=text, 
        voice=voice,
        client_persona=client_persona
    )
    
    # Return the audio as a streaming response
    return StreamingResponse(
        io.BytesIO(audio_stream), 
        media_type="audio/mp3",
        headers={
            "Content-Disposition": f"attachment; filename=response_{int(time.time())}.mp3"
        }
    )

@router.websocket("/sessions/{session_id}/audio-stream")
async def audio_stream(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for audio streaming.
    Verifies the token before accepting connections.
    """
    # Log connection attempt
    logging.info("Audio stream WebSocket connection attempt")
    connection_accepted = False
    
    try:
        # Accept the WebSocket connection first 
        await websocket.accept()
        connection_accepted = True
        logging.info("connection open")
        
        # Verify token
        if not token:
            logging.warning("Token is required for WebSocket connection")
            await websocket.send_text(json.dumps({"error": "Token is required"}))
            await websocket.close(code=1008, reason="Token is required")
            return
        
        try:
            # Verify the token - modified to use verify_token without type checking
            payload = auth.verify_token(token)
            if not payload:
                logging.warning("Invalid token for WebSocket connection")
                await websocket.send_text(json.dumps({"error": "Invalid token"}))
                await websocket.close(code=1008, reason="Invalid token")
                return
            
            # Get user from email in token
            email = payload.get("sub")
            logging.info(f"Looking up user by email: {email}")
            user = db.query(models.User).filter(models.User.email == email).first()
            
            if not user:
                logging.warning(f"User not found for email: {email}")
                await websocket.send_text(json.dumps({"error": "User not found"}))
                await websocket.close(code=1008, reason="User not found")
                return
            
            # Get game session
            logging.info(f"Looking up game session: {session_id}")
            session = db.query(models.GameSession).filter(models.GameSession.id == session_id).first()
            
            if not session:
                logging.warning(f"Session not found: {session_id}")
                await websocket.send_text(json.dumps({"error": "Session not found"}))
                await websocket.close(code=1008, reason="Session not found")
                return
            
            if session.user_id != user.id:
                logging.warning(f"Unauthorized access: user {user.id} attempting to access session {session_id}")
                await websocket.send_text(json.dumps({"error": "Unauthorized"}))
                await websocket.close(code=1008, reason="Unauthorized")
                return
            
            # Get the scenario for this session
            scenario = db.query(models.Scenario).filter(
                models.Scenario.id == session.scenario_id
            ).first()
            
            if not scenario:
                logging.warning(f"Scenario not found for session: {session_id}")
                await websocket.send_text(json.dumps({"error": "Scenario not found"}))
                await websocket.close(code=1008, reason="Scenario not found")
                return
            
            # Send success message
            logging.info(f"WebSocket connection established for session: {session_id}")
            await websocket.send_text(json.dumps({"success": True, "message": "Connected to audio stream"}))
            
            # Keep the connection open and handle messages
            while True:
                try:
                    # Wait for messages - handle both binary and text
                    message = await websocket.receive()
                    
                    # Check the message type
                    if message["type"] == "websocket.receive":
                        if "bytes" in message:
                            # Handle binary data
                            data = message["bytes"]
                            await websocket.send_bytes(data)
                        elif "text" in message:
                            # Handle text data
                            text_data = message["text"]
                            try:
                                # Try to parse as JSON
                                json_data = json.loads(text_data)
                                # Echo back with a success message
                                await websocket.send_text(json.dumps({
                                    "status": "success",
                                    "message": "Received JSON message",
                                    "data": json_data
                                }))
                            except json.JSONDecodeError:
                                # Not valid JSON, just echo back
                                await websocket.send_text(text_data)
                    
                except WebSocketDisconnect:
                    logging.info(f"WebSocket disconnected for session: {session_id}")
                    break
                except Exception as e:
                    logging.error(f"Error in WebSocket message handling: {str(e)}")
                    try:
                        await websocket.send_text(json.dumps({"error": f"Error processing message: {str(e)}"}))
                    except Exception as send_e:
                        logging.error(f"Failed to send error message: {str(send_e)}")
                    break
                
        except Exception as e:
            logging.error(f"Error verifying token: {str(e)}")
            await websocket.send_text(json.dumps({"error": f"Authentication error: {str(e)}"}))
            await websocket.close(code=1008, reason="Authentication error")
            return
            
    except Exception as e:
        logging.error(f"WebSocket error: {str(e)}")
        if connection_accepted:
            try:
                await websocket.send_text(json.dumps({"error": f"Internal server error: {str(e)}"}))
                await websocket.close(code=1011, reason="Internal server error")
            except:
                logging.error("Failed to close WebSocket connection after error")
    finally:
        # Make sure to close the database session to free up resources
        db.close()
        logging.info("connection closed - database session released")

@router.websocket("/sessions/{session_id}/realtime-voice")
async def realtime_voice(client_ws: WebSocket, session_id: int): 
    # Get token from query parameters manually
    token = client_ws.query_params.get("token") # Use client_ws
    if not token:
        await client_ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token") # Use client_ws
        return

    user = None
    db: Session = next(get_db()) # Manually get a DB session
    try:
        # Manually authenticate the token
        payload = auth.verify_token(token=token)
        email: str = payload.get("sub")
        expected_token_type = "websocket" # Or check payload['token_type'] if needed
        actual_token_type = payload.get("token_type")

        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload: Missing subject")
        if actual_token_type != expected_token_type:
             logger.warning(f"Token type mismatch: Expected {expected_token_type}, Got {actual_token_type}")
             # Decide if this is critical - potentially close connection or just log
             # await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token type")
             # return

        # Get user from database
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        if not user.is_active:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    except HTTPException as e:
        await client_ws.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {e.detail}") # Use client_ws
        return
    except Exception as e:
        logger.error(f"Token validation or user lookup error: {e}")
        await client_ws.close(code=status.WS_1011_INTERNAL_ERROR, reason="Token validation error") # Use client_ws
        return
    finally:
        db.close() # Ensure the manually obtained session is closed

    # ---> ACCEPT THE CONNECTION HERE <--- After successful authentication
    await client_ws.accept()
    logger.info(f"WebSocket connection accepted for user {user.email} on session {session_id}")

    openai_ws = None
    try:
        # --- Updated Workflow ---
        # 1. Create a transcription session to get an ephemeral token
        ephemeral_token = await AIService.create_realtime_session()
        if not ephemeral_token:
            logger.error("Failed to create OpenAI transcription session and get token.")
            await client_ws.close(code=1011, reason="AI session creation failed") # Use client_ws
            return
            
        # 2. Connect to OpenAI Realtime Transcription endpoint using the ephemeral token
        openai_ws = await AIService.connect_to_openai_realtime(ephemeral_token) # Keep openai_ws name
        if openai_ws is None:
            logger.error("Failed to connect to OpenAI WebSocket using ephemeral token.")
            await client_ws.close(code=1011, reason="AI connection failed") # Use client_ws
            return
            
        logger.info("Successfully connected to OpenAI WebSocket using ephemeral token.")

        # 3. Handle the conversation using the established connections
        try:
            # ---> ADD THIS LINE <---
            ai_service_instance = AIService() # Instantiate the service
            # Pass only the expected arguments: client_ws and session_id
            await ai_service_instance.handle_realtime_conversation(client_ws, session_id) # Call on instance

        except WebSocketDisconnect:
            logger.info(f"Client disconnected from realtime_voice for session: {session_id}")
    
    except Exception as e:
        logger.error(f"Error in realtime_voice WebSocket endpoint: {e}")
    finally:
        # Clean up OpenAI connection if it exists
        if openai_ws:
            try:
                await openai_ws.close()
                logger.info("Closed OpenAI WebSocket connection.")
            except Exception as e:
                logger.error(f"Error closing OpenAI connection: {e}")

# Helper function to forward messages between two websockets
async def forward_messages(ws_from: WebSocket | websockets.WebSocketClientProtocol,
                           ws_to: WebSocket | websockets.WebSocketClientProtocol,
                           direction: str,
                           log_session_id: str):
    """Reads messages from ws_from and forwards them to ws_to."""
    try:
        async for message in ws_from:
            # Determine message type and forward appropriately
            if isinstance(ws_to, WebSocket): # Sending to client (FastAPI WebSocket)
                if isinstance(message, str):
                    # logger.debug(f"Proxy WS {log_session_id}: OpenAI -> Client: {message[:150]}...")
                    await ws_to.send_text(message)
                elif isinstance(message, bytes):
                    # logger.debug(f"Proxy WS {log_session_id}: OpenAI -> Client: [bytes len={len(message)}]")
                    await ws_to.send_bytes(message) # Forward bytes if OpenAI sends them
                else:
                    logger.warning(f"Proxy WS {log_session_id}: Unknown message type from OpenAI: {type(message)}")
            elif isinstance(ws_to, websockets.WebSocketClientProtocol): # Sending to OpenAI (websockets lib)
                # FastAPI receive() might give text/bytes directly or a dict
                if isinstance(message, str):
                    # logger.debug(f"Proxy WS {log_session_id}: Client -> OpenAI (str): {message[:150]}...")
                    await ws_to.send(message)
                elif isinstance(message, bytes):
                    # logger.debug(f"Proxy WS {log_session_id}: Client -> OpenAI (bytes): [len={len(message)}]")
                    await ws_to.send(message)
                elif isinstance(message, dict): # Handle FastAPI dict format
                    # Handle messages received via websocket.receive() which returns a dict
                    msg_type = message.get("type")
                    if msg_type == "websocket.receive":
                         text_data = message.get("text")
                         bytes_data = message.get("bytes")
                         if text_data:
                             # logger.debug(f"Proxy WS {log_session_id}: Client -> OpenAI (dict.text): {text_data[:150]}...")
                             await ws_to.send(text_data)
                         elif bytes_data:
                            # logger.debug(f"Proxy WS {log_session_id}: Client -> OpenAI (dict.bytes): [len={len(bytes_data)}]")
                            await ws_to.send(bytes_data)
                         # else: ignore message without text/bytes
                    elif msg_type == "websocket.disconnect":
                         logger.info(f"Proxy WS {log_session_id}: Client sent disconnect message type.")
                         # Connection closing is handled by exception below
                    # else: ignore other types like websocket.connect
                else:
                    logger.warning(f"Proxy WS {log_session_id}: Unknown message type from Client: {type(message)}")

    except (WebSocketDisconnect, websockets.exceptions.ConnectionClosedOK, websockets.exceptions.ConnectionClosedError) as ws_closed:
        logger.info(f"Proxy WS {log_session_id}: WebSocket closed in {direction} direction. {type(ws_closed).__name__}")
    except Exception as e:
        # Log errors unless they are expected disconnect/runtime errors during close
        if not isinstance(e, RuntimeError) or "Cannot call" not in str(e):
             logger.error(f"Proxy WS {log_session_id}: Error in {direction} forwarding: {e}", exc_info=True)
    finally:
        logger.info(f"Proxy WS {log_session_id}: Forwarding task ({direction}) finished.")
        # Attempt to close the other socket gracefully to ensure the other task also exits
        ws_to_is_open = False
        if isinstance(ws_to, WebSocket):
            ws_to_is_open = ws_to.client_state == WebSocketState.CONNECTED
        elif isinstance(ws_to, websockets.WebSocketClientProtocol):
             ws_to_is_open = ws_to.open

        if ws_to_is_open:
            try:
                await ws_to.close(code=1001, reason="Other side disconnected")
            except Exception:
                 pass # Ignore errors during cleanup close

# --- Refactored WebSocket Proxy Endpoint --- 
@router.websocket("/ws/rt_proxy_connect/{session_id}") 
async def realtime_websocket_proxy(
    websocket: WebSocket,
    session_id: int,
):
    """
    Acts as a proxy between the client and the OpenAI Realtime API.
    Client connects, sends JWT for auth, then sends ephemeral token.
    """
    # <<< ADD VERY FIRST LOG LINE >>>
    logger.info(f"===> ROUTE HANDLER ENTERED for /ws/rt_proxy_connect/{session_id}") 
    log_session_id = str(session_id)
    logger.info(f"---> ENTERED NEW realtime_websocket_proxy for session {log_session_id} <--- Using new path.")
    openai_ws: Optional[websockets.WebSocketClientProtocol] = None
    client_sender_task = None
    openai_receiver_task = None
    connection_active = True
    ephemeral_token: Optional[str] = None
    current_user: Optional[models.User] = None # Initialize user as None

    # <<< ADDED: Local import to ensure availability >>>
    from ..ai_service import AIService, REALTIME_MODEL, TRANSCRIBE_MODEL

    # <<< ADD LOGGING BEFORE ACCEPT >>>
    logger.info(f"===> Attempting to accept WebSocket for session {log_session_id} at new path...")
    await websocket.accept()
    logger.info(f"Session {log_session_id}: Client WebSocket connection accepted. Waiting for JWT Auth...")

    # --- Task definitions (remain the same, but with added checks) --- 
    async def forward_to_openai(client_ws: WebSocket, openai_conn: websockets.WebSocketClientProtocol):
        nonlocal connection_active
        try:
            while connection_active:
                # Check connection state before receiving
                if client_ws.client_state != WebSocketState.CONNECTED:
                    logger.warning(f"ProxyWS {log_session_id}: Client WS no longer connected in forward_to_openai. Stopping.")
                    break
                
                message = await client_ws.receive_text()
                if not connection_active: break # Check after receiving, before processing/sending
                
                # Check connection state before sending
                if not openai_conn or openai_conn.state != WebSocketStateProtocol.OPEN:
                     logger.warning(f"ProxyWS {log_session_id}: OpenAI WS no longer open in forward_to_openai. Cannot forward. Stopping.")
                     break

                try:
                    msg_data = json.loads(message)
                    msg_type = msg_data.get("type", "unknown")

                    # Don't forward authentication messages to OpenAI
                    if msg_type in ["auth_jwt", "auth_openai"]:
                        logger.info(f"ProxyWS {log_session_id}: Client -> OpenAI: Skipping authentication message '{msg_type}'")
                        continue

                    # Prevent infinite loop: do NOT forward any response.* events to OpenAI
                    if msg_type.startswith("response."):
                        logger.error(f"ProxyWS {log_session_id}: BLOCKED forwarding '{msg_type}' from client to OpenAI to prevent loop.")
                        continue

                    if msg_type == "input_audio_buffer.append":
                        logger.debug(f"ProxyWS {log_session_id}: Client -> OpenAI: Forwarding '{msg_type}' (size: {len(msg_data.get('audio',''))})")
                    else:
                        logger.info(f"ProxyWS {log_session_id}: Client -> OpenAI: Forwarding '{msg_type}'")
                        logger.debug(f"ProxyWS {log_session_id}: Full C->O content: {message[:200]}...") # Log content for non-audio
                except json.JSONDecodeError:
                    logger.warning(f"ProxyWS {log_session_id}: Client -> OpenAI: Forwarding non-JSON: {message[:100]}...")
                except Exception as log_e:
                    logger.error(f"ProxyWS {log_session_id}: Error logging C->O message: {log_e}")
                
                await openai_conn.send(message)

        except WebSocketDisconnect:
            logger.info(f"ProxyWS {log_session_id}: Client disconnected (forward_to_openai). Triggering cleanup.")
        except (websockets.exceptions.ConnectionClosedOK, websockets.exceptions.ConnectionClosedError) as ws_closed_error:
            logger.warning(f"ProxyWS {log_session_id}: OpenAI connection closed while sending: {ws_closed_error}. Triggering cleanup.")
        except Exception as e:
            # Avoid logging expected disconnect errors if connection_active is already false
            if connection_active and not isinstance(e, (RuntimeError, asyncio.CancelledError)):
                 if "Cannot call 'receive' once a close message has been sent" not in str(e): # Ignore specific runtime error
                    logger.error(f"ProxyWS {log_session_id}: Error forwarding Client -> OpenAI: {e}", exc_info=True)
        finally:
            logger.info(f"--- ProxyWS {log_session_id}: forward_to_openai task finishing. ---")
            connection_active = False # Signal other task to stop
            
    async def forward_to_client(client_ws: WebSocket, openai_conn: websockets.WebSocketClientProtocol):
        nonlocal connection_active
        try:
            while connection_active:
                if not openai_conn or openai_conn.state != WebSocketStateProtocol.OPEN:
                    logger.warning(f"ProxyWS {log_session_id}: OpenAI WS no longer open in forward_to_client. Stopping.")
                    break
                
                message = await openai_conn.recv() # Receive from OpenAI
                logger.info(f"RAW MESSAGE FROM OPENAI (type: {type(message)}): {str(message)[:500]}") # <<< RAW LOGGING ADDED

                if not connection_active: break
                
                if client_ws.client_state != WebSocketState.CONNECTED:
                    logger.warning(f"ProxyWS {log_session_id}: Client WS no longer connected in forward_to_client. Cannot forward. Stopping.")
                    break

                processed_for_logging = False
                try:
                    if isinstance(message, str):
                        try:
                            msg_data = json.loads(message)
                            msg_type = msg_data.get("type", "unknown_json_type_field_missing")
                            logger.info(f"ProxyWS {log_session_id}: Parsed OpenAI message. Type: '{msg_type}'") # <<< LOG PARSED TYPE

                            if msg_type == "response.audio.delta":
                                import base64
                                delta_val = msg_data.get('delta')
                                # logger.info(f"ProxyWS {log_session_id}: Type of 'delta' before correction: {type(delta_val)}")
                                if isinstance(delta_val, list):
                                    try:
                                        delta_bytes = bytes(delta_val)
                                        delta_b64 = base64.b64encode(delta_bytes).decode('ascii')
                                        msg_data['delta'] = delta_b64
                                        # logger.warning(f"ProxyWS {log_session_id}: Converted 'delta' from list to base64 string (len={len(delta_b64)})")
                                    except Exception as e:
                                        logger.error(f"ProxyWS {log_session_id}: Failed to convert 'delta' list to base64: {e}")
                                # elif not isinstance(delta_val, str):
                                    # logger.warning(f"ProxyWS {log_session_id}: Unexpected type for 'delta': {type(delta_val)}. Forwarding as-is.")
                                # else:
                                    # logger.info(f"ProxyWS {log_session_id}: 'delta' is already a string (len={len(delta_val)})" )
                                
                                await client_ws.send_text(json.dumps(msg_data))
                                processed_for_logging = True
                                continue 
                            elif msg_type == "error":
                                logger.error(f"ProxyWS {log_session_id}: OpenAI -> Client: Received ERROR from OpenAI: {json.dumps(msg_data)}")
                                # Fall through to send
                            # else: # For other known JSON types, just log and fall through to send
                                # logger.info(f"ProxyWS {log_session_id}: OpenAI -> Client: Forwarding JSON '{msg_type}'")

                        except json.JSONDecodeError:
                            logger.warning(f"ProxyWS {log_session_id}: OpenAI -> Client: Message from OpenAI was string but NOT VALID JSON. Will forward as raw string. Content: {message[:200]}...")
                            # Fall through to send raw string message
                    # else: # If message is not string (e.g. bytes)
                        # logger.warning(f"ProxyWS {log_session_id}: OpenAI -> Client: Received non-text message (Type: {type(message)}), forwarding raw.")
                    processed_for_logging = True # Mark as processed for logging path if it made it here

                except Exception as log_parse_err:
                    logger.error(f"ProxyWS {log_session_id}: Error during OpenAI message parsing/logging: {log_parse_err}", exc_info=True)
                    # Still try to forward the original message
                
                # Actual sending to client
                if isinstance(message, str):
                    # if not processed_for_logging: # Log here if not logged in detail above
                        # logger.info(f"ProxyWS {log_session_id}: OpenAI -> Client (str direct send): {message[:200]}...")
                    await client_ws.send_text(message)
                elif isinstance(message, bytes):
                    # if not processed_for_logging:
                        # logger.info(f"ProxyWS {log_session_id}: OpenAI -> Client (bytes direct send): len={len(message)}")
                    await client_ws.send_bytes(message)
                else:
                    logger.error(f"ProxyWS {log_session_id}: OpenAI -> Client: UNKNOWN MESSAGE TYPE from OpenAI not sent: {type(message)}")

        except WebSocketDisconnect:
             logger.info(f"ProxyWS {log_session_id}: Client disconnected during receive from OpenAI. Triggering cleanup.") # Should be caught by other task
        except (websockets.exceptions.ConnectionClosedOK, websockets.exceptions.ConnectionClosedError) as ws_closed_error:
            logger.warning(f"ProxyWS {log_session_id}: OpenAI connection closed while receiving: {ws_closed_error}. Triggering cleanup.")
        except Exception as e:
            # Avoid logging expected disconnect errors if connection_active is already false
             if connection_active and not isinstance(e, (RuntimeError, asyncio.CancelledError)):
                 if "Cannot call 'receive' once a close message has been sent" not in str(e): # Ignore specific runtime error
                     logger.error(f"ProxyWS {log_session_id}: Error forwarding OpenAI -> Client: {e}", exc_info=True)
        finally:
            logger.info(f"--- ProxyWS {log_session_id}: forward_to_client task finishing. ---")
            connection_active = False # Signal other task to stop

    # --- Main Connection Logic --- 
    db: Optional[Session] = None # Initialize db session variable
    try:
        # 1. Wait for the client to send its JWT for authentication
        try:
            # Use a context manager for database session
            db_gen = get_db()
            db = next(db_gen) 
            
            jwt_auth_msg_str = await asyncio.wait_for(websocket.receive_text(), timeout=10.0) # 10 second timeout
            jwt_auth_data = json.loads(jwt_auth_msg_str)

            if jwt_auth_data.get("type") != "auth_jwt" or not jwt_auth_data.get("token"):
                logger.error(f"Session {log_session_id}: Invalid or missing JWT auth message. Received: {jwt_auth_msg_str[:100]}...")
                await websocket.close(code=4001, reason="Invalid JWT auth message") # Use custom code
                return

            jwt_token = jwt_auth_data.get("token")
            logger.info(f"Session {log_session_id}: Received JWT auth message.")
            
            # Manually authenticate user
            # 1. Verify token and get payload
            payload = auth.verify_token(token=jwt_token)
            email: str = payload.get("sub")
            if email is None:
                 logger.error(f"Session {log_session_id}: JWT token missing email (sub claim).")
                 await websocket.close(code=4001, reason="Invalid JWT payload")
                 return
            
            # 2. Get user from database
            user = db.query(models.User).filter(models.User.email == email).first()

            # 3. Check if user exists and is active
            if not user:
                 logger.error(f"Session {log_session_id}: User not found for email {email}.")
                 await websocket.close(code=4001, reason="User not found")
                 return
            if not user.is_active:
                 logger.error(f"Session {log_session_id}: User {email} is inactive.")
                 await websocket.close(code=4001, reason="Inactive user")
                 return
                 
            current_user = user # Assign the validated user
            logger.info(f"Session {log_session_id}: JWT authentication successful for user: {current_user.email}")

        except HTTPException as auth_exc: # Catch specific auth errors from verify_token
            logger.error(f"Session {log_session_id}: Auth HTTPException during JWT validation: {auth_exc.detail}")
            await websocket.close(code=4001, reason=f"JWT Auth Failed: {auth_exc.detail}")
            return
        except Exception as db_auth_error:
            logger.error(f"Session {log_session_id}: Error during JWT Auth/DB operation: {db_auth_error}", exc_info=True)
            await websocket.close(code=4003, reason="Auth process error") # Custom code for auth process failure
            return
        finally:
            # Ensure the database session is closed properly
             if db and db.is_active:
                 db.close()
                 logger.debug(f"Session {log_session_id}: Database session closed after JWT auth.")


        # 2. Wait for the client to send its ephemeral OpenAI token
        logger.info(f"Session {log_session_id}: Waiting for client to send ephemeral OpenAI token...")
        openai_auth_msg = await asyncio.wait_for(websocket.receive(), timeout=10.0) # 10 second timeout
        logger.info(f"Session {log_session_id}: Raw OpenAI auth message received: {openai_auth_msg}")
        if openai_auth_msg.get("type") == "websocket.receive" and openai_auth_msg.get("text"):
            openai_auth_msg_str = openai_auth_msg["text"]
            try:
                openai_auth_data = json.loads(openai_auth_msg_str)
            except Exception as e:
                logger.error(f"Session {log_session_id}: Failed to parse OpenAI auth message as JSON: {e}")
                await websocket.close(code=4002, reason="Invalid JSON in OpenAI auth message")
                return
        elif openai_auth_msg.get("type") == "websocket.receive" and openai_auth_msg.get("bytes"):
            logger.error(f"Session {log_session_id}: Received OpenAI auth message as bytes, expected text/JSON. Closing.")
            await websocket.close(code=4002, reason="OpenAI auth message must be text/JSON, not bytes")
            return
        else:
            logger.error(f"Session {log_session_id}: Unexpected OpenAI auth message format: {openai_auth_msg}")
            await websocket.close(code=4002, reason="Unexpected OpenAI auth message format")
            return

        if openai_auth_data.get("type") != "auth_openai" or not openai_auth_data.get("token"): 
            logger.error(f"Session {log_session_id}: Invalid or missing OpenAI auth message. Received: {openai_auth_msg_str[:100]}...")
            await websocket.close(code=4002, reason="Invalid OpenAI auth message") # Use custom code
            return
        
        ephemeral_token = openai_auth_data.get("token")
        if not ephemeral_token.startswith("ek_"): # Basic check for ephemeral key format
             logger.error(f"Session {log_session_id}: Received token doesn't look like an ephemeral key: {ephemeral_token[:10]}...")
             await websocket.close(code=4002, reason="Invalid OpenAI token format")
             return
        logger.info(f"Session {log_session_id}: Received ephemeral token from client.") 

        # <<< ADDED: Fetch context BEFORE connecting to OpenAI >>>
        game_session = None
        scenario = None
        client_persona = {}
        conversation_history = []
        db_context = None # Use a separate variable for db context
        try:
            db_context_gen = get_db()
            db_context = next(db_context_gen)
            game_session = db_context.query(models.GameSession).filter(
                models.GameSession.id == session_id,
                models.GameSession.user_id == current_user.id # Use authenticated user
            ).first()
            
            if game_session:
                scenario = db_context.query(models.Scenario).filter(models.Scenario.id == game_session.scenario_id).first()
                if scenario:
                    # Fetch client persona
                    personas = db_context.query(models.ClientPersona).filter(
                        models.ClientPersona.scenario_id == scenario.id
                    ).all()
                    if personas:
                        p = personas[0]
                        client_persona = {
                            "name": p.name, "role": p.role, "company": p.company,
                            "personality_traits": p.personality_traits,
                            "pain_points": p.pain_points,
                            "decision_criteria": p.decision_criteria
                        }
                    
                    # Fetch conversation history
                    interactions = db_context.query(models.Interaction).filter(
                        models.Interaction.game_session_id == session_id
                    ).order_by(models.Interaction.sequence).limit(10).all() # Limit history
                    
                    for interaction in interactions:
                        if interaction.player_input:
                            conversation_history.append({"role": "user", "content": interaction.player_input})
                        if interaction.ai_response:
                            conversation_history.append({"role": "assistant", "content": interaction.ai_response})
            else:
                 logger.error(f"Session {log_session_id}: Game session not found or invalid for user {current_user.email}.")
                 await websocket.close(code=4004, reason="Game session not found or invalid")
                 return
                 
        except Exception as context_err:
            logger.error(f"Session {log_session_id}: Error fetching context: {context_err}", exc_info=True)
            await websocket.close(code=1011, reason="Error fetching context")
            return
        finally:
            if db_context and db_context.is_active:
                db_context.close()
                logger.debug(f"Session {log_session_id}: Database session closed after context fetch.")
        # <<< END: Context Fetching >>>

        # 3. Connect to OpenAI using the received ephemeral token
        logger.info(f"Session {log_session_id}: Connecting to OpenAI Realtime API with ephemeral token...")
        openai_ws = await AIService.connect_to_openai_realtime(ephemeral_token)

        if not openai_ws:
            logger.error(f"Session {log_session_id}: Failed to connect to OpenAI.")
            # Send error to client *before* closing
            await websocket.send_text(json.dumps({"type": "error", "status": "openai_connection_failed", "message": "Backend failed to connect to OpenAI"}))
            await websocket.close(code=1011, reason="Backend failed to connect to OpenAI")
            return

        logger.info(f"Session {log_session_id}: Successfully connected to OpenAI.")
        # Send confirmation to client that proxy is ready
        await websocket.send_text(json.dumps({"type": "proxy_ready", "status": "success"}))

        # <<< MOVED & MODIFIED >>> Send initial config WITH context AFTER connecting to OpenAI
        try:
            from ..ai_service import AIService # Local import if needed
            
            context_for_formatter = {
                "clientPersona": client_persona, # Already fetched
                "pacerStage": game_session.current_stage if game_session else 'P', # Already fetched
                "scenario": scenario.__dict__ if scenario else {}, 
            }
            
            # Call the static method correctly using the class name
            # IMPORTANT: Use openai_ws (connection to OpenAI), not websocket (connection to client)
            # IMPORTANT: This now needs to be an async call if sendInitialConfiguration is async
            # Assuming sendInitialConfiguration is NOT async for now based on previous context
            
            # <<< ADDED: Local import for prompt builder >>>
            from ..prompts import build_client_system_prompt
            
            # Construct the session update payload manually for raw websocket
            initial_session_payload = {
                "model": REALTIME_MODEL, # Use env var from ai_service
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "modalities": ["audio", "text"],
                "input_audio_transcription": {
                  "model": TRANSCRIBE_MODEL, # Use env var from ai_service
                  "language": "en",
                  # REMOVED "prompt": f"..."
                },
                "voice": "alloy",
                "turn_detection": {
                  "type": "semantic_vad",
                  "eagerness": "low",
                  "create_response": True,
                  "interrupt_response": True
                },
                # <<< CORRECTED >>> Use the imported prompt builder
                "instructions": build_client_system_prompt(
                    client_persona, # Pass the fetched client_persona dict
                    game_session.current_stage if game_session else 'P'
                ),
                # Add conversation history if needed by the model/prompt structure
                # "conversation_history": conversation_history # Example
            }
            
            await openai_ws.send(json.dumps({
                "type": "session.update",
                "session": initial_session_payload
            }))
            logger.info(f"ProxyWS {log_session_id}: Sent initial session.update to OpenAI.")
            
        except Exception as config_err:
            logger.error(f"Session {log_session_id}: Failed to send initial configuration to OpenAI: {config_err}", exc_info=True)
            # Close connections if initial config fails critically
            await websocket.close(code=1011, reason="Initial config failed")
            if openai_ws and openai_ws.open:
                 await openai_ws.close(code=1011)
            return 
        # <<< END >>>

        # 4. Create tasks to forward messages concurrently
        logger.info(f"ProxyWS {log_session_id}: Starting forwarding tasks.")
        client_sender_task = asyncio.create_task(forward_to_openai(websocket, openai_ws))
        openai_receiver_task = asyncio.create_task(forward_to_client(websocket, openai_ws))

        # 5. Wait for either task to complete (indicates disconnect or error)
        done, pending = await asyncio.wait(
            [client_sender_task, openai_receiver_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        logger.info(f"ProxyWS {log_session_id}: One forwarding task completed. Initiating cleanup.")

    except asyncio.TimeoutError as e:
        # Distinguish which timeout occurred based on state
        if not current_user: # Check if user was ever authenticated
             logger.error(f"Session {log_session_id}: Timed out waiting for client JWT auth message.")
             if websocket.client_state == WebSocketState.CONNECTED: # Check state before closing
                await websocket.close(code=4001, reason="JWT Auth timeout")
        elif not ephemeral_token:
             logger.error(f"Session {log_session_id}: Timed out waiting for client OpenAI auth message.")
             if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.close(code=4002, reason="OpenAI Auth timeout")
        else:
            logger.error(f"Session {log_session_id}: Unspecified timeout error during operation: {e}")
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.close(code=1008, reason="Timeout")
    except WebSocketDisconnect as e:
        # Log disconnect reason if available
        close_reason = f"Code: {e.code}, Reason: {e.reason}" if hasattr(e, 'code') else "Unknown reason"
        logger.info(f"ProxyWS {log_session_id}: Client disconnected unexpectedly ({close_reason}).")
        connection_active = False # Ensure tasks stop
    except json.JSONDecodeError as e:
        # Distinguish which message failed parsing based on state
        close_code = 1003 # Default: unsupported data
        reason = "Invalid JSON format"
        if not current_user:
             logger.error(f"Session {log_session_id}: Failed to parse client JWT auth message: {e}")
             close_code=4001; reason="Invalid JSON in JWT auth message"
        elif not ephemeral_token:
            logger.error(f"Session {log_session_id}: Failed to parse client OpenAI auth message: {e}")
            close_code=4002; reason="Invalid JSON in OpenAI auth message"
        else:
            logger.error(f"Session {log_session_id}: Failed to parse other client message: {e}")
        
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close(code=close_code, reason=reason)

    except Exception as e:
        logger.error(f"ProxyWS {log_session_id}: Unhandled Error in main handler: {e}", exc_info=True)
        try:
            # Send error before closing if possible and connection still open
             if websocket.client_state == WebSocketState.CONNECTED:
                 error_msg = f"Internal Server Error: {str(e)[:50]}"
                 await websocket.send_text(json.dumps({"type": "error", "status": "internal_server_error", "message": error_msg}))
                 await websocket.close(code=1011, reason=error_msg)
        except Exception as close_err: 
            logger.error(f"ProxyWS {log_session_id}: Error sending error/closing client WS after main handler exception: {close_err}")

    finally:
        logger.info(f"--- ProxyWS {log_session_id}: Cleaning up proxy connection... ---")
        connection_active = False # Signal tasks to stop

        # Cancel pending tasks (ensure graceful exit)
        tasks_to_cancel = [t for t in [client_sender_task, openai_receiver_task] if t and not t.done()]
        if tasks_to_cancel:
             logger.info(f"ProxyWS {log_session_id}: Cancelling {len(tasks_to_cancel)} pending forwarding task(s)...")
             for task in tasks_to_cancel:
                task.cancel()
             try:
                 # Wait for cancellations, suppress CancelledError
                 await asyncio.gather(*tasks_to_cancel, return_exceptions=True) 
             except asyncio.CancelledError:
                 # This is expected when tasks are cancelled
                 logger.info(f"ProxyWS {log_session_id}: Forwarding tasks successfully cancelled.")
             except Exception as gather_e:
                 # Log other errors during gather (like exceptions inside the tasks)
                 logger.error(f"ProxyWS {log_session_id}: Error occurred during task cancellation/cleanup: {gather_e}")
             logger.info(f"ProxyWS {log_session_id}: Pending tasks processing complete.")

        # Close OpenAI connection
        if openai_ws:
            # Use websockets library's state check
            try: # Add try-except around state check as well
                is_openai_ws_open = openai_ws.state == WebSocketStateProtocol.OPEN 
                if is_openai_ws_open:
                    logger.info(f"ProxyWS {log_session_id}: Closing OpenAI WebSocket connection (State: {openai_ws.state})...")
                    try:
                        await openai_ws.close(code=1000)
                    except Exception as e:
                        logger.error(f"ProxyWS {log_session_id}: Error closing OpenAI WebSocket: {e}")
                else:
                    logger.info(f"ProxyWS {log_session_id}: OpenAI WebSocket already closed (State: {openai_ws.state}).")
            except Exception as state_check_err:
                 logger.error(f"ProxyWS {log_session_id}: Error checking OpenAI WS state: {state_check_err}")

        # Close Client connection if still connected
        if websocket.client_state == WebSocketState.CONNECTED:
             logger.info(f"ProxyWS {log_session_id}: Ensuring Client WebSocket connection is closed...")
             try:
                 await websocket.close(code=1000)
             except Exception as e:
                 logger.error(f"ProxyWS {log_session_id}: Error closing Client WebSocket during cleanup: {e}")
        elif websocket.client_state != WebSocketState.DISCONNECTED:
             logger.warning(f"ProxyWS {log_session_id}: Client WebSocket in unexpected state during cleanup: {websocket.client_state}")


        logger.info(f"--- ProxyWS {log_session_id}: Proxy cleanup complete. ---")

# Endpoint to get WebSocket URL for audio streaming (legacy or specific use)
@router.get("/sessions/{session_id}/audio-stream-url")
async def get_audio_stream_url(
    session_id: int,
    token: str = Depends(auth.get_token_from_header)
):
    # Construct WebSocket URL
    # Use environment variables or config for host/port if needed
    ws_url = f"ws://localhost:8001/api/game/sessions/{session_id}/audio-stream?token={token}"
    return {"url": ws_url}

# Endpoint to get WebSocket URL for real-time voice
@router.get("/sessions/{session_id}/realtime-voice-url")
async def get_realtime_voice_url(
    session_id: int,
    token: str = Depends(auth.get_token_from_header)
):
    # Determine protocol and host based on environment
    ws_protocol = "ws"
    ws_host = "localhost:8001"
    ws_path_prefix = "/api"

    # Check if running in production (e.g., via environment variable)
    if os.getenv("ENV", "development") == "production":
        ws_protocol = os.getenv("WS_PROTOCOL", "wss")
        ws_host = os.getenv("WS_HOST", "your-production-domain.com")
        ws_path_prefix = os.getenv("WS_PATH_PREFIX", "/pacer-api")

    # Return the PROXY endpoint, not the direct handler
    ws_url = f"{ws_protocol}://{ws_host}{ws_path_prefix}/game/ws/rt_proxy_connect/{session_id}"
    return {"url": ws_url}

# Add a simple health check endpoint
@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Database connection error: {e}")

# Add seed endpoint (for development)
@router.get("/seed")
def seed_database(db: Session = Depends(get_db)):
    # Check if seeding is allowed (e.g., based on environment variable)
    if os.getenv("ALLOW_SEEDING", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Seeding is not allowed in this environment.")
    
    try:
        seed.seed_all(db)
        return {"message": "Database seeded successfully"}
    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database seeding failed: {e}")

@router.post("/sessions/{session_id}/realtime-token", response_model=dict)
async def get_realtime_session_token(
    session_id: int,
    # Remove request_body as AIService.create_realtime_session doesn't use it yet
    db: AsyncSession = Depends(get_async_db), # Use async session
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Provides an ephemeral token for the client to connect directly 
    to the OpenAI Realtime API session managed by the backend.
    """
    # Optional: Validate session exists and belongs to user
    # game_session = await get_game_session_by_id(db, session_id)
    # if not game_session:
    #     raise HTTPException(status_code=404, detail="Session not found")
    # if game_session.user_id != current_user.id:
    #     raise HTTPException(status_code=403, detail="Not authorized to access this session")

    try:
        logger.info(f"Requesting ephemeral token for session {session_id}")
        # Call AIService.create_realtime_session without arguments
        token_value = await AIService.create_realtime_session()
        
        # Check if a valid token string was returned
        if not token_value or not isinstance(token_value, str):
             logger.error(f"Failed to get valid token string from AIService for session {session_id}. Received: {token_value}")
             raise HTTPException(status_code=500, detail="Failed to create realtime session token")

        logger.info(f"Successfully obtained ephemeral token for session {session_id}")
        # Return the token string in the expected format for the frontend
        return {"token": token_value}

    except Exception as e:
        logger.error(f"Error generating realtime token for session {session_id}: {e}", exc_info=True)
        # Log the full traceback for better debugging
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error creating token: {str(e)}")

# Add after the other session-related endpoints
@router.post("/sessions/{session_id}/audio-transcripts")
def save_audio_transcripts(
    session_id: int,
    transcript_data: Dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Save real-time voice audio transcripts to the database.
    These transcripts are generated during WebSocket communication
    but need to be persisted separately.
    """
    # First, ensure the session exists and belongs to the user
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=404, 
            detail=f"Game session with id {session_id} not found or does not belong to current user"
        )
    
    # Get transcripts from request data
    transcripts = transcript_data.get("transcripts", [])
    if not transcripts:
        return {"status": "success", "message": "No transcripts to save"}
    
    # Process each transcript item
    saved_items = []
    for item in transcripts:
        sender = item.get("sender")
        text = item.get("text")
        timestamp = item.get("timestamp", datetime.utcnow().isoformat())
        
        if not sender or not text:
            continue
            
        # Create a new AudioTranscript record
        transcript = models.AudioTranscript(
            session_id=session_id,
            sender=sender,
            text=text,
            timestamp=timestamp
        )
        
        db.add(transcript)
        saved_items.append({"id": "pending", "sender": sender, "text": text})
    
    # Commit changes
    db.commit()
    
    # Return IDs of saved transcripts
    return {
        "status": "success", 
        "message": f"Saved {len(saved_items)} transcript items",
        "items": saved_items
    }


@router.get("/sessions/{session_id}/audio-transcripts", response_model=List[Dict])
def get_audio_transcripts(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Retrieve all audio transcripts for a specific game session.
    """
    # Ensure the session exists and belongs to the user
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=404, 
            detail=f"Game session with id {session_id} not found or does not belong to current user"
        )
    
    # Query for all transcripts related to this session
    transcripts = db.query(models.AudioTranscript).filter(
        models.AudioTranscript.session_id == session_id
    ).order_by(models.AudioTranscript.timestamp).all()
    
    # Format response
    result = []
    for transcript in transcripts:
        result.append({
            "id": transcript.id,
            "sender": transcript.sender,
            "text": transcript.text,
            "timestamp": transcript.timestamp
        })
    
    return result

@router.get("/sessions/{session_id}/current-score")
def get_current_score(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Calculate the current score for an in-progress session using the same logic as complete_session."""
    # Get session
    session = db.query(models.GameSession).filter(
        models.GameSession.id == session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Calculate scores using the same logic as complete_session but without marking as complete
    
    # 1. Calculate the aggregate quality score (average of all per-turn scores)
    interactions = db.query(models.Interaction).filter(
        models.Interaction.game_session_id == session_id
    ).all()
    
    # Define score weights
    weights = {
        "methodology": 0.40,  # 40%
        "rapport": 0.25,      # 25%
        "progress": 0.20,     # 20%
        "outcome": 0.15       # 15%
    }
    
    # Get all interaction scores
    interaction_scores = []
    
    for interaction in interactions:
        evaluation = db.query(models.InteractionEvaluation).filter(
            models.InteractionEvaluation.interaction_id == interaction.id
        ).first()
        
        if evaluation:
            # Calculate weighted score for this interaction
            score = (
                weights["methodology"] * evaluation.methodology_score +
                weights["rapport"] * evaluation.rapport_score +
                weights["progress"] * evaluation.progress_score +
                weights["outcome"] * evaluation.outcome_score
            )
            interaction_scores.append(score)
    
    # Calculate aggregate quality (average of all scores)
    quality = sum(interaction_scores) / len(interaction_scores) if interaction_scores else 0
    
    # 2. Goal completion bonus
    # Check the outcome scores of the last few interactions to determine if goal was achieved
    goal_bonus = 0
    GOAL_INTERACTIONS_TO_CHECK = 3  # Check last 3 interactions
    
    recent_interactions = interactions[-GOAL_INTERACTIONS_TO_CHECK:] if len(interactions) >= GOAL_INTERACTIONS_TO_CHECK else interactions
    
    # Average outcome score from recent interactions
    recent_outcome_scores = []
    for interaction in recent_interactions:
        evaluation = db.query(models.InteractionEvaluation).filter(
            models.InteractionEvaluation.interaction_id == interaction.id
        ).first()
        if evaluation:
            recent_outcome_scores.append(evaluation.outcome_score)
    
    avg_outcome_score = sum(recent_outcome_scores) / len(recent_outcome_scores) if recent_outcome_scores else 0
    
    # Determine goal bonus based on outcome score
    if avg_outcome_score >= 80:
        goal_bonus = 15  # Goal fully achieved
    elif avg_outcome_score >= 50:
        goal_bonus = 8   # Goal partially achieved
    
    # 3. Time management bonus - MODIFIED to account for paused time
    current_time = datetime.utcnow()
    
    # Calculate actual active time excluding pauses
    active_seconds = 0
    
    if session.is_timed:
        # Check if the timer is currently running
        if session.timer_started_at:
            if session.timer_paused_at:
                # Timer is paused - use time from start to pause
                active_seconds = (session.timer_paused_at - session.start_time).total_seconds()
            else:
                # Timer is running - use current time
                active_seconds = (current_time - session.start_time).total_seconds()
                
                # Subtract any previous pause durations if they exist
                # This would require tracking total_pause_duration in the session model
                # For now, we can approximate by using the difference between 
                # time_limit_seconds and remaining_time_seconds
                if session.time_limit_seconds and session.remaining_time_seconds is not None:
                    time_used = session.time_limit_seconds - session.remaining_time_seconds
                    # Use the minimum to avoid negative values in edge cases
                    active_seconds = min(active_seconds, time_used)
    else:
        # Regular calculation for non-timed sessions
        active_seconds = (current_time - session.start_time).total_seconds()
    
    time_limit = session.time_limit_seconds
    
    # Check if time_limit is None and handle appropriately
    if time_limit is None:
        # If no time limit is set, use a default bonus factor (no bonus/penalty)
        time_bonus = 1.0
    elif active_seconds <= time_limit:
        # Under time limit - bonus up to 10%
        time_bonus = 1 + (time_limit - active_seconds) / time_limit * 0.10
    else:
        # Over time limit - penalty up to 10%
        time_bonus = 1 - (active_seconds - time_limit) / time_limit * 0.10
    
    # Clamp time bonus between 0.9 and 1.1
    time_bonus = min(max(time_bonus, 0.9), 1.1)
    
    # 4. Difficulty multiplier
    difficulty_factor = session.difficulty_factor or 1.0
    
    # 5. Calculate final score
    final_score = round(
        quality * time_bonus * difficulty_factor
    ) + goal_bonus
    
    # Clamp final score between 0 and 100
    final_score = min(max(final_score, 0), 100)
    
    # Calculate individual component scores
    methodology_score = weights["methodology"] * quality
    rapport_score = weights["rapport"] * quality
    progress_score = weights["progress"] * quality
    outcome_score = weights["outcome"] * quality
    
    # *** NEW CODE - Update the score table if it exists ***
    # If a score record already exists, update it
    score = db.query(models.Score).filter(models.Score.game_session_id == session_id).first()
    
    if score:
        # Update the existing score record with current values
        score.total_score = final_score
        score.methodology_score = methodology_score
        score.rapport_score = rapport_score
        score.progress_score = progress_score
        score.outcome_score = outcome_score
        score.detailed_breakdown = {
            "quality": quality,
            "goal_bonus": goal_bonus,
            "time_bonus": time_bonus,
            "difficulty_factor": difficulty_factor,
            "final_score": final_score,
            "active_seconds": active_seconds
        }
        db.commit()
        logger.info(f"Updated existing score record for session {session_id}")
    
    # Return scores
    return {
        "total_score": final_score,
        "methodology_score": methodology_score,
        "rapport_score": rapport_score,
        "progress_score": progress_score,
        "outcome_score": outcome_score,
        "detailed_breakdown": {
            "quality": quality,
            "goal_bonus": goal_bonus,
            "time_bonus": time_bonus,
            "difficulty_factor": difficulty_factor,
            "final_score": final_score,
            "active_seconds": active_seconds
        }
    }
