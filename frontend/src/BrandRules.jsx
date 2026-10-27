
import { useState } from "react";
import api from "./api";

function BrandRules() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState("forbidden_phrase");
  const [approvedSource, setApprovedSource] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadRules() {
    setError("");
    setLoading(true);

    try {
      const response = await api.get("/rules");
      setRules(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not load rules."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addRule(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/rules", {
        title,
        description,
        rule_type: ruleType,
        approved_source: approvedSource
      });

      setMessage("Brand rule added successfully!");
      setTitle("");
      setDescription("");
      setRuleType("forbidden_phrase");
      setApprovedSource("");

      await loadRules();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not add the rule. Manager access may be required."
      );
    }
  }

  return (
    <div className="brand-rules-page">
      <h2>Brand Rules</h2>
      <p>
        Manage approved rules that help protect your brand voice.
      </p>

      <form onSubmit={addRule} className="rule-form">
        <label>Rule title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Example: Avoid guaranteed claims"
          minLength={3}
          maxLength={200}
          required
        />

        <label>Rule description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the words or behaviour to check"
          minLength={5}
          required
        />

        <label>Rule type</label>
        <select
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value)}
        >
          <option value="forbidden_phrase">Forbidden phrase</option>
          <option value="required_phrase">Required phrase</option>
          <option value="claim">Claim verification</option>
          <option value="tone">Brand tone</option>
        </select>

        <label>Approved source</label>
        <textarea
          value={approvedSource}
          onChange={(e) => setApprovedSource(e.target.value)}
          placeholder="Enter an approved document name or reference"
          minLength={3}
          required
        />

        <button type="submit">Add Brand Rule</button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="rules-heading">
        <h3>Saved Rules</h3>
        <button type="button" onClick={loadRules}>
          Load Rules
        </button>
      </div>

      {loading && <p>Loading rules...</p>}

      {rules.map((rule) => (
        <div className="rule-card" key={rule.id}>
          <h4>{rule.title}</h4>
          <p>{rule.description}</p>
          <p>Type: {rule.rule_type}</p>
          <p>Approved source: {rule.approved_source}</p>
          <small>Version {rule.version}</small>
        </div>
      ))}
    </div>
  );
}

export default BrandRules;
