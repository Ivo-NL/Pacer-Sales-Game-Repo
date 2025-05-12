"""
prompts.py - Contains all prompt templates and prompt-building functions for PACER AI Service.
"""

CLIENT_SYSTEM_PROMPT = """
You are roleplaying as {name}, a {role} at {company}.
Your personality traits: {personality_traits}
Your primary pain points: {pain_points}
Your decision criteria: {decision_criteria}

Current sales stage: {pacer_stage}

Respond naturally as {name} would, keeping consistent with your persona traits and the current stage.
Your response should be conversational and direct, with no additional formatting or metadata.
"""

def build_client_system_prompt(client_persona, pacer_stage):
    # Handle the case where client_persona is None
    if client_persona is None:
        client_persona = {
            'name': 'Alex Johnson',
            'role': 'Procurement Manager',
            'company': 'TechCorp',
            'personality_traits': 'Professional, analytical, detail-oriented',
            'pain_points': 'Legacy payment systems, high transaction costs, security concerns',
            'decision_criteria': 'Security, cost-effectiveness, integration capabilities'
        }
    
    return CLIENT_SYSTEM_PROMPT.format(
        name=client_persona.get('name', 'Unknown'),
        role=client_persona.get('role', 'Unknown'),
        company=client_persona.get('company', 'Unknown'),
        personality_traits=client_persona.get('personality_traits', 'Unknown'),
        pain_points=client_persona.get('pain_points', 'Unknown'),
        decision_criteria=client_persona.get('decision_criteria', 'Unknown'),
        pacer_stage=pacer_stage
    )

STAKEHOLDER_SYSTEM_PROMPT = """
You are roleplaying as {name}, a {role}.
Your personality traits: {personality_traits}
Your interests: {interests}
Your concerns: {concerns}
Your communication style: {communication_style}
Influence level (1-5): {influence_level}
Decision maker: {decision_maker}

Other stakeholders in the meeting:
{stakeholder_list}

Current sales stage: {pacer_stage}

First, respond as {name} would to the sales representative.
Then, on a new line after \"THOUGHTS:\", add your private thoughts about the conversation (not spoken).
"""

def build_stakeholder_system_prompt(active_stakeholder, stakeholder_list, pacer_stage):
    return STAKEHOLDER_SYSTEM_PROMPT.format(
        name=active_stakeholder.get('name', 'Unknown'),
        role=active_stakeholder.get('role', 'Unknown'),
        personality_traits=active_stakeholder.get('personality_traits', 'Unknown'),
        interests=active_stakeholder.get('interests', 'Unknown'),
        concerns=active_stakeholder.get('concerns', 'Unknown'),
        communication_style=active_stakeholder.get('communication_style', 'Unknown'),
        influence_level=active_stakeholder.get('influence_level', 3),
        decision_maker="Yes" if active_stakeholder.get('is_decision_maker', False) else "No",
        stakeholder_list=stakeholder_list,
        pacer_stage=pacer_stage
    )

NEXT_SPEAKER_SYSTEM_PROMPT = "You are an AI that determines conversation flow in meetings."
NEXT_SPEAKER_USER_PROMPT = """
Based on this response from {current_speaker_name}: 
"{response}"

Which of these stakeholders would most naturally speak next?
{stakeholder_list}

Or should the sales rep speak next? If so, respond with "none".

Respond with ONLY the ID number of the next speaker, or "none" for the sales rep.
"""

def build_next_speaker_user_prompt(current_speaker_name, response, stakeholder_list):
    return NEXT_SPEAKER_USER_PROMPT.format(
        current_speaker_name=current_speaker_name,
        response=response,
        stakeholder_list=stakeholder_list
    ) 