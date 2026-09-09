import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.database import init_db
from app.api.routes.health import router as health_router
from app.api.routes.inspections import router as inspections_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing LM-Verify Backend application...")
    # Ensure local storage directories exist
    Path(settings.LOCAL_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.LOCAL_REPORT_DIR).mkdir(parents=True, exist_ok=True)
    
    # Initialize DB tables
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        
    yield
    # Shutdown
    logger.info("Shutting down LM-Verify Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Backend API for LM-Verify: Legal Metrology (Packaged Commodities) Rules, 2011 "
        "Compliance Checking & Verification Platform."
    ),
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.exceptions import RequestValidationError

# Request Validation Error Handler (handles Python 3.14 Pydantic serialization cleanly)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc}")
    clean_errors = []
    for err in exc.errors():
        clean_errors.append({
            "type": err.get("type"),
            "loc": [str(x) for x in err.get("loc", [])],
            "msg": str(err.get("msg", "")),
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": clean_errors},
    )


# Global Exception Handler (prevents stack traces from leaking to API clients)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later.",
            "path": request.url.path,
        },
    )


# Register Routers
app.include_router(health_router)
app.include_router(inspections_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
