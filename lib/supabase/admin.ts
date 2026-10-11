import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// service_role 클라이언트. RLS를 우회하므로 서버 코드에서만, 호출 전에 권한을 확인한 뒤 씁니다.
export async function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // 클라이언트는 만들어질 때 내부 초기화를 백그라운드로 시작합니다. 여기서 끝날 때까지 기다려
  // 서버 액션이 끝난 뒤(페이지를 다시 그리는 동안)까지 그 작업이 이어지지 않게 합니다.
  await client.auth.initialize();
  return client;
}
