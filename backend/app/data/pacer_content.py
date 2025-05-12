"""
PACER Methodology Content Library

This module contains detailed content about each stage of the PACER sales methodology,
including key concepts, best practices, and examples. This content is used in the game
to provide educational resources and guidance to players.
"""

PACER_METHODOLOGY = {
    "overview": {
        "title": "PACER Sales Methodology Overview",
        "description": """
        The PACER methodology is a comprehensive framework for complex B2B sales, 
        especially suited for payment processing solutions. It provides a structured 
        approach to navigate the entire sales cycle from prospecting to customer retention.
        
        The methodology consists of five sequential stages:
        - Prospect: Identify and qualify potential customers
        - Assess: Understand customer needs and pain points
        - Challenge: Present insights and solutions that challenge the status quo
        - Execute: Navigate complex buying processes and close deals
        - Retain: Maintain and grow customer relationships
        """,
        "key_principles": [
            "Value-based selling over feature-based selling",
            "Consultative approach to understand business challenges",
            "Insight delivery to educate prospects about opportunities",
            "Multi-stakeholder navigation and alignment",
            "Long-term relationship building"
        ]
    },
    
    "P": {
        "title": "Prospect",
        "description": "The Prospect stage focuses on identifying and qualifying potential customers who could benefit from My Company's payment solutions.",
        "key_concepts": [
            {
                "title": "Ideal Customer Profile",
                "description": "Define characteristics of organizations most likely to benefit from My Company solutions, including industry, size, geographic presence, and technical maturity."
            },
            {
                "title": "Strategic Account Selection",
                "description": "Prioritize accounts based on potential deal size, strategic importance, likelihood of success, and alignment with My Company's growth objectives."
            },
            {
                "title": "Multi-channel Prospecting",
                "description": "Utilize various channels including referrals, networking, digital marketing, industry events, and targeted outreach to identify prospects."
            },
            {
                "title": "Value-based Initial Contact",
                "description": "Lead with industry insights and value propositions rather than product features when making initial contact."
            }
        ],
        "best_practices": [
            "Research prospects thoroughly before reaching out",
            "Personalize outreach based on industry-specific pain points",
            "Use open-ended questions to engage prospects in meaningful conversation",
            "Qualify prospects using the BANT framework (Budget, Authority, Need, Timeline)",
            "Identify potential objections early and prepare responses"
        ],
        "common_mistakes": [
            "Leading with product features instead of business value",
            "Insufficient research before initial contact",
            "Failing to identify key decision-makers early",
            "Poor qualification leading to wasted time on low-potential prospects",
            "Generic messaging that doesn't address industry-specific challenges"
        ],
        "examples": [
            {
                "scenario": "Cold outreach to retail prospect",
                "approach": """
                Subject: Reducing Payment Friction for RetailCo Customers
                
                Dear [Name],
                
                Our recent research with similar retailers showed that optimizing payment flows 
                resulted in a 12% increase in completed transactions. 
                
                Many retailers like yours are facing challenges with cart abandonment and 
                cross-border payment acceptance. I'd like to share some industry-specific 
                insights that have helped our retail clients address these challenges.
                
                Would you be open to a brief call to discuss how these approaches might 
                apply to RetailCo's payment strategy?
                """
            }
        ]
    },
    
    "A": {
        "title": "Assess",
        "description": "The Assess stage involves deeply understanding the prospect's business needs, pain points, and decision-making process.",
        "key_concepts": [
            {
                "title": "Needs Analysis",
                "description": "Systematically uncover business requirements, technical constraints, and strategic objectives related to payment processing."
            },
            {
                "title": "Stakeholder Mapping",
                "description": "Identify all stakeholders involved in the decision process, their roles, influence levels, personal motivations, and potential objections."
            },
            {
                "title": "Current State Assessment",
                "description": "Document the prospect's existing payment infrastructure, processes, challenges, and performance metrics."
            },
            {
                "title": "Future State Vision",
                "description": "Collaboratively develop a vision of what success looks like for the prospect after implementing My Company solutions."
            }
        ],
        "best_practices": [
            "Use a structured discovery framework to ensure comprehensive needs assessment",
            "Ask probing questions that reveal underlying business challenges",
            "Listen actively and take detailed notes during assessment meetings",
            "Validate your understanding by summarizing what you've heard",
            "Identify both technical and business requirements",
            "Quantify the impact of current pain points where possible"
        ],
        "common_mistakes": [
            "Rushing through the assessment phase to present solutions",
            "Failing to engage all relevant stakeholders",
            "Not asking about budget and decision process",
            "Missing underlying needs by accepting surface-level answers",
            "Focusing only on technical requirements without business context"
        ],
        "examples": [
            {
                "scenario": "Discovery meeting with banking client",
                "approach": """
                Questions to ask:
                
                1. "What are your top three challenges with your current card issuing platform?"
                2. "How do these challenges impact your customer experience and operational efficiency?"
                3. "What would an ideal solution look like from your perspective?"
                4. "Who else in the organization is involved in this decision?"
                5. "What metrics would you use to measure success in this project?"
                6. "What timeline are you working with for implementation?"
                7. "Have you allocated budget for this initiative?"
                """
            }
        ]
    },
    
    "C": {
        "title": "Challenge",
        "description": "The Challenge stage focuses on providing unique insights and challenging the prospect's thinking to demonstrate My Company's value and differentiation.",
        "key_concepts": [
            {
                "title": "Insight Delivery",
                "description": "Share relevant industry data, trends, and best practices that help the prospect see new opportunities or risks they hadn't considered."
            },
            {
                "title": "Solution Mapping",
                "description": "Connect My Company solutions directly to the prospect's specific needs and desired business outcomes identified in the Assess stage."
            },
            {
                "title": "Competitive Differentiation",
                "description": "Clearly articulate My Company's unique advantages over competitors in a way that's relevant to the prospect's priorities."
            },
            {
                "title": "ROI Modeling",
                "description": "Develop a compelling business case showing the expected return on investment from implementing My Company solutions."
            }
        ],
        "best_practices": [
            "Present insights specific to the prospect's industry and situation",
            "Use data and case studies to support your recommendations",
            "Emphasize business outcomes over technical features",
            "Address competitive offerings proactively and respectfully",
            "Tailor your presentation to different stakeholder interests",
            "Use visual aids to clarify complex concepts"
        ],
        "common_mistakes": [
            "Generic presentations not tailored to the specific prospect",
            "Focusing too much on product features rather than business impact",
            "Not addressing competitive alternatives that the prospect is considering",
            "Overwhelming the prospect with too much information",
            "Failing to quantify the value proposition"
        ],
        "examples": [
            {
                "scenario": "Presenting to retail prospect",
                "approach": """
                "Based on our assessment of your current payment infrastructure, we've identified 
                three key opportunities:
                
                1. Reducing cart abandonment by 15% through optimized checkout flows and 
                   localized payment methods, potentially worth €2.4M annually
                   
                2. Decreasing fraud losses by 25% with advanced AI-driven fraud prevention, 
                   saving approximately €800K annually
                   
                3. Expanding into new markets with localized payment acceptance, potentially 
                   growing revenue by 12% in the first year
                
                While Competitor X offers similar baseline functionality, our solution provides 
                superior fraud prevention with 30% fewer false positives and supports 40% more 
                local payment methods in your target expansion markets."
                """
            }
        ]
    },
    
    "E": {
        "title": "Execute",
        "description": "The Execute stage involves navigating the complex buying process, addressing objections, and closing the deal.",
        "key_concepts": [
            {
                "title": "Mutual Action Plan",
                "description": "Develop a detailed roadmap of the steps required to move from proposal to implementation, with clear responsibilities and timelines."
            },
            {
                "title": "Multi-stakeholder Management",
                "description": "Navigate diverse stakeholder priorities and concerns to build consensus around the proposed solution."
            },
            {
                "title": "Objection Handling",
                "description": "Address concerns and objections with data-driven responses and creative problem-solving."
            },
            {
                "title": "Negotiation Strategy",
                "description": "Prepare a structured approach to negotiation that preserves value while addressing customer requirements."
            }
        ],
        "best_practices": [
            "Create a detailed mutual action plan with the prospect",
            "Maintain regular communication with all stakeholders",
            "Document and track all objections and responses",
            "Prepare for negotiations with clear parameters and fallback positions",
            "Involve technical and implementation teams early in the process",
            "Manage customer expectations regarding implementation timeline and requirements"
        ],
        "common_mistakes": [
            "Failing to create a clear path to decision",
            "Losing momentum in the sales process",
            "Not involving implementation teams early enough",
            "Ineffective responses to last-minute objections",
            "Unnecessary discounting due to poor negotiation preparation",
            "Overpromising on implementation timelines or capabilities"
        ],
        "examples": [
            {
                "scenario": "Creating a mutual action plan",
                "approach": """
                Mutual Action Plan for [Customer] My Company Implementation
                
                Week 1-2: Technical requirements workshop with IT team
                Week 3: Solution design and customization proposal
                Week 4: Pricing finalization and contract draft
                Week 5: Legal and compliance review
                Week 6: Contract signing and kickoff planning
                Week 7-8: Implementation planning and resource allocation
                Week 9-12: Phased implementation
                
                Key Milestones:
                - Requirements sign-off: [Date]
                - Final proposal approval: [Date]
                - Contract signature: [Date]
                - Go-live: [Date]
                
                Decision Makers:
                - Final approval: CFO and CTO
                - Technical sign-off: Head of Digital Payments
                - Budget approval: Finance Committee (meets monthly on 15th)
                """
            }
        ]
    },
    
    "R": {
        "title": "Retain",
        "description": "The Retain stage focuses on ensuring customer success, expanding the relationship, and generating referrals.",
        "key_concepts": [
            {
                "title": "Customer Success Planning",
                "description": "Develop a structured approach to ensure the customer achieves their expected business outcomes from My Company solutions."
            },
            {
                "title": "Quarterly Business Reviews",
                "description": "Conduct regular strategic reviews to assess progress, address issues, and identify new opportunities."
            },
            {
                "title": "Account Expansion",
                "description": "Identify opportunities to grow the relationship through additional products, services, or business units."
            },
            {
                "title": "Reference Development",
                "description": "Cultivate customer advocates who can provide references and testimonials for new prospects."
            }
        ],
        "best_practices": [
            "Establish clear success metrics with the customer",
            "Conduct regular business reviews focused on value delivered",
            "Proactively identify and resolve potential issues",
            "Maintain relationships across multiple stakeholders",
            "Stay informed about the customer's business strategy and challenges",
            "Look for opportunities to add value beyond the contracted solutions"
        ],
        "common_mistakes": [
            "Focusing only on technical implementation rather than business outcomes",
            "Neglecting the relationship once the deal is signed",
            "Failing to document and communicate the value delivered",
            "Not staying current on the customer's evolving needs",
            "Missing expansion opportunities due to poor account planning"
        ],
        "examples": [
            {
                "scenario": "Quarterly business review structure",
                "approach": """
                Quarterly Business Review Agenda:
                
                1. Business Update (Customer presents recent developments and priorities)
                2. Implementation Status and Roadmap
                3. Performance Review
                   - Key metrics vs. targets (transaction volume, approval rates, fraud rates)
                   - Support tickets and resolution times
                   - User adoption and feedback
                4. Value Realization
                   - Cost savings achieved
                   - Revenue impact
                   - Operational improvements
                5. Innovation and Roadmap
                   - Upcoming My Company features relevant to customer
                   - Customer's future requirements
                6. Action Items and Next Steps
                """
            }
        ]
    }
}

# Industry-specific PACER applications
INDUSTRY_APPLICATIONS = {
    "Banking": {
        "key_challenges": [
            "Legacy system integration",
            "Regulatory compliance",
            "Digital transformation",
            "Competitive pressure from fintechs",
            "Customer experience expectations"
        ],
        "value_propositions": [
            "Modernized payment infrastructure with reduced operational costs",
            "Regulatory compliance with PSD2, SEPA Instant, etc.",
            "Enhanced digital banking capabilities",
            "Fast time-to-market for new payment products",
            "Reduced fraud losses through advanced detection"
        ],
        "PACER_approach": {
            "P": "Focus on digital transformation objectives and regulatory challenges",
            "A": "Deep dive into technical infrastructure, regulatory requirements, and customer experience goals",
            "C": "Demonstrate how My Company solutions can accelerate digital transformation while ensuring compliance",
            "E": "Address IT security concerns and ensure smooth integration with core banking systems",
            "R": "Regular compliance updates and innovation roadmaps for future banking trends"
        }
    },
    "Retail": {
        "key_challenges": [
            "Omnichannel payment consistency",
            "Cart abandonment rates",
            "Fraud prevention",
            "Cross-border sales barriers",
            "Payment processing costs"
        ],
        "value_propositions": [
            "Seamless omnichannel payment experience",
            "Optimized checkout flows to reduce abandonment",
            "Advanced fraud prevention with minimal false positives",
            "Expanded payment method coverage for international markets",
            "Competitive transaction pricing and improved authorization rates"
        ],
        "PACER_approach": {
            "P": "Focus on revenue growth and customer experience improvements",
            "A": "Analyze current checkout flows, abandonment data, and international payment challenges",
            "C": "Demonstrate ROI through reduced abandonment and increased international sales",
            "E": "Ensure POS integration simplicity and address concerns about customer impact during transition",
            "R": "Regular reviews of transaction data to identify optimization opportunities"
        }
    },
    "Fintech": {
        "key_challenges": [
            "Speed to market",
            "Scalability",
            "Regulatory compliance",
            "Technical integration capabilities",
            "Competitive differentiation"
        ],
        "value_propositions": [
            "Accelerated go-to-market with white-label solutions",
            "Robust APIs and developer resources",
            "Scalable infrastructure for growth",
            "Compliance expertise and built-in safeguards",
            "Access to My Company's global payment network"
        ],
        "PACER_approach": {
            "P": "Focus on growth objectives and technical requirements",
            "A": "Deep dive into API needs, scalability requirements, and compliance challenges",
            "C": "Demonstrate technical advantages and developer support compared to alternatives",
            "E": "Address technical integration concerns with proof of concepts and sandbox access",
            "R": "Regular technical roadmap updates and optimization consultations"
        }
    },
    "E-commerce": {
        "key_challenges": [
            "Conversion optimization",
            "Cross-border payment acceptance",
            "Fraud prevention",
            "Payment processing costs",
            "User experience consistency"
        ],
        "value_propositions": [
            "Optimized checkout experience for higher conversion",
            "Global payment method coverage",
            "Advanced fraud prevention with machine learning",
            "Competitive processing fees with high authorization rates",
            "Simple integration with major e-commerce platforms"
        ],
        "PACER_approach": {
            "P": "Focus on conversion rates and international expansion goals",
            "A": "Analyze checkout flow, abandonment points, and fraud challenges",
            "C": "Demonstrate conversion improvements and fraud reduction potential",
            "E": "Ensure simple integration and minimal disruption during implementation",
            "R": "Continuous optimization through A/B testing and data analysis"
        }
    },
    "Logistics": {
        "key_challenges": [
            "Cross-border payment reconciliation",
            "Complex supplier payment flows",
            "Cash flow management",
            "FX exposure and costs",
            "Payment visibility and tracking"
        ],
        "value_propositions": [
            "Streamlined international payment processes",
            "Reduced FX costs and improved rates",
            "Enhanced payment tracking and reconciliation",
            "Faster settlement times",
            "Simplified supplier onboarding"
        ],
        "PACER_approach": {
            "P": "Focus on operational efficiency and cost reduction",
            "A": "Analyze current payment flows, FX exposure, and reconciliation challenges",
            "C": "Demonstrate cost savings and operational improvements",
            "E": "Address integration with ERP systems and supplier transition concerns",
            "R": "Regular reviews of payment efficiency metrics and cost savings"
        }
    }
}

# Regional payment considerations
REGIONAL_CONSIDERATIONS = {
    "Europe": {
        "key_regulations": [
            "PSD2 (Payment Services Directive 2)",
            "GDPR (General Data Protection Regulation)",
            "SEPA (Single Euro Payments Area)",
            "SCA (Strong Customer Authentication)",
            "Digital Euro initiatives"
        ],
        "unique_challenges": [
            "Complex regulatory landscape with country variations",
            "Strong customer authentication requirements",
            "Open banking implementation",
            "Instant payment adoption",
            "Digital Euro preparation"
        ],
        "popular_payment_methods": [
            "Cards (Visa, Mastercard)",
            "SEPA Credit Transfer and Direct Debit",
            "Digital wallets (Apple Pay, Google Pay)",
            "Local methods (iDEAL, SOFORT, Cartes Bancaires, etc.)",
            "Open banking payments"
        ],
        "sales_approach": "Focus on regulatory compliance, security, and pan-European coverage"
    },
    "North America": {
        "key_regulations": [
            "PCI DSS compliance",
            "State-level privacy regulations (CCPA, etc.)",
            "Nacha rules for ACH",
            "KYC/AML requirements",
            "Card network rules"
        ],
        "unique_challenges": [
            "Fragmented regulatory landscape across states",
            "High card processing costs",
            "Legacy ACH system limitations",
            "Data security and fraud concerns",
            "Real-time payment adoption"
        ],
        "popular_payment_methods": [
            "Credit and debit cards",
            "ACH transfers",
            "Digital wallets (Apple Pay, Google Pay, PayPal)",
            "Real-Time Payments (RTP)",
            "Buy Now Pay Later solutions"
        ],
        "sales_approach": "Focus on innovation, efficiency, fraud reduction, and customer experience"
    },
    "APAC": {
        "key_regulations": [
            "Varied regulations by country",
            "Cross-border payment restrictions",
            "Data localization requirements",
            "Electronic payment licenses",
            "Regional standards (e.g., India's UPI)"
        ],
        "unique_challenges": [
            "Extreme diversity across markets",
            "Local payment method requirements",
            "Cross-border restrictions and compliance",
            "Fast-changing regulatory landscape",
            "Digital wallet dominance in many markets"
        ],
        "popular_payment_methods": [
            "QR code payments (Alipay, WeChat Pay, Paytm, etc.)",
            "Bank transfers and real-time payments",
            "Cards (primarily in developed markets)",
            "Digital wallets (region-specific)",
            "Alternative payment methods (convenience stores, etc.)"
        ],
        "sales_approach": "Focus on localization, flexibility, and market-specific adaptations"
    }
} 