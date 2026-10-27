
import { useState } from "react";
import "./App.css";
import api from "./api.js";
import Auth from "./Auth.jsx";
import BrandRules from "./BrandRules.jsx";
import ReviewQueue from "./ReviewQueue.jsx";
import History from "./History.jsx";
import AdminPanel from "./AdminPanel.jsx";

const pageTitles = {
  Checker: "Content Checker",
  "Brand Rules": "Brand Rules Library",
  "Review Queue": "Human Review Queue",
  History: "Review History",
  Admin: "Administrator Panel",
};

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem("inkloom_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      sessionStorage.removeItem("inkloom_user");
      sessionStorage.removeItem("inkloom_token");
      return null;
    }
  });

  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activePage, setActivePage] = useState("Checker");
  const [submitting, setSubmitting] = useState(false);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setActivePage("Checker");
    setError("");
    setMessage("");
  }

  function logOut() {
    sessionStorage.removeItem("inkloom_token");
    sessionStorage.removeItem("inkloom_user");

    setUser(null);
    setContent("");
    setResult(null);
    setError("");
    setMessage("");
    setActivePage("Checker");
  }

  async function checkContent(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setResult(null);
    setSubmitting(true);

    try {
      const response = await api.post("/content/check", {
        content,
      });

      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to check content. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForReview() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await api.post("/reviews", {
        content: content.trim(),
      });

      setMessage("Your content has been submitted for human review.");
      setContent("");
      setResult(null);
      setActivePage("History");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to submit your content for review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const safeActivePage =
    activePage === "Admin" && user.role !== "admin"
      ? "Checker"
      : activePage;

  const navigation = [
    { name: "Checker", label: "Content Checker" },
    { name: "Brand Rules", label: "Brand Rules" },
    { name: "Review Queue", label: "Review Queue" },
    { name: "History", label: "Review History" },
    ...(user.role === "admin"
      ? [{ name: "Admin", label: "Admin Panel" }]
      : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Inkloom</h1>
          <p>BrandGuard</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              type="button"
              className={
                safeActivePage === item.name
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => {
                setActivePage(item.name);
                setError("");
                setMessage("");
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-details">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logOut}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">INKLOOM BRANDGUARD</p>
            <h2>{pageTitles[safeActivePage]}</h2>
          </div>
          <span className="role-label">{user.role}</span>
        </header>

        <div className="page-content">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message" role="status">
              {message}
            </div>
          )}

          {safeActivePage === "Checker" && (
            <section className="checker-page">
              <div className="page-intro">
                <h3>Check your content</h3>
                <p>
                  Review your writing against the approved brand rules
                  before publishing.
                </p>
              </div>

              <form className="checker-form" onSubmit={checkContent}>
                <label htmlFor="content-input">
                  Content to check
                </label>

                <textarea
                  id="content-input"
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setResult(null);
                  }}
                  placeholder="Paste your content here..."
                  rows={10}
                  maxLength={20000}
                  required
                />

                <div className="checker-actions">
                  <span>{content.length}/20000 characters</span>

                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                  >
                    {submitting ? "Checking..." : "Check Content"}
                  </button>
                </div>
              </form>

              {result && (
                <section className="checker-results">
                  <h3>Check results</h3>

                  {typeof result.score === "number" && (
                    <p>
                      Prototype score: <strong>{result.score}/100</strong>
                    </p>
                  )}

                  {Array.isArray(result.flags) &&
                  result.flags.length > 0 ? (
                    <div className="flag-list">
                      {result.flags.map((flag, index) => (
                        <article
                          className="flag-card"
                          key={`${flag.rule_id ?? "rule"}-${index}`}
                        >
                          <h4>
                            {flag.rule_title || "Content issue"}
                          </h4>

                          <p>
                            <strong>Severity:</strong>{" "}
                            {flag.severity || "Needs review"}
                          </p>

                          <p>
                            <strong>Issue:</strong>{" "}
                            {flag.message || flag.issue_type || "Review needed"}
                          </p>

                          {flag.reason && (
                            <p>
                              <strong>Reason:</strong> {flag.reason}
                            </p>
                          )}

                          {flag.matched_text && (
                            <p>
                              <strong>Matched text:</strong>{" "}
                              {flag.matched_text}
                            </p>
                          )}

                          {(flag.suggested_fix || flag.suggestion) && (
                            <p>
                              <strong>Suggested fix:</strong>{" "}
                              {flag.suggested_fix || flag.suggestion}
                            </p>
                          )}

                          {(flag.approved_source || flag.source) && (
                            <p>
                              <strong>Approved source:</strong>{" "}
                              {flag.approved_source || flag.source}
                            </p>
                          )}

                          {flag.needs_human_review && (
                            <p>
                              <strong>Human review recommended.</strong>
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>
                      No issues were returned by the configured rules.
                      This does not guarantee that the content is fully
                      compliant.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={submitForReview}
                    disabled={submitting || !content.trim()}
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit for Human Review"}
                  </button>
                </section>
              )}
            </section>
          )}

          {safeActivePage === "Brand Rules" && <BrandRules />}

          {safeActivePage === "Review Queue" && <ReviewQueue />}

          {safeActivePage === "History" && <History />}

          {safeActivePage === "Admin" && user.role === "admin" && (
            <AdminPanel />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

