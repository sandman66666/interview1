# Import all models here for Alembic autogenerate support
from .base_class import Base  # noqa
from ..db.models import Interview  # noqa
from ..db.models import Question  # noqa
from ..db.models import Response  # noqa

# Make sure all models are imported before initializing Alembic