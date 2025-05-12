from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.models import Base
from app.database import SQLALCHEMY_DATABASE_URL

def create_tables():
    """Create all database tables defined in models.py."""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    print("Database tables created successfully.")

if __name__ == "__main__":
    create_tables() 