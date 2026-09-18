from fastapi import APIRouter
from pydantic import BaseModel
from app.services.state_machine import state_machine

router = APIRouter(prefix="/viewport", tags=["viewport"])


class ViewportRegistration(BaseModel):
    session_id: str
    train_numbers: list[str]


@router.post("/register")
async def register_viewport(registration: ViewportRegistration):
    """Register which trains a viewport is currently viewing."""
    await state_machine.register_viewport(registration.session_id, registration.train_numbers)
    return {"status": "registered", "train_count": len(registration.train_numbers)}


@router.delete("/{session_id}")
async def unregister_viewport(session_id: str):
    """Remove a viewport from tracking."""
    await state_machine.unregister_viewport(session_id)
    return {"status": "unregistered"}


@router.get("/active-count")
async def get_active_viewport_count():
    """Get number of trains being actively viewed across all viewports."""
    count = await state_machine.get_active_train_count()
    return {"active_trains": count}
