import os
import sys
from sqlalchemy.orm import Session
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models, schemas

# Create tables to ensure they exist
models.Base.metadata.create_all(bind=engine)

def seed_phase2_2_data():
    db = SessionLocal()
    
    try:
        print("Starting Phase 2.2 content library expansion seeding...")
        
        # Check if we already have the expanded content
        europe_scenarios = db.query(models.Scenario).filter(models.Scenario.region == "Europe").count()
        north_america_scenarios = db.query(models.Scenario).filter(models.Scenario.region == "North America").count()
        apac_scenarios = db.query(models.Scenario).filter(models.Scenario.region == "APAC").count()
        
        if europe_scenarios > 1 and north_america_scenarios > 1 and apac_scenarios > 1:
            print("Phase 2.2 content already seeded.")
            return {"message": "Phase 2.2 content already exists in the database"}
        
        # 1. Create region-specific scenarios
        # EUROPE SCENARIOS
        eu_scenario1 = models.Scenario(
            title="SEPA Instant Payments Integration",
            description="Help a European bank implement SEPA Instant Payments and navigate the regulatory landscape",
            difficulty=2,
            pacer_stage="P",
            product_type="Instant Payments",
            industry="Banking",
            region="Europe",
            is_multi_stakeholder=False,
            scenario_type="standard"
        )
        
        eu_scenario2 = models.Scenario(
            title="Digital Euro Implementation Strategy",
            description="Consult with a central bank on their Digital Euro implementation roadmap",
            difficulty=3,
            pacer_stage="A",
            product_type="CBDC / Digital Euro",
            industry="Banking",
            region="Europe",
            is_multi_stakeholder=True,
            scenario_type="multi_stakeholder"
        )
        
        eu_scenario3 = models.Scenario(
            title="PSD2 Compliance and Open Banking",
            description="Help a financial institution leverage PSD2 requirements for new opportunities",
            difficulty=2,
            pacer_stage="C",
            product_type="Account-to-Account Payments",
            industry="Fintech",
            region="Europe",
            is_multi_stakeholder=False,
            scenario_type="competitive"
        )
        
        # NORTH AMERICA SCENARIOS
        na_scenario1 = models.Scenario(
            title="Retail Chain Payment Modernization",
            description="Help a major US retail chain modernize their payment infrastructure",
            difficulty=2,
            pacer_stage="E",
            product_type="Acceptance & Authorization",
            industry="Retail",
            region="North America",
            is_multi_stakeholder=True,
            scenario_type="multi_stakeholder"
        )
        
        na_scenario2 = models.Scenario(
            title="Fraud Prevention for E-commerce Giant",
            description="Present advanced fraud prevention solutions to an e-commerce company facing increased fraud rates",
            difficulty=2,
            pacer_stage="C",
            product_type="Fraud Risk Management",
            industry="E-commerce",
            region="North America",
            is_multi_stakeholder=False,
            scenario_type="competitive"
        )
        
        na_scenario3 = models.Scenario(
            title="Corporate Card Program Overhaul",
            description="Help a financial services firm revamp their corporate card offerings",
            difficulty=3,
            pacer_stage="R",
            product_type="Issuing Solutions",
            industry="Financial Services",
            region="North America",
            is_multi_stakeholder=False,
            scenario_type="standard"
        )
        
        # APAC SCENARIOS
        apac_scenario1 = models.Scenario(
            title="Mobile Payments Expansion in Southeast Asia",
            description="Support a bank's expansion of mobile payment capabilities across Southeast Asian markets",
            difficulty=3,
            pacer_stage="P",
            product_type="Digital Services",
            industry="Banking",
            region="APAC",
            is_multi_stakeholder=False,
            scenario_type="standard"
        )
        
        apac_scenario2 = models.Scenario(
            title="Super App Integration Strategy",
            description="Help an APAC super app integrate advanced payment capabilities",
            difficulty=3,
            pacer_stage="A",
            product_type="Acceptance & Authorization",
            industry="Technology",
            region="APAC",
            is_multi_stakeholder=True,
            scenario_type="multi_stakeholder"
        )
        
        apac_scenario3 = models.Scenario(
            title="Cross-Border Payments Solution",
            description="Present cross-border payment solutions to a company with operations across APAC",
            difficulty=2,
            pacer_stage="C",
            product_type="Account-to-Account Payments",
            industry="Logistics",
            region="APAC",
            is_multi_stakeholder=False,
            scenario_type="competitive"
        )
        
        db.add_all([
            eu_scenario1, eu_scenario2, eu_scenario3,
            na_scenario1, na_scenario2, na_scenario3,
            apac_scenario1, apac_scenario2, apac_scenario3
        ])
        db.commit()
        
        # 2. Add client personas for each scenario
        # Europe personas
        eu_persona1 = models.ClientPersona(
            scenario_id=eu_scenario1.id,
            name="Hans Müller",
            role="Head of Payments Infrastructure",
            company="EuroBank AG",
            personality_traits="Methodical, regulatory-focused, risk-averse",
            pain_points="Slow payment settlement, regulatory compliance costs, legacy system integration",
            decision_criteria="Compliance with ECB requirements, system reliability, cost efficiency"
        )
        
        eu_persona2 = models.ClientPersona(
            scenario_id=eu_scenario3.id,
            name="Sophie Laurent",
            role="Innovation Director",
            company="OpenFin Europe",
            personality_traits="Forward-thinking, collaborative, strategic",
            pain_points="API standardization, security concerns, competitive differentiation",
            decision_criteria="API capabilities, developer support, time-to-market"
        )
        
        # North America personas
        na_persona1 = models.ClientPersona(
            scenario_id=na_scenario2.id,
            name="David Reynolds",
            role="VP of Security",
            company="MegaShop Online",
            personality_traits="Protective, detail-oriented, data-driven",
            pain_points="Rising chargeback rates, sophisticated fraud rings, false positives affecting customers",
            decision_criteria="Real-time detection capabilities, machine learning advancements, integration simplicity"
        )
        
        na_persona2 = models.ClientPersona(
            scenario_id=na_scenario3.id,
            name="Jennifer Martinez",
            role="Head of Corporate Banking",
            company="Atlantic Financial",
            personality_traits="Relationship-focused, pragmatic, service-oriented",
            pain_points="Manual expense processes, limited data visibility, outdated reporting",
            decision_criteria="Digital capabilities, integration with ERP systems, expense controls"
        )
        
        # APAC personas
        apac_persona1 = models.ClientPersona(
            scenario_id=apac_scenario1.id,
            name="Rajiv Patel",
            role="Chief Digital Officer",
            company="PanAsia Banking Group",
            personality_traits="Ambitious, tech-savvy, growth-focused",
            pain_points="Market fragmentation, regulatory diversity, local payment methods",
            decision_criteria="Adaptability to local markets, scalability, localization capabilities"
        )
        
        apac_persona2 = models.ClientPersona(
            scenario_id=apac_scenario3.id,
            name="Li Wei",
            role="CFO",
            company="Pacific Logistics",
            personality_traits="Analytical, cost-conscious, efficiency-driven",
            pain_points="FX costs, payment delays, reconciliation challenges",
            decision_criteria="Speed of settlement, transaction costs, visibility and tracking"
        )
        
        db.add_all([
            eu_persona1, eu_persona2,
            na_persona1, na_persona2,
            apac_persona1, apac_persona2
        ])
        db.commit()
        
        # 3. Add stakeholders for multi-stakeholder scenarios
        # For EU Digital Euro scenario
        eu_stakeholder1 = models.Stakeholder(
            scenario_id=eu_scenario2.id,
            name="Dr. Andreas Schmidt",
            role="Director of Digital Currencies",
            influence_level=5,
            is_decision_maker=True,
            personality_traits="Academic, thorough, cautious",
            interests="Monetary policy implications, security architecture, interoperability",
            concerns="Privacy concerns, disintermediation of commercial banks, public adoption",
            communication_style="analytical"
        )
        
        eu_stakeholder2 = models.Stakeholder(
            scenario_id=eu_scenario2.id,
            name="Claudia Berger",
            role="Head of Technology",
            influence_level=4,
            is_decision_maker=False,
            personality_traits="Technology-focused, practical, detail-oriented",
            interests="Technology stack, scalability, resilience",
            concerns="Integration complexity, performance at scale, security vulnerabilities",
            communication_style="analytical"
        )
        
        eu_stakeholder3 = models.Stakeholder(
            scenario_id=eu_scenario2.id,
            name="Marco Rossi",
            role="Director of Retail Payments",
            influence_level=3,
            is_decision_maker=False,
            personality_traits="Customer-oriented, pragmatic, collaborative",
            interests="User experience, merchant adoption, interoperability with existing systems",
            concerns="Consumer adoption, training requirements, transition period",
            communication_style="amiable"
        )
        
        # For North America retail chain scenario
        na_stakeholder1 = models.Stakeholder(
            scenario_id=na_scenario1.id,
            name="Richard Thompson",
            role="CTO",
            influence_level=5,
            is_decision_maker=True,
            personality_traits="Innovation-driven, results-oriented, decisive",
            interests="System modernization, data analytics, omnichannel integration",
            concerns="Project timeline, operational disruption, PCI compliance",
            communication_style="driver"
        )
        
        na_stakeholder2 = models.Stakeholder(
            scenario_id=na_scenario1.id,
            name="Barbara Wilson",
            role="VP of Store Operations",
            influence_level=4,
            is_decision_maker=False,
            personality_traits="Operations-focused, practical, customer-oriented",
            interests="Checkout speed, employee usability, reliability",
            concerns="Employee training, customer experience during transition, hardware issues",
            communication_style="amiable"
        )
        
        na_stakeholder3 = models.Stakeholder(
            scenario_id=na_scenario1.id,
            name="Carlos Rodriguez",
            role="CFO",
            influence_level=5,
            is_decision_maker=True,
            personality_traits="Financial-focused, ROI-driven, risk-averse",
            interests="Transaction cost reduction, fraud prevention, maintenance costs",
            concerns="Investment size, payback period, hidden costs",
            communication_style="analytical"
        )
        
        # For APAC super app scenario
        apac_stakeholder1 = models.Stakeholder(
            scenario_id=apac_scenario2.id,
            name="Hiroshi Tanaka",
            role="Chief Product Officer",
            influence_level=5,
            is_decision_maker=True,
            personality_traits="Visionary, user-focused, perfectionistic",
            interests="Seamless user experience, feature expansion, competitive advantage",
            concerns="Integration complexity, user friction, time to market",
            communication_style="expressive"
        )
        
        apac_stakeholder2 = models.Stakeholder(
            scenario_id=apac_scenario2.id,
            name="Ananya Singh",
            role="Head of Partnerships",
            influence_level=3,
            is_decision_maker=False,
            personality_traits="Relationship-oriented, strategic, collaborative",
            interests="Merchant ecosystem expansion, commission structure, exclusivity options",
            concerns="Competitor partnerships, revenue sharing, merchant onboarding",
            communication_style="amiable"
        )
        
        apac_stakeholder3 = models.Stakeholder(
            scenario_id=apac_scenario2.id,
            name="Jason Wong",
            role="CTO",
            influence_level=4,
            is_decision_maker=True,
            personality_traits="Technical, methodical, security-conscious",
            interests="API capabilities, system performance, scalability",
            concerns="Security vulnerabilities, system downtimes, maintenance overhead",
            communication_style="analytical"
        )
        
        db.add_all([
            eu_stakeholder1, eu_stakeholder2, eu_stakeholder3,
            na_stakeholder1, na_stakeholder2, na_stakeholder3,
            apac_stakeholder1, apac_stakeholder2, apac_stakeholder3
        ])
        db.commit()
        
        # 4. Add competitor information for competitive scenarios
        eu_competitor = models.CompetitorInfo(
            scenario_id=eu_scenario3.id,
            competitor_name="OpenConnect",
            product_offering="API-first open banking platform with developer portal",
            strengths="Developer-friendly documentation, established marketplace, first-mover advantage in PSD2 solutions",
            weaknesses="Limited customer support, incomplete coverage of EU institutions, basic analytics",
            pricing_strategy="Per-API call pricing with volume discounts, separate pricing for premium features",
            key_differentiators="Marketplace of fintech plugins, compliance automation, sandbox environment"
        )
        
        na_competitor = models.CompetitorInfo(
            scenario_id=na_scenario2.id,
            competitor_name="FraudShield",
            product_offering="E-commerce fraud prevention platform",
            strengths="Well-known brand, real-time decisioning, extensive fraud database, simple integration",
            weaknesses="Rules-based approach with limited AI, false positives, limited customization",
            pricing_strategy="Percentage of transaction value with minimum monthly fee",
            key_differentiators="Dashboard simplicity, quick implementation, pre-built integrations with major platforms"
        )
        
        apac_competitor = models.CompetitorInfo(
            scenario_id=apac_scenario3.id,
            competitor_name="AsiaTransfer",
            product_offering="Cross-border payment network for APAC region",
            strengths="Local market knowledge, established relationships with regional banks, specialized in APAC corridors",
            weaknesses="Limited global reach, traditional settlement approach, basic technology stack",
            pricing_strategy="Fixed fee plus FX spread, volume-based discounting",
            key_differentiators="Local currency support, regional compliance expertise, local support teams"
        )
        
        db.add_all([eu_competitor, na_competitor, apac_competitor])
        db.commit()
        
        # Add badges related to regional expertise
        europe_expert = models.Badge(
            name="Europe Market Expert",
            description="Demonstrated expertise in European payment scenarios and regulations",
            category="Regional Expertise",
            image_url="/badges/europe_expert.png",
            criteria={"region": "Europe", "completed_scenarios": 5, "min_score": 80}
        )
        
        na_expert = models.Badge(
            name="North America Market Expert",
            description="Mastered the complexities of North American payment landscapes",
            category="Regional Expertise",
            image_url="/badges/na_expert.png",
            criteria={"region": "North America", "completed_scenarios": 5, "min_score": 80}
        )
        
        apac_expert = models.Badge(
            name="APAC Market Expert",
            description="Successfully navigated the diverse payment ecosystems of the APAC region",
            category="Regional Expertise",
            image_url="/badges/apac_expert.png",
            criteria={"region": "APAC", "completed_scenarios": 5, "min_score": 80}
        )
        
        competitive_expert = models.Badge(
            name="Competitive Edge Master",
            description="Consistently won against competitive offerings across regions",
            category="Competitive Selling",
            image_url="/badges/competitive_expert.png",
            criteria={"scenario_type": "competitive", "completed_scenarios": 5, "min_score": 85}
        )
        
        db.add_all([europe_expert, na_expert, apac_expert, competitive_expert])
        db.commit()
        
        print("Phase 2.2 content library expansion completed successfully.")
        return {"message": "Phase 2.2 content library expansion completed successfully"}
    
    except Exception as e:
        db.rollback()
        print(f"Error seeding Phase 2.2 data: {str(e)}")
        return {"error": str(e)}
    
    finally:
        db.close()

if __name__ == "__main__":
    seed_phase2_2_data() 