-- 4단계 (1/3): 가입 약관 동의 시각
-- 실행 순서: 이 파일 → 20261011150050_saju_profiles.sql → 20261011150100_orders.sql
-- 기록은 가입 서버 액션이 service_role로만 한다(terms_agreed_at is null일 때만). 사용자는 읽을 수만 있다.

alter table public.profiles
  add column age_confirmed_at timestamptz,       -- [필수] 만 14세 이상 확인 시각
  add column terms_agreed_at timestamptz,        -- [필수] 이용약관 동의 시각
  add column privacy_agreed_at timestamptz,      -- [필수] 개인정보 수집·이용 동의 시각
  add column marketing_opt_in_at timestamptz;    -- [선택] 오픈·할인 소식 이메일 수신 동의 시각. 동의하지 않으면 null

-- 권한은 바꾸지 않는다.
--  - authenticated는 profiles에 select만 있고 update grant가 어떤 컬럼에도 없으므로
--    새 컬럼도 사용자가 직접 바꿀 수 없다(시도하면 42501).
--  - select는 테이블 단위 grant라 본인 행의 새 컬럼을 읽을 수 있다(profiles_select_own).
--  - handle_new_user() 트리거는 바꾸지 않는다. 가입 요청의 메타데이터를 읽지 않으므로
--    새 계정의 네 컬럼은 null로 시작하고, 서버 액션이 가입 직후 채운다.
--  - 신청(주문) 서버 액션은 필수 3개가 비어 있는 계정의 신청을 막는다.
