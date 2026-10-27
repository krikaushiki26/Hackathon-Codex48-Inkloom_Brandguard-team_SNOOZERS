
import { useState } from "react";
import api from "./api";

function History() {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reviews/mine");
      setReviews(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not load your review history."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="history-page">
      <h2>Review History</h2>
      <p>Track the content you've submitted and its review status.</p>

      <button type="button" onClick={loadHistory}>
        Load My History
      </button>

      {loading && <p>Loading history...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && reviews.length === 0 && !error && (
        <p>Your review history will appear here.</p>
      )}

      {reviews.map((review) => (
        <div className="history-card" key={review.id}>
          <div className="history-card-heading">
            <h3>Submission #{review.id}</h3>
            <span className={`status status-${review.status}`}>
              {review.status.replaceAll("_", " ")}
            </span>
          </div>

          <p className="history-content">{review.content}</p>

          {review.reviewer_comment && (
            <p>
              <strong>Reviewer comment:</strong>{" "}
              {review.reviewer_comment}
            </p>
          )}

          <small>
            Submitted:{" "}
            {new Date(review.created_at).toLocaleString()}
          </small>

          {review.reviewed_at && (
            <p>
              <small>
                Reviewed:{" "}
                {new Date(review.reviewed_at).toLocaleString()}
              </small>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default History;
