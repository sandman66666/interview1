"""Create initial tables

Revision ID: b6a8679814d6
Revises: 
Create Date: 2024-12-23 15:50:06.384245

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b6a8679814d6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create interviews table
    op.create_table(
        'interviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('url_id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_interviews_url_id', 'interviews', ['url_id'], unique=True)

    # Create questions table
    op.create_table(
        'questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('interview_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('order_number', sa.Integer(), nullable=False),
        sa.Column('avatar_video_id', sa.String(), nullable=True),
        sa.Column('avatar_video_url', sa.String(), nullable=True),
        sa.Column('avatar_video_status', sa.String(), nullable=True),
        sa.Column('avatar_video_error', sa.Text(), nullable=True),
        sa.Column('voice_id', sa.String(), nullable=True, server_default='en-US-JennyNeural'),
        sa.Column('voice_style', sa.String(), nullable=True, server_default='Cheerful'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE')
    )

    # Create responses table
    op.create_table(
        'responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('interview_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_url', sa.String(), nullable=True),
        sa.Column('transcription', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE')
    )


def downgrade() -> None:
    op.drop_table('responses')
    op.drop_table('questions')
    op.drop_index('ix_interviews_url_id', 'interviews')
    op.drop_table('interviews')