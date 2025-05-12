from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Optional

from app.database import get_db
from app import auth
from app.models import User
from app.data.pacer_content import PACER_METHODOLOGY, INDUSTRY_APPLICATIONS, REGIONAL_CONSIDERATIONS

router = APIRouter(
    prefix="/content",
    tags=["content"],
    responses={404: {"description": "Not found"}},
)

@router.get("/pacer_methodology")
def get_pacer_methodology(
    stage: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_active_user)
):
    """Get PACER methodology content, optionally filtered by stage."""
    if stage:
        if stage.upper() not in ["P", "A", "C", "E", "R"]:
            raise HTTPException(status_code=400, detail="Invalid PACER stage")
        
        return {stage.upper(): PACER_METHODOLOGY[stage.upper()]}
    
    return PACER_METHODOLOGY

@router.get("/industry_applications")
def get_industry_applications(
    industry: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_active_user)
):
    """Get industry-specific PACER applications, optionally filtered by industry."""
    if industry:
        if industry not in INDUSTRY_APPLICATIONS:
            raise HTTPException(status_code=400, detail="Industry not found")
        
        return {industry: INDUSTRY_APPLICATIONS[industry]}
    
    return INDUSTRY_APPLICATIONS

@router.get("/regional_considerations")
def get_regional_considerations(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_active_user)
):
    """Get regional payment considerations, optionally filtered by region."""
    if region:
        if region not in REGIONAL_CONSIDERATIONS:
            raise HTTPException(status_code=400, detail="Region not found")
        
        return {region: REGIONAL_CONSIDERATIONS[region]}
    
    return REGIONAL_CONSIDERATIONS 