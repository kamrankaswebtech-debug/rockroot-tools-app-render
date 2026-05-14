// import prisma from "../db.server";

// Complete suburb data extracted from official Delivery Fees PDF (Effective 1-9-25)
// Format: "Suburb Name": [weekday, saturday, sunday]


export async function loader({ request }) {
  // Get shop from proxy request query params
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "default";

  // Load settings from DB for phone numbers and fuel levy note
  let settings = null;
  try {
    const prisma = (await import("../db.server")).default;
    settings = await prisma.settings.findUnique({ where: { shop } });
  } catch (e) {
    console.error("Settings load error:", e);
  }

  const phoneRouseHill    = settings?.phoneRouseHill    || "02 9629 2299";
  const phoneSouthWindsor = settings?.phoneSouthWindsor || "02 4574 3299";
  const minOrderTonnes    = settings?.minOrderTonnes    ?? 1;

  // Load suburb delivery rates from database (managed via admin panel)
  let dbRates = [];
  try {
    const prismaClient = (await import("../db.server")).default;
    dbRates = await prismaClient.deliveryRate.findMany({ where: { shop } });
  } catch (e) {
    console.error("Delivery rates load error:", e);
  }

  // Convert DB rows to frontend format { "SuburbName": [weekday, saturday, sunday] }
  const suburbsData = {};
  for (const r of dbRates) {
    suburbsData[r.suburb] = {
      fees:       [r.weekday, r.saturday, r.sunday],
      postalCode: r.postalCode || "",
    };
  }
  const suburbsJson = JSON.stringify(suburbsData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Fee Estimator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #333; }
    .wrap { max-width: 600px; margin: 0 auto; }
    h2 { font-size: 22px; color: #1a2e4a; margin-bottom: 20px; border-bottom: 3px solid #f5c518; padding-bottom: 8px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 14px; font-weight: 600; color: #444; margin-bottom: 6px; }
    .suburb-wrap { position: relative; }
    .suburb-wrap input { width: 100%; padding: 10px 14px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; }
    .suburb-wrap input:focus { outline: none; border-color: #1a2e4a; }
    #suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-top: none; border-radius: 0 0 4px 4px; max-height: 220px; overflow-y: auto; z-index: 100; display: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .sug-item { padding: 10px 14px; cursor: pointer; font-size: 14px; }
    .sug-item:hover { background: #f0f0f0; }
    .sug-count { padding: 6px 14px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .day-options { display: flex; gap: 10px; flex-wrap: wrap; }
    .day-opt { padding: 8px 16px; border: 2px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; user-select: none; }
    .day-opt.active { background: #1a2e4a; color: white; border-color: #1a2e4a; }
    .calc-btn { margin-top: 16px; padding: 11px 30px; background: #1a2e4a; color: #f5c518; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .calc-btn:hover { background: #243d61; }
    #result-box { display: none; margin-top: 24px; background: #1a2e4a; color: white; border-radius: 8px; padding: 20px 24px; }
    .res-suburb { font-size: 18px; font-weight: 700; color: #f5c518; }
    .res-fee { font-size: 42px; font-weight: 700; margin: 8px 0; letter-spacing: -1px; }
    .res-note { font-size: 12px; opacity: 0.75; margin-top: 12px; line-height: 1.7; }
    .res-note strong { opacity: 1; color: #f5c518; }
    #not-found { display: none; margin-top: 24px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; font-size: 14px; color: #856404; }
    .suburb-count { font-size: 12px; color: #888; margin-top: 4px; }
  </style>
</head>
<body>
<div class="wrap">
  <h2>Check Your Delivery Fee</h2>

  <div class="form-group">
    <label>Enter your suburb</label>
    <div class="suburb-wrap">
      <input type="text" id="suburb-input" placeholder="Start typing your suburb..." autocomplete="off">
      <div id="suggestions"></div>
    </div>
    <div class="suburb-count" id="suburb-count"></div>
  </div>

  <div class="form-group">
    <label>Delivery day</label>
    <div class="day-options">
      <div class="day-opt active" data-idx="0">Mon–Fri (Weekday)</div>
      <div class="day-opt" data-idx="1">Saturday</div>
      <div class="day-opt" data-idx="2">Sunday</div>
    </div>
  </div>

  <button class="calc-btn" onclick="checkFee()">CHECK FEE</button>

  <div id="result-box">
    <div class="res-suburb" id="res-suburb"></div>
    <div class="res-fee" id="res-fee"></div>
    <div class="res-note">
      <strong>Please note:</strong><br>
      * For bulk materials — ${minOrderTonnes} tonne/m³ minimum delivery.<br>
      * Additional fees apply for bricks, blocks and pavers.<br>
      * A fuel levy of 4% will be added to the final price.<br>
      * Long delays in unloading or difficult access may incur additional charges.<br>
      * Call for quote if suburb not listed.
    </div>
  </div>

  <div id="not-found">
    <strong>Suburb not found in our delivery area.</strong><br><br>
    Please call us for a custom quote:<br>
    Rouse Hill: <strong>${phoneRouseHill}</strong><br>
    South Windsor: <strong>${phoneSouthWindsor}</strong>
  </div>
</div>

<script>
const SUBURBS = ${suburbsJson};
const names = Object.keys(SUBURBS).sort();
let selected = null;
let dayIdx = 0;

// Show suburb count on load
document.getElementById('suburb-count').textContent = names.length + ' suburbs available';

document.getElementById('suburb-input').addEventListener('input', function() {
  const val = this.value.trim();
  const box = document.getElementById('suggestions');
  selected = null;

  if (!val || val.length < 2) {
    box.style.display = 'none';
    return;
  }

  // Match suburbs that start with input OR contain input (starts-with ranked first)
  const startsWith = names.filter(s => s.toLowerCase().startsWith(val.toLowerCase()));
  const contains   = names.filter(s => !s.toLowerCase().startsWith(val.toLowerCase()) && s.toLowerCase().includes(val.toLowerCase()));
  const matches    = [...startsWith, ...contains].slice(0, 10);

  if (!matches.length) {
    box.style.display = 'none';
    return;
  }

  box.innerHTML = matches
    .map(s => '<div class="sug-item" onclick="pick(\\'' + s.replace(/'/g, "\\\\'") + '\\')">' + s + '</div>')
    .join('');

  if (startsWith.length + contains.length > 10) {
    box.innerHTML += '<div class="sug-count">Showing 10 of ' + (startsWith.length + contains.length) + ' matches — type more to narrow</div>';
  }

  box.style.display = 'block';
});

function pick(name) {
  selected = name;
  document.getElementById('suburb-input').value = name;
  document.getElementById('suggestions').style.display = 'none';
  document.getElementById('suburb-count').textContent = '';
}

document.querySelectorAll('.day-opt').forEach(function(el) {
  el.addEventListener('click', function() {
    document.querySelectorAll('.day-opt').forEach(function(o) { o.classList.remove('active'); });
    this.classList.add('active');
    dayIdx = parseInt(this.getAttribute('data-idx'));
  });
});

function checkFee() {
  const input = document.getElementById('suburb-input').value.trim();
  if (!input) { alert('Please enter a suburb.'); return; }

  let suburb = selected || input;
  let entry  = SUBURBS[suburb];

  // Case-insensitive fallback lookup
  if (!entry) {
    const key = names.find(function(s) { return s.toLowerCase() === suburb.toLowerCase(); });
    if (key) { entry = SUBURBS[key]; suburb = key; }
  }

  document.getElementById('result-box').style.display = 'none';
  document.getElementById('not-found').style.display  = 'none';

  if (!entry) {
    document.getElementById('not-found').style.display = 'block';
    return;
  }

  const fees       = entry.fees;
  const postalCode = entry.postalCode || "";
  const labels     = ['Weekday', 'Saturday', 'Sunday'];
  const suburbLabel = postalCode
    ? suburb + ' ' + postalCode + ' — ' + labels[dayIdx]
    : suburb + ' — ' + labels[dayIdx];

  document.getElementById('res-suburb').textContent = suburbLabel;
  document.getElementById('res-fee').textContent    = '$' + fees[dayIdx].toFixed(2);
  document.getElementById('result-box').style.display = 'block';
}

// Close suggestions when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.suburb-wrap')) {
    document.getElementById('suggestions').style.display = 'none';
  }
});

// Allow Enter key to trigger check
document.getElementById('suburb-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('suggestions').style.display = 'none';
    checkFee();
  }
});
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}