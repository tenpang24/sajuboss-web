// Node 모듈 해석 hook. "@/x" → 저장소 루트의 x, 확장자가 없으면 .ts → .tsx → /index.ts 순서로 찾는다.
// exports 표가 없는 패키지의 하위 경로(next/navigation 등)는 .js를 붙여 다시 찾는다.
// "server-only"는 빈 모듈로 바꾼다(react-server 조건을 켜면 next/navigation이 쓰는 React 기능이 빠져서 조건 없이 실행한다).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = new URL("../../", import.meta.url);
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

function withExtension(url) {
  const path = fileURLToPath(url);
  if (/\.[cm]?[jt]sx?$/.test(path) && existsSync(path)) return url;
  for (const ext of EXTENSIONS) {
    if (existsSync(path + ext)) return pathToFileURL(path + ext).href;
  }
  return url;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    return next(withExtension(new URL(specifier.slice(2), ROOT).href), context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    return next(withExtension(new URL(specifier, context.parentURL).href), context);
  }
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && /^[@\w][^:]*\/[^.]+$/.test(specifier)) {
      return next(`${specifier}.js`, context);
    }
    throw error;
  }
}
