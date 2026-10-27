
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from models import User


def request_review(db: Session, submitted_by: int, content: str):
    result = db.execute(
        text("""
            INSERT INTO public.content_reviews
                (submitted_by, content, status)
            VALUES
                (:submitted_by, :content, 'pending')
            RETURNING id, status, created_at
        """),
        {
            "submitted_by": submitted_by,
            "content": content,
        },
    )

    review = result.mappings().one()
    db.commit()
    return dict(review)


def get_my_reviews(db: Session, user_id: int):
    result = db.execute(
        text("""
            SELECT id, content, status, reviewer_comment,
                   created_at, reviewed_at
            FROM public.content_reviews
            WHERE submitted_by = :user_id
            ORDER BY created_at DESC
        """),
        {"user_id": user_id},
    )

    return [dict(row) for row in result.mappings().all()]


def get_pending_reviews(db: Session):
    result = db.execute(
        text("""
            SELECT id, content, status, submitted_by, created_at
            FROM public.content_reviews
            WHERE status = 'pending'
            ORDER BY created_at ASC
        """)
    )

    return [dict(row) for row in result.mappings().all()]


def review_content(
    db: Session,
    review_id: int,
    reviewer: User,
    decision: str,
    comment: str | None = None,
):
    if decision not in {"approved", "changes_requested"}:
        raise ValueError(
            "Decision must be approved or changes_requested."
        )

    if decision == "changes_requested" and not (
        comment and comment.strip()
    ):
        raise ValueError(
            "Please provide a comment explaining the required changes."
        )

    result = db.execute(
        text("""
            UPDATE public.content_reviews
            SET status = :status,
                reviewer_id = :reviewer_id,
                reviewer_comment = :comment,
                reviewed_at = :reviewed_at
            WHERE id = :review_id
              AND status = 'pending'
              AND submitted_by != :reviewer_id
            RETURNING id, status, reviewer_comment, reviewed_at
        """),
        {
            "status": decision,
            "reviewer_id": reviewer.id,
            "comment": comment.strip() if comment else None,
            "reviewed_at": datetime.now(timezone.utc),
            "review_id": review_id,
        },
    )

    review = result.mappings().first()

    if review is None:
        db.rollback()
        raise ValueError(
            "Review not found, already processed, or self-review is not allowed."
        )

    db.commit()
    return dict(review)
