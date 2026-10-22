// 테스트 전용: Next.js 경로 별칭(@/…)과 확장자 없는 import를 Node 테스트 러너에서 풀어 준다.
// 앱 코드는 바꾸지 않는다. npm run test:report가 --import로 불러온다.
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
