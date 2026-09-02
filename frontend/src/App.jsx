import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const getMPName = (row) =>
  row["MP Name"] ||
  row.MP_Name ||
  row.Normalized_MP_Name ||
  "Unknown";

const getAmount = (row) =>
  Number(row["Expenditure Amount (₹)"]) ||
  Number(row.Expenditure_Amount) ||
  Number(row.Amount) ||
  0;

const getVendor = (row) =>
  row.Vendor ||
  row["Vendor Name"] ||
  row.Vendor_Name ||
  "—";

const getDistrict = (row) =>
  row.IDA ||
  row.District ||
  row["District Name"] ||
  "—";

const getStatus = (row) =>
  row["Payment Status"] ||
  row.Payment_Status ||
  row.Status ||
  "—";

const getReason = (row) =>
  row.Flag_Reason ||
  row.Reason ||
  row.Anomaly_Reason ||
  "Flagged";

const getMinistry = (row) =>
  row.Ministry ||
  row["Ministry Name"] ||
  row.Ministry_Name ||
  row.Department ||
  "Unknown Ministry";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function App() {
  const [anomalies, setAnomalies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [segments, setSegments] = useState([]);

  const [page, setPage] = useState("dashboard");

  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("all");

  const [analysisView, setAnalysisView] =
    useState("ministry");

  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          anomalyResponse,
          duplicateResponse,
          segmentResponse,
        ] = await Promise.all([
          axios.get(`${API}/api/anomalies`),
          axios.get(`${API}/api/duplicates`),
          axios.get(`${API}/api/mp-segments`),
        ]);

        setAnomalies(
          Array.isArray(anomalyResponse.data)
            ? anomalyResponse.data
            : []
        );

        setDuplicates(
          Array.isArray(duplicateResponse.data)
            ? duplicateResponse.data
            : []
        );

        setSegments(
          Array.isArray(segmentResponse.data)
            ? segmentResponse.data
            : []
        );

        setOnline(true);
      } catch (error) {
        console.error(
          "SAKSHI-AI API ERROR:",
          error
        );

        setOnline(false);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const flaggedAmount = useMemo(() => {
    return anomalies.reduce(
      (total, row) =>
        total + getAmount(row),
      0
    );
  }, [anomalies]);

  const reasons = useMemo(() => {
    const values = anomalies
      .map((row) => getReason(row))
      .filter(Boolean)
      .map((value) =>
        String(value).trim()
      )
      .filter(Boolean);

    return [...new Set(values)];
  }, [anomalies]);

  const districtData = useMemo(() => {
    const grouped = {};

    anomalies.forEach((row) => {
      const district =
        getDistrict(row);

      if (!grouped[district]) {
        grouped[district] = {
          name: district,
          count: 0,
          amount: 0,
        };
      }

      grouped[district].count += 1;
      grouped[district].amount +=
        getAmount(row);
    });

    return Object.values(grouped).sort(
      (a, b) => b.amount - a.amount
    );
  }, [anomalies]);

  const chartData = useMemo(() => {
    const grouped = {};

    if (analysisView === "all") {
      segments.forEach((row) => {
        const name =
          row.Normalized_MP_Name ||
          row.MP_Name ||
          row["MP Name"] ||
          "Unknown";

        const amount =
          Number(row.Total_Expenditure) ||
          Number(row.Expenditure) ||
          Number(row.Amount) ||
          0;

        grouped[name] =
          (grouped[name] || 0) +
          amount;
      });
    }

    if (analysisView === "ministry") {
      anomalies.forEach((row) => {
        const name =
          getMinistry(row);

        grouped[name] =
          (grouped[name] || 0) +
          getAmount(row);
      });
    }

    if (analysisView === "district") {
      anomalies.forEach((row) => {
        const name =
          getDistrict(row);

        grouped[name] =
          (grouped[name] || 0) +
          getAmount(row);
      });
    }

    if (analysisView === "mp") {
      anomalies.forEach((row) => {
        const name =
          getMPName(row);

        grouped[name] =
          (grouped[name] || 0) +
          getAmount(row);
      });
    }

    return Object.entries(grouped)
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort(
        (a, b) =>
          b.amount - a.amount
      )
      .slice(0, 10);
  }, [
    anomalies,
    segments,
    analysisView,
  ]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((row) => {
      const text =
        JSON.stringify(row).toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(
          search.toLowerCase()
        );

      const matchesReason =
        reason === "all" ||
        getReason(row) === reason;

      return (
        matchesSearch &&
        matchesReason
      );
    });
  }, [
    anomalies,
    search,
    reason,
  ]);

  const exportCSV = () => {
    const headers = [
      "MP Name",
      "Vendor",
      "IDA",
      "Amount",
      "Status",
      "Reason",
    ];

    const rows = anomalies.map(
      (row) =>
        [
          getMPName(row),
          getVendor(row),
          getDistrict(row),
          getAmount(row),
          getStatus(row),
          getReason(row),
        ]
          .map(
            (value) =>
              `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
    );

    const csv = [
      headers.join(","),
      ...rows,
    ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "sakshi-ai-audit-report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">

          <div className="loading-mark">
            S
          </div>

          <div>
            <strong>
              SAKSHI-AI
            </strong>

            <span>
              Loading audit console...
            </span>
          </div>

        </div>
      </div>
    );
  }

  const navigation = [
    ["dashboard", "Overview"],
    ["anomalies", "Anomalies"],
    ["duplicates", "Duplicate Works"],
    ["district", "District Analysis"],
    ["mp", "MP Analysis"],
  ];

  return (
    <div className="app">
      <aside className="sidebar">

        <div className="brand">

          <div className="brand-emblem-wrap">
            <img
              className="brand-emblem"
              src="/Emblem_of_India.svg.webp"
              alt="National Emblem of India"
            />
          </div>

          <div>

            <div className="brand-name">
              SAKSHI-AI
            </div>

            <div className="brand-subtitle">
              PUBLIC EXPENDITURE
              <br />
              INTELLIGENCE
            </div>

          </div>

        </div>

        <div className="sidebar-section">
          AUDIT
        </div>

        {navigation
          .slice(0, 3)
          .map(
            ([id, label]) => (
              <button
                key={id}
                className={`nav-item ${
                  page === id
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setPage(id);
                  setSearch("");
                  setReason("all");
                }}
              >
                <span className="nav-marker" />

                {label}
              </button>
            )
          )}

        <div className="sidebar-section">
          ANALYSIS
        </div>

        {navigation
          .slice(3)
          .map(
            ([id, label]) => (
              <button
                key={id}
                className={`nav-item ${
                  page === id
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setPage(id);
                  setSearch("");
                }}
              >
                <span className="nav-marker" />

                {label}
              </button>
            )
          )}

        <div
          className="sidebar-parliament-bg"
          aria-hidden="true"
        >
          <img
            src="/parliament.jpg"
            alt=""
          />
        </div>

        <div className="sidebar-bottom">

          <div className="connection-status">

            <span
              className={`status-dot ${
                online
                  ? "online"
                  : ""
              }`}
            />

            <div>

              <strong>
                {online
                  ? "System connected"
                  : "System offline"}
              </strong>

              <small>
                FastAPI backend
              </small>

            </div>

          </div>

          <button
            className="sidebar-export"
            onClick={exportCSV}
          >
            Export audit data
          </button>

          <div className="sidebar-version">
            SAKSHI-AI · v1.0
          </div>

        </div>

      </aside>

      <div className="main">

        <header className="topbar">

          <div className="breadcrumb">

            <span>
              SAKSHI-AI
            </span>

            <b>/</b>

            {page === "dashboard" &&
              "Overview"}

            {page === "anomalies" &&
              "Anomalies"}

            {page === "duplicates" &&
              "Duplicate Works"}

            {page === "district" &&
              "District Analysis"}

            {page === "mp" &&
              "MP Analysis"}

          </div>

          <div
            className={`system-state ${
              online
                ? "online"
                : ""
            }`}
          >

            <i />

            {online
              ? "OPERATIONAL"
              : "OFFLINE"}

          </div>

        </header>

        <main className="content">

          {page === "dashboard" && (
            <>

              <div className="dashboard-heading">

                <div>

                  <div className="eyebrow">
                    EXECUTIVE AUDIT OVERVIEW
                  </div>

                  <h1>
                    MP Fund Expenditure
                  </h1>

                  <p>
                    Real-time anomaly metrics
                    and semantic fraud detection
                    across parliamentary
                    constituencies.
                  </p>

                </div>

                <div className="view-switch">

                  <button
                    className={
                      analysisView ===
                      "all"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAnalysisView(
                        "all"
                      )
                    }
                  >
                    All View
                  </button>

                  <button
                    className={
                      analysisView ===
                      "ministry"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAnalysisView(
                        "ministry"
                      )
                    }
                  >
                    Ministry View
                  </button>

                  <button
                    className={
                      analysisView ===
                      "district"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAnalysisView(
                        "district"
                      )
                    }
                  >
                    District View
                  </button>

                  <button
                    className={
                      analysisView ===
                      "mp"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAnalysisView(
                        "mp"
                      )
                    }
                  >
                    MP View
                  </button>

                </div>

              </div>

              <div className="metrics">

                <Metric
                  label="HIGH-RISK ANOMALIES"
                  value={
                    anomalies.length
                  }
                  text="Transactions requiring review"
                  red
                />

                <Metric
                  label="DISGUISED DUPLICATES"
                  value={
                    duplicates.length
                  }
                  text="Potentially repeated works"
                  orange
                />

                <Metric
                  label="CONSTITUENCIES TRACKED"
                  value={
                    segments.length
                  }
                  text="K-Means clustered records"
                />

                <Metric
                  label="FLAGGED EXPENDITURE"
                  value={formatMoney(
                    flaggedAmount
                  )}
                  text="Total flagged transaction value"
                />

              </div>

              <div className="dashboard-grid">

                {}

                <section className="panel">

                  <PanelHeader
                    title={
                      analysisView ===
                      "all"
                        ? "MP Fund Utilization Pacing"
                        : analysisView ===
                          "ministry"
                        ? "Ministry Expenditure"
                        : analysisView ===
                          "district"
                        ? "District Expenditure"
                        : "MP Expenditure"
                    }
                    subtitle="Top expenditure records"
                  />

                  <div className="chart">

                    {chartData.length ===
                    0 ? (

                      <div className="empty">
                        No chart data available.
                      </div>

                    ) : (

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <BarChart
                          data={chartData}
                          margin={{
                            top: 10,
                            right: 15,
                            left: 0,
                            bottom: 90,
                          }}
                        >

                          <CartesianGrid
                            vertical={false}
                            stroke="#e3e5e2"
                            strokeDasharray="2 3"
                          />

                          <XAxis
                            dataKey="name"
                            angle={-40}
                            textAnchor="end"
                            interval={0}
                            height={110}
                            tick={{
                              fontSize: 9,
                              fill: "#686f6c",
                            }}
                            tickLine={false}
                            axisLine={{
                              stroke:
                                "#d5d7d3",
                            }}
                          />

                          <YAxis
                            tick={{
                              fontSize: 9,
                              fill: "#737a77",
                            }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(
                              value
                            ) =>
                              `₹${(
                                value /
                                100000
                              ).toFixed(
                                0
                              )}L`
                            }
                          />

                          <Tooltip
                            formatter={(
                              value
                            ) => [
                              formatMoney(
                                value
                              ),
                              "Expenditure",
                            ]}
                            contentStyle={{
                              border:
                                "1px solid #d7d9d5",
                              borderRadius:
                                "3px",
                              boxShadow:
                                "none",
                              fontSize:
                                "10px",
                            }}
                          />

                          <Bar
                            dataKey="amount"
                            fill="#293943"
                            barSize={28}
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    )}

                  </div>

                </section>
                <section className="panel">

                  <PanelHeader
                    title="Audit Findings"
                    subtitle="Current review queue"
                  />

                  <Finding
                    label="Anomalous transactions"
                    value={
                      anomalies.length
                    }
                    onClick={() =>
                      setPage(
                        "anomalies"
                      )
                    }
                  />

                  <Finding
                    label="Potential duplicate works"
                    value={
                      duplicates.length
                    }
                    onClick={() =>
                      setPage(
                        "duplicates"
                      )
                    }
                  />

                  <Finding
                    label="Districts with findings"
                    value={
                      districtData.length
                    }
                    onClick={() =>
                      setPage(
                        "district"
                      )
                    }
                  />

                </section>

              </div>

              <section className="panel">

                <PanelHeader
                  title="Flagged High-Risk Transactions"
                  subtitle="Highest priority records"
                  action={
                    <button
                      className="view-all"
                      onClick={() =>
                        setPage(
                          "anomalies"
                        )
                      }
                    >
                      View all
                    </button>
                  }
                />

                <TransactionTable
                  rows={anomalies.slice(
                    0,
                    8
                  )}
                />

              </section>

            </>
          )}

          {page === "anomalies" && (
            <>

              <PageHeading
                eyebrow="AUDIT / ANOMALY DETECTION"
                title="Flagged High-Risk Transactions"
                description="Review transactions identified as unusual by the anomaly detection engine."
              />

              <div className="filter-bar">

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search MP, vendor or district..."
                />

                <select
                  value={reason}
                  onChange={(e) =>
                    setReason(
                      e.target.value
                    )
                  }
                >

                  <option value="all">
                    All Reasons
                  </option>

                  {reasons.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}

                </select>

                <button
                  className="export-button"
                  onClick={exportCSV}
                >
                  Export CSV
                </button>

              </div>

              <section className="panel">

                <TransactionTable
                  rows={
                    filteredAnomalies
                  }
                />

              </section>

            </>
          )}

          {page === "duplicates" && (
            <>

              <PageHeading
                eyebrow="NLP REVIEW"
                title="Potential Duplicate Records"
                description="Semantic similarity analysis of expenditure works."
              />

              <section className="panel">

                <div className="table-wrap">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          MP NAME
                        </th>

                        <th>
                          MATCH
                        </th>

                        <th>
                          WORK DESCRIPTION
                        </th>

                        <th>
                          MATCHED WORK
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {duplicates.length ===
                      0 ? (

                        <tr>

                          <td
                            colSpan="4"
                            className="empty-cell"
                          >
                            No duplicate
                            records found.
                          </td>

                        </tr>

                      ) : (

                        duplicates.map(
                          (
                            row,
                            index
                          ) => {

                            const score =
                              Number(
                                row[
                                  "Similarity_Score_%"
                                ]
                              ) ||
                              Number(
                                row[
                                  "Similarity Score"
                                ]
                              ) ||
                              Number(
                                row.Score
                              );

                            return (
                              <tr
                                key={
                                  index
                                }
                              >

                                <td>
                                  <strong>
                                    {row.MP_Name ||
                                      row[
                                        "MP Name"
                                      ] ||
                                      "—"}
                                  </strong>
                                </td>

                                <td className="dup-score">

                                  {!Number.isNaN(
                                    score
                                  )
                                    ? `${score.toFixed(
                                        2
                                      )}%`
                                    : "—"}

                                </td>

                                <td>
                                  {row.Work_A ||
                                    row.Work_Description ||
                                    row[
                                      "Work Description"
                                    ] ||
                                    "—"}
                                </td>

                                <td>
                                  {row.Work_B ||
                                    row.Matched_Work ||
                                    row[
                                      "Matched Work"
                                    ] ||
                                    "—"}
                                </td>

                              </tr>
                            );
                          }
                        )

                      )}

                    </tbody>

                  </table>

                </div>

              </section>

            </>
          )}

          {}

          {page === "district" && (
            <>

              <PageHeading
                eyebrow="ANALYSIS / DISTRICT"
                title="District Analysis"
                description="Flagged expenditure distributed across implementing districts."
              />

              <div className="district-table">

                {districtData.length ===
                0 ? (

                  <div className="empty-box">
                    No district data
                    available.
                  </div>

                ) : (

                  districtData.map(
                    (
                      district,
                      index
                    ) => (

                      <div
                        className="district-row"
                        key={
                          district.name
                        }
                      >

                        <span className="district-index">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <strong>
                          {district.name}
                        </strong>

                        <span>
                          {
                            district.count
                          }{" "}
                          flagged records
                        </span>

                        <b>
                          {formatMoney(
                            district.amount
                          )}
                        </b>

                      </div>

                    )
                  )

                )}

              </div>

            </>
          )}

          {}

          {page === "mp" && (
            <>

              <PageHeading
                eyebrow="ANALYSIS / MP"
                title="MP Analysis"
                description="Search and inspect flagged expenditure records by MP."
              />

              <div className="mp-search">

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search MP name..."
                />

              </div>

              {search ? (

                <section className="panel">

                  <TransactionTable
                    rows={anomalies.filter(
                      (row) =>
                        getMPName(
                          row
                        )
                          .toLowerCase()
                          .includes(
                            search.toLowerCase()
                          )
                    )}
                  />

                </section>

              ) : (

                <div className="empty-box">
                  Enter an MP name to
                  inspect expenditure
                  records.
                </div>

              )}

            </>
          )}

        </main>

      </div>

    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}) {
  return (
    <div className="page-heading">

      <span>
        {eyebrow}
      </span>

      <h1>
        {title}
      </h1>

      <p>
        {description}
      </p>

    </div>
  );
}

function Metric({
  label,
  value,
  text,
  red,
  orange,
}) {
  return (
    <div
      className={`metric ${
        red
          ? "metric-red"
          : ""
      } ${
        orange
          ? "metric-orange"
          : ""
      }`}
    >

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {text}
      </small>

    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  action,
}) {
  return (
    <div className="panel-header">

      <div>

        <h2>
          {title}
        </h2>

        {subtitle && (
          <span>
            {subtitle}
          </span>
        )}

      </div>

      {action}

    </div>
  );
}

function Finding({
  label,
  value,
  onClick,
}) {
  return (
    <button
      className="finding"
      onClick={onClick}
    >

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

      <b>
        →
      </b>

    </button>
  );
}

function TransactionTable({
  rows,
}) {
  return (
    <div className="table-wrap">

      <table>

        <thead>

          <tr>

            <th>
              MP NAME
            </th>

            <th>
              VENDOR
            </th>

            <th>
              IDA
            </th>

            <th>
              AMOUNT
            </th>

            <th>
              STATUS
            </th>

            <th>
              REASON
            </th>

          </tr>

        </thead>

        <tbody>

          {rows.length === 0 ? (

            <tr>

              <td
                colSpan="6"
                className="empty-cell"
              >
                No records found.
              </td>

            </tr>

          ) : (

            rows.map(
              (
                row,
                index
              ) => (

                <tr key={index}>

                  <td>
                    <strong>
                      {getMPName(
                        row
                      )}
                    </strong>
                  </td>

                  <td>
                    {getVendor(
                      row
                    )}
                  </td>

                  <td>
                    {getDistrict(
                      row
                    )}
                  </td>

                  <td className="amount">
                    {formatMoney(
                      getAmount(
                        row
                      )
                    )}
                  </td>

                  <td>
                    {getStatus(
                      row
                    )}
                  </td>

                  <td>
                    <span className="reason-badge">
                      {getReason(
                        row
                      )}
                    </span>
                  </td>

                </tr>

              )
            )

          )}

        </tbody>

      </table>

    </div>
  );
}

export default App;
