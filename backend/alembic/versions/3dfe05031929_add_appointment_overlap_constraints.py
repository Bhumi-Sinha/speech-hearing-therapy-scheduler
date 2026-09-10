"""add appointment overlap constraints"""

from alembic import op


revision = "3dfe05031929"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Required so PostgreSQL can use UUID equality in GiST exclusion constraints.
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    # Prevent overlapping scheduled appointments for the same therapist.
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT exclude_therapist_overlap
        EXCLUDE USING gist (
            therapist_id WITH =,
            tsrange(start_time, end_time, '[)') WITH &&
        )
        WHERE (status = 'scheduled')
        """
    )

    # Prevent overlapping scheduled appointments for the same room.
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT exclude_room_overlap
        EXCLUDE USING gist (
            room_id WITH =,
            tsrange(start_time, end_time, '[)') WITH &&
        )
        WHERE (status = 'scheduled')
        """
    )

    # Prevent overlapping scheduled appointments for the same patient.
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT exclude_patient_overlap
        EXCLUDE USING gist (
            patient_id WITH =,
            tsrange(start_time, end_time, '[)') WITH &&
        )
        WHERE (status = 'scheduled')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE appointments
        DROP CONSTRAINT IF EXISTS exclude_patient_overlap
        """
    )

    op.execute(
        """
        ALTER TABLE appointments
        DROP CONSTRAINT IF EXISTS exclude_room_overlap
        """
    )

    op.execute(
        """
        ALTER TABLE appointments
        DROP CONSTRAINT IF EXISTS exclude_therapist_overlap
        """
    )
