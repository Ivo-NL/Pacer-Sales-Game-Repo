from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app import auth, models, schemas
from app.database import get_db
from app.ai_service import AIService

router = APIRouter(prefix="/recordings", tags=["recordings"])

# Get all recordings for the current user
@router.get("/", response_model=List[schemas.SessionRecordingResponse])
def get_recordings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all recordings for the current user."""
    # Users can see their own recordings, or recordings shared with them
    user_recordings = db.query(models.SessionRecording).filter(
        models.SessionRecording.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    # Also get recordings shared with this user
    shared_recording_ids = db.query(models.RecordingShare.recording_id).filter(
        models.RecordingShare.user_id == current_user.id
    ).all()
    shared_recording_ids = [r[0] for r in shared_recording_ids]
    
    shared_recordings = []
    if shared_recording_ids:
        shared_recordings = db.query(models.SessionRecording).filter(
            models.SessionRecording.id.in_(shared_recording_ids)
        ).all()
    
    return user_recordings + shared_recordings

# Create a new recording
@router.post("/", response_model=schemas.SessionRecordingResponse)
def create_recording(
    recording: schemas.SessionRecordingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new recording for a completed game session."""
    # Check if the session exists and belongs to the current user
    session = db.query(models.GameSession).filter(
        models.GameSession.id == recording.session_id,
        models.GameSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Check if the session can be recorded
    if not session.can_be_recorded:
        if not session.is_completed:
            raise HTTPException(status_code=400, detail="Cannot record an incomplete session")
        # Auto-enable recording for completed sessions
        session.can_be_recorded = True
        db.commit()
    
    # Create the recording
    db_recording = models.SessionRecording(
        **recording.dict(),
        user_id=current_user.id
    )
    db.add(db_recording)
    db.commit()
    db.refresh(db_recording)
    
    return db_recording

# Get a specific recording
@router.get("/{recording_id}", response_model=schemas.SessionRecordingResponse)
def get_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a specific recording."""
    # Users can access their own recordings or ones shared with them
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    if recording.user_id != current_user.id:
        # Check if the recording is shared with the user
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied to this recording")
    
    return recording

# Update a recording
@router.put("/{recording_id}", response_model=schemas.SessionRecordingResponse)
def update_recording(
    recording_id: int,
    recording_update: schemas.SessionRecordingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a recording."""
    # Get the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    if recording.user_id != current_user.id:
        # Check if the user has edit permission
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id,
            models.RecordingShare.permission_level == "edit"
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="You don't have permission to edit this recording")
    
    # Update fields
    update_data = recording_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(recording, key, value)
    
    db.commit()
    db.refresh(recording)
    
    return recording

# Delete a recording
@router.delete("/{recording_id}")
def delete_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Delete a recording."""
    # Get the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check if the user is the owner
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this recording")
    
    # Delete all related data
    db.query(models.RecordingAnnotation).filter(
        models.RecordingAnnotation.recording_id == recording_id
    ).delete()
    
    db.query(models.RecordingBookmark).filter(
        models.RecordingBookmark.recording_id == recording_id
    ).delete()
    
    db.query(models.RecordingShare).filter(
        models.RecordingShare.recording_id == recording_id
    ).delete()
    
    db.query(models.RecordingExport).filter(
        models.RecordingExport.recording_id == recording_id
    ).delete()
    
    # Delete the recording
    db.delete(recording)
    db.commit()
    
    return {"message": "Recording deleted successfully"}

# Request a review for a recording
@router.post("/{recording_id}/request-review")
def request_review(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Request a review for a recording from managers/coaches."""
    # Get the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check if the user is the owner
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can request a review")
    
    # Update the recording
    recording.review_requested = True
    db.commit()
    
    return {"message": "Review requested successfully"}

# Get recordings pending review (managers only)
@router.get("/reviews/pending", response_model=List[schemas.ReviewDashboardItem])
def get_pending_reviews(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)
):
    """Get all recordings pending review (managers only)."""
    # Find recordings that have requested review but haven't been reviewed
    recordings = db.query(
        models.SessionRecording.id.label("recording_id"),
        models.SessionRecording.user_id,
        models.User.username,
        models.SessionRecording.title,
        models.SessionRecording.created_at,
        models.SessionRecording.duration_seconds,
        models.Scenario.title.label("scenario_title")
    ).join(
        models.User, models.SessionRecording.user_id == models.User.id
    ).join(
        models.GameSession, models.SessionRecording.session_id == models.GameSession.id
    ).join(
        models.Scenario, models.GameSession.scenario_id == models.Scenario.id
    ).filter(
        models.SessionRecording.review_requested == True,
        models.SessionRecording.is_reviewed == False
    ).offset(skip).limit(limit).all()
    
    return recordings

# Submit a review for a recording (managers only)
@router.post("/{recording_id}/review")
def submit_review(
    recording_id: int,
    review_score: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_manager_user)
):
    """Submit a review for a recording (managers only)."""
    # Get the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Update the recording
    recording.is_reviewed = True
    recording.reviewed_at = datetime.utcnow()
    recording.reviewed_by = current_user.id
    recording.review_score = review_score
    db.commit()
    
    return {"message": "Review submitted successfully"}

# --- Annotations ---

# Get all annotations for a recording
@router.get("/{recording_id}/annotations", response_model=List[schemas.RecordingAnnotationResponse])
def get_annotations(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all annotations for a recording."""
    # Check access rights to the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    if recording.user_id != current_user.id:
        # Check if the recording is shared with the user
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied to this recording")
    
    # Get annotations
    annotations = db.query(models.RecordingAnnotation).filter(
        models.RecordingAnnotation.recording_id == recording_id
    ).all()
    
    return annotations

# Create an annotation
@router.post("/{recording_id}/annotations", response_model=schemas.RecordingAnnotationResponse)
def create_annotation(
    recording_id: int,
    annotation: schemas.RecordingAnnotationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new annotation for a recording."""
    # Check access rights to the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    permission_level = None
    if recording.user_id != current_user.id:
        # Check if the user can comment
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied to this recording")
        
        permission_level = share.permission_level
        if permission_level not in ["comment", "edit"]:
            raise HTTPException(status_code=403, detail="You don't have permission to add annotations")
    
    # Create the annotation
    db_annotation = models.RecordingAnnotation(
        **annotation.dict(),
        user_id=current_user.id
    )
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return db_annotation

# --- Bookmarks ---

# Get all bookmarks for a recording
@router.get("/{recording_id}/bookmarks", response_model=List[schemas.RecordingBookmarkResponse])
def get_bookmarks(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all bookmarks for a recording."""
    # Check access rights to the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    if recording.user_id != current_user.id:
        # Check if the recording is shared with the user
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied to this recording")
    
    # Get user's bookmarks
    bookmarks = db.query(models.RecordingBookmark).filter(
        models.RecordingBookmark.recording_id == recording_id,
        models.RecordingBookmark.user_id == current_user.id
    ).all()
    
    return bookmarks

# Create a bookmark
@router.post("/{recording_id}/bookmarks", response_model=schemas.RecordingBookmarkResponse)
def create_bookmark(
    recording_id: int,
    bookmark: schemas.RecordingBookmarkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new bookmark for a recording."""
    # Check access rights to the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    if recording.user_id != current_user.id:
        # Check if the recording is shared with the user
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied to this recording")
    
    # Create the bookmark
    db_bookmark = models.RecordingBookmark(
        **bookmark.dict(),
        user_id=current_user.id
    )
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    
    return db_bookmark

# --- Sharing ---

# Share a recording with another user
@router.post("/{recording_id}/share", response_model=schemas.RecordingShareResponse)
def share_recording(
    recording_id: int,
    share: schemas.RecordingShareCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Share a recording with another user."""
    # Check if the recording exists and belongs to the current user
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can share this recording")
    
    # Check if the target user exists
    target_user = db.query(models.User).filter(
        models.User.id == share.user_id
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # Check if already shared
    existing_share = db.query(models.RecordingShare).filter(
        models.RecordingShare.recording_id == recording_id,
        models.RecordingShare.user_id == share.user_id
    ).first()
    
    if existing_share:
        # Update the permission level
        existing_share.permission_level = share.permission_level
        db.commit()
        db.refresh(existing_share)
        return existing_share
    
    # Create the share
    db_share = models.RecordingShare(
        **share.dict(),
        shared_by=current_user.id
    )
    db.add(db_share)
    db.commit()
    db.refresh(db_share)
    
    # Update the recording's shared status
    recording.is_shared = True
    db.commit()
    
    return db_share

# --- Exports ---

# Export a recording
@router.post("/{recording_id}/export", response_model=schemas.RecordingExportResponse)
def export_recording(
    recording_id: int,
    export: schemas.RecordingExportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Export a recording to PDF or video format."""
    # Check access rights to the recording
    recording = db.query(models.SessionRecording).filter(
        models.SessionRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check permissions
    if recording.user_id != current_user.id:
        # Check if the recording is shared with the user
        share = db.query(models.RecordingShare).filter(
            models.RecordingShare.recording_id == recording_id,
            models.RecordingShare.user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied to this recording")
    
    # Create the export
    db_export = models.RecordingExport(
        **export.dict(),
        user_id=current_user.id,
        status="pending"
    )
    db.add(db_export)
    db.commit()
    db.refresh(db_export)
    
    # In a real implementation, this would trigger a background task to generate the export
    # For now, we'll just mark it as completed immediately
    db_export.status = "completed"
    db_export.exported_at = datetime.utcnow()
    db_export.download_url = f"/api/static/exports/recording_{recording_id}_{export.export_format}.{export.export_format}"
    db.commit()
    db.refresh(db_export)
    
    return db_export 