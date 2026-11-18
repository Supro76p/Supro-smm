// Supabase Edge Function: smmgen
// Secrets lagbe: SMMGEN_API_URL, SMMGEN_API_KEY (baki gulo Supabase nijei dey)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown) =>
  new Response(JSON.stringify(b), { headers: { ...cors, "Content-Type": "application/json" } });

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_URL = Deno.env.get("SMMGEN_API_URL")!;
const API_KEY = Deno.env.get("SMMGEN_API_KEY")!;
const admin = createClient(URL_, SERVICE);

async function provider(params: Record<string, string>) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: API_KEY, ...params }),
  });
  return await res.json();
}

const statusMap: Record<string, string> = {
  pending: "processing", processing: "processing", "in progress": "in_progress",
  completed: "completed", partial: "partial", canceled: "canceled", cancelled: "canceled", refunded: "canceled",
};
const platforms = ["facebook", "instagram", "tiktok", "youtube", "telegram"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Please sign in again." });

    const body = await req.json();
    const action = body.action;

    /* ---- customer: place order ---- */
    if (action === "place_order") {
      const { data: oid, error } = await userClient.rpc("place_order", {
        p_service_id: body.service_id, p_link: body.link, p_quantity: body.quantity,
      });
      if (error) return json({ ok: false, error: error.message });

      const { data: o } = await admin.from("orders")
        .select("id, charge, quantity, link, services(provider_service_id)").eq("id", oid).single();
      const pid = (o as any)?.services?.provider_service_id;
      if (!pid) return json({ ok: true, order_id: oid }); // demo service, pending thake

      try {
        const r = await provider({ action: "add", service: String(pid), link: o!.link, quantity: String(o!.quantity) });
        if (r.order) {
          await admin.from("orders").update({ provider_order_id: String(r.order), status: "processing" }).eq("id", oid);
          return json({ ok: true, order_id: oid });
        }
        console.error("provider rejected order", r);
        await admin.rpc("system_refund", { p_order_id: oid, p_amount: o!.charge, p_status: "failed" });
        return json({ ok: false, error: "The provider could not take this order. Your balance was returned." });
      } catch (e) {
        console.error("provider call failed", e);
        return json({ ok: true, order_id: oid }); // pending thake, admin dekhbe
      }
    }

    /* ---- admin only ---- */
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!me || me.role !== "admin") return json({ ok: false, error: "Not allowed." });

    if (action === "sync_services") {
      const mult = Number(body.multiplier);
      if (!Number.isFinite(mult) || mult <= 0) return json({ ok: false, error: "Enter a valid multiplier." });
      const list = await provider({ action: "services" });
      if (!Array.isArray(list)) return json({ ok: false, error: "Provider did not return a service list." });

      const { data: existing } = await admin.from("services").select("provider_service_id").not("provider_service_id", "is", null);
      const have = new Set((existing ?? []).map((r: any) => r.provider_service_id));
      const fresh: any[] = [], update: any[] = [];
      for (const s of list) {
        if (String(s.type ?? "Default").toLowerCase() !== "default") continue;
        const text = `${s.category} ${s.name}`.toLowerCase();
        const platform = platforms.find((p) => text.includes(p));
        if (!platform) continue;
        const min = Number(s.min), max = Number(s.max);
        if (!(min > 0) || !(max >= min)) continue;
        const row: any = {
          provider_service_id: String(s.service), platform,
          category: String(s.category).slice(0, 80), name: String(s.name).slice(0, 200),
          description: String(s.category).slice(0, 200),
          rate_per_1000: Math.round(Number(s.rate) * mult * 10000) / 10000, min_qty: min, max_qty: max,
        };
        if (have.has(row.provider_service_id)) update.push(row); else fresh.push({ ...row, is_active: false });
      }
      for (let i = 0; i < fresh.length; i += 500)
        await admin.from("services").insert(fresh.slice(i, i + 500));
      for (let i = 0; i < update.length; i += 500)
        await admin.from("services").upsert(update.slice(i, i + 500), { onConflict: "provider_service_id" });
      return json({ ok: true, added: fresh.length, updated: update.length });
    }

    if (action === "sync_status") {
      const { data: orders } = await admin.from("orders")
        .select("id, charge, quantity, provider_order_id")
        .not("provider_order_id", "is", null).in("status", ["pending", "processing", "in_progress"]).limit(100);
      if (!orders?.length) return json({ ok: true, checked: 0, changed: 0 });

      const ids = orders.map((o: any) => o.provider_order_id);
      let res = await provider({ action: "status", orders: ids.join(",") });
      if (ids.length === 1 && res && res.status) res = { [ids[0]]: res };

      let changed = 0;
      for (const o of orders as any[]) {
        const r = res?.[o.provider_order_id];
        if (!r || r.error) continue;
        const st = statusMap[String(r.status).toLowerCase()];
        if (!st) continue;
        if (st === "canceled") {
          if (await admin.rpc("system_refund", { p_order_id: o.id, p_amount: o.charge, p_status: "canceled" }).then((x) => x.data)) changed++;
        } else if (st === "partial") {
          const remains = Number(r.remains) || 0;
          const amount = Math.round(o.charge * Math.min(remains / o.quantity, 1) * 100) / 100;
          await admin.rpc("system_refund", { p_order_id: o.id, p_amount: amount, p_status: "partial" });
          changed++;
        } else {
          const { data } = await admin.from("orders").update({ status: st }).eq("id", o.id).neq("status", st).select("id");
          if (data?.length) changed++;
        }
      }
      return json({ ok: true, checked: orders.length, changed });
    }

    return json({ ok: false, error: "Unknown action." });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Something went wrong. Try again." });
  }
});
