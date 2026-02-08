import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── BRANDED EMAIL WRAPPER ──────────────────────────────────────────
function wrapInBrandedTemplate(content: string, preheader = ""): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VintechHost</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f5f7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2332 0%,#243447 100%);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                <span style="color:#2ecc71;">Vintech</span>Host
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#8899aa;letter-spacing:1px;text-transform:uppercase;">Web Hosting &amp; Domains</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e8eaed;border-right:1px solid #e8eaed;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafbfc;padding:24px 40px;border-radius:0 0 12px 12px;border:1px solid #e8eaed;border-top:none;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Need help? Contact our support team.</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} VintechHost. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── BUTTON HELPER ──────────────────────────────────────────────────
function emailButton(text: string, url: string, color = "#2ecc71"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${color};border-radius:8px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ─── STATUS BADGE ───────────────────────────────────────────────────
function statusBadge(text: string, bgColor: string, textColor: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background-color:${bgColor};color:${textColor};text-transform:uppercase;letter-spacing:0.5px;">${text}</span>`;
}

// ─── INFO ROW ───────────────────────────────────────────────────────
function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1f2937;font-weight:500;text-align:right;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;
}

function infoTable(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tbody style="padding:4px 16px;">${rows.map(([l, v]) => infoRow(l, v)).join("")}</tbody>
  </table>`;
}

// ─── TEMPLATE BUILDERS ──────────────────────────────────────────────

function buildSuspensionEmail(data: any): { subject: string; html: string } {
  const { domain, firstName, dashboardUrl } = data;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#fef2f2;line-height:56px;font-size:28px;">⚠️</div>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#dc2626;text-align:center;">Hosting Suspended</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">Action required to restore your website</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Hi${firstName ? ` ${firstName}` : ""},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Your hosting account for <strong>${domain}</strong> has been <strong style="color:#dc2626;">suspended</strong> due to an unpaid invoice that is more than 7 days overdue.</p>
    ${infoTable([["Domain", domain], ["Status", "Suspended"], ["Reason", "Overdue invoice (7+ days)"]])}
    <p style="font-size:15px;color:#374151;line-height:1.6;">To restore your website immediately, please pay the outstanding invoice:</p>
    ${emailButton("Pay Now & Restore", dashboardUrl || "https://vintechdev.store/dashboard/billing", "#dc2626")}
    <p style="font-size:13px;color:#9ca3af;">If you believe this is an error, please contact our support team.</p>
  `;
  return { subject: `⚠️ Hosting Suspended: ${domain}`, html: wrapInBrandedTemplate(content, `Your hosting for ${domain} has been suspended due to an overdue invoice.`) };
}

function buildUnsuspensionEmail(data: any): { subject: string; html: string } {
  const { domain, firstName } = data;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#f0fdf4;line-height:56px;font-size:28px;">✅</div>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#16a34a;text-align:center;">Hosting Restored</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">Your website is back online</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Hi${firstName ? ` ${firstName}` : ""},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Great news! Your payment has been received and your hosting for <strong>${domain}</strong> has been <strong style="color:#16a34a;">restored</strong>.</p>
    ${infoTable([["Domain", domain], ["Status", "Active"], ["Action", "Payment received"]])}
    <p style="font-size:15px;color:#374151;line-height:1.6;">Your website should be accessible again shortly. Thank you for your prompt payment!</p>
    ${emailButton("Go to Dashboard", "https://vintechdev.store/dashboard")}
  `;
  return { subject: `✅ Hosting Restored: ${domain}`, html: wrapInBrandedTemplate(content, `Your hosting for ${domain} is back online!`) };
}

function buildInvoiceCreatedEmail(data: any): { subject: string; html: string } {
  const { firstName, invoiceNumber, amount, currency, dueDate, description, dashboardUrl } = data;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#eff6ff;line-height:56px;font-size:28px;">📄</div>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1f2937;text-align:center;">New Invoice</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">A new invoice has been generated for your account</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Hi${firstName ? ` ${firstName}` : ""},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">A new invoice has been generated for your account:</p>
    ${infoTable([
      ["Invoice", `#${invoiceNumber}`],
      ["Amount", `${currency || "KES"} ${Number(amount).toLocaleString()}`],
      ["Due Date", dueDate],
      ...(description ? [["Description", description]] : []),
    ])}
    ${emailButton("Pay Invoice", dashboardUrl || "https://vintechdev.store/dashboard/billing")}
    <p style="font-size:13px;color:#9ca3af;">Please ensure payment is made before the due date to avoid service interruption.</p>
  `;
  return { subject: `Invoice #${invoiceNumber} - ${currency || "KES"} ${Number(amount).toLocaleString()}`, html: wrapInBrandedTemplate(content, `Invoice #${invoiceNumber} for ${currency || "KES"} ${Number(amount).toLocaleString()} is ready.`) };
}

function buildPaymentReceivedEmail(data: any): { subject: string; html: string } {
  const { firstName, invoiceNumber, amount, currency, reference } = data;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#f0fdf4;line-height:56px;font-size:28px;">💰</div>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#16a34a;text-align:center;">Payment Received</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">Thank you for your payment</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Hi${firstName ? ` ${firstName}` : ""},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">We've received your payment. Here are the details:</p>
    ${infoTable([
      ["Invoice", `#${invoiceNumber}`],
      ["Amount", `${currency || "KES"} ${Number(amount).toLocaleString()}`],
      ["Status", "Paid"],
      ...(reference ? [["Reference", reference]] : []),
    ])}
    ${emailButton("View Receipt", "https://vintechdev.store/dashboard/billing")}
  `;
  return { subject: `Payment Confirmed - Invoice #${invoiceNumber}`, html: wrapInBrandedTemplate(content, `Payment of ${currency || "KES"} ${Number(amount).toLocaleString()} confirmed.`) };
}

function buildWelcomeEmail(data: any): { subject: string; html: string } {
  const { firstName, domain, planName } = data;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#f0fdf4;line-height:56px;font-size:28px;">🎉</div>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1f2937;text-align:center;">Welcome to VintechHost!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">Your hosting journey starts now</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Hi${firstName ? ` ${firstName}` : ""},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Welcome aboard! Your hosting order has been received and is being set up. Here's a summary:</p>
    ${infoTable([
      ["Domain", domain || "—"],
      ...(planName ? [["Plan", planName]] : []),
      ["Status", "Setting up"],
    ])}
    <h3 style="font-size:16px;font-weight:600;color:#1f2937;margin:24px 0 12px;">Next Steps</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;font-size:14px;color:#374151;">1️⃣ Point your domain nameservers to <strong>ns1.vintechdev.store</strong> & <strong>ns2.vintechdev.store</strong></td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#374151;">2️⃣ Wait for DNS propagation (up to 48 hours)</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#374151;">3️⃣ Your hosting will activate automatically once DNS is verified</td></tr>
    </table>
    ${emailButton("Go to Dashboard", "https://vintechdev.store/dashboard")}
  `;
  return { subject: `🎉 Welcome to VintechHost${domain ? ` - ${domain}` : ""}!`, html: wrapInBrandedTemplate(content, `Welcome! Your hosting${domain ? ` for ${domain}` : ""} is being set up.`) };
}

function buildExpiringEmail(data: any): { subject: string; html: string } {
  const { firstName, domain, expiresAt, daysLeft, dashboardUrl } = data;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#fffbeb;line-height:56px;font-size:28px;">⏰</div>
    </div>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#d97706;text-align:center;">Hosting Expiring Soon</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">Renew now to avoid service interruption</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Hi${firstName ? ` ${firstName}` : ""},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;">Your hosting for <strong>${domain}</strong> will expire in <strong style="color:#d97706;">${daysLeft} day${daysLeft > 1 ? "s" : ""}</strong>.</p>
    ${infoTable([["Domain", domain], ["Expires", expiresAt], ["Days Left", `${daysLeft}`]])}
    <p style="font-size:15px;color:#374151;line-height:1.6;">Renew now to keep your website online without interruption:</p>
    ${emailButton("Renew Hosting", dashboardUrl || "https://vintechdev.store/dashboard/billing", "#d97706")}
  `;
  return { subject: `⏰ Hosting for ${domain} expires in ${daysLeft} days`, html: wrapInBrandedTemplate(content, `Your hosting for ${domain} expires in ${daysLeft} days.`) };
}

// ─── TEMPLATE ROUTER ────────────────────────────────────────────────
function buildEmail(type: string, data: any): { subject: string; html: string } | null {
  switch (type) {
    case "suspension": return buildSuspensionEmail(data);
    case "unsuspension": return buildUnsuspensionEmail(data);
    case "invoice_created": return buildInvoiceCreatedEmail(data);
    case "payment_received": return buildPaymentReceivedEmail(data);
    case "welcome": return buildWelcomeEmail(data);
    case "expiring": return buildExpiringEmail(data);
    default: return null;
  }
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-notification-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(RESEND_API_KEY);
    const body = await req.json();
    const { to, type, data, subject: rawSubject, html: rawHtml } = body;

    if (!to) {
      return new Response(JSON.stringify({ error: "Missing required field: to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject: string;
    let html: string;

    if (type && data) {
      // Use template system
      const email = buildEmail(type, data);
      if (!email) {
        return new Response(JSON.stringify({ error: `Unknown email template type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subject = email.subject;
      html = email.html;
    } else if (rawSubject && rawHtml) {
      // Legacy: raw subject + html (wrap in branded template)
      subject = rawSubject;
      html = wrapInBrandedTemplate(rawHtml);
    } else {
      return new Response(JSON.stringify({ error: "Provide either (type + data) or (subject + html)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-notification-email] Sending "${subject}" to ${to}`);

    const emailResponse = await resend.emails.send({
      from: "VintechHost <noreply@vintechdev.store>",
      to: [to],
      subject,
      html,
    });

    console.log("[send-notification-email] Sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-notification-email] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
