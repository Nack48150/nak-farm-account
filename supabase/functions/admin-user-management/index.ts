import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Missing authorization");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !caller) throw new Error("Unauthorized");

    const { data: profile } = await adminClient.from("profiles").select("role,is_active").eq("id", caller.id).single();
    if (!profile || profile.role !== "admin" || !profile.is_active) throw new Error("Admin only");

    const body = await req.json();
    const action = body.action;

    if (action === "list_users") {
      const { data: users, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const ids = users.users.map(u => u.id);
      const { data: profiles } = await adminClient.from("profiles").select("*").in("id", ids);
      const map = new Map((profiles || []).map(p => [p.id, p]));
      return json({ users: users.users.map(u => ({ id:u.id, email:u.email, user_metadata:u.user_metadata, profile:map.get(u.id)||null })) });
    }

    if (action === "create_user") {
      const { email, password, full_name, role } = body;
      if (!email || !password || password.length < 6) throw new Error("Email/password ไม่ถูกต้อง");
      if (!["admin","user","viewer"].includes(role)) throw new Error("Role ไม่ถูกต้อง");
      const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: full_name || "" } });
      if (error) throw error;
      const { error: pe } = await adminClient.from("profiles").upsert({ id:data.user.id, full_name:full_name||"", role, is_active:true });
      if (pe) throw pe;
      return json({ ok:true, id:data.user.id });
    }

    if (action === "set_password") {
      const { user_id, password } = body;
      if (!user_id || !password || password.length < 6) throw new Error("รหัสผ่านไม่ถูกต้อง");
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return json({ ok:true });
    }

    if (action === "set_active") {
      const { user_id, is_active } = body;
      if (user_id === caller.id) throw new Error("ไม่สามารถปิดบัญชี Admin ที่กำลังใช้งานได้");
      const { error } = await adminClient.from("profiles").update({ is_active:!!is_active, updated_at:new Date().toISOString() }).eq("id", user_id);
      if (error) throw error;
      return json({ ok:true });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id || user_id === caller.id) throw new Error("ไม่สามารถลบบัญชีตัวเองได้");
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ ok:true });
    }

    throw new Error("Unknown action");
  } catch (e) {
    return json({ error: e?.message || String(e) }, 400);
  }
});

function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type":"application/json" } });
}
