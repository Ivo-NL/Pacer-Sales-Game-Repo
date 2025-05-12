from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(tags=["progress"])

# Progress endpoints
@router.get("", response_model=schemas.ProgressResponse)
def get_user_progress(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a user's progress (default: current user)."""
    # Determine which user to get progress for
    target_user_id = user_id if user_id else current_user.id
    
    # Managers can view anyone's progress, regular users can only view their own
    if target_user_id != current_user.id and not current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's progress"
        )
    
    # Get progress
    progress = db.query(models.Progress).filter(models.Progress.user_id == target_user_id).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    return progress

@router.get("/detailed", response_model=schemas.DetailedProgressResponse)
def get_detailed_progress(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a user's detailed progress with all skill breakdowns."""
    # Determine which user to get progress for
    target_user_id = user_id if user_id else current_user.id
    
    # Managers can view anyone's progress, regular users can only view their own
    if target_user_id != current_user.id and not current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's progress"
        )
    
    # Get detailed progress
    detailed_progress = db.query(models.DetailedProgress).filter(
        models.DetailedProgress.user_id == target_user_id
    ).first()
    
    if not detailed_progress:
        # Initialize detailed progress if it doesn't exist
        detailed_progress = models.DetailedProgress(user_id=target_user_id)
        db.add(detailed_progress)
        db.commit()
        db.refresh(detailed_progress)
    
    return detailed_progress

@router.get("/badges", response_model=List[schemas.BadgeResponse])
def get_all_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all available badges in the system."""
    badges = db.query(models.Badge).all()
    return badges

@router.get("/badges/user", response_model=List[schemas.UserBadgeResponse])
def get_user_badges(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get badges earned by a specific user (default: current user)."""
    # Determine which user to get badges for
    target_user_id = user_id if user_id else current_user.id
    
    # Managers can view anyone's badges, regular users can only view their own
    if target_user_id != current_user.id and not current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's badges"
        )
    
    # Get user badges
    user_badges = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == target_user_id
    ).all()
    
    return user_badges

@router.post("/badges", response_model=schemas.BadgeResponse)
def create_badge(
    badge: schemas.BadgeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can create badges
):
    """Create a new badge (managers only)."""
    # Check if badge with same name already exists
    existing_badge = db.query(models.Badge).filter(models.Badge.name == badge.name).first()
    if existing_badge:
        raise HTTPException(status_code=400, detail="Badge with this name already exists")
    
    # Create badge
    db_badge = models.Badge(**badge.dict())
    db.add(db_badge)
    db.commit()
    db.refresh(db_badge)
    
    return db_badge

@router.post("/badges/award", response_model=schemas.UserBadgeResponse)
def award_badge(
    user_badge: schemas.UserBadgeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)  # Only managers can award badges
):
    """Award a badge to a user (managers only)."""
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_badge.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if badge exists
    badge = db.query(models.Badge).filter(models.Badge.id == user_badge.badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")
    
    # Check if user already has this badge
    existing_award = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == user_badge.user_id,
        models.UserBadge.badge_id == user_badge.badge_id
    ).first()
    
    if existing_award:
        raise HTTPException(status_code=400, detail="User already has this badge")
    
    # Award badge
    db_user_badge = models.UserBadge(**user_badge.dict())
    db.add(db_user_badge)
    db.commit()
    db.refresh(db_user_badge)
    
    return db_user_badge

@router.post("/progress/check-achievements")
def check_achievements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Check and award any newly qualified achievements for the current user."""
    # Get user's progress
    progress = db.query(models.Progress).filter(models.Progress.user_id == current_user.id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    # Get user's detailed progress
    detailed_progress = db.query(models.DetailedProgress).filter(
        models.DetailedProgress.user_id == current_user.id
    ).first()
    
    # Get user's current badges
    current_badge_ids = [ub.badge_id for ub in db.query(models.UserBadge).filter(
        models.UserBadge.user_id == current_user.id
    ).all()]
    
    # Get all badges
    all_badges = db.query(models.Badge).all()
    
    # Check each badge to see if user qualifies
    newly_awarded = []
    
    for badge in all_badges:
        # Skip if user already has this badge
        if badge.id in current_badge_ids:
            continue
        
        # Check if user meets criteria
        criteria = badge.criteria if badge.criteria else {}
        
        qualified = True
        
        # Example criteria checks (this would be more comprehensive in a real app)
        if 'min_prospect_level' in criteria and progress.prospect_level < criteria['min_prospect_level']:
            qualified = False
        
        if 'min_assess_level' in criteria and progress.assess_level < criteria['min_assess_level']:
            qualified = False
            
        if 'min_challenge_level' in criteria and progress.challenge_level < criteria['min_challenge_level']:
            qualified = False
            
        if 'min_execute_level' in criteria and progress.execute_level < criteria['min_execute_level']:
            qualified = False
            
        if 'min_retain_level' in criteria and progress.retain_level < criteria['min_retain_level']:
            qualified = False
            
        if 'min_total_score' in criteria and progress.total_score < criteria['min_total_score']:
            qualified = False
            
        if 'min_sessions_completed' in criteria and progress.total_sessions_completed < criteria['min_sessions_completed']:
            qualified = False
        
        # Check detailed skill criteria if detailed progress exists
        if detailed_progress and 'min_skill_levels' in criteria:
            for skill, min_level in criteria['min_skill_levels'].items():
                if hasattr(detailed_progress, skill) and getattr(detailed_progress, skill) < min_level:
                    qualified = False
                    break
        
        # Award badge if qualified
        if qualified:
            new_badge = models.UserBadge(
                user_id=current_user.id,
                badge_id=badge.id
            )
            db.add(new_badge)
            newly_awarded.append(badge.name)
    
    # Commit changes if any badges were awarded
    if newly_awarded:
        db.commit()
    
    return {
        "awarded_badges": newly_awarded,
        "message": f"Awarded {len(newly_awarded)} new badges" if newly_awarded else "No new badges awarded"
    }

@router.get("/skills/recommendations", response_model=dict)
def get_skill_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get personalized skill improvement recommendations based on user's progress."""
    # Get user's detailed progress
    detailed_progress = db.query(models.DetailedProgress).filter(
        models.DetailedProgress.user_id == current_user.id
    ).first()
    
    if not detailed_progress:
        detailed_progress = models.DetailedProgress(user_id=current_user.id)
        db.add(detailed_progress)
        db.commit()
        db.refresh(detailed_progress)
    
    # Identify lowest skill areas
    skills = {
        # Prospect skills
        "lead_qualification": detailed_progress.lead_qualification,
        "market_research": detailed_progress.market_research,
        "outreach_effectiveness": detailed_progress.outreach_effectiveness,
        "value_proposition": detailed_progress.value_proposition,
        
        # Assess skills
        "needs_analysis": detailed_progress.needs_analysis,
        "stakeholder_mapping": detailed_progress.stakeholder_mapping,
        "qualification_framework": detailed_progress.qualification_framework,
        "pain_point_identification": detailed_progress.pain_point_identification,
        
        # Challenge skills
        "solution_presentation": detailed_progress.solution_presentation,
        "competitive_differentiation": detailed_progress.competitive_differentiation,
        "insight_delivery": detailed_progress.insight_delivery,
        "value_demonstration": detailed_progress.value_demonstration,
        
        # Execute skills
        "negotiation": detailed_progress.negotiation,
        "objection_handling": detailed_progress.objection_handling,
        "closing_techniques": detailed_progress.closing_techniques,
        "deal_structuring": detailed_progress.deal_structuring,
        
        # Retain skills
        "account_management": detailed_progress.account_management,
        "relationship_building": detailed_progress.relationship_building,
        "upselling": detailed_progress.upselling,
        "customer_success": detailed_progress.customer_success
    }
    
    # Sort skills by level (ascending)
    sorted_skills = sorted(skills.items(), key=lambda x: x[1])
    
    # Get the lowest 3 skills
    lowest_skills = sorted_skills[:3]
    
    # Define skill categories
    skill_categories = {
        "lead_qualification": "Prospect",
        "market_research": "Prospect",
        "outreach_effectiveness": "Prospect",
        "value_proposition": "Prospect",
        "needs_analysis": "Assess",
        "stakeholder_mapping": "Assess",
        "qualification_framework": "Assess",
        "pain_point_identification": "Assess",
        "solution_presentation": "Challenge",
        "competitive_differentiation": "Challenge",
        "insight_delivery": "Challenge",
        "value_demonstration": "Challenge",
        "negotiation": "Execute",
        "objection_handling": "Execute",
        "closing_techniques": "Execute",
        "deal_structuring": "Execute",
        "account_management": "Retain",
        "relationship_building": "Retain",
        "upselling": "Retain",
        "customer_success": "Retain"
    }
    
    # Get scenarios that focus on these skills
    recommended_scenarios = []
    for skill, level in lowest_skills:
        category = skill_categories.get(skill, "Unknown")
        stage_code = category[0] if category in ["Prospect", "Assess", "Challenge", "Execute", "Retain"] else "P"
        
        # Find scenarios that focus on this PACER stage
        scenarios = db.query(models.Scenario).filter(
            models.Scenario.pacer_stage.contains(stage_code)
        ).limit(2).all()
        
        for scenario in scenarios:
            recommended_scenarios.append({
                "id": scenario.id,
                "title": scenario.title,
                "description": scenario.description,
                "pacer_stage": scenario.pacer_stage,
                "targeted_skill": skill
            })
    
    # Prepare recommendations
    recommendations = {
        "focus_areas": [
            {
                "skill": skill,
                "category": skill_categories.get(skill, "Other"),
                "current_level": level,
                "training_tips": f"Focus on improving your {skill.replace('_', ' ')} skills."
            }
            for skill, level in lowest_skills
        ],
        "recommended_scenarios": recommended_scenarios
    }
    
    return recommendations 