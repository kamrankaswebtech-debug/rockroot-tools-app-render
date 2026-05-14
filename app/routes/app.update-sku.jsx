// ─────────────────────────────────────────────────────────────────────────────
// FILE: app/routes/app.update-sku.jsx
//
// NOTE: Uses useFetcher instead of raw fetch() — required for Shopify embedded
//       apps. Raw fetch() bypasses authentication. useFetcher is Shopify's
//       official recommended approach for form submissions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

// ─── LOADER: Shopify auth on page load ───────────────────────────────────────
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return Response.json({});
};

// ─── ACTION: POST handler — all Shopify GraphQL work happens here ────────────
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const csvData = formData.get("csvData");

  // Parse JSON from frontend
  let rows;
  try {
    rows = JSON.parse(csvData);
  } catch {
    return Response.json({ error: "Invalid CSV data sent to server" }, { status: 400 });
  }

  // Group rows by productTitle
  // If same product has multiple rows (for multiple variants),
  // they will be processed together
  const groupedByTitle = {};
  for (const row of rows) {
    const title = row.productTitle?.trim();
    const sku = row.sku?.trim();
    if (!title || !sku) continue;
    if (!groupedByTitle[title]) groupedByTitle[title] = [];
    groupedByTitle[title].push(sku);
  }

  const results = [];

  // Process har unique product title
  for (const [productTitle, skus] of Object.entries(groupedByTitle)) {
    try {
      // STEP 1: Product title se product + variants dhundo
      const searchResponse = await admin.graphql(
        `#graphql
        query searchProduct($query: String!) {
          products(first: 5, query: $query) {
            edges {
              node {
                id
                title
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      sku
                    }
                  }
                }
              }
            }
          }
        }`,
        { variables: { query: `title:"${productTitle}"` } }
      );

      const searchData = await searchResponse.json();
      const products = searchData?.data?.products?.edges || [];

      // Exact title match (case-insensitive)
      const matchedProduct = products.find(
        (p) => p.node.title.toLowerCase() === productTitle.toLowerCase()
      );

      if (!matchedProduct) {
        results.push({
          productTitle,
          status: "NOT_FOUND",
          message: `"${productTitle}" was not found in Shopify`,
          skusAttempted: skus,
        });
        continue;
      }

      const productId = matchedProduct.node.id;
      const variants = matchedProduct.node.variants.edges.map((e) => e.node);

      // STEP 2: Variant to SKU mapping
      // - 1 variant  → use first SKU from CSV
      // - N variants → positional match: 1st CSV row → 1st variant, etc.
      const variantUpdates = variants.map((variant, i) => ({
        id: variant.id,
        inventoryItem: { sku: skus[i] ?? skus[0] },
      }));

      // STEP 3: productVariantsBulkUpdate mutation (latest Shopify API 2026-04)
      const updateResponse = await admin.graphql(
        `#graphql
        mutation bulkUpdateVariantSKU(
          $productId: ID!
          $variants: [ProductVariantsBulkInput!]!
        ) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              title
              sku
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { productId, variants: variantUpdates } }
      );

      const updateData = await updateResponse.json();
      const userErrors =
        updateData?.data?.productVariantsBulkUpdate?.userErrors || [];
      const updatedVariants =
        updateData?.data?.productVariantsBulkUpdate?.productVariants || [];

      if (userErrors.length > 0) {
        results.push({
          productTitle,
          status: "ERROR",
          message: userErrors.map((e) => e.message).join(", "),
          skusAttempted: skus,
        });
      } else {
        results.push({
          productTitle,
          status: "SUCCESS",
          message: `${updatedVariants.length} variant(s) updated successfully`,
          updatedVariants: updatedVariants.map((v) => ({
            title: v.title,
            newSku: v.sku,
          })),
        });
      }
    } catch (err) {
      results.push({
        productTitle,
        status: "ERROR",
        message: err.message || "Unknown server error",
        skusAttempted: skus,
      });
    }
  }

  return Response.json({ results });
};

// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function UpdateSKU() {
  // useFetcher — correct way to submit forms in Shopify embedded apps
  // Raw fetch() is not allowed in embedded apps — auth gets bypassed
  const fetcher = useFetcher();

  const [isDragging, setIsDragging]   = useState(false);
  const [fileName, setFileName]       = useState(null);
  const [parsedRows, setParsedRows]   = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [step, setStep]               = useState("upload"); // upload | preview | results
  const [clientError, setClientError] = useState(null);

  // fetcher.state: "idle" | "submitting" | "loading"
  const isLoading = fetcher.state !== "idle";

  // Results and error from server
  const serverResults = fetcher.data?.results || [];
  const serverError   = fetcher.data?.error   || null;

  // Jab server response aaye → results step pe le jao
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.results) {
      setStep("results");
    }
  }, [fetcher.state, fetcher.data]);

  // ── CSV Parser ──────────────────────────────────────────────────────────────
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));

    const skuIdx = headers.findIndex(
      (h) => h.toLowerCase() === "sku"
    );
    const titleIdx = headers.findIndex(
      (h) =>
        h.toLowerCase() === "product_name" ||
        h.toLowerCase() === "product name" ||
        h.toLowerCase() === "title"
    );

    if (skuIdx === -1 || titleIdx === -1) {
      throw new Error(
        `CSV must have "SKU" and "Product_Name" columns. Found: ${headers.join(", ")}`
      );
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted commas in CSV values
      const cols =
        line.match(/(".*?"|[^,]+)/g)?.map((c) =>
          c.trim().replace(/^"|"$/g, "")
        ) || line.split(",");

      const sku          = cols[skuIdx]?.trim();
      const productTitle = cols[titleIdx]?.trim();

      if (sku && productTitle) {
        rows.push({ productTitle, sku, rowNumber: i });
      }
    }
    return rows;
  };

  // ── File handler ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    setClientError(null);
    setStep("upload");
    setParsedRows([]);
    setPreviewData([]);

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setClientError("Please upload a .csv file only");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result);
        if (rows.length === 0) {
          setClientError("No valid rows found in CSV");
          return;
        }
        setParsedRows(rows);
        setPreviewData(rows.slice(0, 10));
        setStep("preview");
      } catch (err) {
        setClientError(err.message);
      }
    };
    reader.readAsText(file);
  }, []);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); },
    [handleFile]
  );
  const handleDragOver   = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave  = ()  => setIsDragging(false);
  const handleInputChange = (e) => handleFile(e.target.files[0]);

  // ── Submit via useFetcher (NOT raw fetch) ───────────────────────────────────
  const handleSubmit = () => {
    const fd = new FormData();
    fd.append("csvData", JSON.stringify(parsedRows));
    // fetcher.submit → Shopify session/auth is handled automatically
    fetcher.submit(fd, { method: "POST", action: "/app/update-sku" });
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFileName(null);
    setParsedRows([]);
    setPreviewData([]);
    setClientError(null);
    setStep("upload");
  };

  // ── Result counts ────────────────────────────────────────────────────────────
  const successCount  = serverResults.filter((r) => r.status === "SUCCESS").length;
  const errorCount    = serverResults.filter((r) => r.status === "ERROR").length;
  const notFoundCount = serverResults.filter((r) => r.status === "NOT_FOUND").length;

  const displayError = clientError || serverError;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto", fontFamily: "sans-serif" }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1a1a2e", marginBottom: "6px" }}>
          Update Product SKU
        </h1>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
          Upload a CSV file with <strong>Product_Name</strong> and <strong>SKU</strong> columns.
          SKUs will be automatically updated in your Shopify Admin.
        </p>
      </div>

      {/* STEPS INDICATOR */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "28px", alignItems: "center" }}>
        {[
          { key: "upload",  label: "CSV Upload"        },
          { key: "preview", label: "Preview & Confirm" },
          { key: "results", label: "Results"           },
        ].map(({ key, label }, i) => {
          const isActive = step === key;
          const isDone =
            (i === 0 && (step === "preview" || step === "results")) ||
            (i === 1 && step === "results");
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: isDone ? "#10b981" : isActive ? "#6366f1" : "#e5e7eb",
                color: (isDone || isActive) ? "#fff" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "700", flexShrink: 0,
              }}>
                {isDone ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "13px",
                color: isActive ? "#6366f1" : isDone ? "#10b981" : "#9ca3af",
                fontWeight: isActive ? "600" : "400",
              }}>
                {label}
              </span>
              {i < 2 && <span style={{ color: "#d1d5db", margin: "0 4px" }}>→</span>}
            </div>
          );
        })}
      </div>

      {/* ERROR BANNER */}
      {displayError && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px",
          padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "14px",
        }}>
          ⚠️ {displayError}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 1 — UPLOAD
      ════════════════════════════════════════════════ */}
      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${isDragging ? "#6366f1" : "#d1d5db"}`,
            borderRadius: "12px",
            padding: "60px 24px",
            textAlign: "center",
            background: isDragging ? "#f0f0ff" : "#fafafa",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📂</div>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
            Drag & drop your CSV file here
          </p>
          <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px" }}>
            or click the button below to browse
          </p>
          <label style={{
            background: "#6366f1", color: "#fff", padding: "10px 24px",
            borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600",
            display: "inline-block",
          }}>
            Choose CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleInputChange}
              style={{ display: "none" }}
            />
          </label>
          <p style={{ marginTop: "20px", fontSize: "12px", color: "#9ca3af" }}>
            Required columns: <strong>SKU</strong> and <strong>Product_Name</strong>
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 2 — PREVIEW
      ════════════════════════════════════════════════ */}
      {step === "preview" && (
        <div>
          {/* File info bar */}
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px",
            padding: "12px 16px", marginBottom: "20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "8px",
          }}>
            <span style={{ color: "#15803d", fontSize: "14px" }}>
              ✅ <strong>{fileName}</strong> — {parsedRows.length} rows ready to process
            </span>
            <button
              onClick={handleReset}
              style={{
                background: "none", border: "1px solid #86efac", borderRadius: "6px",
                padding: "4px 12px", color: "#15803d", cursor: "pointer", fontSize: "13px",
              }}
            >
              Change File
            </button>
          </div>

          {/* Preview table */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
              Preview — first {previewData.length} rows
            </h3>
            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Product Name</th>
                    <th style={thStyle}>New SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={tdStyle}>{row.rowNumber}</td>
                      <td style={tdStyle}>{row.productTitle}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", color: "#6366f1" }}>
                        {row.sku}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && (
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
                ... and {parsedRows.length - 10} more rows
              </p>
            )}
          </div>

          {/* Warning */}
          <div style={{
            background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px",
            padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#92400e",
          }}>
            ⚠️ <strong>This will update SKUs directly in Shopify Admin.</strong> Please verify the preview above before confirming.
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                background: isLoading ? "#a5b4fc" : "#6366f1",
                color: "#fff", padding: "12px 28px", borderRadius: "8px",
                border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "15px", fontWeight: "600",
              }}
            >
              {isLoading
                ? "⏳ Updating SKUs..."
                : `🚀 Update ${parsedRows.length} SKUs in Shopify`}
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              style={{
                background: "#fff", color: "#6b7280", padding: "12px 20px",
                borderRadius: "8px", border: "1px solid #d1d5db",
                cursor: isLoading ? "not-allowed" : "pointer", fontSize: "14px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 3 — RESULTS
      ════════════════════════════════════════════════ */}
      {step === "results" && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
            <SummaryCard label="Total Processed" value={serverResults.length} color="#6366f1" />
            <SummaryCard label="✅ Success"       value={successCount}          color="#10b981" />
            <SummaryCard label="❌ Errors"        value={errorCount}            color="#ef4444" />
            <SummaryCard label="🔍 Not Found"     value={notFoundCount}         color="#f59e0b" />
          </div>

          {/* Results table */}
          <div style={{
            overflowX: "auto", borderRadius: "8px",
            border: "1px solid #e5e7eb", marginBottom: "20px",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Product Name</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {serverResults.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ ...tdStyle, fontWeight: "500" }}>{r.productTitle}</td>
                    <td style={tdStyle}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={tdStyle}>
                      {r.status === "SUCCESS" ? (
                        <div>
                          <div style={{ color: "#15803d", marginBottom: "4px" }}>
                            {r.message}
                          </div>
                          {r.updatedVariants?.map((v, vi) => (
                            <div key={vi} style={{ fontSize: "12px", color: "#6b7280" }}>
                              {v.title} →{" "}
                              <span style={{ fontFamily: "monospace", color: "#6366f1" }}>
                                {v.newSku}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{
                          color: r.status === "NOT_FOUND" ? "#92400e" : "#dc2626",
                        }}>
                          {r.message}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleReset}
            style={{
              background: "#6366f1", color: "#fff", padding: "10px 24px",
              borderRadius: "8px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: "600",
            }}
          >
            Upload Another CSV
          </button>
        </div>
      )}

    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}30`, borderRadius: "10px",
      padding: "16px 24px", minWidth: "130px", textAlign: "center",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: "28px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    SUCCESS:   { bg: "#dcfce7", color: "#15803d", label: "✅ Success"   },
    ERROR:     { bg: "#fee2e2", color: "#dc2626", label: "❌ Error"     },
    NOT_FOUND: { bg: "#fef3c7", color: "#92400e", label: "🔍 Not Found" },
  };
  const c = config[status] || { bg: "#f3f4f6", color: "#374151", label: status };
  return (
    <span style={{
      background: c.bg, color: c.color, padding: "3px 10px",
      borderRadius: "20px", fontSize: "12px", fontWeight: "600",
    }}>
      {c.label}
    </span>
  );
}

// ─── Table styles ─────────────────────────────────────────────────────────────
const thStyle = {
  padding: "10px 14px", textAlign: "left", fontWeight: "600",
  color: "#374151", fontSize: "12px", borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "10px 14px", color: "#374151", verticalAlign: "top",
};
