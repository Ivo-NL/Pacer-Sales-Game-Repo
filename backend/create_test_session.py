"""
Script to create a test game session for development and testing.
This creates a scenario, a client persona, and a game session with ID 1.
"""
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User, Scenario, ClientPersona, GameSession, Interaction
from app.database import SQLALCHEMY_DATABASE_URL
from app.auth import get_password_hash

# Connect to database
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def create_test_session():
    """Create a test game session with ID 1 for development and testing."""
    try:
        print("Creating test session for Phase 3.2...")
        
        # Create a test user if it doesn't exist
        test_user = db.query(User).filter(User.email == "testuser@example.com").first()
        if not test_user:
            print("Creating test user...")
            test_user = User(
                email="testuser@example.com",
                username="testuser",
                hashed_password=get_password_hash("Password123!"),
                is_active=True,
                is_manager=False,
                region="Global",
                created_at=datetime.utcnow()
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        
        # Get a scenario
        scenario = db.query(Scenario).first()
        if not scenario:
            print("Error: No scenarios found in the database.")
            sys.exit(1)
        
        # Create a completed game session
        session = GameSession(
            user_id=test_user.id,
            scenario_id=scenario.id,
            start_time=datetime.utcnow() - timedelta(hours=1),
            end_time=datetime.utcnow(),
            is_completed=True,
            total_score=85.5,
            current_stage="R",
            can_be_recorded=True  # Make sure it can be recorded
        )
        db.add(session)
        db.flush()
        
        # Add some interactions
        interactions = [
            {
                "sequence": 1,
                "player_input": "Hello, I'm interested in your payment processing solutions.",
                "ai_response": "Thank you for your interest! I'd be happy to tell you about our payment solutions. What specific needs does your business have?",
                "pacer_stage": "P",
                "timestamp": datetime.utcnow() - timedelta(minutes=50)
            },
            {
                "sequence": 2,
                "player_input": "We're an e-commerce platform looking to streamline our checkout process and reduce cart abandonment.",
                "ai_response": "That's a common challenge for e-commerce businesses. Cart abandonment can significantly affect revenue. Could you tell me more about your current payment process and where customers seem to drop off?",
                "pacer_stage": "A",
                "timestamp": datetime.utcnow() - timedelta(minutes=45)
            },
            {
                "sequence": 3,
                "player_input": "Our current process has too many steps, and we're seeing about 30% abandonment during payment.",
                "ai_response": "A 30% abandonment rate during payment is quite high. Most successful e-commerce platforms aim for below 20%. Our one-click checkout solution could reduce this by streamlining the process to a single step for returning customers.",
                "pacer_stage": "C",
                "timestamp": datetime.utcnow() - timedelta(minutes=40)
            },
            {
                "sequence": 4,
                "player_input": "That sounds promising. How would implementation work, and what would be the timeline?",
                "ai_response": "Great question. Implementation typically takes 2-3 weeks. We would start with API integration, followed by testing, and then a phased rollout. We assign a dedicated technical manager to ensure smooth deployment. Would you prefer to start with a pilot on a subset of transactions?",
                "pacer_stage": "E",
                "timestamp": datetime.utcnow() - timedelta(minutes=30)
            },
            {
                "sequence": 5,
                "player_input": "Yes, a pilot sounds like a good approach. How do we measure success and ensure ongoing optimization?",
                "ai_response": "We'll establish baseline metrics before the pilot, focusing on cart abandonment rate, checkout time, and conversion. Our customer success team conducts monthly reviews to optimize performance and suggest improvements based on your data. We're committed to reducing your abandonment rate by at least 30% within the first quarter.",
                "pacer_stage": "R",
                "timestamp": datetime.utcnow() - timedelta(minutes=20)
            }
        ]
        
        for interaction_data in interactions:
            interaction = Interaction(
                game_session_id=session.id,
                **interaction_data
            )
            db.add(interaction)
        
        db.commit()
        print(f"Created completed test session with ID {session.id} and 5 interactions")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_test_session() 