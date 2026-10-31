"""Simulation playground endpoints for demo scenarios."""

from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id
from app.database.mongodb import memories
from app.services.embedding_service import embed
from typing import List

router = APIRouter(prefix="/simulations", tags=["simulation"])


SIMULATIONS = [
    {
        "id": "learning_preferences",
        "title": "Learning Preferences",
        "description": "User shares learning style; agent adapts explanations.",
        "steps": [
            {
                "role": "user",
                "content": "I am a CS student preparing for internships. I prefer Python and struggle with advanced math. Explain concepts with simple examples.",
            },
            {
                "role": "user",
                "content": "Explain binary search.",
            },
        ],
    },
    {
        "id": "career_adaptation",
        "title": "Career Goal Adaptation",
        "description": "Cross-session personalization: agent recalls career goal and suggests appropriate projects.",
        "steps": [
            {
                "role": "user",
                "content": "I want to be a backend engineer. I like building APIs and working with databases.",
            },
            {
                "role": "user",
                "content": "Suggest a project for my resume.",
            },
        ],
    },
    {
        "id": "conflict_correction",
        "title": "Conflicting Memory Correction",
        "description": "User changes preference; agent detects conflict and updates contextually.",
        "steps": [
            {
                "role": "user",
                "content": "I prefer Python for DSA problems.",
            },
            {
                "role": "user",
                "content": "Actually, I now prefer C++ for DSA but keep Python for ML.",
            },
        ],
    },
    {
        "id": "temporary_expiration",
        "title": "Temporary Memory Expiration",
        "description": "Time-bound memory that auto-expires via TTL index.",
        "steps": [
            {
                "role": "user",
                "content": "My exam is on November 10. Remind me to review graph algorithms.",
            },
            {
                "role": "user",
                "content": "What should I study today?",
            },
        ],
    },
    {
        "id": "learning_feedback",
        "title": "Learning From Negative Feedback",
        "description": "User rates an explanation; agent adapts future responses.",
        "steps": [
            {
                "role": "user",
                "content": "Explain merge sort.",
            },
            {
                "role": "feedback",
                "rating": "too_complicated",
                "note": "Use simpler examples.",
            },
            {
                "role": "user",
                "content": "Explain quicksort.",
            },
        ],
    },
    {
        "id": "forgetting",
        "title": "Forgetting a Memory",
        "description": "User explicitly requests to forget a preference.",
        "steps": [
            {
                "role": "user",
                "content": "I prefer practical projects over theory.",
            },
            {
                "role": "user",
                "content": "Forget my internship preference.",
            },
        ],
    },
    {
        "id": "project_decisions",
        "title": "Remembering Project Decisions",
        "description": "Agent recalls technical choices from previous conversations.",
        "steps": [
            {
                "role": "user",
                "content": "We decided to use FastAPI for the backend and React for the frontend.",
            },
            {
                "role": "user",
                "content": "What backend framework are we using?",
            },
        ],
    },
]


@router.get("", response_model=List[dict])
async def list_simulations(user_id: str = Depends(get_current_user_id)):
    """List all available demo simulations."""
    return SIMULATIONS


@router.post("/run/{simulation_id}")
async def run_simulation(
    simulation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Run a simulation and return the full trace of memories and responses."""
    sim = next((s for s in SIMULATIONS if s["id"] == simulation_id), None)
    if not sim:
        return {"error": "Simulation not found"}

    # Clear user's memories for a clean demo (optional - could be a flag)
    # await memories().delete_many({"user_id": user_id})

    trace = []
    conversation_id = None

    for i, step in enumerate(sim["steps"]):
        if step["role"] == "user":
            # Simulate the chat endpoint
            from app.api.v1.chat import chat as chat_endpoint
            from app.schemas.chat import ChatRequest

            req = ChatRequest(message=step["content"], conversation_id=conversation_id)
            try:
                response = await chat_endpoint(req, user_id)
                conversation_id = response.conversation_id
                trace.append(
                    {
                        "step": i,
                        "type": "user",
                        "content": step["content"],
                        "response": response.reply,
                        "retrieved": [r.memory.content for r in response.retrieved],
                        "changes": [c.action for c in response.changes],
                    }
                )
            except Exception as exc:
                trace.append(
                    {
                        "step": i,
                        "type": "user",
                        "content": step["content"],
                        "error": str(exc),
                    }
                )

        elif step["role"] == "feedback":
            # Simulate feedback
            from app.api.v1.chat import feedback_endpoint
            from app.schemas.chat import FeedbackRequest

            # Get the last message_id
            # This is a simplified version
            trace.append(
                {
                    "step": i,
                    "type": "feedback",
                    "rating": step["rating"],
                    "note": step.get("note"),
                }
            )

    return {"simulation_id": simulation_id, "trace": trace}