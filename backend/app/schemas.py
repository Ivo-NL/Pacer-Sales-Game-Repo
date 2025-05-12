from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import json

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    region: Optional[str] = "Global"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_manager: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True

# Stakeholder schemas
class StakeholderBase(BaseModel):
    name: str
    role: str
    influence_level: int = Field(ge=1, le=5)
    is_decision_maker: bool = False
    personality_traits: str
    interests: str
    concerns: str
    communication_style: str = Field(description="analytical, amiable, expressive, driver")

class StakeholderCreate(StakeholderBase):
    scenario_id: int

class StakeholderResponse(StakeholderBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Competitor Info schemas
class CompetitorInfoBase(BaseModel):
    competitor_name: str
    product_offering: str
    strengths: str
    weaknesses: str
    pricing_strategy: str
    key_differentiators: str

class CompetitorInfoCreate(CompetitorInfoBase):
    scenario_id: int

class CompetitorInfoResponse(CompetitorInfoBase):
    id: int

    class Config:
        orm_mode = True

# Client Persona schemas
class ClientPersonaBase(BaseModel):
    name: str
    role: str
    company: str
    personality_traits: str
    pain_points: str
    decision_criteria: str

class ClientPersonaCreate(ClientPersonaBase):
    scenario_id: int

class ClientPersonaResponse(ClientPersonaBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Scenario schemas
class ScenarioBase(BaseModel):
    title: str
    description: str
    difficulty: int = Field(ge=1, le=3)
    pacer_stage: str
    product_type: str
    industry: str
    region: Optional[str] = "Global"
    is_multi_stakeholder: Optional[bool] = False
    scenario_type: Optional[str] = "standard"

class ScenarioCreate(ScenarioBase):
    pass

class ScenarioResponse(ScenarioBase):
    id: int
    created_at: datetime
    client_personas: List[ClientPersonaResponse] = []
    stakeholders: List[StakeholderResponse] = []
    competitor_info: Optional[CompetitorInfoResponse] = None

    class Config:
        orm_mode = True

# Game session schemas
class GameSessionBase(BaseModel):
    scenario_id: int
    challenge_id: Optional[int] = None

class GameSessionCreate(GameSessionBase):
    pass

class GameSessionUpdate(BaseModel):
    is_completed: Optional[bool] = None
    total_score: Optional[float] = None
    current_stage: Optional[str] = None
    conversation_context: Optional[Dict[str, Any]] = None

class StakeholderResponseBase(BaseModel):
    stakeholder_id: int
    response_text: str

class StakeholderResponseCreate(StakeholderResponseBase):
    game_session_id: int
    sequence: int

class StakeholderResponseInDB(StakeholderResponseBase):
    id: int
    game_session_id: int
    sequence: int
    timestamp: datetime

    class Config:
        orm_mode = True

class InteractionBase(BaseModel):
    player_input: Optional[str] = None
    pacer_stage: str
    addressed_to: Optional[str] = None

class InteractionCreate(InteractionBase):
    game_session_id: int
    sequence: int

class InteractionEvaluationBase(BaseModel):
    methodology_score: float = Field(ge=0, le=100)
    rapport_score: float = Field(ge=0, le=100)
    progress_score: float = Field(ge=0, le=100)
    outcome_score: float = Field(ge=0, le=100)
    feedback: str
    skills_demonstrated: Optional[Dict[str, int]] = None
    
    # New fields added to match AIService evaluation responses
    strength: Optional[str] = None
    improvement: Optional[str] = None
    methodology_feedback: Optional[str] = None
    rapport_feedback: Optional[str] = None
    progress_feedback: Optional[str] = None
    outcome_feedback: Optional[str] = None

class InteractionEvaluationCreate(InteractionEvaluationBase):
    interaction_id: int

class InteractionEvaluationResponse(InteractionEvaluationBase):
    id: int

    class Config:
        orm_mode = True

class InteractionResponse(InteractionBase):
    id: int
    ai_response: Optional[str] = None
    timestamp: datetime
    feedback_provided: bool
    evaluation: Optional[InteractionEvaluationResponse] = None

    class Config:
        orm_mode = True

class GameSessionResponse(BaseModel):
    id: int
    user_id: int
    scenario_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    is_completed: bool = False
    total_score: float = 0
    current_stage: Optional[str] = None
    challenge_id: Optional[int] = None
    is_timed: bool = False
    time_limit_seconds: Optional[int] = None
    timer_started_at: Optional[datetime] = None
    timer_paused_at: Optional[datetime] = None
    remaining_time_seconds: Optional[int] = None
    difficulty_factor: float = 1.0
    is_tournament_mode: bool = False
    tournament_id: Optional[int] = None
    interactions: Optional[List["InteractionResponse"]] = []
    scenario: Optional[ScenarioResponse] = None
    
    # Added metadata fields for consistent frontend display
    difficulty: Optional[int] = None
    pacer_focus: Optional[List[str]] = None
    scenario_type: Optional[str] = None
    duration: Optional[int] = None  # Duration in seconds
    
    class Config:
        orm_mode = True

# Score schemas
class ScoreBase(BaseModel):
    methodology_score: float = Field(ge=0, le=100)
    rapport_score: float = Field(ge=0, le=100)
    progress_score: float = Field(ge=0, le=100)
    outcome_score: float = Field(ge=0, le=100)
    total_score: float = Field(ge=0, le=100)
    detailed_breakdown: Optional[Dict[str, Any]] = None

class ScoreCreate(ScoreBase):
    game_session_id: int
    user_id: int

class ScoreResponse(ScoreBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Progress schemas
class ProgressBase(BaseModel):
    prospect_level: int = Field(ge=1, le=10)
    assess_level: int = Field(ge=1, le=10)
    challenge_level: int = Field(ge=1, le=10)
    execute_level: int = Field(ge=1, le=10)
    retain_level: int = Field(ge=1, le=10)
    total_sessions_completed: int
    total_score: float
    rank: str

class ProgressResponse(ProgressBase):
    id: int
    user_id: int
    updated_at: datetime

    class Config:
        orm_mode = True

# Detailed Progress schemas
class DetailedProgressBase(BaseModel):
    # Prospect sub-skills
    lead_qualification: int = Field(ge=1, le=10, default=1)
    market_research: int = Field(ge=1, le=10, default=1)
    outreach_effectiveness: int = Field(ge=1, le=10, default=1)
    value_proposition: int = Field(ge=1, le=10, default=1)
    
    # Assess sub-skills
    needs_analysis: int = Field(ge=1, le=10, default=1)
    stakeholder_mapping: int = Field(ge=1, le=10, default=1)
    qualification_framework: int = Field(ge=1, le=10, default=1)
    pain_point_identification: int = Field(ge=1, le=10, default=1)
    
    # Challenge sub-skills
    solution_presentation: int = Field(ge=1, le=10, default=1)
    competitive_differentiation: int = Field(ge=1, le=10, default=1)
    insight_delivery: int = Field(ge=1, le=10, default=1)
    value_demonstration: int = Field(ge=1, le=10, default=1)
    
    # Execute sub-skills
    negotiation: int = Field(ge=1, le=10, default=1)
    objection_handling: int = Field(ge=1, le=10, default=1)
    closing_techniques: int = Field(ge=1, le=10, default=1)
    deal_structuring: int = Field(ge=1, le=10, default=1)
    
    # Retain sub-skills
    account_management: int = Field(ge=1, le=10, default=1)
    relationship_building: int = Field(ge=1, le=10, default=1)
    upselling: int = Field(ge=1, le=10, default=1)
    customer_success: int = Field(ge=1, le=10, default=1)

class DetailedProgressCreate(DetailedProgressBase):
    user_id: int

class DetailedProgressResponse(DetailedProgressBase):
    id: int
    user_id: int
    updated_at: datetime

    class Config:
        orm_mode = True

# Badge schemas
class BadgeBase(BaseModel):
    name: str
    description: str
    category: str
    image_url: str
    criteria: Dict[str, Any]

class BadgeCreate(BadgeBase):
    pass

class BadgeResponse(BadgeBase):
    id: int

    class Config:
        orm_mode = True

class UserBadgeBase(BaseModel):
    user_id: int
    badge_id: int

class UserBadgeCreate(UserBadgeBase):
    pass

class UserBadgeResponse(UserBadgeBase):
    id: int
    earned_at: datetime
    badge: BadgeResponse

    class Config:
        orm_mode = True

# Team schemas
class TeamBase(BaseModel):
    name: str
    region: str
    description: Optional[str] = None

class TeamCreate(TeamBase):
    manager_id: int

class TeamResponse(TeamBase):
    id: int
    manager_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class TeamMemberBase(BaseModel):
    team_id: int
    user_id: int

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMemberResponse(TeamMemberBase):
    id: int
    joined_at: datetime

    class Config:
        orm_mode = True

class TeamWithMembersResponse(TeamResponse):
    members: List[TeamMemberResponse] = []

    class Config:
        orm_mode = True

# Team Challenge schemas
class TeamChallengeBase(BaseModel):
    title: str
    description: str
    pacer_focus: str
    target_score: int
    start_date: datetime
    end_date: datetime
    is_active: bool = True

class TeamChallengeCreate(TeamChallengeBase):
    team_id: int

class TeamChallengeResponse(TeamChallengeBase):
    id: int
    team_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class ChallengeResultBase(BaseModel):
    score: float = 0
    completed_sessions: int = 0
    completed_at: Optional[datetime] = None

class ChallengeResultCreate(ChallengeResultBase):
    challenge_id: int
    user_id: int

class ChallengeResultResponse(ChallengeResultBase):
    id: int
    challenge_id: int
    user_id: int

    class Config:
        orm_mode = True

# Conversation schemas for game interactions
class PlayerInput(BaseModel):
    message: str
    addressed_to: Optional[str] = None
    modality: Optional[str] = "text"  # "text" or "voice"
    role: Optional[str] = "user"  # "user" or "assistant"
    generate: Optional[bool] = True  # Whether to generate AI response or just persist

class TextToSpeechInput(BaseModel):
    text: str
    voice: Optional[str] = None

class AIResponse(BaseModel):
    message: str
    evaluation: Optional[Dict] = None

class MultiStakeholderResponse(BaseModel):
    stakeholder_id: int
    response: str
    thoughts: Optional[str] = None
    next_speaker_id: Optional[int] = None

class CompetitorAnalysisResponse(BaseModel):
    advantages: List[str]
    objections: List[str]
    talking_points: List[str]
    emphasis_points: List[str]

class MeetingSummaryResponse(BaseModel):
    summary: str
    stakeholder_interest: Dict[str, str]  # stakeholder name -> interest level
    key_concerns: List[str]
    next_steps: List[str]
    focus_stakeholders: List[str]

# Game Event Schemas
class GameEventBase(BaseModel):
    name: str
    event_type: str
    description: str
    trigger_condition: str
    probability: float = 0.3
    event_data: Optional[dict] = None
    difficulty_adjustment: float = 0.0


class GameEventCreate(GameEventBase):
    scenario_id: int


class GameEventResponse(GameEventBase):
    id: int
    scenario_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True


class EventOccurrenceBase(BaseModel):
    game_event_id: int
    game_session_id: int


class EventOccurrenceCreate(EventOccurrenceBase):
    pass


class EventOccurrenceResponse(EventOccurrenceBase):
    id: int
    occurred_at: datetime
    player_response: Optional[str] = None
    resolution: Optional[str] = None
    impact_score: float = 0.0
    
    class Config:
        orm_mode = True


class EventOccurrenceUpdate(BaseModel):
    player_response: Optional[str] = None
    resolution: Optional[str] = None
    impact_score: Optional[float] = None


# Timed Challenge Schemas
class TimedChallengeBase(BaseModel):
    challenge_type: str
    description: str
    time_limit_seconds: int


class TimedChallengeCreate(TimedChallengeBase):
    session_id: int


class TimedChallengeResponse(TimedChallengeBase):
    id: int
    session_id: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    player_response: Optional[str] = None
    score: Optional[float] = None
    
    class Config:
        orm_mode = True


class TimedChallengeUpdate(BaseModel):
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_completed: Optional[bool] = None
    player_response: Optional[str] = None
    score: Optional[float] = None


# Seasonal Content Schemas
class SeasonalContentBase(BaseModel):
    name: str
    description: str
    content_type: str
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    content_data: dict


class SeasonalContentCreate(SeasonalContentBase):
    pass


class SeasonalContentResponse(SeasonalContentBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True


# Difficulty Settings Schemas
class DifficultySettingsBase(BaseModel):
    base_difficulty: float = 1.0
    adaptive_factor: float = 0.1
    min_difficulty: float = 0.5
    max_difficulty: float = 2.0
    last_performance_score: Optional[float] = None


class DifficultySettingsCreate(DifficultySettingsBase):
    user_id: int


class DifficultySettingsResponse(DifficultySettingsBase):
    id: int
    user_id: int
    updated_at: datetime
    
    class Config:
        orm_mode = True


class DifficultySettingsUpdate(BaseModel):
    base_difficulty: Optional[float] = None
    adaptive_factor: Optional[float] = None
    min_difficulty: Optional[float] = None
    max_difficulty: Optional[float] = None
    last_performance_score: Optional[float] = None


# Update GameSession schemas to include new fields
class GameSessionCreate(BaseModel):
    scenario_id: int
    challenge_id: Optional[int] = None
    is_timed: bool = False
    time_limit_seconds: Optional[int] = None
    is_tournament_mode: bool = False
    tournament_id: Optional[int] = None


class GameSessionResponse(BaseModel):
    id: int
    user_id: int
    scenario_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    is_completed: bool = False
    total_score: float = 0
    current_stage: Optional[str] = None
    challenge_id: Optional[int] = None
    is_timed: bool = False
    time_limit_seconds: Optional[int] = None
    timer_started_at: Optional[datetime] = None
    timer_paused_at: Optional[datetime] = None
    remaining_time_seconds: Optional[int] = None
    difficulty_factor: float = 1.0
    is_tournament_mode: bool = False
    tournament_id: Optional[int] = None
    interactions: Optional[List["InteractionResponse"]] = []
    scenario: Optional[ScenarioResponse] = None
    
    class Config:
        orm_mode = True

# Specifically for trigger-event endpoint
class TriggerEventRequest(BaseModel):
    event_type: str
    description: str = "Triggered event"
    name: str = "Custom Event"
    trigger_condition: str = "manual"
    probability: float = 1.0
    scenario_id: int = 0
    event_data: Optional[dict] = None
    difficulty_adjustment: float = 0.0


# Phase 3.2: Recording & Review System Schemas

# Recording Schemas
class SessionRecordingBase(BaseModel):
    session_id: int
    title: str
    description: Optional[str] = None
    duration_seconds: int


class SessionRecordingCreate(SessionRecordingBase):
    pass


class SessionRecordingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_shared: Optional[bool] = None
    is_reviewed: Optional[bool] = None
    review_requested: Optional[bool] = None
    reviewed_by: Optional[int] = None
    review_score: Optional[float] = None


class SessionRecordingResponse(SessionRecordingBase):
    id: int
    user_id: int
    created_at: datetime
    is_shared: bool
    is_reviewed: bool
    review_requested: bool
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    review_score: Optional[float] = None
    
    class Config:
        orm_mode = True


# Recording Annotation Schemas
class RecordingAnnotationBase(BaseModel):
    recording_id: int
    timestamp_seconds: int
    content: str
    annotation_type: str  # positive, negative, suggestion
    pacer_stage: Optional[str] = None  # P, A, C, E, R


class RecordingAnnotationCreate(RecordingAnnotationBase):
    pass


class RecordingAnnotationUpdate(BaseModel):
    timestamp_seconds: Optional[int] = None
    content: Optional[str] = None
    annotation_type: Optional[str] = None
    pacer_stage: Optional[str] = None


class RecordingAnnotationResponse(RecordingAnnotationBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True


# Recording Bookmark Schemas
class RecordingBookmarkBase(BaseModel):
    recording_id: int
    timestamp_seconds: int
    label: str


class RecordingBookmarkCreate(RecordingBookmarkBase):
    pass


class RecordingBookmarkUpdate(BaseModel):
    timestamp_seconds: Optional[int] = None
    label: Optional[str] = None


class RecordingBookmarkResponse(RecordingBookmarkBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True


# Recording Share Schemas
class RecordingShareBase(BaseModel):
    recording_id: int
    user_id: int
    permission_level: str  # view, comment, edit


class RecordingShareCreate(RecordingShareBase):
    pass


class RecordingShareUpdate(BaseModel):
    permission_level: Optional[str] = None


class RecordingShareResponse(RecordingShareBase):
    id: int
    shared_by: int
    shared_at: datetime
    
    class Config:
        orm_mode = True


# Recording Export Schemas
class RecordingExportBase(BaseModel):
    recording_id: int
    export_format: str  # pdf, video


class RecordingExportCreate(RecordingExportBase):
    pass


class RecordingExportUpdate(BaseModel):
    status: Optional[str] = None
    downloaded_url: Optional[str] = None


class RecordingExportResponse(RecordingExportBase):
    id: int
    user_id: int
    status: str
    exported_at: Optional[datetime] = None
    download_url: Optional[str] = None
    
    class Config:
        orm_mode = True


# Extended GameSession response for Phase 3.2
class GameSessionWithRecordingsResponse(GameSessionResponse):
    recordings: List[SessionRecordingResponse] = []
    can_be_recorded: bool = False
    
    class Config:
        orm_mode = True


# Review Dashboard Schema
class ReviewDashboardItem(BaseModel):
    recording_id: int
    user_id: int
    username: str
    title: str
    created_at: datetime
    duration_seconds: int
    scenario_title: str
    
    class Config:
        orm_mode = True

# Schema for initiating a real-time session token request
class RealtimeTokenRequest(BaseModel):
    # Currently no parameters needed as AIService.create_realtime_session uses hardcoded values
    # Add fields here if the service is updated to accept parameters like model or voice
    pass 