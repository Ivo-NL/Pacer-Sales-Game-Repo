from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, Float, DateTime, Table, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_manager = Column(Boolean, default=False)
    region = Column(String, default="Global")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    game_sessions = relationship("GameSession", back_populates="user")
    scores = relationship("Score", back_populates="user")
    progress = relationship("Progress", back_populates="user")
    detailed_progress = relationship("DetailedProgress", back_populates="user", uselist=False)
    badges = relationship("UserBadge", back_populates="user")
    teams_managed = relationship("Team", back_populates="manager")
    team_memberships = relationship("TeamMember", back_populates="user")
    difficulty_settings = relationship("DifficultySettings", back_populates="user", uselist=False)
    recordings = relationship("SessionRecording", foreign_keys="[SessionRecording.user_id]", back_populates="user")


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    difficulty = Column(Integer)  # 1: Beginner, 2: Intermediate, 3: Advanced
    pacer_stage = Column(String)  # P, A, C, E, R or combination
    product_type = Column(String)  # Issuing, Acceptance, A2A, etc.
    industry = Column(String)  # Banking, Retail, etc.
    region = Column(String, default="Global")  # For region-specific scenarios
    created_at = Column(DateTime, default=datetime.utcnow)
    is_multi_stakeholder = Column(Boolean, default=False)
    scenario_type = Column(String, default="standard")  # standard, multi_stakeholder, competitive
    
    # Relationships
    client_personas = relationship("ClientPersona", back_populates="scenario")
    stakeholders = relationship("Stakeholder", back_populates="scenario")
    game_sessions = relationship("GameSession", back_populates="scenario")
    competitor_info = relationship("CompetitorInfo", back_populates="scenario", uselist=False)
    events = relationship("GameEvent", back_populates="scenario")


class ClientPersona(Base):
    __tablename__ = "client_personas"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    name = Column(String)
    role = Column(String)
    company = Column(String)
    personality_traits = Column(Text)
    pain_points = Column(Text)
    decision_criteria = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scenario = relationship("Scenario", back_populates="client_personas")


class Stakeholder(Base):
    __tablename__ = "stakeholders"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    name = Column(String)
    role = Column(String)
    influence_level = Column(Integer)  # 1-5 scale of influence
    is_decision_maker = Column(Boolean, default=False)
    personality_traits = Column(Text)
    interests = Column(Text)
    concerns = Column(Text)
    communication_style = Column(String)  # analytical, amiable, expressive, driver
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scenario = relationship("Scenario", back_populates="stakeholders")
    responses = relationship("StakeholderResponse", back_populates="stakeholder")


class StakeholderResponse(Base):
    __tablename__ = "stakeholder_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    stakeholder_id = Column(Integer, ForeignKey("stakeholders.id"))
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"))
    sequence = Column(Integer)
    response_text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    stakeholder = relationship("Stakeholder", back_populates="responses")
    game_session = relationship("GameSession", back_populates="stakeholder_responses")


class CompetitorInfo(Base):
    __tablename__ = "competitor_info"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    competitor_name = Column(String)
    product_offering = Column(Text)
    strengths = Column(Text)
    weaknesses = Column(Text)
    pricing_strategy = Column(Text)
    key_differentiators = Column(Text)
    
    # Relationships
    scenario = relationship("Scenario", back_populates="competitor_info")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    total_score = Column(Float, default=0)
    current_stage = Column(String)  # Current PACER stage in this session
    conversation_context = Column(JSON, nullable=True)  # Store conversation context for AI memory
    challenge_id = Column(Integer, ForeignKey("team_challenges.id"), nullable=True)  # If part of a team challenge
    
    # Relationships
    user = relationship("User", back_populates="game_sessions")
    scenario = relationship("Scenario", back_populates="game_sessions")
    interactions = relationship("Interaction", back_populates="game_session")
    stakeholder_responses = relationship("StakeholderResponse", back_populates="game_session")
    score = relationship("Score", back_populates="game_session", uselist=False)
    challenge = relationship("TeamChallenge", back_populates="game_sessions")
    event_occurrences = relationship("EventOccurrence", back_populates="game_session")
    timed_challenges = relationship("TimedChallenge", back_populates="game_session")
    recordings = relationship("SessionRecording", back_populates="session")
    audio_transcripts = relationship("AudioTranscript", back_populates="session", cascade="all, delete-orphan")

    # New columns
    time_limit_seconds = Column(Integer, nullable=True)  # For timed sessions
    timer_started_at = Column(DateTime, nullable=True)
    timer_paused_at = Column(DateTime, nullable=True)
    remaining_time_seconds = Column(Integer, nullable=True)
    difficulty_factor = Column(Float, default=1.0)  # Dynamic difficulty adjustment
    is_timed = Column(Boolean, default=False)
    is_tournament_mode = Column(Boolean, default=False)  # Special competitions
    tournament_id = Column(Integer, nullable=True)
    can_be_recorded = Column(Boolean, default=False)  # Added in Phase 3.2


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"))
    sequence = Column(Integer)  # Order in the conversation
    player_input = Column(Text)
    ai_response = Column(Text)
    pacer_stage = Column(String)  # Current PACER stage of this interaction
    timestamp = Column(DateTime, default=datetime.utcnow)
    addressed_to = Column(String, nullable=True)  # For multi-stakeholder scenarios
    feedback_provided = Column(Boolean, default=False)
    modality = Column(String, default="text")  # "text" or "voice"
    
    # Relationships
    game_session = relationship("GameSession", back_populates="interactions")
    evaluation = relationship("InteractionEvaluation", back_populates="interaction", uselist=False)


class InteractionEvaluation(Base):
    __tablename__ = "interaction_evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    interaction_id = Column(Integer, ForeignKey("interactions.id"))
    methodology_score = Column(Float)
    rapport_score = Column(Float)
    progress_score = Column(Float)
    outcome_score = Column(Float)
    feedback = Column(Text)
    skills_demonstrated = Column(JSON)  # Store specific skills demonstrated in this interaction
    
    # New fields added to match AIService evaluation responses
    strength = Column(Text, nullable=True)
    improvement = Column(Text, nullable=True)
    methodology_feedback = Column(Text, nullable=True)
    rapport_feedback = Column(Text, nullable=True)
    progress_feedback = Column(Text, nullable=True)
    outcome_feedback = Column(Text, nullable=True)
    
    # Relationships
    interaction = relationship("Interaction", back_populates="evaluation")


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"))
    methodology_score = Column(Float, default=0)  # PACER methodology application
    rapport_score = Column(Float, default=0)      # Client rapport
    progress_score = Column(Float, default=0)     # Deal progression
    outcome_score = Column(Float, default=0)      # Business outcome
    total_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    detailed_breakdown = Column(JSON, nullable=True)  # Detailed scoring breakdown
    
    # Relationships
    user = relationship("User", back_populates="scores")
    game_session = relationship("GameSession", back_populates="score")


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    prospect_level = Column(Integer, default=1)
    assess_level = Column(Integer, default=1)
    challenge_level = Column(Integer, default=1)
    execute_level = Column(Integer, default=1)
    retain_level = Column(Integer, default=1)
    total_sessions_completed = Column(Integer, default=0)
    total_score = Column(Float, default=0)
    rank = Column(String, default="Rookie")
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="progress")


class DetailedProgress(Base):
    __tablename__ = "detailed_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Prospect sub-skills
    lead_qualification = Column(Integer, default=1)
    market_research = Column(Integer, default=1)
    outreach_effectiveness = Column(Integer, default=1)
    value_proposition = Column(Integer, default=1)
    
    # Assess sub-skills
    needs_analysis = Column(Integer, default=1)
    stakeholder_mapping = Column(Integer, default=1)
    qualification_framework = Column(Integer, default=1)
    pain_point_identification = Column(Integer, default=1)
    
    # Challenge sub-skills
    solution_presentation = Column(Integer, default=1)
    competitive_differentiation = Column(Integer, default=1)
    insight_delivery = Column(Integer, default=1)
    value_demonstration = Column(Integer, default=1)
    
    # Execute sub-skills
    negotiation = Column(Integer, default=1)
    objection_handling = Column(Integer, default=1)
    closing_techniques = Column(Integer, default=1)
    deal_structuring = Column(Integer, default=1)
    
    # Retain sub-skills
    account_management = Column(Integer, default=1)
    relationship_building = Column(Integer, default=1)
    upselling = Column(Integer, default=1)
    customer_success = Column(Integer, default=1)
    
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="detailed_progress")


class Badge(Base):
    __tablename__ = "badges"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(Text)
    category = Column(String)  # PACER stage or special achievement
    image_url = Column(String)
    criteria = Column(JSON)  # Requirements to earn this badge
    
    # Relationships
    user_badges = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    badge_id = Column(Integer, ForeignKey("badges.id"))
    earned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges")


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    manager_id = Column(Integer, ForeignKey("users.id"))
    region = Column(String)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    manager = relationship("User", back_populates="teams_managed")
    members = relationship("TeamMember", back_populates="team")
    challenges = relationship("TeamChallenge", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


class TeamChallenge(Base):
    __tablename__ = "team_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    title = Column(String)
    description = Column(Text)
    pacer_focus = Column(String)  # Which PACER stage to focus on
    target_score = Column(Integer)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="challenges")
    results = relationship("ChallengeResult", back_populates="challenge")
    game_sessions = relationship("GameSession", back_populates="challenge")


class ChallengeResult(Base):
    __tablename__ = "challenge_results"
    
    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("team_challenges.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Float, default=0)
    completed_sessions = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    challenge = relationship("TeamChallenge", back_populates="results")
    user = relationship("User")


class GameEvent(Base):
    __tablename__ = "game_events"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    event_type = Column(String)  # competitor_intervention, market_change, client_emergency, etc.
    description = Column(Text)
    trigger_condition = Column(String)  # time-based, score-based, random, specific_interaction
    probability = Column(Float, default=0.3)  # Probability of event triggering (0.0-1.0)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # JSON fields for event-specific data
    event_data = Column(JSON, nullable=True)  # Contains different data based on event_type
    difficulty_adjustment = Column(Float, default=0.0)  # How much this event affects difficulty (-1.0 to 1.0)
    
    # Relationships
    scenario = relationship("Scenario", back_populates="events")
    occurrences = relationship("EventOccurrence", back_populates="game_event")


class EventOccurrence(Base):
    __tablename__ = "event_occurrences"
    
    id = Column(Integer, primary_key=True, index=True)
    game_event_id = Column(Integer, ForeignKey("game_events.id"))
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"))
    occurred_at = Column(DateTime, default=datetime.utcnow)
    player_response = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    impact_score = Column(Float, default=0.0)  # How well the player handled the event (-1.0 to 1.0)
    
    # Relationships
    game_event = relationship("GameEvent", back_populates="occurrences")
    game_session = relationship("GameSession", back_populates="event_occurrences")


class TimedChallenge(Base):
    __tablename__ = "timed_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"))
    challenge_type = Column(String)  # response_time, decision_making, crisis_management, etc.
    description = Column(Text)
    time_limit_seconds = Column(Integer)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    player_response = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    
    # Relationships
    game_session = relationship("GameSession", back_populates="timed_challenges")


class SeasonalContent(Base):
    __tablename__ = "seasonal_content"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text)
    content_type = Column(String)  # scenario, event, challenge, reward
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    content_data = Column(JSON)  # Contains different data based on content_type
    created_at = Column(DateTime, default=datetime.utcnow)


class DifficultySettings(Base):
    __tablename__ = "difficulty_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    base_difficulty = Column(Float, default=1.0)  # Starting difficulty level
    adaptive_factor = Column(Float, default=0.1)  # How quickly difficulty adapts
    min_difficulty = Column(Float, default=0.5)
    max_difficulty = Column(Float, default=2.0)
    last_performance_score = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="difficulty_settings")


class SessionRecording(Base):
    __tablename__ = "session_recordings"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text, nullable=True)
    duration_seconds = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_shared = Column(Boolean, default=False)
    is_reviewed = Column(Boolean, default=False)
    review_requested = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_score = Column(Float, nullable=True)
    
    # Relationships
    session = relationship("GameSession", back_populates="recordings")
    user = relationship("User", foreign_keys="[SessionRecording.user_id]", back_populates="recordings")
    reviewer = relationship("User", foreign_keys="[SessionRecording.reviewed_by]")
    annotations = relationship("RecordingAnnotation", back_populates="recording")
    bookmarks = relationship("RecordingBookmark", back_populates="recording")
    shares = relationship("RecordingShare", back_populates="recording")
    exports = relationship("RecordingExport", back_populates="recording")


class RecordingAnnotation(Base):
    __tablename__ = "recording_annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("session_recordings.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp_seconds = Column(Integer)  # Position in the recording
    content = Column(Text)
    annotation_type = Column(String)  # positive, negative, suggestion
    pacer_stage = Column(String, nullable=True)  # P, A, C, E, R
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    recording = relationship("SessionRecording", back_populates="annotations")
    user = relationship("User")


class RecordingBookmark(Base):
    __tablename__ = "recording_bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("session_recordings.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp_seconds = Column(Integer)  # Position in the recording
    label = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    recording = relationship("SessionRecording", back_populates="bookmarks")
    user = relationship("User")


class RecordingShare(Base):
    __tablename__ = "recording_shares"
    
    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("session_recordings.id"))
    user_id = Column(Integer, ForeignKey("users.id"))  # User who has access
    permission_level = Column(String)  # view, comment, edit
    shared_by = Column(Integer, ForeignKey("users.id"))  # User who shared
    shared_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    recording = relationship("SessionRecording", back_populates="shares")
    user = relationship("User", foreign_keys="[RecordingShare.user_id]")
    sharer = relationship("User", foreign_keys="[RecordingShare.shared_by]")


class RecordingExport(Base):
    __tablename__ = "recording_exports"
    
    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("session_recordings.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    export_format = Column(String)  # pdf, video
    status = Column(String)  # pending, processing, completed, failed
    exported_at = Column(DateTime, nullable=True)
    download_url = Column(String, nullable=True)
    
    # Relationships
    recording = relationship("SessionRecording", back_populates="exports")
    user = relationship("User")


class AudioTranscript(Base):
    """
    Stores audio transcripts from real-time voice conversations.
    These are generated during WebSocket sessions and need
    to be persisted separately from regular interactions.
    """
    __tablename__ = "audio_transcripts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # 'user' or 'client'
    text = Column(Text, nullable=False)
    timestamp = Column(String, nullable=False)  # ISO format timestamp
    
    # Relationship to game session
    session = relationship("GameSession", back_populates="audio_transcripts")


# Add relationships to existing tables
Scenario.events = relationship("GameEvent", back_populates="scenario")
GameSession.event_occurrences = relationship("EventOccurrence", back_populates="game_session")
GameSession.timed_challenges = relationship("TimedChallenge", back_populates="game_session")
GameSession.recordings = relationship("SessionRecording", back_populates="session")
User.difficulty_settings = relationship("DifficultySettings", back_populates="user", uselist=False) 