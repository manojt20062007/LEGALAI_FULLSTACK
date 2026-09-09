import io
import pytest
import pytest_asyncio
import httpx
from PIL import Image, ImageDraw
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.database as db_module
from app.db.database import Base, get_db
from app.db.models import Inspection
from app.main import app as fastapi_app

# In-memory SQLite test database with StaticPool so all threads/sessions share the same in-memory DB
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch SessionLocal in db_module for tests
db_module.SessionLocal = TestingSessionLocal
db_module.engine = test_engine


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest_asyncio.fixture
async def async_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=fastapi_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def synthetic_label_image_bytes() -> bytes:
    """
    Creates a non-copyrighted, dynamically synthesized product label image in memory
    for testing without committing proprietary or commercial image assets.
    """
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw simple label text representations
    draw.text((20, 20), "PRODUCT: Pure Coconut Water", fill=(0, 0, 0))
    draw.text((20, 60), "BRAND: CocoFresh", fill=(0, 0, 0))
    draw.text((20, 100), "MFD BY: CocoFresh Agri Ltd, Kochi, Kerala - 682001", fill=(0, 0, 0))
    draw.text((20, 140), "NET QTY: 200 ml", fill=(0, 0, 0))
    draw.text((20, 180), "MRP: Rs. 40.00 (INCL. OF ALL TAXES)", fill=(0, 0, 0))
    draw.text((20, 220), "COUNTRY OF ORIGIN: India", fill=(0, 0, 0))
    draw.text((20, 260), "CONSUMER CARE: support@cocofresh.in", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
