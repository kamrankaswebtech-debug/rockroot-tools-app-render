import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export async function loader({ request }) {
  await authenticate.admin(request);
  return Response.json({ ok: true });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData   = await request.formData();
  const intent     = formData.get("intent");

  // ── FETCH ALL ACTIVE PRODUCTS ──────────────────────────────────────
  if (intent === "fetch_products") {
    const response = await admin.graphql(`
      query getAllProducts {
        products(first: 100, query: "status:active") {
          edges {
            node {
              id
              title
              images(first: 1) { edges { node { url } } }
              variants(first: 20) {
                edges { node { id title price } }
              }
            }
          }
        }
      }
    `);
    const data     = await response.json();
    const products = data.data.products.edges.map(e => ({
      id:       e.node.id,
      title:    e.node.title,
      image:    e.node.images.edges[0]?.node.url || null,
      variants: e.node.variants.edges.map(v => ({
        id:    v.node.id,
        title: v.node.title,
        price: v.node.price,
      })),
    }));
    return Response.json({ success: true, intent: "fetch_products", products });
  }

  // ── FETCH SPECIFIC PRODUCTS BY IDs ────────────────────────────────
  if (intent === "fetch_selected_products") {
    const ids      = JSON.parse(formData.get("productIds") || "[]");
    const products = [];
    for (const productId of ids) {
      const response = await admin.graphql(`
        query getProduct($id: ID!) {
          product(id: $id) {
            id title
            images(first: 1) { edges { node { url } } }
            variants(first: 20) {
              edges { node { id title price } }
            }
          }
        }
      `, { variables: { id: productId } });
      const data = await response.json();
      const p    = data.data.product;
      if (!p) continue;
      products.push({
        id:       p.id,
        title:    p.title,
        image:    p.images.edges[0]?.node.url || null,
        variants: p.variants.edges.map(v => ({
          id:    v.node.id,
          title: v.node.title,
          price: v.node.price,
        })),
      });
    }
    return Response.json({ success: true, intent: "fetch_selected_products", products });
  }

  // ── UPDATE SINGLE VARIANT PRICE ───────────────────────────────────
  if (intent === "update_single_price") {
    const productId = formData.get("productId");
    const variantId = formData.get("variantId");
    const newPrice  = parseFloat(formData.get("newPrice")).toFixed(2);

    const response = await admin.graphql(`
      mutation updateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id price }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        productId,
        variants: [{ id: variantId, price: newPrice }],
      },
    });

    const data   = await response.json();
    const errors = data.data?.productVariantsBulkUpdate?.userErrors || [];
    if (errors.length > 0) {
      return Response.json({ success: false, intent: "update_single_price", error: errors[0].message });
    }
    return Response.json({ success: true, intent: "update_single_price", variantId, newPrice });
  }

  // ── BULK PRICE ADJUSTMENT ─────────────────────────────────────────
  if (intent === "bulk_adjust") {
    const adjustType  = formData.get("adjustType");
    const adjustMode  = formData.get("adjustMode");
    const adjustValue = parseFloat(formData.get("adjustValue")) || 0;
    const variants    = JSON.parse(formData.get("variants") || "[]");

    // Group variants by productId — Shopify API requirement
    const byProduct = {};
    for (const v of variants) {
      if (!byProduct[v.productId]) byProduct[v.productId] = [];
      byProduct[v.productId].push(v);
    }

    let updatedCount = 0;
    for (const [productId, pvariants] of Object.entries(byProduct)) {
      const bulkInput = pvariants.map(v => {
        const curr = parseFloat(v.price) || 0;
        let newPrice;
        if (adjustMode === "percent") {
          const delta = curr * (adjustValue / 100);
          newPrice    = adjustType === "increase" ? curr + delta : curr - delta;
        } else {
          newPrice    = adjustType === "increase" ? curr + adjustValue : curr - adjustValue;
        }
        newPrice = Math.max(0, parseFloat(newPrice.toFixed(2)));
        return { id: v.id, price: String(newPrice.toFixed(2)) };
      });

      await admin.graphql(`
        mutation bulkUpdatePrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id price }
            userErrors { field message }
          }
        }
      `, { variables: { productId, variants: bulkInput } });

      updatedCount += bulkInput.length;
    }
    return Response.json({ success: true, intent: "bulk_adjust", count: updatedCount });
  }

  return Response.json({ error: "Unknown intent." });
}

// ── REACT COMPONENT ──────────────────────────────────────────────────
export default function ProductPrices() {
  // useFetcher — Shopify's recommended way for embedded apps
  // Raw fetch() does NOT work in embedded apps (authentication issue)
  const fetcher = useFetcher();

  const [products, setProducts]           = useState([]);
  const [loaded, setLoaded]               = useState(false);
  const [message, setMessage]             = useState(null);

  // Single price edit state
  const [editVariantId, setEditVariantId] = useState(null);
  const [editProductId, setEditProductId] = useState(null);
  const [editPrice, setEditPrice]         = useState("");

  // Bulk adjust state
  const [adjType,  setAdjType]  = useState("increase");
  const [adjMode,  setAdjMode]  = useState("percent");
  const [adjValue, setAdjValue] = useState("");

  // Track what action is pending so we can handle response correctly
  const pendingIntent = useRef(null);

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  // ── Handle fetcher responses ──
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;

    const data = fetcher.data;

    if (data.intent === "fetch_products" || data.intent === "fetch_selected_products") {
      if (data.success) {
        setProducts(data.products);
        setLoaded(true);
      } else {
        flash("error", "Failed to load products.");
      }
    }

    if (data.intent === "update_single_price") {
      if (data.success) {
        // Update UI immediately
        setProducts(prev => prev.map(p =>
          p.id !== editProductId ? p : {
            ...p,
            variants: p.variants.map(v =>
              v.id !== data.variantId ? v : { ...v, price: data.newPrice }
            ),
          }
        ));
        flash("success", "✅ Price updated on Shopify. Live on store now.");
        setEditVariantId(null);
        setEditProductId(null);
      } else {
        flash("error", data.error || "Failed to save price.");
      }
    }

    if (data.intent === "bulk_adjust") {
      if (data.success) {
        flash("success", `✅ Price updated for ${data.count} variant(s). Reloading prices...`);
        // Reload all products to show updated prices
        setTimeout(() => {
          const fd = new FormData();
          fd.append("intent", "fetch_products");
          fetcher.submit(fd, { method: "post" });
        }, 1000);
      } else {
        flash("error", "Bulk adjustment failed.");
      }
    }
  }, [fetcher.state, fetcher.data]);

  // ── Load all products ──
  function loadAll() {
    const fd = new FormData();
    fd.append("intent", "fetch_products");
    fetcher.submit(fd, { method: "post" });
  }

  // ── Browse specific products via Resource Picker ──
  async function browseProducts() {
    try {
      const selected = await window.shopify.resourcePicker({
        type:     "product",
        action:   "select",
        multiple: true,
        filter:   { draft: false, archived: false },
      });
      if (!selected || selected.length === 0) return;

      const fd = new FormData();
      fd.append("intent",     "fetch_selected_products");
      fd.append("productIds", JSON.stringify(selected.map(p => p.id)));
      fetcher.submit(fd, { method: "post" });
    } catch (e) {
      flash("error", "Could not open product picker: " + e.message);
    }
  }

  // ── Save single variant price ──
  function savePrice() {
    if (!editPrice || isNaN(parseFloat(editPrice))) {
      flash("error", "Please enter a valid price.");
      return;
    }
    const fd = new FormData();
    fd.append("intent",    "update_single_price");
    fd.append("productId", editProductId);
    fd.append("variantId", editVariantId);
    fd.append("newPrice",  parseFloat(editPrice).toFixed(2));
    fetcher.submit(fd, { method: "post" });
  }

  // ── Apply bulk price adjustment ──
  function applyBulk() {
    const val = parseFloat(adjValue);
    if (!val || val <= 0) { flash("error", "Enter a valid adjustment value greater than 0."); return; }
    if (products.length === 0) { flash("error", "Load products first."); return; }

    const variants = products.flatMap(p =>
      p.variants.map(v => ({ ...v, productId: p.id }))
    );
    const label = `${adjType === "increase" ? "+" : "-"}${val}${adjMode === "percent" ? "%" : "$"}`;

    if (!window.confirm(
      `Apply ${label} to ALL ${variants.length} variant(s) shown?\n\nThis updates prices live on your Shopify store including cart and checkout.`
    )) return;

    const fd = new FormData();
    fd.append("intent",      "bulk_adjust");
    fd.append("adjustType",  adjType);
    fd.append("adjustMode",  adjMode);
    fd.append("adjustValue", val);
    fd.append("variants",    JSON.stringify(variants));
    fetcher.submit(fd, { method: "post" });
  }

  // ── Preview price ──
  function preview(currentPrice) {
    const val  = parseFloat(adjValue) || 0;
    const curr = parseFloat(currentPrice) || 0;
    if (!val) return null;
    let np;
    if (adjMode === "percent") {
      const delta = curr * (val / 100);
      np = adjType === "increase" ? curr + delta : curr - delta;
    } else {
      np = adjType === "increase" ? curr + val : curr - val;
    }
    return Math.max(0, parseFloat(np.toFixed(2))).toFixed(2);
  }

  const isLoading = fetcher.state !== "idle";
  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);

  const btn = (bg, fg, extra = {}) => ({
    padding: "9px 18px", background: bg, color: fg,
    border: "none", borderRadius: "4px", fontSize: "13px",
    fontWeight: "700", cursor: isLoading ? "not-allowed" : "pointer",
    opacity: isLoading ? 0.7 : 1, ...extra,
  });
  const inp = {
    padding: "8px 10px", border: "1px solid #ccc",
    borderRadius: "4px", fontSize: "14px",
  };

  return (
    <s-page heading="Manage Product Prices">

      {/* ── BANNER ── */}
      {message && (
        <s-banner tone={message.type === "success" ? "success" : "critical"}>
          {message.text}
        </s-banner>
      )}

      {/* ── LOAD PRODUCTS ── */}
      <s-section heading="Load Products">
        <s-paragraph>
          Browse specific products to edit individual prices, or load all products at once.
          All price changes apply directly to your live Shopify store — cart and checkout
          automatically use the updated prices.
        </s-paragraph>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={browseProducts} disabled={isLoading} style={btn("#1a2e4a", "#f5c518")}>
            {isLoading && fetcher.formData?.get("intent") === "fetch_selected_products"
              ? "Loading..." : "Browse & Select Products"}
          </button>
          <button onClick={loadAll} disabled={isLoading} style={btn("#28a745", "white")}>
            {isLoading && fetcher.formData?.get("intent") === "fetch_products"
              ? "Loading..." : "Load All Products"}
          </button>
          {loaded && (
            <button
              onClick={() => { setProducts([]); setLoaded(false); }}
              disabled={isLoading}
              style={btn("#6c757d", "white")}
            >
              Clear
            </button>
          )}
        </div>

        {loaded && (
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#28a745", fontWeight: "600" }}>
            ✅ {products.length} product(s) loaded — {totalVariants} total variant(s)
          </div>
        )}
      </s-section>

      {/* ── BULK ADJUST — only when products loaded ── */}
      {loaded && products.length > 0 && (
        <s-section heading="Bulk Price Adjustment">
          <s-paragraph>
            Adjust prices for all loaded products at once using percentage or fixed amount.
            Preview column in the table below shows new prices before you apply.
          </s-paragraph>

          <div style={{
            padding: "16px", background: "#f8f9fa",
            borderRadius: "8px", border: "1px solid #e0e0e0",
            marginTop: "16px", display: "flex",
            gap: "14px", flexWrap: "wrap", alignItems: "flex-end",
          }}>

            {/* Direction */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#555" }}>Direction</div>
              <div style={{ display: "flex" }}>
                {[
                  { val: "increase", label: "+ Increase", activeColor: "#28a745" },
                  { val: "decrease", label: "− Decrease", activeColor: "#dc3545" },
                ].map((d, i) => (
                  <button key={d.val} onClick={() => setAdjType(d.val)} style={{
                    padding: "9px 16px", fontWeight: "700", cursor: "pointer", fontSize: "14px",
                    background: adjType === d.val ? d.activeColor : "white",
                    color:      adjType === d.val ? "white" : "#555",
                    border: "1px solid #ccc",
                    borderRight: i === 0 ? "none" : undefined,
                    borderRadius: i === 0 ? "4px 0 0 4px" : "0 4px 4px 0",
                  }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#555" }}>Mode</div>
              <div style={{ display: "flex" }}>
                {[
                  { val: "percent", label: "% Percent" },
                  { val: "fixed",   label: "$ Fixed"   },
                ].map((m, i) => (
                  <button key={m.val} onClick={() => setAdjMode(m.val)} style={{
                    padding: "9px 16px", fontWeight: "700", cursor: "pointer", fontSize: "14px",
                    background: adjMode === m.val ? "#1a2e4a" : "white",
                    color:      adjMode === m.val ? "#f5c518" : "#555",
                    border: "1px solid #ccc",
                    borderRight: i === 0 ? "none" : undefined,
                    borderRadius: i === 0 ? "4px 0 0 4px" : "0 4px 4px 0",
                  }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#555" }}>
                Value ({adjMode === "percent" ? "%" : "$"})
              </div>
              <input
                type="number" min="0"
                step={adjMode === "percent" ? "1" : "0.01"}
                placeholder={adjMode === "percent" ? "e.g. 10" : "e.g. 5.00"}
                value={adjValue}
                onChange={e => setAdjValue(e.target.value)}
                style={{ ...inp, width: "120px" }}
              />
            </div>

            {/* Apply */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#555" }}>Apply</div>
              <button
                onClick={applyBulk}
                disabled={isLoading || !adjValue}
                style={{
                  padding: "9px 18px",
                  background: isLoading || !adjValue ? "#ccc"
                    : adjType === "increase" ? "#28a745" : "#dc3545",
                  color:      isLoading || !adjValue ? "#888" : "white",
                  border: "none", borderRadius: "4px",
                  fontSize: "13px", fontWeight: "700",
                  cursor: isLoading || !adjValue ? "not-allowed" : "pointer",
                }}
              >
                {isLoading && fetcher.formData?.get("intent") === "bulk_adjust"
                  ? "Applying..."
                  : `Apply ${adjType === "increase" ? "+" : "-"}${adjValue || "?"}${adjMode === "percent" ? "%" : "$"} to All ${totalVariants} Variant(s)`
                }
              </button>
            </div>
          </div>
        </s-section>
      )}

      {/* ── PRODUCTS TABLE ── */}
      {loaded ? (
        <s-section heading={`Products (${products.length})`}>
          {products.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
              No products found.
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#1a2e4a", color: "#f5c518" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Variant</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Current Price</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>
                      Preview {adjValue
                        ? `(${adjType === "increase" ? "+" : "-"}${adjValue}${adjMode === "percent" ? "%" : "$"})`
                        : ""}
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product =>
                    product.variants.map((variant, vi) => {
                      const previewPrice = preview(variant.price);
                      const isEditing    = editVariantId === variant.id;
                      const isSaving     = isLoading &&
                        fetcher.formData?.get("intent") === "update_single_price" &&
                        fetcher.formData?.get("variantId") === variant.id;

                      return (
                        <tr key={variant.id} style={{
                          background:   vi % 2 === 0 ? "white" : "#f8f9fa",
                          borderBottom: "1px solid #eee",
                        }}>

                          {/* Product name — first variant row only */}
                          <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                            {vi === 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {product.image && (
                                  <img src={product.image} alt={product.title}
                                    style={{ width: "38px", height: "38px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                                )}
                                <div>
                                  <div style={{ fontWeight: "600" }}>{product.title}</div>
                                  <div style={{ fontSize: "11px", color: "#999" }}>
                                    {product.variants.length} variant{product.variants.length > 1 ? "s" : ""}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Variant */}
                          <td style={{ padding: "10px 12px", color: "#555" }}>
                            {variant.title === "Default Title" ? "—" : variant.title}
                          </td>

                          {/* Current Price */}
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {isEditing ? (
                              <input type="number" min="0" step="0.01"
                                value={editPrice}
                                onChange={e => setEditPrice(e.target.value)}
                                style={{ ...inp, width: "100px", textAlign: "right" }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontWeight: "700", color: "#1a2e4a" }}>
                                ${parseFloat(variant.price).toFixed(2)}
                              </span>
                            )}
                          </td>

                          {/* Preview */}
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {previewPrice && !isEditing ? (
                              <span style={{
                                fontWeight: "600",
                                color: adjType === "increase" ? "#28a745" : "#dc3545",
                              }}>
                                ${previewPrice}
                              </span>
                            ) : (
                              <span style={{ color: "#ccc" }}>—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                <button
                                  onClick={savePrice}
                                  disabled={isSaving}
                                  style={{
                                    padding: "6px 14px", background: "#28a745", color: "white",
                                    border: "none", borderRadius: "4px", fontSize: "12px",
                                    fontWeight: "600", cursor: isSaving ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={() => { setEditVariantId(null); setEditProductId(null); }}
                                  style={{
                                    padding: "6px 14px", background: "#6c757d", color: "white",
                                    border: "none", borderRadius: "4px", fontSize: "12px",
                                    fontWeight: "600", cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditVariantId(variant.id);
                                  setEditProductId(product.id);
                                  setEditPrice(variant.price);
                                }}
                                disabled={isLoading}
                                style={{
                                  padding: "6px 14px", background: "#1a2e4a", color: "#f5c518",
                                  border: "none", borderRadius: "4px", fontSize: "12px",
                                  fontWeight: "600", cursor: isLoading ? "not-allowed" : "pointer",
                                }}
                              >
                                Edit Price
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </s-section>
      ) : (
        <s-section heading="Products">
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#888", background: "#f8f9fa", borderRadius: "8px" }}>
            {isLoading ? (
              <div style={{ fontSize: "16px" }}>⏳ Loading products...</div>
            ) : (
              <>
                <div style={{ fontSize: "18px", marginBottom: "8px" }}>No products loaded yet</div>
                <div style={{ fontSize: "13px" }}>
                  Click "Browse & Select Products" to pick specific products,
                  or "Load All Products" to see everything.
                </div>
              </>
            )}
          </div>
        </s-section>
      )}

    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);