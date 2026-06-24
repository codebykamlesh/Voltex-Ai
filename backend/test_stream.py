import asyncio
from groq import AsyncGroq

async def main():
    client = AsyncGroq(api_key='YOUR_API_KEY_HERE')
    stream = await client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[{'role': 'user', 'content': 'hi'}],
        stream=True
    )
    async for chunk in stream:
        print("CHOICES:", chunk.choices)
        if hasattr(chunk, "x_groq") and chunk.x_groq:
            print("X_GROQ:", chunk.x_groq)

if __name__ == "__main__":
    asyncio.run(main())
