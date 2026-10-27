
import { useState } from "react";
import api from "./api.js";

function ReviewQueue() {
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  async function loadReviews() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await api.get("/reviews/pending");

      // The backend should return an array of pending reviews.
      if (!Array.isArray(response.data)) {
        throw new Error("Unexpected response format from the server.");
      }

      setReviews(response.data);
    } catch (err) {
      setReviews([]);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Could not load pending reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  async function decideReview(id, decision) {
    setMessage("");
    setError("");

    const comment = (comments[id] || "").trim();

    if (decision === "changes_requested" && !comment) {
      setError("Please explain what needs to change before requesting changes.");
      return;
    }

    setProcessingId(id);

    try {
      await api.post(`/reviews/${id}/decision`, {
        decision,
        comment: comment || null,
      });

      setMessage(
        decision === "approved"
          ? `Submission #${id} approved successfully.`
          : `Changes requested for submission #${id}.`
      );

      // Remove the processed item immediately from the pending list.
      setReviews((currentReviews) =>
        currentReviews.filter((review) => review.id !== id)
      );

      setComments((currentComments) => {
        const updated = { ...currentComments };
        delete updated[id];
        return updated;
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not update this review. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="review-queue-page">
      <h2>Review Queue</h2>
      <p>Review submitted content before it is approved for use.</p>

      <button
        type="button"
        onClick={loadReviews}
        disabled={loading || processingId !== null}
      >
        {loading ? "Loading..." : "Load Pending Reviews"}
      </button>

      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {loading && <p>Loading pending submissions...</p>}

      {!loading && !error && reviews.length === 0 && (
        <p>No pending reviews to display. Click "Load Pending Reviews" to refresh.</p>
      )}

      {reviews.map((review) => (
        <div className="review-card" key={review.id}>
          <h3>Submission #{review.id}</h3>

          <p className="review-content">{review.content}</p>

          <label htmlFor={`comment-${review.id}`}>
            Reviewer comments
          </label>

          <textarea
            id={`comment-${review.id}`}
            value={comments[review.id] || ""}
            onChange={(event) =>
              setComments((currentComments) => ({
                ...currentComments,
                [review.id]: event.target.value,
              }))
            }
            placeholder="Explain what needs to change, if anything"
            disabled={processingId === review.id}
          />

          <div className="review-actions">
            <button
              type="button"
              disabled={processingId !== null}
              onClick={() => decideReview(review.id, "approved")}
            >
              {processingId === review.id ? "Processing..." : "Approve"}
            </button>

            <button
              type="button"
              className="request-changes-button"
              disabled={processingId !== null}
              onClick={() =>
                decideReview(review.id, "changes_requested")
              }
            >
              Request Changes
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReviewQueue;
