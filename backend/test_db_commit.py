import asyncio
import sys
import uuid

sys.path.append("c:\\Users\\Kamlesh\\VS CODE\\voltex-ai\\backend")

from app.database import async_session, engine, Base
from app.models.message import Message
from app.models.api_usage import ApiUsage
from app.models.user import User
from app.models.conversation import Conversation
from sqlalchemy import select

async def main():
    async with async_session() as db:
        # Get first user and conversation
        user_res = await db.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        if not user:
            print("No users found.")
            return
            
        conv_res = await db.execute(select(Conversation).limit(1))
        conv = conv_res.scalar_one_or_none()
        if not conv:
            print("No conversations found.")
            return

        print(f"Using user: {user.id}")
        print(f"Using conv: {conv.id}")

        try:
            tokens = 59
            model = 'llama-3.3-70b-versatile'
            full_content = "Hello world"
            
            assistant_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=full_content,
                model_used=model,
                tokens_used=tokens,
            )
            db.add(assistant_msg)

            usage_data = {'prompt_tokens': 36, 'completion_tokens': 23, 'total_tokens': 59}
            if usage_data and not usage_data.get("stopped"):
                api_usage = ApiUsage(
                    user_id=user.id,
                    model=model,
                    tokens_input=usage_data.get("prompt_tokens", 0),
                    tokens_output=usage_data.get("completion_tokens", 0),
                )
                db.add(api_usage)

            conv_update = await db.execute(
                select(Conversation).where(Conversation.id == conv.id)
            )
            conv_obj = conv_update.scalar_one_or_none()
            from datetime import datetime, timezone
            if conv_obj:
                conv_obj.updated_at = datetime.now(timezone.utc)

            await db.commit()
            print("Commit successful!")
            
        except Exception as e:
            print(f"ERROR during commit: {e}")

if __name__ == "__main__":
    asyncio.run(main())
