"""
Script to seed Phase 2.2 content library expansion data.
This should be run after the initial data has been seeded.
"""

from app.seed_phase2_2 import seed_phase2_2_data

if __name__ == "__main__":
    result = seed_phase2_2_data()
    print(result) 