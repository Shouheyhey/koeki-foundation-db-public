/**
 * 公益財団法人 Co-Funding ターゲットDB — フロントエンドロジック
 * data.json を読み込み、フィルタ・ソート・モーダル詳細を提供
 */

let DATA = null;
let filteredData = [];

// ============================================================
// 初期化
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  bindEvents();
});

async function loadData() {
  try {
    const resp = await fetch("data.json?t=" + Date.now());
    if (!resp.ok) {
      showNoData();
      return;
    }
    DATA = await resp.json();
    populateFilters();
    renderSummary();
    applyFilters();
  } catch {
    showNoData();
  }
}

function showNoData() {
  document.getElementById("table-body").innerHTML =
    '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#586069;">' +
    "data.json が見つかりません。<br>" +
    "公開ディレクトリに <code>data.json</code> を配置してください。" +
    "</td></tr>";
}

// ============================================================
// フィルタ・プルダウン設定
// ============================================================
function populateFilters() {
  // 都道府県
  const prefSelect = document.getElementById("filter-pref");
  if (DATA.pref_stats) {
    DATA.pref_stats
      .filter((p) => p.count > 0)
      .forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.pref_code;
        opt.textContent = `${p.pref_name} (${p.count})`;
        prefSelect.appendChild(opt);
      });
  }

  // 事業形態
  const typeSelect = document.getElementById("filter-grant-type");
  if (DATA.m_grant_types) {
    DATA.m_grant_types.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.code;
      opt.textContent = `${t.code} ${t.label}`;
      typeSelect.appendChild(opt);
    });
  }

  // 事業分野
  const fieldSelect = document.getElementById("filter-grant-field");
  if (DATA.m_grant_fields) {
    DATA.m_grant_fields.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.code;
      opt.textContent = `${f.code} ${f.label}`;
      fieldSelect.appendChild(opt);
    });
  }
}

// ============================================================
// サマリ表示
// ============================================================
function renderSummary() {
  const s = DATA.summary || {};
  document.getElementById("stat-total").textContent = fmt(s.total_foundations);
  document.getElementById("stat-financials").textContent = fmt(s.with_financials);
  document.getElementById("stat-flagged").textContent = fmt(s.with_flags);
  document.getElementById("stat-critical").textContent = fmt(s.critical_targets);
  document.getElementById("generated-at").textContent =
    `最終更新: ${DATA.generated_at || "N/A"}`;
}

// ============================================================
// フィルタ適用
// ============================================================
function applyFilters() {
  if (!DATA || !DATA.foundations) return;

  const pref = document.getElementById("filter-pref").value;
  const grantType = document.getElementById("filter-grant-type").value;
  const grantField = document.getElementById("filter-grant-field").value;
  const flagFilter = document.getElementById("filter-flag").value;
  const search = document.getElementById("filter-search").value.toLowerCase();
  const minRevenue = parseFloat(document.getElementById("filter-min-revenue").value) || 0;
  const minSecPct = parseFloat(document.getElementById("filter-min-sec-pct").value) || 0;
  const sortBy = document.getElementById("sort-by").value;

  filteredData = DATA.foundations.filter((f) => {
    if (pref && f.pref_code !== pref) return false;
    if (search && !f.name_ja.toLowerCase().includes(search)) return false;
    if (minRevenue > 0 && (f.latest_total_revenue || 0) < minRevenue * 1e6) return false;
    if (minSecPct > 0 && (f.securities_pct || 0) < minSecPct) return false;

    if (grantType && !f.programs.some((p) => p.grant_type_code === grantType)) return false;
    if (grantField && !f.programs.some((p) => p.grant_field_code === grantField)) return false;

    if (flagFilter) {
      if (flagFilter === "any" && f.flag_count === 0) return false;
      if (flagFilter === "critical" && !f.has_critical_flag) return false;
      if (flagFilter === "high" && !f.flags.some((fl) => fl.severity === "critical" || fl.severity === "high")) return false;
      if (!["any", "critical", "high"].includes(flagFilter) &&
          !f.flags.some((fl) => fl.flag_type === flagFilter)) return false;
    }

    return true;
  });

  // ソート
  filteredData.sort((a, b) => {
    switch (sortBy) {
      case "securities_desc":
        return (b.latest_revenue_securities || 0) - (a.latest_revenue_securities || 0);
      case "revenue_desc":
        return (b.latest_total_revenue || 0) - (a.latest_total_revenue || 0);
      case "surplus_desc":
        return (b.surplus_pct || -999) - (a.surplus_pct || -999);
      case "sec_pct_desc":
        return (b.securities_pct || -999) - (a.securities_pct || -999);
      case "flags_desc":
        return b.flag_count - a.flag_count;
      case "name_asc":
        return a.name_ja.localeCompare(b.name_ja, "ja");
      case "pref_asc":
        return a.pref_code.localeCompare(b.pref_code);
      default:
        return 0;
    }
  });

  renderTable();
}

// ============================================================
// テーブル描画
// ============================================================
function renderTable() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";
  document.getElementById("result-count").textContent = filteredData.length;

  if (filteredData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align:center;padding:1.5rem;color:#586069;">該当なし</td></tr>';
    return;
  }

  // 最大500件表示（パフォーマンス）
  const displayData = filteredData.slice(0, 500);

  displayData.forEach((f) => {
    const tr = document.createElement("tr");
    if (f.has_critical_flag) tr.classList.add("critical-row");
    tr.onclick = () => showDetail(f);

    const rev = f.latest_total_revenue;
    const sec = f.latest_revenue_securities;
    const ni = f.latest_net_income;

    tr.innerHTML = `
      <td>${f.pref_name || ""}</td>
      <td><strong>${esc(f.name_ja)}</strong></td>
      <td>${f.latest_fiscal_year || "-"}</td>
      <td class="num">${fmtMil(rev)}</td>
      <td class="num">${fmtMil(sec)}</td>
      <td class="num">${f.securities_pct != null ? f.securities_pct + "%" : "-"}</td>
      <td class="num ${ni > 0 ? "positive" : ni < 0 ? "negative" : ""}">${fmtMil(ni)}</td>
      <td class="num">${f.surplus_pct != null ? f.surplus_pct + "%" : "-"}</td>
      <td>${renderFlags(f.flags)}</td>
      <td>${renderGrants(f.programs)}</td>
    `;
    tbody.appendChild(tr);
  });

  if (filteredData.length > 500) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="10" style="text-align:center;color:#586069;">
      ... 他 ${filteredData.length - 500}件（フィルタで絞り込んでください）</td>`;
    tbody.appendChild(tr);
  }
}

function renderFlags(flags) {
  if (!flags || flags.length === 0) return "-";
  // 最新年度のフラグのみ表示
  const latestYear = Math.max(...flags.map((f) => f.fiscal_year));
  return flags
    .filter((f) => f.fiscal_year === latestYear)
    .map(
      (f) =>
        `<span class="flag-badge flag-${f.severity}" title="${esc(f.flag_detail)}">${flagLabel(f.flag_type)}</span>`
    )
    .join("");
}

function flagLabel(type) {
  const labels = {
    rapid_revenue_growth: "収益急増",
    rapid_securities_growth: "証券急増",
    high_securities_ratio: "証券比率高",
    large_surplus: "大幅黒字",
    growing_surplus_trend: "連続黒字増",
  };
  return labels[type] || type;
}

function renderGrants(programs) {
  if (!programs || programs.length === 0) return "-";
  return programs
    .slice(0, 3)
    .map((p) => `<span class="grant-badge">${esc(p.grant_type_label || p.grant_type_code || "")}</span>`)
    .join("");
}

// ============================================================
// モーダル詳細
// ============================================================
function showDetail(f) {
  const modal = document.getElementById("detail-modal");
  const body = document.getElementById("modal-body");

  let html = `
    <div class="detail-section">
      <h3>${esc(f.name_ja)}</h3>
      <div class="detail-grid">
        <div class="detail-item"><span class="label">都道府県</span><br><span class="value">${f.pref_name || "-"}</span></div>
        <div class="detail-item"><span class="label">行政庁</span><br><span class="value">${esc(f.admin_authority || "-")}</span></div>
        <div class="detail-item"><span class="label">法人番号</span><br><span class="value">${f.corporate_number || "-"}</span></div>
        <div class="detail-item"><span class="label">認定日</span><br><span class="value">${f.koeki_certified_date || "-"}</span></div>
        <div class="detail-item"><span class="label">所在地</span><br><span class="value">${esc(f.address || "-")}</span></div>
        <div class="detail-item"><span class="label">代表者</span><br><span class="value">${esc(f.representative || "-")}</span></div>
      </div>
      ${f.homepage_url ? `<p style="margin-top:0.5rem"><a href="${esc(f.homepage_url)}" target="_blank">公式サイト</a></p>` : ""}
      ${f.koeki_info_url ? `<p><a href="${esc(f.koeki_info_url)}" target="_blank">公益法人information</a></p>` : ""}
    </div>
  `;

  // 目的
  if (f.purpose) {
    html += `<div class="detail-section"><h3>設立目的</h3><p style="font-size:0.85rem">${esc(f.purpose)}</p></div>`;
  }

  // フラグ
  if (f.flags && f.flags.length > 0) {
    html += `<div class="detail-section"><h3>分析フラグ</h3><table class="fin-table"><thead><tr><th>年度</th><th>種別</th><th>重要度</th><th>詳細</th></tr></thead><tbody>`;
    f.flags.forEach((fl) => {
      html += `<tr><td>${fl.fiscal_year}</td><td><span class="flag-badge flag-${fl.severity}">${flagLabel(fl.flag_type)}</span></td><td>${fl.severity}</td><td>${esc(fl.flag_detail)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // 財務推移
  if (f.financials && f.financials.length > 0) {
    html += `<div class="detail-section"><h3>財務推移（2020年度〜）</h3>
    <table class="fin-table"><thead><tr>
      <th>年度</th><th class="num">総収益<br>(百万円)</th><th class="num">有価証券<br>運用益</th>
      <th class="num">証券比率</th><th class="num">当期損益</th><th class="num">総資産</th>
      <th class="num">有価証券<br>保有額</th><th class="num">正味財産</th>
    </tr></thead><tbody>`;
    f.financials.forEach((fin) => {
      const tr = fin.total_revenue || 0;
      const sec = fin.revenue_securities || 0;
      const ni = fin.net_income;
      const secPct = tr > 0 ? ((sec / tr) * 100).toFixed(1) + "%" : "-";
      html += `<tr>
        <td>${fin.fiscal_year}</td>
        <td class="num">${fmtMil(tr)}</td>
        <td class="num">${fmtMil(sec)}</td>
        <td class="num">${secPct}</td>
        <td class="num ${ni > 0 ? "positive" : ni < 0 ? "negative" : ""}">${fmtMil(ni)}</td>
        <td class="num">${fmtMil(fin.total_assets)}</td>
        <td class="num">${fmtMil(fin.securities_holdings)}</td>
        <td class="num">${fmtMil(fin.total_net_assets)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // 助成プログラム
  if (f.programs && f.programs.length > 0) {
    html += `<div class="detail-section"><h3>助成プログラム</h3><table class="fin-table"><thead><tr>
      <th>プログラム名</th><th>事業形態</th><th>事業分野</th><th class="num">年間予算(百万円)</th>
    </tr></thead><tbody>`;
    f.programs.forEach((p) => {
      html += `<tr>
        <td>${esc(p.program_name)}</td>
        <td><span class="grant-badge">${esc(p.grant_type_label || "")}</span></td>
        <td>${esc(p.grant_field_label || "")}</td>
        <td class="num">${fmtMil(p.annual_budget)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  body.innerHTML = html;
  modal.classList.remove("hidden");
}

// ============================================================
// CSVエクスポート
// ============================================================
function exportCSV() {
  if (filteredData.length === 0) return;

  const headers = [
    "都道府県", "法人名", "法人番号", "行政庁", "直近年度",
    "総収益(円)", "有価証券運用益(円)", "有価証券比率(%)",
    "当期黒字(円)", "黒字率(%)", "フラグ", "助成種別",
  ];
  const rows = filteredData.map((f) => [
    f.pref_name || "",
    f.name_ja,
    f.corporate_number || "",
    f.admin_authority || "",
    f.latest_fiscal_year || "",
    f.latest_total_revenue || "",
    f.latest_revenue_securities || "",
    f.securities_pct || "",
    f.latest_net_income || "",
    f.surplus_pct || "",
    (f.flags || []).map((fl) => `${flagLabel(fl.flag_type)}(${fl.severity})`).join("; "),
    (f.programs || []).map((p) => p.grant_type_label || "").join("; "),
  ]);

  let csv = "\uFEFF"; // BOM
  csv += headers.join(",") + "\n";
  rows.forEach((r) => {
    csv += r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cofunding_targets_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// イベントバインド
// ============================================================
function bindEvents() {
  ["filter-pref", "filter-grant-type", "filter-grant-field", "filter-flag", "sort-by"].forEach(
    (id) => document.getElementById(id).addEventListener("change", applyFilters)
  );
  document.getElementById("filter-search").addEventListener("input", debounce(applyFilters, 300));
  document.getElementById("filter-min-revenue").addEventListener("input", debounce(applyFilters, 500));
  document.getElementById("filter-min-sec-pct").addEventListener("input", debounce(applyFilters, 500));

  document.getElementById("btn-reset").addEventListener("click", () => {
    document.getElementById("filter-pref").value = "";
    document.getElementById("filter-grant-type").value = "";
    document.getElementById("filter-grant-field").value = "";
    document.getElementById("filter-flag").value = "";
    document.getElementById("filter-search").value = "";
    document.getElementById("filter-min-revenue").value = "";
    document.getElementById("filter-min-sec-pct").value = "";
    document.getElementById("sort-by").value = "securities_desc";
    applyFilters();
  });

  document.getElementById("btn-export-csv").addEventListener("click", exportCSV);

  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("detail-modal").classList.add("hidden");
  });
  document.getElementById("detail-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add("hidden");
    }
  });
}

// ============================================================
// ユーティリティ
// ============================================================
function fmt(n) {
  if (n == null) return "-";
  return Number(n).toLocaleString("ja-JP");
}

function fmtMil(n) {
  if (n == null) return "-";
  return (n / 1e6).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
