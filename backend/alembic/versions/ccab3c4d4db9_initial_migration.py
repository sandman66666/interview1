"""Initial migration

Revision ID: ccab3c4d4db9
Revises: b6a8679814d6
Create Date: 2024-12-23 17:27:31.014129

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ccab3c4d4db9'
down_revision: Union[str, None] = 'b6a8679814d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint('questions_interview_id_fkey', 'questions', type_='foreignkey')
    op.create_foreign_key(None, 'questions', 'interviews', ['interview_id'], ['id'])
    op.drop_constraint('responses_interview_id_fkey', 'responses', type_='foreignkey')
    op.drop_constraint('responses_question_id_fkey', 'responses', type_='foreignkey')
    op.create_foreign_key(None, 'responses', 'questions', ['question_id'], ['id'])
    op.create_foreign_key(None, 'responses', 'interviews', ['interview_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'responses', type_='foreignkey')
    op.drop_constraint(None, 'responses', type_='foreignkey')
    op.create_foreign_key('responses_question_id_fkey', 'responses', 'questions', ['question_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('responses_interview_id_fkey', 'responses', 'interviews', ['interview_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint(None, 'questions', type_='foreignkey')
    op.create_foreign_key('questions_interview_id_fkey', 'questions', 'interviews', ['interview_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###
