
import re
from typing import Any


CLAIM_PATTERN = re.compile(
    r"\b(?:guarantee[sd]?|guaranteed|proven|100%|"
    r"cure[sd]?|best|number one|no risk|risk-free|"
    r"always|never)\b",
    re.IGNORECASE,
)


def check_content(
    content: str,
    rules: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Check content against active brand rules.

    Supported rule types:
    - forbidden_phrase
    - required_phrase
    - claim
    - tone
    - general

    This is a rule-based prototype, not an AI fact-checker.
    """

    if not content or not content.strip():
        return {
            "status": "error",
            "message": "Please enter some content to check.",
            "score": 0,
            "total_flags": 0,
            "flags": [],
        }

    checked_content = content.strip()
    flags: list[dict[str, Any]] = []

    def add_flag(
        rule: dict[str, Any],
        issue_type: str,
        severity: str,
        message: str,
        suggested_fix: str,
        needs_human_review: bool,
        matched_text: str = "",
    ) -> None:
        flags.append({
            "rule_id": rule.get("id"),
            "rule_title": rule.get("title", "Brand rule"),
            "issue_type": issue_type,
            "category": issue_type,
            "severity": severity,
            "message": message,
            "reason": message,
            "matched_text": matched_text,
            "suggested_fix": suggested_fix,
            "suggestion": suggested_fix,
            "approved_source": rule.get("approved_source", ""),
            "source": rule.get("approved_source", ""),
            "needs_human_review": needs_human_review,
        })

    for rule in rules:
        rule_type = str(
            rule.get("rule_type", "general")
        ).strip().lower()

        title = rule.get("title", "Brand rule")
        description = str(rule.get("description", "")).strip()

        if rule_type == "forbidden_phrase":
            phrase = description

            if phrase and re.search(
                re.escape(phrase),
                checked_content,
                flags=re.IGNORECASE,
            ):
                add_flag(
                    rule=rule,
                    issue_type="brand_conflict",
                    severity="high",
                    message=(
                        f"The potentially forbidden phrase "
                        f"'{phrase}' appears in the content."
                    ),
                    suggested_fix=(
                        f"Review and remove or replace '{phrase}' "
                        "if it conflicts with the approved guideline."
                    ),
                    needs_human_review=False,
                    matched_text=phrase,
                )

        elif rule_type == "required_phrase":
            phrase = description

            if phrase and not re.search(
                re.escape(phrase),
                checked_content,
                flags=re.IGNORECASE,
            ):
                add_flag(
                    rule=rule,
                    issue_type="missing_requirement",
                    severity="medium",
                    message=f"The required phrase '{phrase}' is missing.",
                    suggested_fix=(
                        f"Consider including '{phrase}' where appropriate."
                    ),
                    needs_human_review=False,
                )

        elif rule_type == "claim":
            matches = CLAIM_PATTERN.findall(checked_content)

            if matches:
                unique_matches = sorted(
                    set(matches),
                    key=str.lower,
                )

                add_flag(
                    rule=rule,
                    issue_type="unsupported_claim",
                    severity="high",
                    message=(
                        "Potentially absolute or factual claims need "
                        "evidence: " + ", ".join(unique_matches)
                    ),
                    suggested_fix=(
                        "Verify each claim using an approved source. "
                        "Do not treat this flag as proof that a claim is false."
                    ),
                    needs_human_review=True,
                    matched_text=", ".join(unique_matches),
                )

        elif rule_type == "tone":
            add_flag(
                rule=rule,
                issue_type="tone_review",
                severity="low",
                message=(
                    f"Human review is needed for the brand tone: {title}."
                ),
                suggested_fix=(
                    description
                    or "Compare the content with the approved brand voice."
                ),
                needs_human_review=True,
            )

        else:
            add_flag(
                rule=rule,
                issue_type="manual_review",
                severity="low",
                message=(
                    description
                    or f"Review the content against this rule: {title}."
                ),
                suggested_fix=(
                    "Compare the content with the approved guideline "
                    "and record the review decision."
                ),
                needs_human_review=True,
            )

    high_count = sum(
        flag["severity"] == "high" for flag in flags
    )
    medium_count = sum(
        flag["severity"] == "medium" for flag in flags
    )

    score = max(
        0,
        100 - high_count * 25 - medium_count * 10,
    )

    return {
        "status": "needs_review" if flags else "no_issues_detected",
        "score": score,
        "total_flags": len(flags),
        "flags": flags,
        "checked_text": checked_content,
        "note": (
            "Automated checks are preliminary. Factual claims, context, "
            "and subjective brand judgments may require human review. "
            "No content is automatically approved or published."
        ),
    }
