# ai_service.py
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.prompts import ChatPromptTemplate
from typing import List, Dict, Optional, Any, Union
import os
import re
import subprocess
import json
import random
from datetime import datetime
import inspect
import traceback
import openai
import asyncio
from typing import AsyncGenerator
import aiohttp
import base64
import io
from fastapi import WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError, WebSocketException
from websockets.client import WebSocketClientProtocol
import websockets
import httpx
from openai import AsyncOpenAI
import time
from .prompts import build_client_system_prompt, build_stakeholder_system_prompt, build_next_speaker_user_prompt
from .scoring import parse_evaluation_json, calculate_total_score
from .client_ai import chat_completion_sync, chat_completion_async

# Use async_timeout if asyncio.timeout is not available (Python < 3.11)
try:
    from asyncio import timeout
except ImportError:
    from async_timeout import timeout

# Configure logging - pm
import logging
logger = logging.getLogger(__name__)

# --- Add immediate check for API Key at import time ---
api_key_at_import = os.getenv('OPENAI_API_KEY')
logger.info(f"---> OPENAI_API_KEY status at ai_service import: {'FOUND' if api_key_at_import else 'MISSING/EMPTY'}")
# --- End immediate check ---

# Placeholder for WebSocketConnectionClosedException
class WebSocketConnectionClosedException(Exception):
    pass

# Helper for debugging
def log_function_name():
    current_frame = inspect.currentframe()
    calling_frame = inspect.getouterframes(current_frame)[1]
    function_name = calling_frame.function
    logger.info(f"Executing function: {function_name}")

# Get API key from environment
api_key = os.environ.get("OPENAI_API_KEY", "")

if not api_key:
    logger.warning("OPENAI_API_KEY environment variable not found or empty")
else:
    masked_key = f"{api_key[:5]}...{api_key[-4:]}" if len(api_key) > 9 else "Key too short to mask effectively"
    print(f"Loaded OpenAI API Key (masked): {masked_key}")

# --- Read Model Names from Environment Variables --- 
default_chat_model = "gpt-4o-mini"
default_realtime_model = "gpt-4o-mini-realtime-preview"
default_transcribe_model = "gpt-4o-transcribe" # Changed default

CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", default_chat_model)
REALTIME_MODEL = os.environ.get("OPENAI_REALTIME_MODEL", default_realtime_model)
TRANSCRIBE_MODEL = os.environ.get("OPENAI_TRANSCRIBE_MODEL", default_transcribe_model)

logger.info(f"Using Chat Model: {CHAT_MODEL} (Default: {default_chat_model})")
logger.info(f"Using Realtime Model: {REALTIME_MODEL} (Default: {default_realtime_model})")
logger.info(f"Using Transcribe Model: {TRANSCRIBE_MODEL} (Default: {default_transcribe_model})")
# --- End Model Names --- 

# Flag for development/testing to return mock responses
MOCK_MODE = False
logger.info("MOCK_MODE disabled - using real OpenAI API responses")

# Initialize OpenAI client (Using CHAT_MODEL)
if not MOCK_MODE:
    try:
        llm = ChatOpenAI(
            model=CHAT_MODEL, # Use variable
            temperature=0.7,
        )
        logger.info(f"LangChain chat model initialized with {CHAT_MODEL}")
    except Exception as e:
        logger.error(f"Failed to initialize LangChain chat model: {e}. Check your OPENAI_API_KEY environment variable.")
        logger.warning("Falling back to MOCK_MODE due to initialization failure. Set a valid API key to use real responses.")
        MOCK_MODE = True

# Removed redundant REALTIME_MODEL definition here

class AIService:
    """Service for handling AI interactions using OpenAI's models or mock responses."""
    
    @staticmethod
    def generate_client_response(
        client_persona: Dict, 
        pacer_stage: str, 
        conversation_history: List[Dict],
        player_input: str,
        context: Optional[Dict] = None
    ) -> str:
        """Generate a response from the client based on the conversation history and player input."""
        log_function_name()
        
        if MOCK_MODE:
            return AIService._generate_mock_response(client_persona, pacer_stage, conversation_history, player_input)
        
        # Prepare messages array - first, check if a system message is already included
        system_message_exists = any(msg.get("role") == "system" for msg in conversation_history)
        
        # Build system prompt using prompts.py or create one directly
        system_content = build_client_system_prompt(client_persona, pacer_stage)
        
        # Explicitly add language instruction to use English
        system_content += "\n\nCRITICAL INSTRUCTION: You MUST respond in English ONLY. Do not use any other language, regardless of the user's language."
        
        # If no system message in history, add it at the beginning
        if not system_message_exists:
            messages = [
                {"role": "system", "content": system_content}
            ]
            # Add all conversation history items
            messages.extend(conversation_history)
        else:
            # If system message exists, use conversation history as is
            messages = conversation_history.copy()
            logger.info("Using system message from conversation history")
        
        # Log the number of messages being sent to the API
        logger.info(f"generate_client_response: Sending {len(messages)} messages to OpenAI API, including: "
                   f"{sum(1 for m in messages if m.get('role') == 'system')} system, "
                   f"{sum(1 for m in messages if m.get('role') == 'user')} user, "
                   f"{sum(1 for m in messages if m.get('role') == 'assistant')} assistant")
        
        # Add context if available
        context_str = ""
        if context:
            context_str = "Additional context:\n"
            for key, value in context.items():
                if isinstance(value, dict):
                    context_str += f"{key}:\n"
                    for sub_key, sub_value in value.items():
                        context_str += f"  - {sub_key}: {sub_value}\n"
                else:
                    context_str += f"{key}: {value}\n"
        
        # Add player input with optional context
        final_input = player_input
        if context:
            final_input = f"{player_input}\n\n{context_str}"
        
        messages.append({"role": "user", "content": final_input})
        
        # Call OpenAI using client_ai.py
        response = chat_completion_sync(messages)
        return response["choices"][0]["message"]["content"].strip()
    
    @staticmethod
    def _generate_mock_response(
        client_persona: Dict, 
        pacer_stage: str, 
        conversation_history: List[Dict],
        player_input: str
    ) -> str:
        """Generate a mock response for development/testing."""
        log_function_name()
        
        # Map of PACER stages to response templates
        stage_responses = {
            "P": [
                "I appreciate you reaching out. We're currently using a legacy system that's becoming expensive to maintain. Tell me more about your solution.",
                "We've been considering updating our payment systems. What makes your solution different from others in the market?",
                "Our team has been discussing payment processing challenges recently. Could you elaborate on how you might help us?",
                "I'm curious about your offerings, but I need to understand how they align with our specific needs in {industry}."
            ],
            "A": [
                "That's interesting. How would this integrate with our existing systems?",
                "I'm concerned about implementation timeframes. What's your typical onboarding process like?",
                "How would your solution address our specific pain point of {pain_point}?",
                "We had a negative experience with a similar solution last year. How can you assure me this would be different?"
            ],
            "C": [
                "We're also considering a competitor who's offering a 25% discount. How does your solution compare?",
                "I see the value, but I'm struggling to justify the cost to my team. Can you help me understand the ROI better?",
                "Your solution seems similar to what we're already using. What specific improvements would we see?",
                "That's an interesting approach, but I'm not convinced it addresses our primary concern about {pain_point}."
            ],
            "E": [
                "I need to consult with the rest of the team before making a decision. What's the next step in your process?",
                "Let's say we move forward - what would implementation look like in terms of timeline and resources?",
                "Could you provide a detailed proposal that includes pricing tiers and implementation costs?",
                "I'm interested, but I'd need approval from our finance department. Can you provide a cost-benefit analysis?"
            ],
            "R": [
                "We've been using your service for a while now. How can we ensure we're getting the most value?",
                "We're experiencing some challenges with {pain_point}. Is there a way to address this within our current plan?",
                "Our needs have evolved since we first started working together. What additional features might benefit us now?",
                "We're reviewing all of our vendors this quarter. Can you remind me of the key benefits we're receiving?"
            ]
        }
        
        # Default to Assessment stage responses if stage not recognized
        if pacer_stage not in stage_responses:
            pacer_stage = "A"
            
        # Select a random response for the appropriate stage
        responses = stage_responses[pacer_stage]
        response = random.choice(responses)
        
        # Replace placeholders with persona information if available
        if "{industry}" in response and "company" in client_persona:
            response = response.replace("{industry}", client_persona["company"])
            
        if "{pain_point}" in response and "pain_points" in client_persona:
            pain_points = client_persona["pain_points"].split(",")
            pain_point = pain_points[0].strip() if pain_points else "cost and efficiency"
            response = response.replace("{pain_point}", pain_point)
        
        return response
    
    @staticmethod
    def generate_multi_stakeholder_response(
        stakeholders: List[Dict],
        active_stakeholder_id: int,
        pacer_stage: str,
        conversation_history: List[Dict],
        player_input: str,
        context: Optional[Dict] = None
    ) -> Dict:
        log_function_name()
        # Find the active stakeholder
        active_stakeholder = next((s for s in stakeholders if s['id'] == active_stakeholder_id), None)
        if not active_stakeholder:
            raise ValueError(f"Active stakeholder with ID {active_stakeholder_id} not found")
        # Format stakeholder list for context
        stakeholder_list = ""
        for s in stakeholders:
            if s['id'] != active_stakeholder_id:
                stakeholder_list += f"- {s.get('name', 'Unknown')}, {s.get('role', 'Unknown')}, "
                stakeholder_list += f"Influence: {s.get('influence_level', 3)}/5, "
                stakeholder_list += f"Decision maker: {'Yes' if s.get('is_decision_maker', False) else 'No'}\n"
        # Build system prompt using prompts.py
        system_content = build_stakeholder_system_prompt(active_stakeholder, stakeholder_list, pacer_stage)
        messages = [
            {"role": "system", "content": system_content}
        ]
        # Add conversation history
        if conversation_history:
            for entry in conversation_history:
                if 'stakeholder_id' in entry:
                    speaker_name = next((s.get('name', 'Unknown') for s in stakeholders if s['id'] == entry['stakeholder_id']), "Unknown")
                    if entry['stakeholder_id'] == active_stakeholder_id:
                        messages.append({"role": "assistant", "content": entry.get('response', '')})
                    else:
                        messages.append({"role": "user", "content": f"{speaker_name}: {entry.get('response', '')}"})
                elif 'player_input' in entry:
                    messages.append({"role": "user", "content": f"Sales Rep: {entry.get('player_input', '')}"})
        # Add context if available
        context_str = ""
        if context:
            context_str = "Additional context:\n"
            for key, value in context.items():
                if isinstance(value, dict):
                    context_str += f"{key}:\n"
                    for sub_key, sub_value in value.items():
                        context_str += f"  - {sub_key}: {sub_value}\n"
                else:
                    context_str += f"{key}: {value}\n"
        current_input = f"Sales Rep: {player_input}"
        if context:
            current_input = f"Sales Rep: {player_input}\n\n{context_str}"
        messages.append({"role": "user", "content": current_input})
        # Call OpenAI using client_ai.py
        response = chat_completion_sync(messages)
        response_text = response["choices"][0]["message"]["content"].strip()
        # Parse out thoughts if present
        thoughts = "No specific thoughts."
        response_only = response_text
        if "THOUGHTS:" in response_text:
            parts = response_text.split("THOUGHTS:", 1)
            response_only = parts[0].strip()
            if len(parts) > 1:
                thoughts = parts[1].strip()
        # Determine the next speaker
        next_speaker_id = AIService._determine_next_speaker(
            stakeholders,
            active_stakeholder_id,
            response_only,
            pacer_stage
        )
        return {
            "stakeholder_id": active_stakeholder_id,
            "response": response_only,
            "thoughts": thoughts,
            "next_speaker_id": next_speaker_id
        }

    @staticmethod
    def _determine_next_speaker(
        stakeholders: List[Dict],
        current_speaker_id: int,
        response: str,
        pacer_stage: str
    ) -> Optional[int]:
        log_function_name()
        # Format stakeholder list
        stakeholder_list = ""
        for s in stakeholders:
            if s['id'] != current_speaker_id:
                stakeholder_list += f"- ID: {s.get('id', 0)}, Name: {s.get('name', 'Unknown')}, Role: {s.get('role', 'Unknown')}, "
                stakeholder_list += f"Influence: {s.get('influence_level', 3)}/5\n"
        current_speaker_name = next((s.get('name', 'Unknown') for s in stakeholders if s['id'] == current_speaker_id), "Unknown")
        # Build prompts using prompts.py
        system_prompt = build_next_speaker_user_prompt(current_speaker_name, response, stakeholder_list)
        messages = [
            {"role": "system", "content": "You are an AI that determines conversation flow in meetings."},
            {"role": "user", "content": system_prompt}
        ]
        # Call OpenAI using client_ai.py
        response_obj = chat_completion_sync(messages, temperature=0.2)
        next_speaker_text = response_obj["choices"][0]["message"]["content"].strip().lower()
        try:
            if next_speaker_text != "none":
                import re
                match = re.search(r'\b(\d+)\b', next_speaker_text)
                if match:
                    next_speaker_id = int(match.group(1))
                    for s in stakeholders:
                        if s['id'] == next_speaker_id and next_speaker_id != current_speaker_id:
                            return next_speaker_id
        except Exception:
            pass
        return None

    @staticmethod
    def evaluate_player_response(
        player_input: str,
        ai_response: str,
        pacer_stage: str,
        client_persona: Dict,
        detailed_evaluation: bool = False
    ) -> Dict:
        log_function_name()
        # Pre-format all content directly
        client_details = f"Client: {client_persona.get('name', 'Unknown')}, {client_persona.get('role', 'Unknown')} at {client_persona.get('company', 'Unknown')}\n"
        client_details += f"Personality traits: {client_persona.get('personality_traits', 'Unknown')}\n"
        client_details += f"Pain points: {client_persona.get('pain_points', 'Unknown')}\n"
        client_details += f"Decision criteria: {client_persona.get('decision_criteria', 'Unknown')}\n"
        messages = [
            {"role": "system", "content": "You are an expert sales trainer evaluating a salesperson's performance in a simulation."},
            {"role": "user", "content": f"""Evaluate this sales interaction:

PACER stage: {pacer_stage}

{client_details}

Sales Rep: {player_input}

Client Response: {ai_response}

Please evaluate how well the sales representative's approach aligns with the PACER sales methodology during this {pacer_stage} stage.
Provide scores from 0-100 for the following categories:
1. Methodology alignment: How well the response follows PACER best practices for this stage
2. Rapport building: How effectively the response builds client relationship
3. Progress: How well the response advances the sales process
4. Outcome: Likelihood of positive outcome based on the response

Your response must be a valid JSON object with the following structure:
{{
  "methodology_score": <integer from 0-100>,
  "rapport_score": <integer from 0-100>,
  "progress_score": <integer from 0-100>,
  "outcome_score": <integer from 0-100>,
  "feedback": "<brief constructive feedback>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...]
}}

Respond with ONLY the JSON object, no other text.
"""}
        ]
        # Call OpenAI using client_ai.py
        response = chat_completion_sync(messages, temperature=0.3)
        response_text = response["choices"][0]["message"]["content"].strip()
        # Parse the JSON response using scoring.py
        evaluation = parse_evaluation_json(response_text)
        total_score = calculate_total_score(evaluation)
        evaluation["total_score"] = total_score
        if not detailed_evaluation:
            return {
                "methodology_score": evaluation.get("methodology_score", 50),
                "rapport_score": evaluation.get("rapport_score", 50),
                "progress_score": evaluation.get("progress_score", 50),
                "outcome_score": evaluation.get("outcome_score", 50),
                "total_score": total_score,
                "feedback": evaluation.get("feedback", "No specific feedback provided.")
            }
        return evaluation
    
    @staticmethod
    def _generate_mock_evaluation(
        player_input: str,
        pacer_stage: str,
        detailed_evaluation: bool = False
    ) -> Dict:
        """Generate mock evaluation data for testing/development."""
        
        # Base scores - slightly random but generally positive
        base_score = random.randint(60, 85)
        variation = lambda: random.randint(-15, 15)
        
        # Different feedback templates for different score ranges
        feedback_templates = {
            "high": [
                "Excellent use of questioning techniques to uncover the client's needs. Your approach was well-aligned with the PACER methodology.",
                "Strong demonstration of active listening and value articulation. The client responded positively to your approach.",
                "Very effective communication that moved the sales process forward. Continue this approach in future interactions."
            ],
            "medium": [
                "Good effort, but try asking more specific questions about the client's pain points to better understand their needs.",
                "Solid approach overall. Consider focusing more on the value proposition specific to this client's industry.",
                "You're on the right track, but could improve by addressing objections more directly rather than pivoting away."
            ],
            "low": [
                "Your response could be improved by asking more open-ended questions rather than focusing on your solution too early.",
                "Consider listening more carefully to the client's concerns before presenting solutions. This will build more rapport.",
                "Remember to align your approach with the current PACER stage. Your response was more suited to a different stage."
            ]
        }
        
        # Generate scores
        methodology_score = max(0, min(100, base_score + variation()))
        rapport_score = max(0, min(100, base_score + variation()))
        progress_score = max(0, min(100, base_score + variation()))
        outcome_score = max(0, min(100, base_score + variation()))
        
        # Calculate average score to determine feedback category
        avg_score = (methodology_score + rapport_score + progress_score + outcome_score) / 4
        
        if avg_score >= 75:
            feedback = random.choice(feedback_templates["high"])
        elif avg_score >= 60:
            feedback = random.choice(feedback_templates["medium"])
        else:
            feedback = random.choice(feedback_templates["low"])
        
        # Base evaluation object
        evaluation = {
            'methodology_score': methodology_score,
            'rapport_score': rapport_score,
            'progress_score': progress_score,
            'outcome_score': outcome_score,
            'feedback': feedback
        }
        
        # Add skills demonstrated if detailed evaluation is requested
        if detailed_evaluation:
            evaluation['skills_demonstrated'] = {
                'questioning_technique': random.randint(1, 10),
                'listening_skills': random.randint(1, 10),
                'solution_alignment': random.randint(1, 10),
                'objection_handling': random.randint(1, 10),
                'value_articulation': random.randint(1, 10)
            }
        
        return evaluation
    
    @staticmethod
    def analyze_competitor(
        competitor_info: Dict,
        product_type: str,
        client_needs: List[str]
    ) -> Dict:
        log_function_name()
        # Format client needs as a bulleted list
        formatted_needs = ""
        for need in client_needs:
            formatted_needs += f"- {need}\n"
        # Build messages
        messages = [
            {"role": "system", "content": "You are an expert competitive analyst for payment processing and financial solutions."},
            {"role": "user", "content": f"""
Analyze this competitor against our client's needs:

COMPETITOR INFORMATION:
Name: {competitor_info.get('competitor_name', 'Unknown competitor')}
Product offering: {competitor_info.get('product_offering', 'Payment solution')}
Strengths: {competitor_info.get('strengths', 'Unknown')}
Weaknesses: {competitor_info.get('weaknesses', 'Unknown')}
Pricing strategy: {competitor_info.get('pricing_strategy', 'Unknown')}
Key differentiators: {competitor_info.get('key_differentiators', 'Unknown')}

OUR PRODUCT TYPE:
{product_type}

CLIENT NEEDS:
{formatted_needs}

Provide a JSON analysis with these 4 categories:
1. "advantages": List of our advantages over this competitor
2. "objections": List of common objections based on this competitor
3. "talking_points": Key talking points to use when competing against them
4. "emphasis_points": Aspects of our solution to emphasize for this client

Respond with ONLY the JSON object, no other text.
"""}
        ]
        response = chat_completion_sync(messages, temperature=0.3)
        response_text = response["choices"][0]["message"]["content"].strip()
        analysis = parse_evaluation_json(response_text)
        # Ensure all required fields are present
        if "advantages" not in analysis:
            analysis["advantages"] = ["Superior technology integration", "More flexible pricing"]
        if "objections" not in analysis:
            analysis["objections"] = ["They offer a lower price", "They have more experience in this industry"]
        if "talking_points" not in analysis:
            analysis["talking_points"] = ["Our solution provides better long-term value", "Our customer support is industry-leading"]
        if "emphasis_points" not in analysis:
            analysis["emphasis_points"] = ["Ease of integration", "Scalability as your business grows"]
        return analysis

    @staticmethod
    def generate_meeting_summary(
        conversation_history: List[Dict],
        stakeholders: List[Dict],
        scenario_context: Dict
    ) -> Dict:
        log_function_name()
        # Format stakeholder information
        stakeholder_info = ""
        for s in stakeholders:
            stakeholder_info += f"- {s.get('name', 'Unknown')}: {s.get('role', 'Unknown')}, "
            stakeholder_info += f"Influence: {s.get('influence_level', 3)}/5, "
            stakeholder_info += f"Decision maker: {'Yes' if s.get('is_decision_maker', False) else 'No'}\n"
            stakeholder_info += f"  Interests: {s.get('interests', 'Unknown')}\n"
            stakeholder_info += f"  Concerns: {s.get('concerns', 'Unknown')}\n"
        # Format conversation history
        conv_text = ""
        for entry in conversation_history:
            if 'player_input' in entry:
                conv_text += f"Sales Rep: {entry.get('player_input', '')}\n"
            elif 'ai_response' in entry:
                conv_text += f"Client: {entry.get('ai_response', '')}\n"
            elif 'stakeholder_id' in entry and 'response' in entry:
                speaker_name = next((s.get('name', 'Stakeholder') for s in stakeholders if s.get('id', 0) == entry.get('stakeholder_id', 0)), "Stakeholder")
                conv_text += f"{speaker_name}: {entry.get('response', '')}\n"
            conv_text += "\n"
        # Format scenario context
        context_text = ""
        for key, value in scenario_context.items():
            if isinstance(value, dict):
                context_text += f"{key}:\n"
                for sub_key, sub_value in value.items():
                    context_text += f"  - {sub_key}: {sub_value}\n"
            else:
                context_text += f"{key}: {value}\n"
        # Build messages
        messages = [
            {"role": "system", "content": "You are an expert sales analyst who summarizes meetings and provides strategic guidance."},
            {"role": "user", "content": f"""
Please summarize this sales meeting and provide strategic advice for follow-up:

STAKEHOLDERS:
{stakeholder_info}

SCENARIO CONTEXT:
{context_text}

CONVERSATION:
{conv_text}

Provide a JSON summary with these 5 categories:
1. "summary": Brief summary of what was discussed and key points
2. "stakeholder_interest": Object mapping each stakeholder's name to their level of interest (very high, high, moderate, low, very low)
3. "key_concerns": List of main concerns or objections raised
4. "next_steps": List of recommended follow-up actions
5. "focus_stakeholders": List of stakeholders who should be the primary focus for follow-up

Respond with ONLY the JSON object, no other text.
"""}
        ]
        response = chat_completion_sync(messages, temperature=0.3)
        response_text = response["choices"][0]["message"]["content"].strip()
        summary = parse_evaluation_json(response_text)
        # Ensure all required fields are present
        if "summary" not in summary:
            summary["summary"] = "The meeting covered product features and potential implementation challenges."
        if "stakeholder_interest" not in summary:
            summary["stakeholder_interest"] = {s.get('name', f'Stakeholder {i}'): "moderate" for i, s in enumerate(stakeholders)}
        if "key_concerns" not in summary:
            summary["key_concerns"] = ["Implementation timeline", "Integration with existing systems", "Cost considerations"]
        if "next_steps" not in summary:
            summary["next_steps"] = ["Send follow-up information", "Schedule technical demo", "Prepare ROI analysis"]
        if "focus_stakeholders" not in summary:
            summary["focus_stakeholders"] = [s.get('name', f'Stakeholder {i}') for i, s in enumerate(stakeholders) if s.get('is_decision_maker', False)]
        return summary

    @staticmethod
    def handle_unexpected_event(
        event_type: str,
        event_data: Dict,
        conversation_history: List[Dict],
        scenario_context: Dict,
        player_difficulty_factor: float = 1.0
    ) -> Dict:
        log_function_name()
        # Format the conversation history
        history_text = ""
        if conversation_history:
            for entry in conversation_history[-5:]:
                if 'player_input' in entry and 'ai_response' in entry:
                    history_text += f"Player: {entry.get('player_input', '')}\n"
                    history_text += f"Client: {entry.get('ai_response', '')}\n\n"
        # Format scenario context
        context_text = ""
        for key, value in scenario_context.items():
            if isinstance(value, dict):
                context_text += f"{key}:\n"
                for sub_key, sub_value in value.items():
                    context_text += f"  - {sub_key}: {sub_value}\n"
            else:
                context_text += f"{key}: {value}\n"
        # Format event data
        event_data_text = ""
        for key, value in event_data.items():
            if isinstance(value, dict):
                event_data_text += f"{key}:\n"
                for sub_key, sub_value in value.items():
                    event_data_text += f"  - {sub_key}: {sub_value}\n"
            else:
                event_data_text += f"{key}: {value}\n"
        # Adjust difficulty based on player factor
        difficulty_description = "moderate"
        if player_difficulty_factor < 0.8:
            difficulty_description = "easy"
        elif player_difficulty_factor > 1.2:
            difficulty_description = "challenging"
        # Build messages
        messages = [
            {"role": "system", "content": "You are generating an unexpected event for a sales simulation game."},
            {"role": "user", "content": f"""
Event type: {event_type}
Difficulty level: {difficulty_description}

Event details:
{event_data_text}

Scenario context:
{context_text}

Recent conversation history:
{history_text}

First, describe how this event unfolds in the simulation. The event should create a realistic challenge appropriate for the specified difficulty level.

Then, on a new line after "IMPACT ANALYSIS:", analyze the impact this event would have on the sales process and provide suggestions for how a salesperson might address it.

Finally, on a new line after "CHALLENGE SCORE:", provide a number from 0-100 indicating how difficult this event would be to handle effectively.
"""}
        ]
        response = chat_completion_sync(messages, temperature=0.7)
        response_text = response["choices"][0]["message"]["content"].strip()
        # Parse out the sections
        event_description = response_text
        impact_analysis = ""
        challenge_score = 50  # Default medium difficulty
        if "IMPACT ANALYSIS:" in response_text:
            parts = response_text.split("IMPACT ANALYSIS:", 1)
            event_description = parts[0].strip()
            remaining = parts[1].strip()
            if "CHALLENGE SCORE:" in remaining:
                parts = remaining.split("CHALLENGE SCORE:", 1)
                impact_analysis = parts[0].strip()
                score_text = parts[1].strip()
                try:
                    import re
                    match = re.search(r'\b(\d+)\b', score_text)
                    if match:
                        challenge_score = min(100, max(0, int(match.group(1))))
                except Exception:
                    pass
            else:
                impact_analysis = remaining
        return {
            "event_description": event_description,
            "impact_analysis": impact_analysis,
            "challenge_score": int(challenge_score)
        }
    
    @staticmethod
    def _generate_mock_event(
        event_type: str,
        event_data: Dict,
        difficulty_factor: float = 1.0
    ) -> Dict:
        """Generate a mock unexpected event for development/testing."""
        log_function_name()
        
        # Event templates
        events = {
            "competitor_intervention": [
                "A competitor has unexpectedly offered the client a 15% discount to close the deal this week.",
                "The client has just informed you that your main competitor is offering an enhanced support package at no additional cost.",
                "You've learned that a competing sales team met with the client yesterday and demonstrated some features your solution doesn't have."
            ],
            "stakeholder_change": [
                "A new CTO has joined the client's organization and wants to revisit all technology decisions.",
                "Your main champion at the client is leaving the company next month.",
                "The final decision authority has changed from the CIO to a procurement committee."
            ],
            "budget_issue": [
                "The client just learned their budget for this project has been reduced by 20%.",
                "The client has a freeze on new expenditures until the next fiscal quarter.",
                "The client needs to allocate 30% of the project budget to compliance requirements they hadn't anticipated."
            ],
            "technical_concern": [
                "The client's IT team has raised security concerns about your proposed integration approach.",
                "A technical audit has identified potential compatibility issues with your solution.",
                "The client requires additional customizations that weren't in the original scope."
            ],
            "market_change": [
                "New regulations have been announced that impact how the client can process payments.",
                "A major market disruption has caused the client to reconsider their technology strategy.",
                "A new technology just launched that claims to solve the same problems at lower cost."
            ]
        }
        
        # Default event type if not recognized
        if event_type not in events:
            event_type = "competitor_intervention"
            
        # Select event description
        descriptions = events[event_type]
        event_description = random.choice(descriptions)
        
        # Generate impact analysis based on event type
        impact_analyses = {
            "competitor_intervention": "This competitive threat could delay the sales process or force price concessions.",
            "stakeholder_change": "This change in personnel may require rebuilding relationships and re-establishing value.",
            "budget_issue": "The budget constraints may require restructuring the proposal or offering a phased approach.",
            "technical_concern": "These technical issues need to be addressed to restore confidence in your solution.",
            "market_change": "This market shift requires repositioning your solution in the new context."
        }
        
        impact_analysis = impact_analyses.get(event_type, "This event could significantly impact the sales process.")
        
        # Challenge score adjusted by difficulty factor
        base_difficulty = {
            "competitor_intervention": 60,
            "stakeholder_change": 70,
            "budget_issue": 65,
            "technical_concern": 55,
            "market_change": 75
        }
        
        challenge_score = int(min(100, base_difficulty.get(event_type, 50) * difficulty_factor))
        
        return {
            "event_description": event_description,
            "impact_analysis": impact_analysis,
            "challenge_score": challenge_score
        }
    
    @staticmethod
    def adapt_difficulty(
        base_prompt: str,
        player_performance: Dict,
        difficulty_settings: Dict
    ) -> str:
        """
        Adjust the prompt to reflect appropriate difficulty based on player performance.
        
        Args:
            base_prompt: The original AI prompt
            player_performance: Dict containing player performance metrics
            difficulty_settings: User's difficulty settings
            
        Returns:
            Modified prompt with adjusted difficulty
        """
        # Extract difficulty settings
        base_difficulty = difficulty_settings.get('base_difficulty', 1.0)
        adaptive_factor = difficulty_settings.get('adaptive_factor', 0.1)
        min_difficulty = difficulty_settings.get('min_difficulty', 0.5)
        max_difficulty = difficulty_settings.get('max_difficulty', 2.0)
        
        # Calculate player's recent performance score (0.0-1.0)
        # Higher is better performance
        recent_scores = player_performance.get('recent_scores', [])
        if not recent_scores:
            performance_score = 0.5  # Default middle value
        else:
            performance_score = sum(recent_scores) / len(recent_scores) / 100  # Normalize to 0.0-1.0
        
        # Calculate adaptive difficulty
        # If player is doing well, increase difficulty; if struggling, decrease difficulty
        performance_adjustment = (performance_score - 0.5) * 2 * adaptive_factor
        adjusted_difficulty = base_difficulty + performance_adjustment
        
        # Ensure difficulty stays within bounds
        adjusted_difficulty = max(min_difficulty, min(max_difficulty, adjusted_difficulty))
        
        # Add difficulty instruction to the prompt
        difficulty_instruction = f"""
        The user's current difficulty level is {adjusted_difficulty:.2f} (1.0 is baseline).
        
        If difficulty < 0.8: Make the conversation easier by being more cooperative, providing clear hints about your needs, and responding positively to sales approaches even if they're not perfect.
        
        If difficulty 0.8-1.2: Provide a baseline realistic challenge that represents a typical client interaction.
        
        If difficulty > 1.2: Increase the challenge by being more skeptical, introducing more complex needs or objections, requiring more precise application of sales techniques, and being less forgiving of imperfect approaches.
        
        Adjust your responses according to this difficulty level while maintaining a realistic and consistent persona.
        """
        
        # Append the difficulty instruction to the base prompt
        enhanced_prompt = base_prompt + "\n\n" + difficulty_instruction
        
        return enhanced_prompt, adjusted_difficulty
    
    @staticmethod
    def evaluate_player_event_response(
        event_type: str,
        event_description: str,
        player_response: str
    ) -> Dict:
        """Evaluate how well the player handled an unexpected event."""
        log_function_name()
        
        try:
            # Create a direct call to OpenAI
            client = openai.OpenAI(api_key=api_key)
            
            # Create the messages
            messages = [
                {"role": "system", "content": "You are an expert sales coach evaluating how a sales representative handles unexpected events during client interactions."},
                {"role": "user", "content": f"""Evaluate how well the sales representative handled this unexpected event:

Event type: {event_type}

Event description:
{event_description}

Sales representative's response:
{player_response}

Please evaluate:
1. How effectively did the representative handle this situation? (score from 0-100)
2. How would the client likely respond to this handling of the event?
3. What feedback would you give the representative?

Your response must be a valid JSON object with the following structure:
{{
  "impact_score": <integer from 0-100>,
  "resolution": "<a brief response from the client reflecting how they received the rep's handling>",
  "feedback": "<brief feedback for the representative>"
}}

Respond with ONLY the JSON object, no other text.
"""}
            ]
            
            # Call the OpenAI API directly
            response = client.chat.completions.create(
                model=CHAT_MODEL, # Use variable
                messages=messages,
                temperature=0.3
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Parse the JSON response
            try:
                # Clean up any potential markdown formatting
                if response_text.startswith("```json"):
                    response_text = response_text.split("```json", 1)[1]
                if response_text.endswith("```"):
                    response_text = response_text.rsplit("```", 1)[0]
                    
                evaluation = json.loads(response_text.strip())
                return evaluation
        
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}. Original response: {response_text}")
                raise ValueError("Response not in valid JSON format")
                
        except Exception as e:
            logger.error(f"Error during event evaluation: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Fallback evaluation
            return {
                "impact_score": 50,
                "resolution": "I understand your perspective. Let's continue our discussion.",
                "feedback": "Unable to evaluate response due to an error."
            } 

    @staticmethod
    def _generate_mock_multi_stakeholder_response(
        stakeholders: List[Dict],
        active_stakeholder_id: int,
        player_input: str
    ) -> Dict:
        """Generate mock multi-stakeholder response for development/testing."""
        log_function_name()
        
        # Get the active stakeholder
        active_stakeholder = None
        for stakeholder in stakeholders:
            if stakeholder['id'] == active_stakeholder_id:
                active_stakeholder = stakeholder
                break
        
        if not active_stakeholder:
            return {
                "stakeholder_id": active_stakeholder_id,
                "response": "I'm sorry, I need to consider this further.",
                "thoughts": "Technical issue in generating response.",
                "next_speaker_id": None
            }
            
        # List of possible responses
        responses = [
            "That's an interesting point. I'd like to understand more about how this would impact our department specifically.",
            "I appreciate the overview, but I'm concerned about implementation timeframes and resource requirements.",
            "From my perspective, the most important factor is how this integrates with our existing systems.",
            "I see potential value, but I need to understand the cost structure in more detail.",
            "My team would need comprehensive training on any new system. How is that typically handled?",
            "I think we should proceed cautiously and evaluate all options before making a decision."
        ]
        
        # Thoughts based on stakeholder characteristics
        thoughts_templates = [
            "This could help with my goals around {interests}, but I'm worried about {concerns}.",
            "I'm not fully convinced this addresses our needs regarding {concerns}.",
            "This solution might support my initiatives related to {interests}.",
            "I should discuss this with the team to see how it aligns with our priorities.",
            "I need more data before bringing this to my supervisor."
        ]
        
        # Choose a random response
        response = random.choice(responses)
        
        # Format a thought
        thought_template = random.choice(thoughts_templates)
        thought = thought_template.format(
            interests=active_stakeholder.get('interests', 'efficiency'),
            concerns=active_stakeholder.get('concerns', 'implementation and cost')
        )
        
        # Determine next speaker (random, but not the current speaker)
        next_speaker_options = [s['id'] for s in stakeholders if s['id'] != active_stakeholder_id]
        next_speaker_id = random.choice(next_speaker_options) if next_speaker_options and random.random() > 0.5 else None
        
        return {
            "stakeholder_id": active_stakeholder_id,
            "response": response,
            "thoughts": thought,
            "next_speaker_id": next_speaker_id
        }

    @staticmethod
    async def generate_client_response_stream(
        client_persona: Dict, 
        pacer_stage: str, 
        conversation_history: List[Dict],
        player_input: str,
        context: Optional[Dict] = None
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from the client based on conversation history and player input."""
        log_function_name()
        
        if MOCK_MODE:
            # For mock mode, simulate streaming by yielding characters with delays
            mock_response = AIService._generate_mock_response(
                client_persona, pacer_stage, conversation_history, player_input
            )
            
            for char in mock_response:
                yield char
                await asyncio.sleep(0.01)  # Simulate realistic typing speed
            
            return
        
        try:
            # Create a direct call to OpenAI
            client = openai.AsyncOpenAI(api_key=api_key)
            
            # Prepare messages array - first, check if a system message is already included
            system_message_exists = any(msg.get("role") == "system" for msg in conversation_history)
            
            # If no system message in history, create one with client persona
            if not system_message_exists:
                # Format the system message
                system_content = f"""
You are roleplaying as {client_persona.get('name', 'Unknown')}, a {client_persona.get('role', 'Unknown')} at {client_persona.get('company', 'Unknown')}.
Your personality traits: {client_persona.get('personality_traits', 'Unknown')}
Your primary pain points: {client_persona.get('pain_points', 'Unknown')}
Your decision criteria: {client_persona.get('decision_criteria', 'Unknown')}

Current sales stage: {pacer_stage}

Respond naturally as {client_persona.get('name', 'the client')} would, keeping consistent with your persona traits and the current stage.
Your response should be conversational and direct, with no additional formatting or metadata.

CRITICAL INSTRUCTION: You MUST respond in English ONLY. Do not use any other language, regardless of the user's language.
"""
                
                messages = [
                    {"role": "system", "content": system_content}
                ]
                
                # Add all conversation history
                messages.extend(conversation_history)
            else:
                # If system message exists, use conversation history as is
                messages = conversation_history.copy()
                logger.info("Using system message from conversation history")
            
            # Log the number of messages being sent to the API
            logger.info(f"Sending {len(messages)} messages to OpenAI API, including: "
                       f"{sum(1 for m in messages if m.get('role') == 'system')} system, "
                       f"{sum(1 for m in messages if m.get('role') == 'user')} user, "
                       f"{sum(1 for m in messages if m.get('role') == 'assistant')} assistant")
            
            # Add the player's input as the final message
            messages.append({"role": "user", "content": player_input})
            
            # Stream the response (Using CHAT_MODEL, as this is for text streaming)
            stream = await client.chat.completions.create(
                model=CHAT_MODEL, # Use variable
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=300,
            )
            
            full_response = ""
            
            async for chunk in stream:
                if chunk.choices:
                    content = chunk.choices[0].delta.content
                    if content:
                        full_response += content
                        yield content
            
            # Evaluate the interaction once it's complete
            # This gives time for evaluation while maintaining streaming UX
            if full_response:
                evaluation = AIService.evaluate_player_response(
                    player_input, 
                    full_response, 
                    pacer_stage, 
                    client_persona
                )
                
                # Yield evaluation data as a separate JSON object
                yield json.dumps({"text": full_response, "is_final": True, "evaluation": evaluation})
                
        except Exception as e:
            error_msg = f"Error in generate_client_response_stream: {str(e)}"
            logger.error(error_msg)
            yield json.dumps({"error": error_msg})
            
            # Fallback to non-streaming response in case of error
            try:
                fallback_response = AIService.generate_client_response(
                    client_persona, pacer_stage, conversation_history, player_input, context
                )
                yield json.dumps({"text": fallback_response, "is_final": True, "fallback": True})
            except Exception as fallback_error:
                logger.error(f"Fallback also failed: {str(fallback_error)}")
                yield json.dumps({"error": "Both streaming and fallback failed."})
    
    @staticmethod
    async def transcribe_audio(audio_file_path: str) -> str:
        """Transcribe audio file to text using OpenAI's Whisper model."""
        log_function_name()
        
        if MOCK_MODE:
            # Return mock transcription for testing
            mock_responses = [
                "Hello, I'm interested in learning more about your payment processing solutions.",
                "Can you tell me about the integration timeline?",
                "What kind of security features do you offer?",
                "How does your pricing compare to competitors?",
                "I'll need to discuss this with my team before making a decision."
            ]
            return random.choice(mock_responses)
        
        try:
            # Create a direct call to OpenAI
            client = openai.AsyncOpenAI(api_key=api_key)
            
            # Open the audio file
            with open(audio_file_path, "rb") as audio_file:
                # Call the OpenAI Whisper API
                transcript = await client.audio.transcriptions.create(
                    model=TRANSCRIBE_MODEL, # Use variable
                    file=audio_file
                )
                
                return transcript.text
                
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return a default message in case of error
            return "I couldn't understand the audio. Please try again."

    @staticmethod
    async def generate_speech(text: str, voice: str = "alloy", client_persona: Optional[Dict] = None) -> bytes:
        """Generate speech from text using OpenAI TTS API"""
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key or os.getenv("MOCK_AI_RESPONSES", "False").lower() == "true":
            # Return mock audio for testing (1 second of silence)
            dummy_audio = b'\x00' * 16000  # 16kHz 1-second silence
            return dummy_audio
        
        try:
            # Create a direct call to OpenAI
            client = openai.AsyncOpenAI(api_key=api_key)
            
            # Select the appropriate voice based on client persona if available
            selected_voice = voice
            if client_persona:
                # Convert client_persona to dict if it's a model object
                persona_dict = {}
                if hasattr(client_persona, '__dict__'):
                    # It's a model object, convert attributes to dict
                    for key in ['name', 'role', 'personality_traits']:
                        if hasattr(client_persona, key):
                            persona_dict[key] = getattr(client_persona, key)
                else:
                    # It's already a dict
                    persona_dict = client_persona
                
                # Determine appropriate voice based on persona characteristics
                # This is a simple example - you might want more sophisticated logic
                gender_hint = None
                
                # Extract personality traits as a string for analysis
                traits = ""
                personality_traits = persona_dict.get('personality_traits', '')
                if isinstance(personality_traits, list):
                    traits = ' '.join(personality_traits)
                else:
                    traits = str(personality_traits)
                
                traits = traits.lower()
                
                # Simple gender detection based on name and role (this is a simplification)
                name = persona_dict.get('name', '').lower()
                role = persona_dict.get('role', '').lower()
                
                # Female-associated voices
                if any(term in role for term in ['woman', 'female', 'lady', 'chairwoman', 'businesswoman']):
                    gender_hint = 'female'
                # Male-associated voices
                elif any(term in role for term in ['man', 'male', 'gentleman', 'chairman', 'businessman']):
                    gender_hint = 'male'
                
                # Voice selection logic based on personality and gender hints
                if gender_hint == 'female':
                    if any(term in traits for term in ['authoritative', 'commanding', 'strong']):
                        selected_voice = 'nova'
                    elif any(term in traits for term in ['friendly', 'warm', 'approachable']):
                        selected_voice = 'shimmer'
                    else:
                        selected_voice = 'nova'  # Default female voice
                elif gender_hint == 'male':
                    if any(term in traits for term in ['authoritative', 'commanding', 'strong']):
                        selected_voice = 'onyx'
                    elif any(term in traits for term in ['friendly', 'warm', 'approachable']):
                        selected_voice = 'echo'
                    else:
                        selected_voice = 'echo'  # Default male voice
                else:
                    # No clear gender indication, use a neutral voice or default
                    selected_voice = 'alloy'
            
            # Call the OpenAI TTS API
            response = await client.audio.speech.create(
                model="tts-1",
                voice=selected_voice,
                input=text
            )
            
            # Get the speech data - remove await since response.read() returns bytes directly
            speech_data = response.read()
            
            return speech_data
            
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return silent audio in case of error
            return b'\x00' * 16000  # 16kHz 1-second silence 

    @staticmethod
    async def process_realtime_audio(audio_data: bytes) -> Dict:
        """
        Process real-time audio data using OpenAI's Whisper for transcription
        and GPT for response generation.
        
        Args:
            audio_data (bytes): Audio data in binary format
            
        Returns:
            Dict: Dictionary containing transcript, response, and possibly audio
        """
        try:
            # Log the audio data size
            logger.info(f"Processing realtime audio chunk of size {len(audio_data)} bytes")
            
            # First, transcribe the audio
            transcript = await AIService.transcribe_audio_bytes(audio_data)
            
            # Log what we received from transcription function
            logger.info(f"Raw transcription result: {transcript!r}")
            
            if not transcript or not transcript.strip():
                # If no transcription detected, return early
                logger.info("No transcription detected in audio")
                return {
                    "status": "success",
                    "transcript": "",
                    "is_final": True
                }
            
            # Log the successful transcription
            logger.info(f"Transcribed audio: '{transcript}'")
            
            # Only generate a response if the transcript is substantial
            # More lenient - allow 3 words for better conversational flow
            words = transcript.strip().split()
            if len(words) < 2 and len(transcript) < 8:
                # For very short responses, just echo back without AI response
                logger.info(f"Transcript too short ({len(words)} words, {len(transcript)} chars), not generating AI response")
                return {
                    "status": "success",
                    "transcript": transcript,
                    "is_final": True
                }
            
            # Generate a response to the transcribed text
            logger.info(f"Generating AI response for: '{transcript}'")
            response = await AIService.generate_sales_agent_response(transcript)
            logger.info(f"Generated AI response: '{response[:50]}...' (truncated)")
            
            # Return both the transcript and AI response
            result = {
                "status": "success",
                "transcript": transcript,
                "response": response,
                "is_final": True
            }
            
            # Attempt to generate speech for the response
            try:
                speech_data = await AIService.generate_speech(response)
                if speech_data:
                    # Convert bytes to base64 for WebSocket transmission
                    audio_base64 = base64.b64encode(speech_data).decode('utf-8')
                    result["audio_base64"] = audio_base64
                    logger.info("Successfully generated speech audio")
                else:
                    logger.warning("No audio content in speech result")
            except Exception as e:
                logger.error(f"Error generating speech in real-time mode: {str(e)}")
                # Continue without audio if speech generation fails
            
            return result
            
        except Exception as e:
            logger.error(f"Error in process_realtime_audio: {str(e)}")
            logger.error(traceback.format_exc())
            return {
                "status": "error",
                "error": f"Error processing audio: {str(e)}",
                "transcript": "",
                "response": "I'm sorry, I couldn't process that. Could you repeat?",
                "fallback": True
            }

    @staticmethod
    async def transcribe_audio_bytes(audio_data: bytes) -> str:
        """
        Transcribe audio data directly from bytes.
        Similar to transcribe_audio but doesn't require saving to a file.
        """
        if MOCK_MODE:
            # Return mock transcription for testing
            mock_responses = [
                "Hello, I'm interested in learning more about your payment processing solutions.",
                "Could you explain the integration process in more detail?",
                "What kind of security features do you offer?",
                "How does your pricing compare to competitors?",
                "I'll need to discuss this with my team before making a decision."
            ]
            return random.choice(mock_responses)
        
        # Log the audio data size for debugging
        logger.info(f"Transcribing audio chunk of size {len(audio_data)} bytes using {TRANSCRIBE_MODEL}")
        
        try:
            # Create a direct call to OpenAI
            client = openai.AsyncOpenAI(api_key=api_key)
            
            # Create an in-memory file-like object from the bytes
            audio_file = io.BytesIO(audio_data)
            
            # Pass the in-memory file object with a filename hint
            file_param = ("audio.webm", audio_file)
            
            try:
                # Call the OpenAI Whisper API with specific parameters
                # Pass the file tuple directly to the 'file' parameter
                transcript = await client.audio.transcriptions.create(
                    model=TRANSCRIBE_MODEL, # Use variable
                    file=file_param, # Pass the file-like object tuple
                    language="en",
                    response_format="text",
                    temperature=0.0,
                    prompt="This is a conversation about sales, payment processing, and financial solutions. The voice may be discussing business needs or requirements."
                )
                
                # Log the successful transcription
                logger.info(f"Successfully transcribed audio to text: '{transcript}' (type: {type(transcript)})")
                
                # Handle different return types (string or object with text attribute)
                if hasattr(transcript, 'text'):
                    return transcript.text
            
                return str(transcript)
            
            except Exception as e:
                logger.error(f"Error transcribing audio bytes: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                
        except Exception as e:
            logger.error(f"Error transcribing audio bytes: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return a default message in case of error
            return ""

    @staticmethod
    async def text_to_speech(text: str) -> Dict:
        """
        Convert text to speech and return as a dict with audio content.
        For use with real-time voice mode.
        """
        if MOCK_MODE:
            # Return mock audio for testing (1 second of silence)
            dummy_audio = b'\x00' * 16000  # 16kHz 1-second silence
            return {"audio_content": dummy_audio}
        
        try:
            # Create a direct call to OpenAI
            client = openai.AsyncOpenAI(api_key=api_key)
            
            # Call the OpenAI TTS API with a neutral voice
            response = await client.audio.speech.create(
                model="tts-1",
                voice="alloy",  # Use a neutral voice
                input=text
            )
            
            # Get the audio data
            audio_data = response.read()
            
            return {"audio_content": audio_data}
                
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return an empty response in case of error
            return {"audio_content": b''}

    @staticmethod
    async def generate_sales_agent_response(user_input: str) -> str:
        """
        Generate a response for the sales agent based on user input.
        For use with real-time voice mode.
        """
        if MOCK_MODE:
            # Return mock responses for testing
            responses = [
                "Thank you for your interest in our payment solutions.",
                "The integration timeline typically takes between 2-4 weeks depending on your systems.",
                "Our security features include end-to-end encryption, tokenization, and fraud detection.",
                "Our pricing is competitive and includes volume discounts. I'd be happy to provide a detailed quote.",
                "I understand you need to discuss with your team. What specific aspects would you like me to elaborate on?"
            ]
            return random.choice(responses)
        
        try:
            # Create a direct call to OpenAI for sales agent responses
            client = openai.AsyncOpenAI(api_key=api_key)
            
            # Create the messages
            messages = [
                {"role": "system", "content": "You are a helpful sales agent for a payment processing company. Keep your responses clear, informative, and concise (1-3 sentences)."},
                {"role": "user", "content": user_input}
            ]
            
            # Call the API
            response = await client.chat.completions.create(
                model=CHAT_MODEL, # Use variable
                messages=messages,
                temperature=0.7,
                max_tokens=150
            )
            
            # Return the response content
            return response.choices[0].message.content.strip()
                
        except Exception as e:
            logger.error(f"Error generating sales agent response: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return a default response in case of error
            return "I appreciate your question. Let me find the information you need." 

    @staticmethod
    async def handle_realtime_conversation(client_ws: WebSocket, session_id: int):
        """
        Handles the real-time, bidirectional conversation flow between a client
        and the OpenAI Realtime API via WebSockets.

        Args:
            client_ws: The WebSocket connection to the client.
            session_id: The ID of the game session for context and logging.
        """
        # <<< ADD ENTRY LOGGING HERE >>>
        log_session_id = str(session_id)
        # print(f"---> ENTERED CORRECT handle_realtime_conversation for session {log_session_id} <--- ")
        logger.info(f"---> ENTERED CORRECT handle_realtime_conversation for session {log_session_id} <--- ")

        openai_ws = None  # Initialize openai_ws to None
        connection_active = True
        openai_listener_task = None
        receive_from_openai_failed = asyncio.Event()
        has_sent_audio = False
        ephemeral_token = None # Initialize token

        # --- Nested function definition remains the same ---
        async def receive_from_openai():
            nonlocal connection_active, receive_from_openai_failed, has_sent_audio, openai_ws # Ensure openai_ws is in scope
            # Defensive check: Ensure openai_ws is connected before proceeding
            if not openai_ws:
                logger.error("receive_from_openai started but openai_ws is None!")
                receive_from_openai_failed.set()
                return
            
            # print(f"+++ receive_from_openai task started for session {log_session_id}, listening to OpenAI WS... +++")
            logger.info(f"+++ receive_from_openai task started for session {log_session_id}, listening to OpenAI WS... +++")
            try:
                while connection_active:
                    try:
                                
                        message = await asyncio.wait_for(openai_ws.recv(), timeout=1.0)
                        # <<< IMPROVED LOGGING >>>
                        try:
                            # Attempt to parse the message to log its type
                            message_data = json.loads(message)
                            received_type = message_data.get("type", "unknown_json")
                            # print(f"<<< Session {log_session_id}: Received message from OpenAI, Type: '{received_type}'")
                            logger.info(f"<<< Session {log_session_id}: Received message from OpenAI, Type: '{received_type}'")
                            # <<< ADD ERROR CONTENT LOGGING HERE >>>
                            if received_type == "error":
                                logger.error(f"<<< Session {log_session_id}: Received ERROR details from OpenAI: {json.dumps(message_data)}")
                            # <<< END ERROR CONTENT LOGGING >>>
                            # Log full message content at DEBUG level if needed for deep inspection
                            logger.debug(f"<<< Session {log_session_id}: Full OpenAI message content: {message}")
                        except json.JSONDecodeError:
                             # Log if message is not valid JSON
                             logger.warning(f"<<< Session {log_session_id}: Received non-JSON message from OpenAI: {message[:100]}...")
                        except Exception as log_e: # Catch potential errors during logging/parsing
                            logger.error(f"<<< Session {log_session_id}: Error processing/logging received OpenAI message: {log_e}")
                            logger.debug(f"<<< Session {log_session_id}: Raw OpenAI message causing log error: {message[:200]}...")
                        
                        # Forward the raw message (should be JSON string) directly to client
                        await client_ws.send_text(message)  # Forward raw JSON string

                    except asyncio.TimeoutError:
                        continue  # No message, loop continues
                    except (ConnectionClosedOK, ConnectionClosedError, WebSocketConnectionClosedException, websockets.exceptions.ConnectionClosed) as ws_closed_error: # Add websockets exception
                        logger.warning(f"OpenAI WebSocket connection closed while receiving: {ws_closed_error}")
                        break
                    except AttributeError as ae:
                        logger.error(f"AttributeError in receive_from_openai (openai_ws likely None?): {ae}", exc_info=True)
                        break
                    except Exception as e:
                        logger.error(f"Error receiving/forwarding from OpenAI: {e}", exc_info=True)
                        break  # Exit on other errors
            except Exception as outer_e:
                logger.error(f"Outer error in receive_from_openai task: {outer_e}", exc_info=True)
            finally:
                # print(f"--- receive_from_openai task finishing for session {log_session_id}. ---")
                logger.info(f"--- receive_from_openai task finishing for session {log_session_id}. ---")
                connection_active = False
                receive_from_openai_failed.set()

        # --- Main Function Logic ---
        try:
            # <<< ADD OPENAI CONNECTION LOGIC HERE >>>
            # print(f"Session {log_session_id}: Attempting to get ephemeral token...")
            logger.info(f"Session {log_session_id}: Attempting to get ephemeral token...")
            ephemeral_token = await AIService.create_realtime_session()
            if not ephemeral_token:
                logger.error(f"Session {log_session_id}: Failed to get ephemeral token.")
                raise ConnectionError("Failed to obtain ephemeral token for OpenAI connection.")
            # print(f"Session {log_session_id}: Got ephemeral token. Connecting to OpenAI...")
            logger.info(f"Session {log_session_id}: Got ephemeral token. Connecting to OpenAI...")

            openai_ws = await AIService.connect_to_openai_realtime(ephemeral_token)
            if not openai_ws:
                logger.error(f"Session {log_session_id}: Failed to connect to OpenAI Realtime API.")
                raise ConnectionError("Failed to establish connection with OpenAI Realtime API.")
            # print(f"Session {log_session_id}: Successfully connected to OpenAI Realtime API.")
            logger.info(f"Session {log_session_id}: Successfully connected to OpenAI Realtime API.")
            # <<< ADD TYPE LOGGING HERE >>>
            # print(f"Session {log_session_id}: Type of openai_ws assigned in handler: {type(openai_ws)}")
            logger.info(f"Session {log_session_id}: Type of openai_ws assigned in handler: {type(openai_ws)}")
            # <<< END OPENAI CONNECTION LOGIC >>>

            # Notify client that connection to OpenAI is established
            await client_ws.send_text(json.dumps({
                "type": "connection_established",
                "message": "Server connected to OpenAI Realtime API."
            }))

            # Start the listener task AFTER openai_ws is established
            openai_listener_task = asyncio.create_task(receive_from_openai())

            # Brief pause to allow listener task to start and potentially fail early
            await asyncio.sleep(0.1)
            if receive_from_openai_failed.is_set() or not connection_active:
                logger.error(f"Session {log_session_id}: OpenAI listener task failed immediately after start.")
                pass # Let it fall through to finally block for cleanup
            else:
                 # print(f"*** Session {log_session_id}: OpenAI listener task running. Waiting for client messages... ***")
                 logger.info(f"*** Session {log_session_id}: OpenAI listener task running. Waiting for client messages... ***")

            # --- Main loop processing messages FROM the client --- 
            while connection_active:
                # Check if the listener task has failed in the background
                if receive_from_openai_failed.is_set():
                    logger.warning(f"Session {log_session_id}: OpenAI listener task failed. Stopping client message processing.")
                    break
                
                try:
                    client_message_raw = await client_ws.receive()
                    
                    # Handle different message types from client
                    if isinstance(client_message_raw, dict) and client_message_raw.get("type") == "websocket.disconnect":
                        # print(f"--- Session {log_session_id}: Client disconnected. ---")
                        logger.info(f"--- Session {log_session_id}: Client disconnected. ---")
                        break
                    
                    elif isinstance(client_message_raw, dict) and "text" in client_message_raw:
                        client_json_str = client_message_raw["text"]
                        logger.debug(f"Session {log_session_id}: Received raw JSON string from client: {client_json_str[:200]}...")
                        
                        # Attempt to parse to check validity and potentially log type
                        try:
                            client_data = json.loads(client_json_str)
                            msg_type = client_data.get("type", "unknown")
                            logger.debug(f"Session {log_session_id}: Parsed client message type: {msg_type}")

                            if msg_type == "end_conversation":
                                logger.info(f"--- Session {log_session_id}: Client requested end_conversation. ---")
                                # Optionally send closing message to OpenAI if needed
                                break
                            elif msg_type == "input_audio_buffer.append": # <<< SPECIFIC CHECK
                                # Log before forwarding audio specifically
                                audio_chunk_size = len(client_data.get('audio', '')) # Get size of base64 data
                                logger.info(f"---> Session {log_session_id}: Forwarding client 'input_audio_buffer.append' to OpenAI (chunk size: {audio_chunk_size} chars).")
                                await openai_ws.send(client_json_str)
                            elif msg_type == "session.update": # <<< SPECIFIC CHECK
                                logger.info(f"---> Session {log_session_id}: Forwarding client 'session.update' to OpenAI.")
                                await openai_ws.send(client_json_str)
                            # <<< MODIFY COMMIT FORWARDING HERE >>>
                            elif msg_type == "input_audio_buffer.commit":
                                logger.info(f"---> Session {log_session_id}: Forwarding client 'input_audio_buffer.commit' to OpenAI.")
                                await openai_ws.send(client_json_str)
                                # <<< REMOVE EXPLICIT RESPONSE TRIGGER FROM PROXY >>>
                                # logger.info(f"---> Session {log_session_id}: Sending explicit 'response.create' to OpenAI.")
                                # await openai_ws.send(json.dumps({"type": "response.create"}))
                                # <<< END REMOVAL >>>
                            # <<< ADD FORWARDING FOR CLIENT-INITIATED ACTIONS >>>
                            elif msg_type == "conversation.item.create":
                                logger.info(f"---> Session {log_session_id}: Forwarding client 'conversation.item.create' to OpenAI.")
                                await openai_ws.send(client_json_str)
                            elif msg_type == "response.create":
                                logger.info(f"---> Session {log_session_id}: Forwarding client 'response.create' to OpenAI.")
                                await openai_ws.send(client_json_str)
                            # <<< END ADDED FORWARDING >>>
                            # <<< END COMMIT FORWARDING MODIFICATION >>>
                            else:
                                 # Log other messages not forwarded (keep this)
                                 logger.warning(f"Session {log_session_id}: Received client message type '{msg_type}', not forwarding.")

                        except json.JSONDecodeError:
                            logger.error(f"Session {log_session_id}: Invalid JSON received from client: {client_json_str}")
                        except Exception as e:
                            logger.error(f"Session {log_session_id}: Error processing client text message: {e}", exc_info=True)

                    else:
                         logger.warning(f"Session {log_session_id}: Received unexpected data type from client: {type(client_message_raw)}")

                except WebSocketDisconnect:
                     # print(f"--- Session {log_session_id}: Client disconnected (WebSocketDisconnect). ---")
                     logger.info(f"--- Session {log_session_id}: Client disconnected (WebSocketDisconnect). ---")
                     break
                except (ConnectionClosedOK, ConnectionClosedError, WebSocketConnectionClosedException, websockets.exceptions.ConnectionClosed) as ws_closed_error:
                     logger.warning(f"Session {log_session_id}: Client WebSocket closed unexpectedly in main loop: {ws_closed_error}")
                     break
                except Exception as e:
                    logger.error(f"Session {log_session_id}: Error in client message processing loop: {e}", exc_info=True)
                    break # Break on most errors for safety
        
        except ConnectionError as ce:
             logger.error(f"Session {log_session_id}: Connection Error in handle_realtime_conversation setup: {ce}")
             # Attempt to notify client about the setup failure
             try:
                 await client_ws.send_text(json.dumps({"type": "error", "message": f"Server Error: {str(ce)}"}))
             except: pass # Ignore errors sending to potentially closed socket
        except Exception as e:
            logger.error(f"Session {log_session_id}: Unhandled Error in handle_realtime_conversation: {e}", exc_info=True)
            # Attempt to notify client if possible
            try:
                 await client_ws.send_text(json.dumps({"type": "error", "message": f"Server Error: {str(e)}"}))
            except: pass # Ignore errors sending to potentially closed socket
        
        finally:
            # print(f"--- Cleaning up handle_realtime_conversation for session {log_session_id}... ---")
            logger.info(f"--- Cleaning up handle_realtime_conversation for session {log_session_id}... ---")
            connection_active = False # Signal listener task to stop

            # Cancel and wait for the listener task
            if openai_listener_task and not openai_listener_task.done():
                # print(f"--- Session {log_session_id}: Cancelling OpenAI listener task... ---")
                logger.info(f"--- Session {log_session_id}: Cancelling OpenAI listener task... ---")
                openai_listener_task.cancel()
                try: 
                    await openai_listener_task
                except asyncio.CancelledError: 
                    logger.info(f"Session {log_session_id}: OpenAI listener task successfully cancelled.")
                except Exception as e: 
                    logger.error(f"Session {log_session_id}: Error during OpenAI listener task cleanup: {e}")

            # Close OpenAI connection
            if openai_ws:
                # print(f"--- Session {log_session_id}: Attempting to close OpenAI WebSocket connection... ---")
                logger.info(f"--- Session {log_session_id}: Attempting to close OpenAI WebSocket connection... ---")
                try:
                    await openai_ws.close(code=1000)
                    # print(f"--- Session {log_session_id}: OpenAI WebSocket connection closed successfully. ---")
                    logger.info(f"--- Session {log_session_id}: OpenAI WebSocket connection closed successfully. ---")
                except Exception as e: 
                    logger.error(f"Session {log_session_id}: Error closing OpenAI connection: {e}")

            # Close Client connection
            # print(f"--- Session {log_session_id}: Closing client WebSocket connection... ---")
            logger.info(f"--- Session {log_session_id}: Closing client WebSocket connection... ---")
            try: 
                await client_ws.close(code=1000)
            except RuntimeError as re:
                # Ignore runtime error if closing already closed socket
                if "Cannot call \"send\" once a close message has been sent" in str(re):
                    logger.warning(f"Session {log_session_id}: Client connection likely already closed, ignoring RuntimeError on close.")
                else:
                    logger.error(f"Session {log_session_id}: Unexpected RuntimeError closing client connection: {re}") # Log other RuntimeErrors
            except Exception as e: 
                logger.error(f"Session {log_session_id}: Error closing client connection: {e}")

            # print(f"--- handle_realtime_conversation cleanup complete for session {log_session_id}. ---")
            logger.info(f"--- handle_realtime_conversation cleanup complete for session {log_session_id}. ---")

    @staticmethod
    async def connect_to_openai_realtime(ephemeral_token: str) -> Optional[WebSocketClientProtocol]:
        """Connect to OpenAI's Realtime Transcription API using WebSockets and an ephemeral token."""
        try:
            # Import the correct library
            import websockets # Changed from 'websocket'
            import json
            import os # Ensure os is imported if not already

            # --- Use ephemeral token passed as argument ---
            if not ephemeral_token:
                logger.error("!!! Cannot connect: Ephemeral token is missing or empty !!!")
                return None
            # logger.info(f"---> Using Ephemeral Token (masked): {ephemeral_token[:5]}...{ephemeral_token[-4:]}") # Mask if needed
            # --- End Token usage ---

            logger.info(f"Attempting to connect to OpenAI Realtime API")

            # Use the correct URL with model parameter
            url = f"wss://api.openai.com/v1/realtime?model={REALTIME_MODEL}"
            logger.info(f"OpenAI Realtime WebSocket URL: {url}")

            # Include the beta header and authorization header
            headers = {
                "Authorization": f"Bearer {ephemeral_token}",
                "OpenAI-Beta": "realtime=v1"  # Required during beta
            }

            # Log the connection details before attempting
            logger.info(f"Connecting to URL: {url}")
            logger.info(f"Using headers: {list(headers.keys())}") # Log header keys, not values

            # Create a WebSocket connection using the async library
            # Use extra_headers for websockets library
            openai_ws_connection = await websockets.connect(url, additional_headers=headers) # Renamed ws -> openai_ws_connection

            logger.info("Successfully connected to OpenAI Realtime Transcription API")
            # <<< ADD TYPE LOGGING HERE >>>
            logger.info(f"connect_to_openai_realtime is returning object of type: {type(openai_ws_connection)}")

            # Return the WebSocket connection
            return openai_ws_connection # Return renamed variable
                    
        except Exception as e:
            logger.error(f"Error connecting to OpenAI Realtime Transcription API: {e}")
            logger.error(traceback.format_exc())
            return None

    def _run_ffmpeg_sync(self, input_bytes: bytes) -> Optional[bytes]:
        """Runs FFmpeg synchronously using subprocess.run."""
        ffmpeg_cmd = [
            'C:\\Users\\a676982\\ffmpeg\\bin\\ffmpeg.exe', # Use absolute path
            '-loglevel', 'error', # Only log errors from FFmpeg
            '-f', 'webm',        # Explicitly state input format
            '-i', 'pipe:0',      # Input from stdin
            '-acodec', 'pcm_s16le', # Output codec: PCM signed 16-bit little-endian
            '-ar', '16000',       # Output sample rate: 16kHz
            '-ac', '1',           # Output channels: Mono
            '-f', 's16le',       # Output format: raw PCM
            'pipe:1'              # Output to stdout
        ]
        
        try:
            # Use subprocess.run to execute synchronously
            result = subprocess.run(
                ffmpeg_cmd,
                input=input_bytes,
                capture_output=True, # Capture stdout and stderr
                check=False # Don't raise exception on non-zero exit code
            )

            # Check return code
            if result.returncode != 0:
                stderr_str = result.stderr.decode(errors='ignore')
                logger.error(f"FFmpeg sync error (code {result.returncode}): {stderr_str}")
                return None
            else:
                # Log warnings even on success
                if result.stderr:
                    logger.warning(f"FFmpeg sync stderr warnings: {result.stderr.decode(errors='ignore')}")
                logger.debug(f"FFmpeg sync conversion successful, output size: {len(result.stdout)} bytes")
                return result.stdout

        except FileNotFoundError:
            logger.error("FFmpeg command not found. Ensure FFmpeg is installed and in the system PATH.")
            return None
        except Exception as e:
            logger.error(f"Error during synchronous FFmpeg execution: {e}", exc_info=True)
            return None

    async def convert_audio_chunk_ffmpeg(self, input_bytes: bytes) -> Optional[bytes]:
        loop = asyncio.get_running_loop()
        try:
            output_bytes = await loop.run_in_executor(None, self._run_ffmpeg_sync, input_bytes)
            return output_bytes
        except Exception as e:
            logger.error(f"FFmpeg conversion failed: {e}")
            return None

    async def _handle_realtime_conversation_instance_unused(self, openai_ws: WebSocketClientProtocol, client_ws: WebSocket, ephemeral_token: str):
        """
        Handles the realtime conversation flow between a client and OpenAI via WebSockets.
        THIS IS THE OLD INSTANCE METHOD - SHOULD NOT BE CALLED DIRECTLY FROM PROXY

        Args:
            openai_ws: The WebSocket connection to OpenAI.
            client_ws: The WebSocket connection from the client (browser/app).
            ephemeral_token: The short-lived token for OpenAI connection.
        """
        connection_active = True
        openai_listener_task = None

        async def receive_from_openai():
            nonlocal connection_active, openai_listener_task
            try:
                while connection_active:
                    try:
                        # Use a timeout for receiving to keep the loop responsive
                        message = await asyncio.wait_for(openai_ws.recv(), timeout=1.0) # Use openai_ws
 
                        # Process transcription messages
                        try:
                            data = json.loads(message)
                            logger.debug(f"Received from OpenAI Transcription: {data}")
 
                            # Forward transcription text to the client
                            transcript_text = data.get("text")
                            is_final = data.get("is_final", False) # Check if it's a final transcript

                            if transcript_text:
                                await client_ws.send_text(json.dumps({ # Use client_ws
                                    "type": "transcript", # Use 'transcript' type
                                    "text": transcript_text,
                                    "is_final": is_final
                                }))

                            # Handle potential errors from OpenAI
                            if data.get("type") == "error" or data.get("error"):
                                error_msg = data.get('message', data.get('error', 'Unknown OpenAI error'))
                                logger.error(f"Received error from OpenAI Transcription: {error_msg}")
                                await client_ws.send_text(json.dumps({ # Use client_ws
                                    "type": "error",
                                    "message": f"OpenAI Error: {error_msg}"
                                }))

                        except json.JSONDecodeError:
                            logger.error(f"Received non-JSON message from OpenAI Transcription: {message}")

                    except asyncio.TimeoutError:
                        # No message received within timeout, continue listening
                        continue
                    except (ConnectionClosedOK, ConnectionClosedError, WebSocketConnectionClosedException):
                        logger.warning("OpenAI Transcription WebSocket connection closed while receiving.")
                        break # Exit loop
                    except Exception as e:
                        logger.error(f"Unexpected error receiving from OpenAI Transcription: {e}")
                        logger.error(traceback.format_exc())
                        break # Exit loop

            except Exception as e:
                logger.error(f"Error processing OpenAI transcription message: {e}")
                logger.error(traceback.format_exc())
            
            finally:
                logger.info("receive_from_openai task finishing.")
                connection_active = False # Signal main loop to stop
                openai_listener_task.set_result(None) # Signal that this task failed/exited

        # --- Main Function Logic ---
        try:
            await client_ws.send_text(json.dumps({
                "type": "connection_established",
                "message": "Server connected to OpenAI Transcription."
            }))

            openai_listener_task = asyncio.create_task(receive_from_openai())

            # Check immediately if listener task failed
            await asyncio.sleep(0.1)
            if openai_listener_task.done():
                logger.error("OpenAI connection likely failed during initial listener setup.")
                raise ConnectionError("Failed to establish stable connection with OpenAI Transcription.")
            logger.info("OpenAI transcription connection seems stable. Waiting for client audio...")
            
            # --- Main loop processing messages FROM the client --- 
            while connection_active:
                try:
                    client_data_raw = await client_ws.receive() # Receive raw message
                    
                    # Handle different message types
                    if isinstance(client_data_raw, dict) and client_data_raw.get("type") == "websocket.disconnect":
                        logger.info("Client disconnected.")
                        break # Exit main loop
                    
                    elif isinstance(client_data_raw, dict) and "bytes" in client_data_raw:
                        # Received audio bytes from client
                        input_webm_bytes = client_data_raw["bytes"]
                        logger.debug(f"Received webm/ogg audio bytes chunk: {len(input_webm_bytes)}")
                        
                        # --- Convert using FFmpeg --- 
                        pcm16_bytes = await self.convert_audio_chunk_ffmpeg(input_webm_bytes)
                        # --- End Conversion ---
                        
                        if pcm16_bytes:
                            try:
                                # Send converted PCM16 bytes to OpenAI
                                await openai_ws.send(pcm16_bytes) 
                                logger.debug(f"Sent {len(pcm16_bytes)} bytes of PCM16 audio to OpenAI.")
                            except Exception as send_error:
                                logger.error(f"Error sending PCM audio bytes to OpenAI: {send_error}")
                                logger.error(traceback.format_exc())
                                connection_active = False # Stop processing if sending fails
                                break
                        else:
                             logger.warning("FFmpeg conversion failed or produced no data. Skipping send to OpenAI.")

                    elif isinstance(client_data_raw, dict) and "text" in client_data_raw:
                        # Process text control messages from client
                        try:
                            message = json.loads(client_data_raw["text"])
                            msg_type = message.get("type")
                            logger.info(f"Received client control message: {msg_type}")

                            if msg_type == "end_conversation":
                                logger.info("Client requested end_conversation.")
                                break # Exit main loop
                            elif msg_type == "init": # Handle init message from client
                                logger.info(f"Received init message from client for session {message.get('session_id')}")
                                # No action needed here, connection already verified by backend message
                            else:
                                 logger.warning(f"Received unknown client text message type: {msg_type}")

                        except json.JSONDecodeError:
                            logger.error(f"Invalid JSON received from client: {client_data_raw['text']}")
                        except Exception as e:
                            logger.error(f"Error processing client text message: {e}")
                    
                    else:
                         logger.warning(f"Received unexpected data type from client: {type(client_data_raw)}")

                except WebSocketDisconnect: # Handle client disconnect (might be covered by websocket.disconnect type)
                     logger.info("Client disconnected (WebSocketDisconnect).")
                     break # Exit main loop
                except (ConnectionClosedOK, ConnectionClosedError, WebSocketConnectionClosedException) as ws_closed_error:
                     logger.warning(f"WebSocket closed unexpectedly in main loop: {ws_closed_error}")
                     break # Exit main loop
        except Exception as e:
            logger.error(f"Error in handle_realtime_conversation: {e}")
            logger.error(traceback.format_exc())
            raise e
        finally:
            logger.info("handle_realtime_conversation task finishing.")

    @staticmethod
    async def create_realtime_session() -> str | None:
        """Creates a session with OpenAI's Realtime API and returns an ephemeral token."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OpenAI API key not found in environment variables.")
            return None

        # Use the correct /sessions endpoint for conversational models
        url = "https://api.openai.com/v1/realtime/sessions" 
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "OpenAI-Beta": "realtime=v1"  # Required beta header
        }

        # Payload for CONVERSATIONAL sessions
        payload = {                             
            "model": REALTIME_MODEL, # Use variable          
            "voice": "alloy",                  
            "output_audio_format": "pcm16", 
            # Optional: configure formats/VAD if needed
            "modalities": ["audio", "text"],
            "input_audio_transcription": {
              "model": TRANSCRIBE_MODEL, # Use variable 
              "language": "en",              
              "prompt": "This is a professional business conversation about sales and payment processing solutions."
            },
        }
        logger.info(f"Requesting OpenAI realtime conversational session with payload: {payload}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    response_text = await response.text() # Read response text for logging
                    logger.debug(f"OpenAI Session Creation Response Status: {response.status}")
                    logger.debug(f"OpenAI Session Creation Response Body: {response_text}")

                    if response.status == 200:
                        data = await response.json()
                        # Token extraction logic (assuming same structure for /sessions)
                        token_value = None
                        client_secret = data.get("client_secret")

                        if isinstance(client_secret, dict):
                            token_value = client_secret.get("value")
                        elif isinstance(client_secret, str): # Handle direct string case if API changes
                            token_value = client_secret
                        elif client_secret is None:
                            logger.warning("OpenAI response contained client_secret: null.")
                            return None

                        if token_value:
                            logger.info("Successfully obtained ephemeral token for conversational session.")
                            logger.debug(f"Ephemeral token starts with: {token_value[:5]}...")
                            return token_value
                        else:
                            logger.error("'client_secret' value not found or in unexpected format in OpenAI response.")
                            logger.debug(f"Full response data: {data}")
                            return None
                    else:
                        logger.error(f"Failed to create OpenAI session. Status: {response.status}, Body: {response_text}")
                        return None
        except aiohttp.ClientError as e:
            logger.error(f"HTTP Client Error creating OpenAI session: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error creating OpenAI session: {e}", exc_info=True)
            return None