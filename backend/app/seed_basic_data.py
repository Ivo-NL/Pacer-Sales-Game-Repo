import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import Base, Scenario, ClientPersona

# Connect to database
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def seed_basic_data():
    """Seed basic scenarios and client personas for Phase 3.1 testing."""
    print("Seeding basic data...")
    
    try:
        # Create base tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Check if scenarios already exist
        existing_scenarios = db.query(Scenario).count()
        if existing_scenarios > 0:
            print(f"Database already contains {existing_scenarios} scenarios. Skipping seed.")
            return True
        
        # Create basic scenarios
        scenarios = [
            {
                "title": "Introduction to Prospecting",
                "description": "Learn the basics of prospecting in the payment processing industry.",
                "difficulty": 1,
                "pacer_stage": "P",
                "product_type": "Issuing Solutions",
                "industry": "Banking",
                "region": "Global"
            },
            {
                "title": "Needs Assessment for Retail",
                "description": "Practice assessing client needs in the retail payment space.",
                "difficulty": 1,
                "pacer_stage": "A",
                "product_type": "Acceptance & Authorization",
                "industry": "Retail",
                "region": "Global"
            },
            {
                "title": "Challenging the Status Quo",
                "description": "Learn to challenge client assumptions about payment processing.",
                "difficulty": 2,
                "pacer_stage": "C",
                "product_type": "Digital Services",
                "industry": "Fintech",
                "region": "Global"
            },
            {
                "title": "Executing the Deal",
                "description": "Practice closing techniques in complex payment solution sales.",
                "difficulty": 2,
                "pacer_stage": "E",
                "product_type": "Instant Payments",
                "industry": "E-commerce",
                "region": "Global"
            },
            {
                "title": "Building Long-term Relationships",
                "description": "Develop strategies for customer retention and account growth.",
                "difficulty": 1,
                "pacer_stage": "R",
                "product_type": "Fraud Risk Management",
                "industry": "Banking",
                "region": "Global"
            },
        ]
        
        # Insert scenarios
        created_scenarios = []
        for scenario_data in scenarios:
            scenario = Scenario(**scenario_data)
            db.add(scenario)
            db.flush()  # Flush to get the ID without committing
            created_scenarios.append(scenario)
        
        # Create client personas for each scenario
        client_personas = [
            {
                "scenario_id": 1,  # Introduction to Prospecting
                "name": "Alex Johnson",
                "role": "Head of Digital Banking",
                "company": "FinBank",
                "personality_traits": "Analytical, cautious, detail-oriented",
                "pain_points": "Legacy systems, high operational costs, customer complaints about card issuance time",
                "decision_criteria": "ROI, implementation timeline, compliance features"
            },
            {
                "scenario_id": 2,  # Needs Assessment for Retail
                "name": "Sarah Williams",
                "role": "VP of Operations",
                "company": "RetailGiant",
                "personality_traits": "Practical, results-driven, time-conscious",
                "pain_points": "Checkout delays, high transaction fees, fraud concerns",
                "decision_criteria": "Speed, cost reduction, customer experience improvement"
            },
            {
                "scenario_id": 3,  # Challenging the Status Quo
                "name": "Michael Chen",
                "role": "CTO",
                "company": "TechPay",
                "personality_traits": "Innovative, skeptical, technology-focused",
                "pain_points": "Integration complexity, competitive pressure, scaling challenges",
                "decision_criteria": "Technical superiority, flexibility, future-proofing"
            },
            {
                "scenario_id": 4,  # Executing the Deal
                "name": "Jessica Rodriguez",
                "role": "CFO",
                "company": "ShopNow",
                "personality_traits": "Direct, financially focused, strategic",
                "pain_points": "International payment issues, chargeback rates, compliance costs",
                "decision_criteria": "Proven ROI, contract flexibility, global capabilities"
            },
            {
                "scenario_id": 5,  # Building Long-term Relationships
                "name": "David Wilson",
                "role": "Head of Customer Experience",
                "company": "GlobalBank",
                "personality_traits": "Relationship-oriented, customer-focused, collaborative",
                "pain_points": "Customer retention, upsell opportunities, service consistency",
                "decision_criteria": "Customer satisfaction metrics, account management approach, innovation roadmap"
            }
        ]
        
        # Insert client personas
        for persona_data in client_personas:
            persona = ClientPersona(**persona_data)
            db.add(persona)
        
        db.commit()
        print(f"Successfully created {len(scenarios)} scenarios and {len(client_personas)} client personas.")
        return True
    
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = seed_basic_data()
    sys.exit(0 if success else 1) 