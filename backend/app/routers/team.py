from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(tags=["teams"])

# Team management
@router.post("/teams", response_model=schemas.TeamResponse)
def create_team(
    team: schemas.TeamCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can create teams
):
    """Create a new team (managers only)."""
    # Create team
    db_team = models.Team(**team.dict())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    
    return db_team

@router.get("/teams", response_model=List[schemas.TeamResponse])
def get_teams(
    skip: int = 0,
    limit: int = 100,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all teams, optionally filtered by region."""
    query = db.query(models.Team)
    
    # Filter by region if specified
    if region:
        query = query.filter(models.Team.region == region)
    
    # Non-managers can only see teams in their region
    if not current_user.is_manager:
        query = query.filter(models.Team.region == current_user.region)
        
    teams = query.offset(skip).limit(limit).all()
    return teams

@router.get("/teams/{team_id}", response_model=schemas.TeamWithMembersResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a team by ID with its members."""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user has access to this team
    if not current_user.is_manager and team.region != current_user.region:
        raise HTTPException(status_code=403, detail="Not authorized to access this team")
    
    return team

@router.post("/teams/{team_id}/members", response_model=schemas.TeamMemberResponse)
def add_team_member(
    team_id: int,
    member: schemas.TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Add a member to a team."""
    # Verify team exists
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is authorized (team manager or global manager)
    is_team_manager = team.manager_id == current_user.id
    if not (current_user.is_manager or is_team_manager):
        raise HTTPException(status_code=403, detail="Not authorized to modify this team")
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == member.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_member = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == member.user_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this team")
    
    # Add user to team
    db_member = models.TeamMember(**member.dict())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member

@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Remove a member from a team."""
    # Verify team exists
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is authorized (team manager or global manager)
    is_team_manager = team.manager_id == current_user.id
    if not (current_user.is_manager or is_team_manager):
        raise HTTPException(status_code=403, detail="Not authorized to modify this team")
    
    # Find team member
    member = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="User is not a member of this team")
    
    # Remove member
    db.delete(member)
    db.commit()
    
    return {"message": "Member removed successfully"}

# Team challenges
@router.post("/challenges", response_model=schemas.TeamChallengeResponse)
def create_challenge(
    challenge: schemas.TeamChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new team challenge."""
    # Verify team exists
    team = db.query(models.Team).filter(models.Team.id == challenge.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is authorized (team manager or global manager)
    is_team_manager = team.manager_id == current_user.id
    if not (current_user.is_manager or is_team_manager):
        raise HTTPException(status_code=403, detail="Not authorized to create challenges for this team")
    
    # Create challenge
    db_challenge = models.TeamChallenge(**challenge.dict())
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    
    # Initialize challenge results for all team members
    team_members = db.query(models.TeamMember).filter(models.TeamMember.team_id == team.id).all()
    for member in team_members:
        result = models.ChallengeResult(
            challenge_id=db_challenge.id,
            user_id=member.user_id,
            score=0,
            completed_sessions=0
        )
        db.add(result)
    
    db.commit()
    
    return db_challenge

@router.get("/challenges", response_model=List[schemas.TeamChallengeResponse])
def get_challenges(
    team_id: Optional[int] = None,
    active_only: bool = Query(False, description="Only return active challenges"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all challenges, optionally filtered by team."""
    query = db.query(models.TeamChallenge)
    
    # Filter by team if specified
    if team_id:
        query = query.filter(models.TeamChallenge.team_id == team_id)
    
    # Filter by active status if requested
    if active_only:
        query = query.filter(models.TeamChallenge.is_active == True)
        
    # Non-managers can only see challenges for teams they are a member of
    if not current_user.is_manager:
        # Get all teams user is a member of
        user_team_ids = db.query(models.TeamMember.team_id).filter(
            models.TeamMember.user_id == current_user.id
        ).all()
        user_team_ids = [team_id for (team_id,) in user_team_ids]
        
        # Filter challenges by these teams
        query = query.filter(models.TeamChallenge.team_id.in_(user_team_ids))
    
    challenges = query.order_by(models.TeamChallenge.end_date.desc()).all()
    return challenges

@router.get("/challenges/{challenge_id}", response_model=schemas.TeamChallengeResponse)
def get_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a challenge by ID."""
    challenge = db.query(models.TeamChallenge).filter(models.TeamChallenge.id == challenge_id).first()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if user has access to this challenge
    if not current_user.is_manager:
        # Check if user is a member of the team
        is_team_member = db.query(models.TeamMember).filter(
            models.TeamMember.team_id == challenge.team_id,
            models.TeamMember.user_id == current_user.id
        ).first() is not None
        
        if not is_team_member:
            raise HTTPException(status_code=403, detail="Not authorized to access this challenge")
    
    return challenge

@router.get("/challenges/{challenge_id}/results", response_model=List[schemas.ChallengeResultResponse])
def get_challenge_results(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get results for a challenge."""
    # Verify challenge exists
    challenge = db.query(models.TeamChallenge).filter(models.TeamChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if user has access to this challenge
    if not current_user.is_manager:
        # Check if user is a member of the team
        is_team_member = db.query(models.TeamMember).filter(
            models.TeamMember.team_id == challenge.team_id,
            models.TeamMember.user_id == current_user.id
        ).first() is not None
        
        if not is_team_member:
            raise HTTPException(status_code=403, detail="Not authorized to access this challenge")
    
    # Get results
    results = db.query(models.ChallengeResult).filter(
        models.ChallengeResult.challenge_id == challenge_id
    ).all()
    
    return results

@router.put("/challenges/{challenge_id}", response_model=schemas.TeamChallengeResponse)
def update_challenge(
    challenge_id: int,
    challenge_update: schemas.TeamChallengeBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a challenge."""
    # Verify challenge exists
    db_challenge = db.query(models.TeamChallenge).filter(models.TeamChallenge.id == challenge_id).first()
    if not db_challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if user is authorized (team manager or global manager)
    team = db.query(models.Team).filter(models.Team.id == db_challenge.team_id).first()
    is_team_manager = team and team.manager_id == current_user.id
    if not (current_user.is_manager or is_team_manager):
        raise HTTPException(status_code=403, detail="Not authorized to update this challenge")
    
    # Update challenge attributes
    for key, value in challenge_update.dict().items():
        setattr(db_challenge, key, value)
    
    db.commit()
    db.refresh(db_challenge)
    
    return db_challenge 