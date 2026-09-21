import { useState, useRef, useEffect } from "react";
import api from "../../utils/api";

// Theme — orange as accent only, neutral surfaces for data
const T = {
  primary: "#E8601C",   // orange — buttons, icons, active borders only
  primaryHover: "#C94E14",
  primaryLight: "#FDF0E8",   // very light orange — avatar bg, empty state icon
  primaryBorder: "#F5C4A0",   // orange border for UI chrome (not tables)
  primaryText: "#7A2E05",   // dark orange text on orange bg
  primaryDark: "#BF4A12",   // labels on orange surfaces
  dot: "#E8A07A",   // thinking dots

  // Neutral surfaces for result data — clean, readable
  pageBg: "var(--color-background-tertiary)",
  subheaderBg: "var(--color-background-primary)",
  footerBg: "var(--color-background-primary)",
  feedBg: "var(--color-background-tertiary)",

  // Table — pure neutral
  tableBorder: "var(--color-border-tertiary)",
  tableTh: "var(--color-background-secondary)",
  tableRowHover: "var(--color-background-secondary)",
  tableText: "var(--color-text-primary)",
  tableSubText: "var(--color-text-secondary)",

  // AI bubble — very subtle, not orange
  bubbleBg: "var(--color-background-primary)",
  bubbleBorder: "var(--color-border-tertiary)",

  // Stat card
  statBg: "var(--color-background-secondary)",

  // Input
  inputBorder: "var(--color-border-secondary)",
  inputActive: "#E8601C",

  // Chips / badges
  chipBg: "var(--color-background-secondary)",
  chipBorder: "var(--color-border-tertiary)",
  chipText: "var(--color-text-secondary)",
};

// Fields to never show in the table
const HIDE_COLS = new Set([
  "__v", "_id",
  "storeNumber", "storeId", "storeID",
  "jobCardId", "jobCardID",
  "customerId", "customerID",
  "createdBy", "updatedBy",
  "updatedAt",
]);

// Numeric fields for right-align + currency formatting
const NUM_KEYS = new Set([
  "total", "subtotal", "subTotal", "price", "amount", "gstPercent",
  "count", "salesCount", "totalRevenue", "orderCount", "bestSellingCount",
  "value", "advance", "balance", "additionalDiscount", "loyaltyDiscount",
  "loyaltyPointsUsed", "earnedLoyaltyPoints",
]);

const isNum = (key, val) =>
  NUM_KEYS.has(key) || (typeof val === "number" && !isNaN(val));

// Flatten a nested object into "parent.child" keys so it never shows as [object]
const flattenObject = (obj, prefix = "") => {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !k.endsWith("At") && !(typeof v === "string")) {
      Object.assign(result, flattenObject(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
};

// Format a single cell value
const fmtVal = (key, val) => {
  if (val == null || val === "") return "—";
  // Nested object still slipped through — show key count instead of raw JSON
  if (typeof val === "object" && !Array.isArray(val))
    return `{${Object.keys(val).length} fields}`;
  if (Array.isArray(val)) return `[${val.length}]`;
  if (isNum(key, val)) {
    const n = Number(val);
    if (key === "gstPercent") return n.toFixed(1) + "%";
    const moneyKeys = ["price", "total", "subtotal", "subTotal", "amount", "totalRevenue",
      "value", "advance", "balance", "additionalDiscount", "loyaltyDiscount"];
    if (moneyKeys.includes(key))
      return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    return n.toLocaleString("en-IN");
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val))
    return new Date(val).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
};

const colLabel = (k) =>
  k.replace(/\./g, " › ")                   // flatten path separator
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const SUGGESTIONS = [
  "Top 5 best selling products",
  "Customer details name, mobile, email",
  "Total revenue this month",
  "Orders with pending payment",
  "Products in category Frame",
];

// ---- Avatar ----------------------------------------------------------------
function Avatar({ role }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 500,
      background: role === "user" ? T.primary : "var(--color-background-secondary)",
      color: role === "user" ? "#fff" : "var(--color-text-secondary)",
      border: role === "user" ? "none" : "0.5px solid var(--color-border-secondary)",
    }}>
      {role === "user" ? "U" : "AI"}
    </div>
  );
}

// ---- User bubble -----------------------------------------------------------
function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "flex-start" }}>
      <div style={{
        maxWidth: "72%", padding: "10px 14px",
        background: T.primary,
        color: "#fff",
        borderRadius: "16px 16px 4px 16px",
        fontSize: 13, lineHeight: 1.55,
      }}>
        {text}
      </div>
      <Avatar role="user" />
    </div>
  );
}

// ---- Thinking dots ---------------------------------------------------------
function ThinkingBubble() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <Avatar role="ai" />
      <div style={{
        padding: "11px 15px",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "4px 16px 16px 16px",
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--color-text-tertiary)",
            display: "inline-block",
            animation: `aiq-bounce 1.2s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ---- Result table ----------------------------------------------------------
function ResultTable({ data, meta }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(-1);

  // Flatten each row so nested objects become dot-notation keys
  const flatData = data.map(row =>
    (typeof row === "object" && !Array.isArray(row)) ? flattenObject(row) : row
  );

  const cols = (
    meta?.columns?.length
      ? meta.columns
      : Object.keys(flatData[0] || {})
  ).filter(c => !HIDE_COLS.has(c) && !HIDE_COLS.has(c.split(".").pop()));

  const sorted = sortKey
    ? [...flatData].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      return av < bv ? sortDir : av > bv ? -sortDir : 0;
    })
    : flatData;

  const handleSort = (col) => {
    if (sortKey === col) setSortDir(d => d * -1);
    else { setSortKey(col); setSortDir(-1); }
  };

  // Single-row aggregation → stat cards
  if (flatData.length === 1 && meta?.isAggregation) {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
        gap: 10,
      }}>
        {cols.map(k => (
          <div key={k} style={{
            background: T.statBg,
            borderRadius: "var(--border-radius-md)",
            padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              {colLabel(k)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {fmtVal(k, flatData[0][k])}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      overflowX: "auto",
      borderRadius: "var(--border-radius-md)",
      border: "0.5px solid var(--color-border-tertiary)",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: T.tableTh }}>
            {cols.map(c => (
              <th
                key={c}
                onClick={() => handleSort(c)}
                style={{
                  padding: "9px 12px", textAlign: "left", fontWeight: 500,
                  fontSize: 12, color: "var(--color-text-secondary)",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                }}
              >
                {colLabel(c)}
                <span style={{ marginLeft: 4, opacity: sortKey === c ? 0.9 : 0.3, fontSize: 10 }}>
                  {sortKey === c ? (sortDir === -1 ? "↓" : "↑") : "↕"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: i < sorted.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = T.tableRowHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {cols.map(c => (
                <td key={c} style={{
                  padding: "9px 12px",
                  color: "var(--color-text-primary)",
                  textAlign: isNum(c, row[c]) ? "right" : "left",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}>
                  {fmtVal(c, row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- AI response bubble ----------------------------------------------------
function AIBubble({ message }) {
  const { data, meta, error } = message;

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <Avatar role="ai" />
      <div style={{ flex: 1, minWidth: 0 }}>
        {error ? (
          <div style={{
            padding: "10px 14px", fontSize: 13,
            background: "var(--color-background-danger)",
            color: "var(--color-text-danger)",
            border: "0.5px solid var(--color-border-danger)",
            borderRadius: "4px 16px 16px 16px",
          }}>
            {error}
          </div>
        ) : (
          <div style={{
            background: T.bubbleBg,
            border: "0.5px solid " + T.bubbleBorder,
            borderRadius: "4px 16px 16px 16px",
            padding: "12px 14px",
          }}>
            {/* meta badges */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <span style={{
                fontSize: 11, padding: "2px 9px", borderRadius: 999,
                background: "#FDF0E8", color: T.primaryDark,
                border: "1px solid " + T.primaryBorder, fontWeight: 500,
              }}>
                {meta?.queryType || "JobCard"}
              </span>
              {meta?.isAggregation && (
                <span style={{
                  fontSize: 11, padding: "2px 9px", borderRadius: 999,
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-secondary)",
                  border: "0.5px solid var(--color-border-secondary)",
                }}>
                  aggregation
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                {meta?.count ?? data?.length ?? 0} result{(meta?.count ?? data?.length) !== 1 ? "s" : ""}
              </span>
            </div>

            {data?.length > 0 ? (
              <ResultTable data={data} meta={meta} />
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                No results found.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Empty state -----------------------------------------------------------
function EmptyState({ onSuggest }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
      <div style={{
        width: 46, height: 46, borderRadius: "50%",
        background: T.primaryLight,
        border: "1px solid " + T.primaryBorder,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={T.primary} strokeWidth="1.8">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 5 }}>
        Ask about your store data
      </p>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 22 }}>
        Query orders, customers, products and payments in plain English.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, margin: "0 auto" }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            style={{
              display: "flex", alignItems: "center",
              padding: "9px 14px", fontSize: 13, textAlign: "left",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              cursor: "pointer", color: "var(--color-text-primary)", width: "100%",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--color-background-primary)"}
          >
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: T.primary, marginRight: 10, flexShrink: 0,
              display: "inline-block",
            }} />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Main page -------------------------------------------------------------
export default function DigiAIPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const { data: json } = await api.post("/ai/query", { query: q });
      if (!json.success) {
        setMessages(prev => [...prev, { role: "ai", error: json.message || "Query failed." }]);
      } else {
        setMessages(prev => [...prev, {
          role: "ai",
          data: json.data,
          meta: { ...json.meta, count: json.count },
        }]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Network error. Please try again.";
      setMessages(prev => [...prev, { role: "ai", error: msg }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const sendActive = !!input.trim() && !loading;

  return (
    <>
      <style>{`
        @keyframes aiq-bounce {
          0%,80%,100% { transform: translateY(0); }
          40%          { transform: translateY(-5px); }
        }
        @keyframes aiq-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ai-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
          overflow: hidden;
          background: var(--color-background-tertiary);
        }
        .ai-subheader {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          background: var(--color-background-primary);
          border-bottom: 0.5px solid var(--color-border-tertiary);
        }
        .ai-feed {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px 10px;
          scrollbar-width: thin;
          scrollbar-color: var(--color-border-secondary) transparent;
        }
        .ai-feed::-webkit-scrollbar { width: 4px; }
        .ai-feed::-webkit-scrollbar-thumb {
          background: var(--color-border-secondary);
          border-radius: 4px;
        }
        .aiq-msg { animation: aiq-in 0.18s ease both; }
        .chip-bar {
          flex-shrink: 0;
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 7px 24px 5px;
          border-top: 0.5px solid var(--color-border-tertiary);
          background: var(--color-background-primary);
        }
        .chip-bar::-webkit-scrollbar { display: none; }
        .aiq-chip {
          padding: 4px 12px;
          font-size: 12px;
          white-space: nowrap;
          border-radius: 999px;
          cursor: pointer;
          background: var(--color-background-secondary);
          border: 0.5px solid var(--color-border-secondary);
          color: var(--color-text-secondary);
          flex-shrink: 0;
          transition: background 0.12s, color 0.12s;
        }
        .aiq-chip:hover { background: var(--color-background-tertiary); color: var(--color-text-primary); }
        .ai-footer {
          flex-shrink: 0;
          padding: 10px 24px 14px;
          background: var(--color-background-primary);
          border-top: 0.5px solid var(--color-border-tertiary);
        }
        .aiq-clear {
          margin-left: auto;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: var(--border-radius-md);
          border: 0.5px solid var(--color-border-secondary);
          background: transparent;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: background 0.12s;
        }
        .aiq-clear:hover { background: var(--color-background-secondary); }
      `}</style>

      <div className="ai-page">

        {/* slim sub-header */}
        <div className="ai-subheader">


          <div style={{
            width: 28, height: 28, borderRadius: "var(--border-radius-md)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <img
              src="https://digibysr.com/wp-content/uploads/2025/08/DigiOptics-Character_low.gif"
              alt="AI"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>


          <div>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
              Digi Intelligence
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Ask anything about your data</div>
          </div>
          {messages.length > 0 && (
            <button className="aiq-clear" onClick={() => setMessages([])}>Clear</button>
          )}
        </div>

        {/* scrollable feed */}
        <div className="ai-feed">
          {messages.length === 0 ? (
            <EmptyState onSuggest={(s) => { setInput(s); setTimeout(() => submit(s), 0); }} />
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", gap: 18,
              maxWidth: 760, margin: "0 auto",
            }}>
              {messages.map((msg, i) =>
                msg.role === "user"
                  ? <div key={i} className="aiq-msg"><UserBubble text={msg.text} /></div>
                  : <div key={i} className="aiq-msg"><AIBubble message={msg} /></div>
              )}
              {loading && <ThinkingBubble />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* quick chips */}
        {messages.length > 0 && !loading && (
          <div className="chip-bar">
            {SUGGESTIONS.slice(0, 4).map(s => (
              <button key={s} className="aiq-chip" onClick={() => submit(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* sticky footer input */}
        <div className="ai-footer">
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#fff",
              border: `1.5px solid ${sendActive ? T.primary : "var(--color-border-secondary)"}`,
              borderRadius: "var(--border-radius-lg)",
              padding: "7px 7px 7px 13px",
              transition: "border-color 0.15s",
            }}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKey}
                placeholder="Ask about orders, customers, products..."
                style={{
                  flex: 1, border: "none", outline: "none", resize: "none",
                  background: "transparent", fontSize: 13, lineHeight: 1.5,
                  color: "var(--color-text-primary)", fontFamily: "inherit",
                  padding: 0, minHeight: 22, maxHeight: 120, overflowY: "auto",
                }}
              />
              <button
                onClick={() => submit()}
                disabled={!sendActive}
                style={{
                  width: 32, height: 32,
                  borderRadius: "var(--border-radius-md)",
                  border: "none",
                  background: sendActive ? T.primary : T.primaryLight,
                  cursor: sendActive ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.15s, transform 0.1s",
                }}
                onMouseEnter={e => { if (sendActive) e.currentTarget.style.background = T.primaryDark; }}
                onMouseLeave={e => { if (sendActive) e.currentTarget.style.background = T.primary; }}
                onMouseDown={e => { if (sendActive) e.currentTarget.style.transform = "scale(0.95)"; }}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={sendActive ? "#fff" : T.primaryBorder}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p style={{
              fontSize: 11, color: "var(--color-text-tertiary)",
              textAlign: "center", marginTop: 6,
            }}>
              Results are scoped to your store &middot; Enter to send
            </p>
          </div>
        </div>

      </div>
    </>
  );
}