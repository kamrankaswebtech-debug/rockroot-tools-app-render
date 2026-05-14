import { useState } from "react";
import { useLoaderData, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

const DEFAULT_SETTINGS = {
  densitySoil: 1.4,
  densitySand: 1.5,
  densityGravel: 1.5,
  densityScoria: 0.85,
  densityRoadbase: 1.8,
  densityRecycled: 1.25,
  densityBluemetal: 1.5,
  concreteSandMetal: 0.7,
  concreteCementBags: 7.5,
  concretePremixBags: 108.0,
  phoneRouseHill: "02 9629 2299",
  phoneSouthWindsor: "02 4574 3299",
  disclaimerMain:
    "Estimated quantities are only as good as the information supplied. Please input measurements in correct units. Answers rounded up. Not for extremely small areas. Product densities can vary — this is an estimate only.",
  disclaimerTurf: "We recommend at least 5% extra for wastage.",
  enableSoil: true,
  enableSand: true,
  enableGravel: true,
  enableScoria: true,
  enableRoadbase: true,
  enableRecycled: true,
  enableBluemetal: true,
  enableMulch: true,
  enableGardenMix: true,
  enableConcrete: true,
  wastagePercentageTurf: 5,
  minOrderTonnes: 1,
  minOrderM3: 1,
};

export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    console.log("Loading settings for shop:", shop);

    let settings = await prisma.settings.findUnique({ where: { shop } });

    if (!settings) {
      console.log("No settings found, creating defaults for:", shop);
      settings = await prisma.settings.create({
        data: { shop, ...DEFAULT_SETTINGS },
      });
    }

    return { settings, shop };
  } catch (error) {
    console.error("Loader error:", error);
    return { settings: DEFAULT_SETTINGS, shop: "unknown" };
  }
}

export async function action({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    console.log("Saving settings for shop:", shop);

    const formData = await request.formData();

    const data = {
      densitySoil: parseFloat(formData.get("densitySoil")) || 1.4,
      densitySand: parseFloat(formData.get("densitySand")) || 1.5,
      densityGravel: parseFloat(formData.get("densityGravel")) || 1.5,
      densityScoria: parseFloat(formData.get("densityScoria")) || 0.85,
      densityRoadbase: parseFloat(formData.get("densityRoadbase")) || 1.8,
      densityRecycled: parseFloat(formData.get("densityRecycled")) || 1.25,
      densityBluemetal: parseFloat(formData.get("densityBluemetal")) || 1.5,
      concreteSandMetal: parseFloat(formData.get("concreteSandMetal")) || 0.7,
      concreteCementBags: parseFloat(formData.get("concreteCementBags")) || 7.5,
      concretePremixBags: parseFloat(formData.get("concretePremixBags")) || 108.0,
      phoneRouseHill: formData.get("phoneRouseHill") || "02 9629 2299",
      phoneSouthWindsor: formData.get("phoneSouthWindsor") || "02 4574 3299",
      disclaimerMain: formData.get("disclaimerMain") || DEFAULT_SETTINGS.disclaimerMain,
      disclaimerTurf: formData.get("disclaimerTurf") || DEFAULT_SETTINGS.disclaimerTurf,
      enableSoil: formData.get("enableSoil") === "true",
      enableSand: formData.get("enableSand") === "true",
      enableGravel: formData.get("enableGravel") === "true",
      enableScoria: formData.get("enableScoria") === "true",
      enableRoadbase: formData.get("enableRoadbase") === "true",
      enableRecycled: formData.get("enableRecycled") === "true",
      enableBluemetal: formData.get("enableBluemetal") === "true",
      enableMulch: formData.get("enableMulch") === "true",
      enableGardenMix: formData.get("enableGardenMix") === "true",
      enableConcrete: formData.get("enableConcrete") === "true",
      wastagePercentageTurf: parseFloat(formData.get("wastagePercentageTurf")) || 5,
      minOrderTonnes: parseFloat(formData.get("minOrderTonnes")) || 1,
      minOrderM3: parseFloat(formData.get("minOrderM3")) || 1,
    };

    console.log("Saving data for shop:", shop, JSON.stringify(data));

    await prisma.settings.upsert({
      where: { shop },
      update: data,
      create: { shop, ...data },
    });

    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { error: String(error) };
  }
}

export default function Index() {
  const { settings } = useLoaderData();
  const actionData = useActionData();

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState({
    densitySoil: String(settings.densitySoil),
    densitySand: String(settings.densitySand),
    densityGravel: String(settings.densityGravel),
    densityScoria: String(settings.densityScoria),
    densityRoadbase: String(settings.densityRoadbase),
    densityRecycled: String(settings.densityRecycled),
    densityBluemetal: String(settings.densityBluemetal),
    concreteSandMetal: String(settings.concreteSandMetal),
    concreteCementBags: String(settings.concreteCementBags),
    concretePremixBags: String(settings.concretePremixBags),
    phoneRouseHill: settings.phoneRouseHill,
    phoneSouthWindsor: settings.phoneSouthWindsor,
    disclaimerMain: settings.disclaimerMain,
    disclaimerTurf: settings.disclaimerTurf,
    enableSoil: settings.enableSoil ?? true,
    enableSand: settings.enableSand ?? true,
    enableGravel: settings.enableGravel ?? true,
    enableScoria: settings.enableScoria ?? true,
    enableRoadbase: settings.enableRoadbase ?? true,
    enableRecycled: settings.enableRecycled ?? true,
    enableBluemetal: settings.enableBluemetal ?? true,
    enableMulch: settings.enableMulch ?? true,
    enableGardenMix: settings.enableGardenMix ?? true,
    enableConcrete: settings.enableConcrete ?? true,
    wastagePercentageTurf: String(settings.wastagePercentageTurf ?? 5),
    minOrderTonnes: String(settings.minOrderTonnes ?? 1),
    minOrderM3: String(settings.minOrderM3 ?? 1),
  });

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();

      // Append all string/number fields
      const stringKeys = [
        "densitySoil", "densitySand", "densityGravel", "densityScoria",
        "densityRoadbase", "densityRecycled", "densityBluemetal",
        "concreteSandMetal", "concreteCementBags", "concretePremixBags",
        "phoneRouseHill", "phoneSouthWindsor", "disclaimerMain", "disclaimerTurf",
        "wastagePercentageTurf", "minOrderTonnes", "minOrderM3",
      ];
      stringKeys.forEach((key) => formData.append(key, formState[key]));

      // Append boolean fields as strings
      const boolKeys = [
        "enableSoil", "enableSand", "enableGravel", "enableScoria",
        "enableRoadbase", "enableRecycled", "enableBluemetal",
        "enableMulch", "enableGardenMix", "enableConcrete",
      ];
      boolKeys.forEach((key) => formData.append(key, String(!!formState[key])));

      const url = new URL(window.location.href);
      const resp = await fetch(
        url.pathname + "?index" + "&" + url.searchParams.toString(),
        { method: "POST", body: formData }
      );

      if (resp.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save. Please try again.");
      }
    } catch (e) {
      console.error("Save error:", e);
      alert("Error saving settings.");
    }
    setSaving(false);
  }

  function handleReset() {
    if (window.confirm("Reset all values to defaults? This cannot be undone.")) {
      setFormState({
        densitySoil: "1.4",
        densitySand: "1.5",
        densityGravel: "1.5",
        densityScoria: "0.85",
        densityRoadbase: "1.8",
        densityRecycled: "1.25",
        densityBluemetal: "1.5",
        concreteSandMetal: "0.7",
        concreteCementBags: "7.5",
        concretePremixBags: "108",
        phoneRouseHill: "02 9629 2299",
        phoneSouthWindsor: "02 4574 3299",
        disclaimerMain: DEFAULT_SETTINGS.disclaimerMain,
        disclaimerTurf: DEFAULT_SETTINGS.disclaimerTurf,
        enableSoil: true,
        enableSand: true,
        enableGravel: true,
        enableScoria: true,
        enableRoadbase: true,
        enableRecycled: true,
        enableBluemetal: true,
        enableMulch: true,
        enableGardenMix: true,
        enableConcrete: true,
        wastagePercentageTurf: "5",
        minOrderTonnes: "1",
        minOrderM3: "1",
      });
      setSaved(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    marginTop: "4px",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#333",
    marginBottom: "2px",
  };

  const hintStyle = {
    fontSize: "11px",
    color: "#888",
    fontWeight: "400",
  };

  return (
    <s-page heading="Rockroot Tools — Calculator Settings">

      <s-button
        slot="primary-action"
        onClick={handleSave}
        loading={saving ? true : undefined}
      >
        {saving ? "Saving..." : "Save Settings"}
      </s-button>

      <s-button
        slot="primary-action"
        variant="secondary"
        onClick={handleReset}
      >
        Reset to Defaults
      </s-button>

      {saved && (
        <s-banner tone="success">
          Settings saved successfully! Calculator will use updated values.
        </s-banner>
      )}

      {actionData?.error && (
        <s-banner tone="critical">
          Error saving: {actionData.error}
        </s-banner>
      )}

      {/* ===== DENSITY VALUES ===== */}
      <s-section heading="Material Density Values (tonnes per m³)">
        <s-paragraph>
          These values convert cubic metres to tonnes in the Quantity Estimator.
          Change only if material densities have been updated by your supplier.
        </s-paragraph>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
          {[
            { key: "densitySoil",      label: "Soil (Top Dressing, Underlay)",            def: "1.4"  },
            { key: "densitySand",      label: "Sand",                                     def: "1.5"  },
            { key: "densityGravel",    label: "Decorative Gravels (excl Red Scoria)",     def: "1.5"  },
            { key: "densityScoria",    label: "Red Scoria",                               def: "0.85" },
            { key: "densityRoadbase",  label: "Road Base / Recycled Asphalt",             def: "1.8"  },
            { key: "densityRecycled",  label: "Recycled Road Base / Dust / Deco Granite", def: "1.25" },
            { key: "densityBluemetal", label: "Blue Metal / Recycled Aggs",               def: "1.5"  },
          ].map(({ key, label, def }) => (
            <div key={key}>
              <label style={labelStyle}>
                {label} <span style={hintStyle}>(Default: {def})</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formState[key]}
                onChange={(e) => setFormState((s) => ({ ...s, [key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </s-section>

      {/* ===== CONCRETE VALUES ===== */}
      <s-section heading="Concrete Calculation Values">
        <s-paragraph>
          Used to calculate sand, metal and cement requirements for concrete work.
        </s-paragraph>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "16px" }}>
          {[
            { key: "concreteSandMetal",  label: "Sand & Metal per m³ (tonnes)", def: "0.7"  },
            { key: "concreteCementBags", label: "Cement Bags per m³",           def: "7.5"  },
            { key: "concretePremixBags", label: "Premix Bags per m³",           def: "108"  },
          ].map(({ key, label, def }) => (
            <div key={key}>
              <label style={labelStyle}>
                {label} <span style={hintStyle}>(Default: {def})</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formState[key]}
                onChange={(e) => setFormState((s) => ({ ...s, [key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </s-section>

      {/* ===== ENABLE / DISABLE PRODUCTS ===== */}
      <s-section heading="Enable / Disable Products in Estimator">
        <s-paragraph>
          Toggle which material rows appear in the quantity estimator results table.
          Disabled products will be hidden from customers.
        </s-paragraph>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
          {[
            { key: "enableMulch",     label: "Garden Mulch" },
            { key: "enableGardenMix", label: "Garden Mixes and Manures" },
            { key: "enableSoil",      label: "Soils (Top Soil, Top Dressing, Underlay)" },
            { key: "enableSand",      label: "Sand" },
            { key: "enableGravel",    label: "Decorative Gravels (excl Red Scoria)" },
            { key: "enableScoria",    label: "Red Scoria" },
            { key: "enableRoadbase",  label: "Road Base / Recycled Asphalt" },
            { key: "enableRecycled",  label: "Recycled Road Base / Dust / Deco Granite" },
            { key: "enableBluemetal", label: "Blue Metal / Recycled Aggs" },
            { key: "enableConcrete",  label: "Concrete (Sand & Metal / Cement / Premix)" },
          ].map(({ key, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: formState[key] ? "#f0fff4" : "#fff5f5", border: `1px solid ${formState[key] ? "#c3e6cb" : "#f5c6cb"}`, borderRadius: "4px" }}>
              <input
                type="checkbox"
                id={key}
                checked={!!formState[key]}
                onChange={(e) => setFormState((s) => ({ ...s, [key]: e.target.checked }))}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#1a2e4a" }}
              />
              <label htmlFor={key} style={{ fontSize: "13px", cursor: "pointer", fontWeight: "500", color: formState[key] ? "#155724" : "#721c24" }}>
                {label}
              </label>
            </div>
          ))}
        </div>
      </s-section>

      {/* ===== WASTAGE & MINIMUM ORDER ===== */}
      <s-section heading="Wastage & Minimum Order Settings">
        <s-paragraph>
          Set the turf wastage percentage and minimum order quantities shown to customers.
        </s-paragraph>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "16px" }}>
          <div>
            <label style={labelStyle}>
              Turf Wastage % <span style={hintStyle}>(Default: 5)</span>
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="50"
              value={formState.wastagePercentageTurf}
              onChange={(e) => setFormState((s) => ({ ...s, wastagePercentageTurf: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Min Order — Tonnes <span style={hintStyle}>(Default: 1)</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formState.minOrderTonnes}
              onChange={(e) => setFormState((s) => ({ ...s, minOrderTonnes: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Min Order — m³ <span style={hintStyle}>(Default: 1)</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formState.minOrderM3}
              onChange={(e) => setFormState((s) => ({ ...s, minOrderM3: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>
      </s-section>

      {/* ===== STORE CONTACT INFO ===== */}
      <s-section heading="Store Contact Information">
        <s-paragraph>
          These phone numbers appear in the email sent to customers after they use the estimator.
        </s-paragraph>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
          {[
            { key: "phoneRouseHill",    label: "Rouse Hill Phone" },
            { key: "phoneSouthWindsor", label: "South Windsor Phone" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="text"
                value={formState[key]}
                onChange={(e) => setFormState((s) => ({ ...s, [key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </s-section>

      {/* ===== DISCLAIMER TEXT ===== */}
      <s-section heading="Disclaimer Text">
        <s-paragraph>
          This text appears at the bottom of the Quantity Estimator page.
        </s-paragraph>

        <div style={{ marginTop: "16px" }}>
          <label style={labelStyle}>Main Disclaimer</label>
          <textarea
            rows={4}
            value={formState.disclaimerMain}
            onChange={(e) => setFormState((s) => ({ ...s, disclaimerMain: e.target.value }))}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ marginTop: "16px" }}>
          <label style={labelStyle}>Turf Disclaimer</label>
          <textarea
            rows={2}
            value={formState.disclaimerTurf}
            onChange={(e) => setFormState((s) => ({ ...s, disclaimerTurf: e.target.value }))}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
      </s-section>

      {/* ===== BOTTOM SAVE BUTTON ===== */}
      <s-section>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px",
              background: saving ? "#ccc" : "#1a2e4a",
              color: "#f5c518",
              border: "none",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: "10px 24px",
              background: "white",
              color: "#d82c0d",
              border: "2px solid #d82c0d",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};