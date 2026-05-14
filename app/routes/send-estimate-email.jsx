export async function action({ request }) {
  try {
    const body = await request.json();
    const { email, section, results } = body;

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build email content
    let emailBody = `Your Quantity Estimator Results\n\n`;
    if (section === "vol") {
      emailBody += `Cubic Metres: ${results.cubicMetres} m³\n`;
      emailBody += `Garden Mulch: ${results.mulch} Cubic Metres\n`;
      emailBody += `Garden Mixes and Manures: ${results.garden} Cubic Metres\n`;
      emailBody += `Soils: ${results.soil} Tonnes\n`;
      emailBody += `Sand: ${results.sand} Tonnes\n`;
      emailBody += `Decorative Gravels: ${results.gravel} Tonnes\n`;
      emailBody += `Red Scoria: ${results.scoria} Tonnes\n`;
      emailBody += `Road Base: ${results.roadbase} Tonnes\n`;
      emailBody += `Recycled Products: ${results.recycled} Tonnes\n`;
      emailBody += `Blue Metal: ${results.bluemetal} Tonnes\n`;
      emailBody += `Concrete Sand & Metal: ${results.concreteSM} Tonnes\n`;
      emailBody += `Cement Bags: ${results.concreteCement} Bags\n`;
      emailBody += `Premix Bags: ${results.concreteBags} Bags\n`;
    } else {
      emailBody += `Actual Area: ${results.actual} Square Metres\n`;
      emailBody += `Turf Recommended (5% wastage): ${results.turf} m²\n`;
    }

    emailBody += `\nFor pricing and orders:\n`;
    emailBody += `Rouse Hill: 02 9629 2299\n`;
    emailBody += `South Windsor: 02 4574 3299\n`;
    emailBody += `www.rockroot-supplies-2.myshopify.com\n`;

    // Send email via Shopify Email API or simple mailto
    // Using fetch to send via a simple email service
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
       from: "onboarding@resend.dev",
        to: email,
        subject: "Your Quantity Estimator Results - Rockroot Supplies",
        text: emailBody,
      }),
    });

    if (emailResponse.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Email service failed");
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}