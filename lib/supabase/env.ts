export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 카카오 키를 Supabase Auth에 등록한 뒤 이 값을 true로 두면 버튼이 활성화됩니다.
export const kakaoLoginEnabled = process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === "true";
