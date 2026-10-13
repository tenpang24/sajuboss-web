import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { adminBadgeTone, formatDayTime, productTitle, statusText } from "@/lib/admin/format";
import { listAdminOrders, readAdminFilters, type AdminOrderFilters } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { formatKrw } from "@/lib/pricing";
import { ORDER_STATUSES, PRODUCTS, orderNumber, productNames, statusLabels } from "@/lib/products";

export const metadata: Metadata = { title: "신청 관리" };

// 검색 조건을 주소로 바꿉니다. 개인정보(이메일·전화)는 조건에 넣지 않습니다.
function listHref(filters: AdminOrderFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.product) params.set("product", filters.product);
  if (filters.status) params.set("status", filters.status);
  if (filters.min !== null) params.set("min", String(filters.min));
  if (filters.max !== null) params.set("max", String(filters.max));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.number) params.set("no", filters.number);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function FilterForm({ filters }: { filters: AdminOrderFilters }) {
  return (
    <form action="/admin/orders" method="get" className="card admin-filter">
      <div className="grid-form">
        <div className="field">
          <label htmlFor="f-product">상품</label>
          <select className="input" id="f-product" name="product" defaultValue={filters.product ?? ""}>
            <option value="">전체</option>
            {PRODUCTS.map((product) => (
              <option key={product} value={product}>
                {productNames[product]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status">상태</label>
          <select className="input" id="f-status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">전체</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-min">금액(원) 이상</label>
          <input
            className="input"
            id="f-min"
            name="min"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={9}
            defaultValue={filters.min ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="f-max">금액(원) 이하</label>
          <input
            className="input"
            id="f-max"
            name="max"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={9}
            defaultValue={filters.max ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="f-from">신청일 시작</label>
          <input className="input" id="f-from" name="from" type="date" defaultValue={filters.from ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="f-to">신청일 끝</label>
          <input className="input" id="f-to" name="to" type="date" defaultValue={filters.to ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="f-no">신청 번호</label>
          <input
            className="input"
            id="f-no"
            name="no"
            maxLength={8}
            autoComplete="off"
            defaultValue={filters.number ? filters.number.toUpperCase() : ""}
          />
          <p className="help">8자리를 모두 입력해 주세요.</p>
        </div>
      </div>
      <div className="admin-filter-actions">
        <Button type="submit">검색</Button>
        <ButtonLink href="/admin/orders" variant="g">
          조건 지우기
        </ButtonLink>
      </div>
    </form>
  );
}

async function AdminOrdersContent({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  await requireAdmin("/admin/orders");
  const filters = readAdminFilters(await searchParams);
  const list = await listAdminOrders(filters);

  return (
    <>
      <FilterForm filters={filters} />

      {!list && (
        <Card className="my-empty">
          <strong className="my-empty-title">신청 목록을 불러오지 못했습니다</strong>
          <p className="muted">잠시 후 화면을 새로 고쳐 주세요.</p>
        </Card>
      )}

      {list && (
        <div className="order-list">
          <strong className="order-list-title">
            신청 목록 <span className="muted">{list.total.toLocaleString("ko-KR")}건</span>
          </strong>

          {list.rows.length === 0 && (
            <Card className="my-empty">
              <strong className="my-empty-title">조건에 맞는 신청이 없습니다</strong>
            </Card>
          )}

          {list.rows.map((row) => (
            <Card key={row.id} className="order admin-row">
              <div className="order-info">
                <div className="order-meta">
                  <Badge tone={row.status ? adminBadgeTone[row.status] : undefined}>
                    {statusText(row.status)}
                  </Badge>
                  {row.deleted && <Badge tone="line">삭제 요청됨</Badge>}
                  {row.waitingDeposit && <Badge tone="y">입금 확인 요청</Badge>}
                  {row.sameSaju > 0 && (
                    <Badge tone="dark">
                      같은 사주 {row.sameSaju}건{row.dueDate ? " (예정일 기준)" : ""}
                    </Badge>
                  )}
                  <span className="muted small">신청 번호 {orderNumber(row.id)}</span>
                </div>
                <strong className="order-name">{productTitle(row.product, row.package)}</strong>
                <span className="muted">
                  {formatDayTime(row.createdAt)} 신청 · {formatKrw(row.amountKrw)}
                </span>
              </div>
              <div className="order-actions">
                <ButtonLink href={`/admin/orders/${row.id}`} variant="o" size="sm">
                  상세 보기
                </ButtonLink>
              </div>
            </Card>
          ))}

          {list.pages > 1 && (
            <nav className="admin-pages" aria-label="쪽 이동">
              {list.page > 1 ? (
                <Link className="btn btn-g btn-sm" href={listHref(filters, list.page - 1)}>
                  이전
                </Link>
              ) : (
                <span />
              )}
              <span className="muted">
                {list.page} / {list.pages}쪽
              </span>
              {list.page < list.pages ? (
                <Link className="btn btn-g btn-sm" href={listHref(filters, list.page + 1)}>
                  다음
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}
    </>
  );
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <div className="wrap my-head">
        <h1 className="t1 t1-sm">신청 관리</h1>
        <p className="lead">신청 내용을 확인하고 입금 확인, 진행 상태, 환불을 처리합니다.</p>
      </div>
      <section className="wrap my-body admin-body">
        <Suspense fallback={<Card className="my-empty my-loading" aria-busy="true" />}>
          <AdminOrdersContent searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}
