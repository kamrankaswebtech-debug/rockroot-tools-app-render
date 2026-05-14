import { useState, useEffect, useCallback } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

const CATEGORY_OPTIONS = [
  { value: "mulch",     label: "Garden Mulch (m³)" },
  { value: "gardenMix", label: "Garden Mixes & Manures (m³)" },
  { value: "soil",      label: "Soils / Top Dressing (tonnes)" },
  { value: "sand",      label: "Sand (tonnes)" },
  { value: "gravel",    label: "Decorative Gravels (tonnes)" },
  { value: "scoria",    label: "Red Scoria (tonnes)" },
  { value: "roadbase",  label: "Road Base / Recycled Asphalt (tonnes)" },
  { value: "recycled",  label: "Recycled Road Base / Deco Granite (tonnes)" },
  { value: "bluemetal", label: "Blue Metal / Recycled Aggs (tonnes)" },
  { value: "turf",      label: "Turf (m² — area calculator)" },
  { value: "other",     label: "Other" },
];

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const products = await prisma.estimatorProduct.findMany({
    where: { shop },
    orderBy: { sortOrder: "asc" },
  });

  return { products, shop };
}

export async function action({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Add products from Shopify Resource Picker
  if (intent === "add_products") {
    const productsJson = formData.get("products");
    const selectedProducts = JSON.parse(productsJson || "[]");

    for (const product of selectedProducts) {
      // Fetch metafields for this product from Shopify
      const response = await admin.graphql(`
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            metafields(namespace: "app", first: 10) {
              edges {
                node {
                  key
                  value
                }
              }
            }
          }
        }
      `, { variables: { id: product.id } });

      const data = await response.json();
      const metafields = data.data.product.metafields.edges.map(e => e.node);

      const densityMeta  = metafields.find(m => m.key === "estimator_density");
      const categoryMeta = metafields.find(m => m.key === "estimator_category");
      const unitMeta     = metafields.find(m => m.key === "estimator_unit");

      const density  = densityMeta  ? parseFloat(densityMeta.value)  : 1.0;
      const category = categoryMeta ? categoryMeta.value              : "other";
      const unit     = unitMeta     ? unitMeta.value                  : "tonnes";

      // Get current max sort order
      const maxOrder = await prisma.estimatorProduct.findFirst({
        where: { shop },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      await prisma.estimatorProduct.upsert({
        where: { shop_shopifyProductId: { shop, shopifyProductId: product.id } },
        update: { title: product.title, density, category, unit },
        create: {
          shop,
          shopifyProductId: product.id,
          title: product.title,
          density,
          category,
          unit,
          enabled: true,
          sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
        },
      });
    }
    return { success: true, intent: "add_products" };
  }

  // Update a single product settings
  if (intent === "update") {
    const id       = parseInt(formData.get("id"));
    const density  = parseFloat(formData.get("density"))  || 1.0;
    const category = formData.get("category") || "other";
    const unit     = formData.get("unit")     || "tonnes";
    const enabled  = formData.get("enabled")  === "true";

    await prisma.estimatorProduct.update({
      where: { id },
      data: { density, category, unit, enabled },
    });
    return { success: true, intent: "update" };
  }

  // Toggle enable/disable
  if (intent === "toggle") {
    const id      = parseInt(formData.get("id"));
    const enabled = formData.get("enabled") === "true";
    await prisma.estimatorProduct.update({
      where: { id },
      data: { enabled },
    });
    return { success: true, intent: "toggle" };
  }

  // Remove product from estimator
  if (intent === "remove") {
    const id = parseInt(formData.get("id"));
    await prisma.estimatorProduct.delete({ where: { id } });
    return { success: true, intent: "remove" };
  }

  return { error: "Unknown action." };
}

export default function EstimatorProducts() {
  const { products } = useLoaderData();
  const [localProducts, setLocalProducts] = useState(products);
  const [editingId, setEditingId]         = useState(null);
  const [editValues, setEditValues]       = useState({});
  const [message, setMessage]             = useState(null);
  const [saving, setSaving]               = useState(false);

  useEffect(() => { setLocalProducts(products); }, [products]);

  // Open Shopify Resource Picker
  async function openResourcePicker() {
    try {
      // Build list of already-linked product GIDs so they show as pre-selected
      const initialSelection = localProducts.map(p => ({ id: p.shopifyProductId }));

      const selected = await window.shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
        filter: { draft: false, archived: false },
        initialSelectionIds: initialSelection,
      });

      if (!selected || selected.length === 0) return;

      const productsData = selected.map(p => ({
        id:    p.id,
        title: p.title,
      }));

      const fd = new FormData();
      fd.append("intent",   "add_products");
      fd.append("products", JSON.stringify(productsData));

      const resp = await fetch(window.location.pathname, { method: "POST", body: fd });
      if (resp.ok) {
        setMessage({ type: "success", text: `${productsData.length} product(s) added to estimator.` });
        // Reload immediately so table updates without needing manual refresh
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMessage({ type: "error", text: "Failed to save products. Please try again." });
      }








    } catch (err) {
      console.error("Resource picker error:", err);
      setMessage({ type: "error", text: "Could not open product picker. Please try again." });
    }
  }

  async function toggleProduct(product) {
    const fd = new FormData();
    fd.append("intent",  "toggle");
    fd.append("id",      product.id);
    fd.append("enabled", String(!product.enabled));
    await fetch(window.location.pathname, { method: "POST", body: fd });
    setLocalProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, enabled: !p.enabled } : p)
    );
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditValues({
      density:  product.density,
      category: product.category,
      unit:     product.unit,
      enabled:  product.enabled,
    });
  }

  function cancelEdit() { setEditingId(null); setEditValues({}); }

  async function saveEdit(product) {
    setSaving(true);
    const fd = new FormData();
    fd.append("intent",   "update");
    fd.append("id",       product.id);
    fd.append("density",  editValues.density);
    fd.append("category", editValues.category);
    fd.append("unit",     editValues.unit);
    fd.append("enabled",  String(editValues.enabled));

    const resp = await fetch(window.location.pathname, { method: "POST", body: fd });
    if (resp.ok) {
      setLocalProducts(prev => prev.map(p =>
        p.id === product.id
          ? { ...p, density: parseFloat(editValues.density), category: editValues.category, unit: editValues.unit, enabled: editValues.enabled }
          : p
      ));
      setMessage({ type: "success", text: `${product.title} updated.` });
      setEditingId(null);
    } else {
      setMessage({ type: "error", text: "Failed to save." });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }

  async function removeProduct(product) {
    if (!window.confirm(`Remove "${product.title}" from estimator?`)) return;
    const fd = new FormData();
    fd.append("intent", "remove");
    fd.append("id",     product.id);
    await fetch(window.location.pathname, { method: "POST", body: fd });
    setLocalProducts(prev => prev.filter(p => p.id !== product.id));
    setMessage({ type: "success", text: `${product.title} removed.` });
    setTimeout(() => setMessage(null), 3000);
  }

  const inputStyle = {
    padding: "6px 8px", border: "1px solid #ccc",
    borderRadius: "4px", fontSize: "13px",
  };
  const btnStyle = (bg, color) => ({
    padding: "5px 12px", background: bg, color,
    border: "none", borderRadius: "4px",
    fontSize: "12px", fontWeight: "600", cursor: "pointer",
  });

  return (
    <s-page heading="Estimator Products Manager">

      {message && (
        <s-banner tone={message.type === "success" ? "success" : "critical"}>
          {message.text}
        </s-banner>
      )}

      <s-section heading="Products Linked to Quantity Estimator">
        <s-paragraph>
          Select products from your Shopify store to appear in the Quantity Estimator.
          Set density and category so the estimator can calculate correctly.
          Total linked: {localProducts.length} product(s).
        </s-paragraph>

        {/* Browse Products Button */}
        <div style={{ marginTop: "16px", marginBottom: "8px" }}>
          <button
            onClick={openResourcePicker}
            style={{
              padding: "10px 24px",
              background: "#1a2e4a",
              color: "#f5c518",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            + Browse Products
          </button>
          <span style={{ marginLeft: "12px", fontSize: "13px", color: "#888" }}>
            Select products from your Shopify catalog to link to the estimator
          </span>
        </div>

        {/* Products Table */}
        {localProducts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888", background: "#f8f9fa", borderRadius: "8px", marginTop: "16px" }}>
            <div style={{ fontSize: "16px", marginBottom: "8px" }}>No products linked yet.</div>
            <div style={{ fontSize: "13px" }}>Click "Browse Products" to add products from your store.</div>
          </div>
        ) : (
          <div style={{ marginTop: "16px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#1a2e4a", color: "#f5c518" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Density (t/m³)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Unit</th>
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>Visible</th>
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {localProducts.map((product, i) => (
                  <tr key={product.id} style={{ background: i % 2 === 0 ? "white" : "#f8f9fa", borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px 12px", fontWeight: "500", maxWidth: "200px" }}>
                      {product.title}
                      <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                        ID: {product.shopifyProductId.split("/").pop()}
                      </div>
                    </td>

                    {editingId === product.id ? (
                      <>
                        <td style={{ padding: "8px 12px" }}>
                          <select
                            value={editValues.category}
                            onChange={e => setEditValues(p => ({ ...p, category: e.target.value }))}
                            style={{ ...inputStyle, width: "180px" }}
                          >
                            {CATEGORY_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <input
                            type="number" step="0.01" min="0"
                            value={editValues.density}
                            onChange={e => setEditValues(p => ({ ...p, density: e.target.value }))}
                            style={{ ...inputStyle, width: "70px" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <select
                            value={editValues.unit}
                            onChange={e => setEditValues(p => ({ ...p, unit: e.target.value }))}
                            style={{ ...inputStyle, width: "80px" }}
                          >
                            <option value="tonnes">tonnes</option>
                            <option value="m3">m³</option>
                            <option value="m2">m²</option>
                            <option value="bags">bags</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!editValues.enabled}
                            onChange={e => setEditValues(p => ({ ...p, enabled: e.target.checked }))}
                            style={{ width: "16px", height: "16px" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => saveEdit(product)} disabled={saving} style={btnStyle("#28a745", "white")}>Save</button>
                            <button onClick={cancelEdit} style={btnStyle("#6c757d", "white")}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "2px 8px", background: "#e8f4f8", borderRadius: "12px", fontSize: "12px" }}>
                            {CATEGORY_OPTIONS.find(o => o.value === product.category)?.label || product.category}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600" }}>
                          {product.density}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#555" }}>
                          {product.unit}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span
                            onClick={() => toggleProduct(product)}
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              background: product.enabled ? "#d4edda" : "#f8d7da",
                              color:      product.enabled ? "#155724" : "#721c24",
                            }}
                          >
                            {product.enabled ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => startEdit(product)} style={btnStyle("#1a2e4a", "#f5c518")}>Edit</button>
                            <button onClick={() => removeProduct(product)} style={btnStyle("#dc3545", "white")}>Remove</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>

      {/* Instructions Section */}
      <s-section heading="How It Works">
        <s-paragraph>
          1. Click "Browse Products" to select products from your Shopify catalog.
        </s-paragraph>
        <s-paragraph>
          2. Set the correct Category for each product — this determines which row in the estimator it maps to.
        </s-paragraph>
        <s-paragraph>
          3. Set the Density value (tonnes per m³). This is used to convert volume to weight.
        </s-paragraph>
        <s-paragraph>
          4. Toggle Visible/Hidden to control which products appear in the estimator without removing them.
        </s-paragraph>
        <s-paragraph>
          5. You can also set density directly on the product page in Shopify Admin under the "App" metafields section.
        </s-paragraph>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);