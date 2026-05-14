import prisma from "../db.server";

export async function loader({ request }) {
  // Get shop from proxy request query params
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "default";

  // Load settings from DB
  let settings = null;
  try {
    settings = await prisma.settings.findUnique({ where: { shop } });
  } catch (e) {
    console.error("Settings load error:", e);
  }










   // Load estimator products from DB
  let estimatorProducts = [];
  try {
    estimatorProducts = await prisma.estimatorProduct.findMany({
      where: { shop, enabled: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (e) {
    console.error("Estimator products load error:", e);
  }
  const estimatorProductsJson = JSON.stringify(estimatorProducts.map(p => ({
    title:    p.title,
    density:  p.density,
    unit:     p.unit,
    category: p.category,
  })));










  // Use DB settings or fallback to defaults
  const s = settings || {
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quantity Estimator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #333; }
    .wrap { max-width: 780px; margin: 0 auto; }
    h2 { font-size: 22px; color: #1a2e4a; margin-bottom: 16px; border-bottom: 3px solid #f5c518; padding-bottom: 8px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab-btn { padding: 8px 20px; border: 2px solid #1a2e4a; border-radius: 4px; background: white; color: #1a2e4a; font-weight: 600; cursor: pointer; font-size: 14px; }
    .tab-btn.active { background: #1a2e4a; color: #f5c518; }
    .section { display: none; background: #f8f9fa; border-radius: 8px; padding: 24px; border: 1px solid #e0e0e0; }
    .section.active { display: block; }
    .shape-tabs { display: flex; gap: 6px; margin-bottom: 20px; }
    .shape-btn { padding: 6px 16px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; font-weight: 500; }
    .shape-btn.active { background: #1a2e4a; color: white; border-color: #1a2e4a; }
    .shape-panel { display: none; }
    .shape-panel.active { display: block; }
    .input-group { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .input-group label { min-width: 240px; font-size: 14px; color: #444; }
    .input-group input { width: 100px; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    .unit { font-size: 13px; color: #777; min-width: 30px; }
    .calc-btn { margin-top: 16px; padding: 10px 28px; background: #1a2e4a; color: #f5c518; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .results-table { margin-top: 20px; width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .results-table th { background: #1a2e4a; color: #f5c518; padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; }
    .results-table td { padding: 9px 14px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
    .results-table tr:last-child td { border-bottom: none; }
    .val { font-weight: 700; color: #1a2e4a; text-align: right; width: 120px; }
    .unit-col { color: #777; font-size: 12px; width: 100px; }
    .email-row { display: flex; gap: 10px; margin-top: 16px; align-items: center; flex-wrap: wrap; }
    .email-row input { flex: 1; min-width: 200px; padding: 9px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    .email-btn { padding: 9px 20px; background: #f5c518; color: #1a2e4a; border: none; border-radius: 4px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .disclaimer { margin-top: 24px; font-size: 12px; color: #777; line-height: 1.6; border-top: 1px solid #e0e0e0; padding-top: 16px; }
    .success-msg { color: green; font-weight: 600; margin-top: 8px; display: none; }
    .error-msg { color: red; font-weight: 600; margin-top: 8px; display: none; }
    @media (max-width: 600px) { .input-group { flex-wrap: wrap; } .input-group label { min-width: 100%; } }
  </style>
</head>
<body>
<div class="wrap">
  <div class="tabs">
    <button class="tab-btn active" onclick="switchSection('volume', this)">VOLUME</button>
    <button class="tab-btn" onclick="switchSection('area', this)">AREA</button>
  </div>

  <!-- VOLUME SECTION -->
  <div id="section-volume" class="section active">
    <h2>Volume Calculator</h2>
    <div class="shape-tabs">
      <button class="shape-btn active" onclick="switchShape('vol','rect',this)">RECTANGLE</button>
      <button class="shape-btn" onclick="switchShape('vol','circle',this)">CIRCLE</button>
      <button class="shape-btn" onclick="switchShape('vol','triangle',this)">TRIANGLE</button>
    </div>
    <div id="vol-rect" class="shape-panel active">
      <div class="input-group"><label>Length in metres</label><input type="number" id="vol-rect-length" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Width in metres</label><input type="number" id="vol-rect-width" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Thickness in centimetres</label><input type="number" id="vol-rect-depth" min="0" step="0.1" placeholder="0.00"><span class="unit">cm</span></div>
      <button class="calc-btn" onclick="calcVolume('rect')">CALCULATE</button>
    </div>
    <div id="vol-circle" class="shape-panel">
      <div class="input-group"><label>Diameter of circle in metres</label><input type="number" id="vol-circle-diam" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Thickness in centimetres</label><input type="number" id="vol-circle-depth" min="0" step="0.1" placeholder="0.00"><span class="unit">cm</span></div>
      <button class="calc-btn" onclick="calcVolume('circle')">CALCULATE</button>
    </div>
    <div id="vol-triangle" class="shape-panel">
      <div class="input-group"><label>Length of base in metres</label><input type="number" id="vol-tri-base" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Height of triangle in metres</label><input type="number" id="vol-tri-height" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Thickness in centimetres</label><input type="number" id="vol-tri-depth" min="0" step="0.1" placeholder="0.00"><span class="unit">cm</span></div>
      <button class="calc-btn" onclick="calcVolume('triangle')">CALCULATE</button>
    </div>
    <div id="vol-results" style="display:none">
      <table class="results-table">
        <thead><tr><th>Material Type</th><th style="text-align:right">Quantity</th><th>Unit</th></tr></thead>
        <tbody>
          <tr id="row-m3"><td>Cubic Metres</td><td class="val" id="r-m3">—</td><td class="unit-col">m³</td></tr>
          <tr id="row-mulch"><td>Garden Mulch</td><td class="val" id="r-mulch">—</td><td class="unit-col">Cubic Metres</td></tr>
          <tr id="row-garden"><td>Garden Mixes and Manures</td><td class="val" id="r-garden">—</td><td class="unit-col">Cubic Metres</td></tr>
          <tr id="row-soil"><td>Soils (Top Soil, Top Dressing, Underlay)</td><td class="val" id="r-soil">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-sand"><td>Sand</td><td class="val" id="r-sand">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-gravel"><td>Decorative Gravels (excl Red Scoria)</td><td class="val" id="r-gravel">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-scoria"><td>Red Scoria</td><td class="val" id="r-scoria">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-roadbase"><td>Road Base, Recycled Asphalt</td><td class="val" id="r-roadbase">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-recycled"><td>Recycled Road Base, Dust, Metal Dust, Deco Granite</td><td class="val" id="r-recycled">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-bluemetal"><td>Blue Metal, Recycled Aggs</td><td class="val" id="r-bluemetal">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-concrete-sm"><td>Concrete — Sand &amp; Metal</td><td class="val" id="r-concrete-sm">—</td><td class="unit-col">Tonnes</td></tr>
          <tr id="row-concrete-cement"><td>Concrete — Cement bags</td><td class="val" id="r-concrete-cement">—</td><td class="unit-col">Bags</td></tr>
          <tr id="row-concrete-bags"><td>Or Bags Concrete (premix)</td><td class="val" id="r-concrete-bags">—</td><td class="unit-col">Bags</td></tr>
        </tbody>
      </table>
      <div class="email-row">
        <input type="email" id="vol-email" placeholder="Enter your email to receive results">
        <button class="email-btn" onclick="sendEmail('vol')">SEND TO EMAIL</button>
      </div>
      <div class="success-msg" id="vol-success">Results sent successfully!</div>
      <div class="error-msg" id="vol-error">Failed to send. Please try again.</div>
    </div>
  </div>

  <!-- AREA SECTION -->
  <div id="section-area" class="section">
    <h2>Area Calculator</h2>
    <div class="shape-tabs">
      <button class="shape-btn active" onclick="switchShape('area','rect',this)">RECTANGLE</button>
      <button class="shape-btn" onclick="switchShape('area','circle',this)">CIRCLE</button>
      <button class="shape-btn" onclick="switchShape('area','triangle',this)">TRIANGLE</button>
    </div>
    <div id="area-rect" class="shape-panel active">
      <div class="input-group"><label>Length in metres</label><input type="number" id="area-rect-length" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Width in metres</label><input type="number" id="area-rect-width" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <button class="calc-btn" onclick="calcArea('rect')">CALCULATE</button>
    </div>
    <div id="area-circle" class="shape-panel">
      <div class="input-group"><label>Diameter of circle in metres</label><input type="number" id="area-circle-diam" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <button class="calc-btn" onclick="calcArea('circle')">CALCULATE</button>
    </div>
    <div id="area-triangle" class="shape-panel">
      <div class="input-group"><label>Length of base in metres</label><input type="number" id="area-tri-base" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <div class="input-group"><label>Height of triangle in metres</label><input type="number" id="area-tri-height" min="0" step="0.01" placeholder="0.00"><span class="unit">m</span></div>
      <button class="calc-btn" onclick="calcArea('triangle')">CALCULATE</button>
    </div>
    <div id="area-results" style="display:none">
      <table class="results-table">
        <thead><tr><th>Type</th><th style="text-align:right">Quantity</th><th>Unit</th></tr></thead>
        <tbody>
          <tr><td>Actual area</td><td class="val" id="r-area-actual">—</td><td class="unit-col">Square Metres</td></tr>
          <tr><td id="turf-label">Turf recommended (${s.wastagePercentageTurf}% wastage)</td><td class="val" id="r-area-turf">—</td><td class="unit-col">m² (Rolls)</td></tr>
        </tbody>
      </table>
      <div class="email-row">
        <input type="email" id="area-email" placeholder="Enter your email to receive results">
        <button class="email-btn" onclick="sendEmail('area')">SEND TO EMAIL</button>
      </div>
      <div class="success-msg" id="area-success">Results sent successfully!</div>
      <div class="error-msg" id="area-error">Failed to send. Please try again.</div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> ${s.disclaimerMain}
    <br><br>
    <strong>Turf disclaimer:</strong> ${s.disclaimerTurf}
    <br><br>
    <strong>Minimum order:</strong> ${s.minOrderTonnes} tonne for bulk materials / ${s.minOrderM3} m³ minimum delivery.
  </div>
</div>

<script>
// Settings injected from database by server
const DENSITY = {
  soil:      ${s.densitySoil},
  sand:      ${s.densitySand},
  gravel:    ${s.densityGravel},
  scoria:    ${s.densityScoria},
  roadbase:  ${s.densityRoadbase},
  recycled:  ${s.densityRecycled},
  bluemetal: ${s.densityBluemetal}
};

const CONCRETE = {
  sandMetalPerM3:  ${s.concreteSandMetal},
  cementBagsPerM3: ${s.concreteCementBags},
  premixBagsPerM3: ${s.concretePremixBags}
};

const STORE = {
  phoneRouseHill:    "${s.phoneRouseHill}",
  phoneSouthWindsor: "${s.phoneSouthWindsor}"
};

// Product visibility — controlled from admin panel
const ENABLE = {
  mulch:     ${s.enableMulch},
  gardenMix: ${s.enableGardenMix},
  soil:      ${s.enableSoil},
  sand:      ${s.enableSand},
  gravel:    ${s.enableGravel},
  scoria:    ${s.enableScoria},
  roadbase:  ${s.enableRoadbase},
  recycled:  ${s.enableRecycled},
  bluemetal: ${s.enableBluemetal},
  concrete:  ${s.enableConcrete}
};

// Turf wastage multiplier from admin panel
const WASTAGE_TURF = ${s.wastagePercentageTurf} / 100;


// Products linked from Shopify catalog via admin panel
const LINKED_PRODUCTS = ${estimatorProductsJson};




function roundUp(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.ceil(n * f) / f;
}

function switchSection(name, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  btn.classList.add('active');
}

function switchShape(prefix, shape, btn) {
  document.querySelectorAll('[id^="' + prefix + '-"]').forEach(p => {
    if (!p.id.includes('-results')) p.classList.remove('active');
  });
  document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(prefix + '-' + shape).classList.add('active');
  btn.classList.add('active');
  const r = document.getElementById(prefix + '-results');
  if (r) r.style.display = 'none';
}

function applyRowVisibility() {
  // Show or hide result rows based on admin enable/disable settings
  document.getElementById('row-mulch').style.display        = ENABLE.mulch     ? '' : 'none';
  document.getElementById('row-garden').style.display       = ENABLE.gardenMix ? '' : 'none';
  document.getElementById('row-soil').style.display         = ENABLE.soil      ? '' : 'none';
  document.getElementById('row-sand').style.display         = ENABLE.sand      ? '' : 'none';
  document.getElementById('row-gravel').style.display       = ENABLE.gravel    ? '' : 'none';
  document.getElementById('row-scoria').style.display       = ENABLE.scoria    ? '' : 'none';
  document.getElementById('row-roadbase').style.display     = ENABLE.roadbase  ? '' : 'none';
  document.getElementById('row-recycled').style.display     = ENABLE.recycled  ? '' : 'none';
  document.getElementById('row-bluemetal').style.display    = ENABLE.bluemetal ? '' : 'none';
  document.getElementById('row-concrete-sm').style.display  = ENABLE.concrete  ? '' : 'none';
  document.getElementById('row-concrete-cement').style.display = ENABLE.concrete ? '' : 'none';
  document.getElementById('row-concrete-bags').style.display   = ENABLE.concrete ? '' : 'none';
}

function calcVolume(shape) {
  let v = 0;
  if (shape === 'rect') {
    const l = parseFloat(document.getElementById('vol-rect-length').value) || 0;
    const w = parseFloat(document.getElementById('vol-rect-width').value) || 0;
    const d = parseFloat(document.getElementById('vol-rect-depth').value) || 0;
    v = l * w * (d / 100);
  } else if (shape === 'circle') {
    const diam = parseFloat(document.getElementById('vol-circle-diam').value) || 0;
    const d    = parseFloat(document.getElementById('vol-circle-depth').value) || 0;
    v = Math.PI * (diam / 2) * (diam / 2) * (d / 100);
  } else if (shape === 'triangle') {
    const b = parseFloat(document.getElementById('vol-tri-base').value) || 0;
    const h = parseFloat(document.getElementById('vol-tri-height').value) || 0;
    const d = parseFloat(document.getElementById('vol-tri-depth').value) || 0;
    v = 0.5 * b * h * (d / 100);
  }

  if (v <= 0) { alert('Please enter valid measurements greater than 0.'); return; }

  // Set all values
  document.getElementById('r-m3').textContent             = roundUp(v);
  document.getElementById('r-mulch').textContent          = roundUp(v);
  document.getElementById('r-garden').textContent         = roundUp(v);
  document.getElementById('r-soil').textContent           = roundUp(v * DENSITY.soil);
  document.getElementById('r-sand').textContent           = roundUp(v * DENSITY.sand);
  document.getElementById('r-gravel').textContent         = roundUp(v * DENSITY.gravel);
  document.getElementById('r-scoria').textContent         = roundUp(v * DENSITY.scoria);
  document.getElementById('r-roadbase').textContent       = roundUp(v * DENSITY.roadbase);
  document.getElementById('r-recycled').textContent       = roundUp(v * DENSITY.recycled);
  document.getElementById('r-bluemetal').textContent      = roundUp(v * DENSITY.bluemetal);
  document.getElementById('r-concrete-sm').textContent    = roundUp(v * CONCRETE.sandMetalPerM3);
  document.getElementById('r-concrete-cement').textContent = Math.ceil(v * CONCRETE.cementBagsPerM3);
  document.getElementById('r-concrete-bags').textContent  = Math.ceil(v * CONCRETE.premixBagsPerM3);

  // Show results then apply visibility
  document.getElementById('vol-results').style.display = 'block';




// Render linked Shopify products dynamically
  renderLinkedProducts(v);


  applyRowVisibility();
}

function calcArea(shape) {
  let a = 0;
  if (shape === 'rect') {
    const l = parseFloat(document.getElementById('area-rect-length').value) || 0;
    const w = parseFloat(document.getElementById('area-rect-width').value) || 0;
    a = l * w;
  } else if (shape === 'circle') {
    const diam = parseFloat(document.getElementById('area-circle-diam').value) || 0;
    a = Math.PI * (diam / 2) * (diam / 2);
  } else if (shape === 'triangle') {
    const b = parseFloat(document.getElementById('area-tri-base').value) || 0;
    const h = parseFloat(document.getElementById('area-tri-height').value) || 0;
    a = 0.5 * b * h;
  }

  if (a <= 0) { alert('Please enter valid measurements greater than 0.'); return; }

  document.getElementById('r-area-actual').textContent = roundUp(a);
  // Use dynamic wastage percentage from admin settings
  document.getElementById('r-area-turf').textContent = Math.ceil(a * (1 + WASTAGE_TURF));
  document.getElementById('area-results').style.display = 'block';
}






function renderLinkedProducts(volumeM3) {
  // Remove previously rendered linked product rows
  document.querySelectorAll('.linked-product-row').forEach(r => r.remove());

  if (!LINKED_PRODUCTS || LINKED_PRODUCTS.length === 0) return;

  const tbody = document.querySelector('#vol-results .results-table tbody');

  LINKED_PRODUCTS.forEach(function(product) {
    const row = document.createElement('tr');
    row.className = 'linked-product-row';
    row.style.borderBottom = '1px solid #f0f0f0';

    let qty = '—';
    if (product.unit === 'tonnes' && product.density > 0) {
      qty = roundUp(volumeM3 * product.density);
    } else if (product.unit === 'm3') {
      qty = roundUp(volumeM3);
    } else if (product.unit === 'm2') {
      qty = roundUp(volumeM3 * 1000);
    }

    row.innerHTML =
      '<td style="padding:9px 14px;font-size:14px;background:#fffbf0;">' + product.title + '</td>' +
      '<td style="padding:9px 14px;font-weight:700;color:#1a2e4a;text-align:right;width:120px;background:#fffbf0;">' + qty + '</td>' +
      '<td style="padding:9px 14px;color:#777;font-size:12px;width:100px;background:#fffbf0;">' + product.unit + '</td>';

    tbody.appendChild(row);
  });
}













async function sendEmail(section) {
  const emailEl = document.getElementById(section + '-email');
  const email   = emailEl.value.trim();
  if (!email || !email.includes('@')) { alert('Please enter a valid email address.'); return; }

  const results = {};
  if (section === 'vol') {
    results.cubicMetres    = document.getElementById('r-m3').textContent;
    results.mulch          = document.getElementById('r-mulch').textContent;
    results.garden         = document.getElementById('r-garden').textContent;
    results.soil           = document.getElementById('r-soil').textContent;
    results.sand           = document.getElementById('r-sand').textContent;
    results.gravel         = document.getElementById('r-gravel').textContent;
    results.scoria         = document.getElementById('r-scoria').textContent;
    results.roadbase       = document.getElementById('r-roadbase').textContent;
    results.recycled       = document.getElementById('r-recycled').textContent;
    results.bluemetal      = document.getElementById('r-bluemetal').textContent;
    results.concreteSM     = document.getElementById('r-concrete-sm').textContent;
    results.concreteCement = document.getElementById('r-concrete-cement').textContent;
    results.concreteBags   = document.getElementById('r-concrete-bags').textContent;
  } else {
    results.actual = document.getElementById('r-area-actual').textContent;
    results.turf   = document.getElementById('r-area-turf').textContent;
  }

  try {
    const resp = await fetch('/apps/tools/send-estimate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, section, results })
    });
    const successEl = document.getElementById(section + '-success');
    const errorEl   = document.getElementById(section + '-error');
    if (resp.ok) {
      successEl.style.display = 'block';
      errorEl.style.display   = 'none';
      emailEl.value = '';
      setTimeout(() => { successEl.style.display = 'none'; }, 4000);
    } else {
      errorEl.style.display   = 'block';
      successEl.style.display = 'none';
    }
  } catch (e) {
    document.getElementById(section + '-error').style.display = 'block';
  }
}
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
