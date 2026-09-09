from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "lm_verify_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_timeout=0.5,
    broker_connection_retry=False,
    broker_connection_retry_on_startup=False,
    task_always_eager=settings.CELERY_ALWAYS_EAGER,
    task_eager_propagates=True,
    redis_socket_connect_timeout=0.5,
    redis_socket_timeout=0.5,
    redis_retry_on_timeout=False,
)
