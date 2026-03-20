import asyncio
from publisher.linkedin_publisher import LinkedInPublisher

async def test_publish():
    pub = LinkedInPublisher()
    try:
        await pub.publish({'id': '123', 'title': 'Test'})
    except Exception as e:
        print("EXCEPTION CAUGHT:", e)

if __name__ == "__main__":
    asyncio.run(test_publish())
