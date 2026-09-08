import React, { useEffect, useMemo, useRef, useState } from "react";
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
  "MoSPI";

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
  const [districtSearch, setDistrictSearch] =
    useState("");
  const [selectedDistrict, setSelectedDistrict] =
    useState(null);
  const [selectedMP, setSelectedMP] =
    useState(null);
  const [reason, setReason] = useState("all");

  const [analysisView, setAnalysisView] =
    useState("ministry");

  // Master Analysis — combined filter state
  const [masterQuery, setMasterQuery] = useState("");
  const [masterMinistry, setMasterMinistry] = useState("all");
  const [masterDistrict, setMasterDistrict] = useState("all");
  const [masterMP, setMasterMP] = useState("all");
  const [masterReason, setMasterReason] = useState("all");
  const [masterStatus, setMasterStatus] = useState("all");
  const [masterMinAmount, setMasterMinAmount] = useState("");
  const [masterMaxAmount, setMasterMaxAmount] = useState("");

  useEffect(() => {
    setDistrictSearch("");

    if (page !== "district") {
      setSelectedDistrict(null);
    }

    if (page !== "mp") {
      setSelectedMP(null);
    }

    if (page !== "master") {
      setMasterQuery("");
      setMasterMinistry("all");
      setMasterDistrict("all");
      setMasterMP("all");
      setMasterReason("all");
      setMasterStatus("all");
      setMasterMinAmount("");
      setMasterMaxAmount("");
    }
  }, [page]);

  const resetMasterFilters = () => {
    setMasterQuery("");
    setMasterMinistry("all");
    setMasterDistrict("all");
    setMasterMP("all");
    setMasterReason("all");
    setMasterStatus("all");
    setMasterMinAmount("");
    setMasterMaxAmount("");
  };

  const goToMP = (name) => {
    setSelectedMP(name);
    setPage("mp");
  };

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

  const ministries = useMemo(() => {
    const values = anomalies
      .map((row) => getMinistry(row))
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [anomalies]);

  const statuses = useMemo(() => {
    const values = anomalies
      .map((row) => getStatus(row))
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter((value) => value && value !== "—");

    return [...new Set(values)].sort();
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

  const filteredDistrictData = useMemo(() => {
    if (!districtSearch) return districtData;

    return districtData.filter((district) =>
      district.name
        .toLowerCase()
        .includes(
          districtSearch.toLowerCase()
        )
    );
  }, [districtData, districtSearch]);

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

  const districtRecords = useMemo(() => {
    if (!selectedDistrict) return [];

    return anomalies.filter(
      (row) =>
        getDistrict(row) === selectedDistrict
    );
  }, [anomalies, selectedDistrict]);

  const mpOptions = useMemo(() => {
    const seen = new Map();

    anomalies.forEach((row) => {
      const name = getMPName(row);
      const district = getDistrict(row);

      if (name && name !== "Unknown" && !seen.has(name)) {
        seen.set(name, district);
      }
    });

    return Array.from(seen.entries())
      .map(([name, district]) => ({
        name,
        district,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [anomalies]);

  const mpData = useMemo(() => {
    const grouped = {};

    anomalies.forEach((row) => {
      const name = getMPName(row);
      const district = getDistrict(row);

      if (!grouped[name]) {
        grouped[name] = {
          name,
          district,
          count: 0,
          amount: 0,
        };
      }

      grouped[name].count += 1;
      grouped[name].amount +=
        getAmount(row);
    });

    return Object.values(grouped).sort(
      (a, b) => b.amount - a.amount
    );
  }, [anomalies]);

  const filteredMpData = useMemo(() => {
    if (!search) return mpData;

    return mpData.filter((mp) =>
      mp.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [mpData, search]);

  const mpRecords = useMemo(() => {
    if (!selectedMP) return [];

    return anomalies.filter(
      (row) =>
        getMPName(row) === selectedMP
    );
  }, [anomalies, selectedMP]);

  const masterFilteredRecords = useMemo(() => {
    const min = masterMinAmount !== "" ? Number(masterMinAmount) : null;
    const max = masterMaxAmount !== "" ? Number(masterMaxAmount) : null;
    const q = masterQuery.trim().toLowerCase();

    return anomalies.filter((row) => {
      const amount = getAmount(row);

      const matchesQuery =
        !q || JSON.stringify(row).toLowerCase().includes(q);

      const matchesMinistry =
        masterMinistry === "all" || getMinistry(row) === masterMinistry;

      const matchesDistrict =
        masterDistrict === "all" || getDistrict(row) === masterDistrict;

      const matchesMP =
        masterMP === "all" || getMPName(row) === masterMP;

      const matchesReason =
        masterReason === "all" || getReason(row) === masterReason;

      const matchesStatus =
        masterStatus === "all" || getStatus(row) === masterStatus;

      const matchesMin = min === null || Number.isNaN(min) || amount >= min;
      const matchesMax = max === null || Number.isNaN(max) || amount <= max;

      return (
        matchesQuery &&
        matchesMinistry &&
        matchesDistrict &&
        matchesMP &&
        matchesReason &&
        matchesStatus &&
        matchesMin &&
        matchesMax
      );
    });
  }, [
    anomalies,
    masterQuery,
    masterMinistry,
    masterDistrict,
    masterMP,
    masterReason,
    masterStatus,
    masterMinAmount,
    masterMaxAmount,
  ]);

  const masterFilteredAmount = useMemo(() => {
    return masterFilteredRecords.reduce(
      (total, row) => total + getAmount(row),
      0
    );
  }, [masterFilteredRecords]);

  const masterActiveFilterCount = [
    masterQuery.trim() !== "",
    masterMinistry !== "all",
    masterDistrict !== "all",
    masterMP !== "all",
    masterReason !== "all",
    masterStatus !== "all",
    masterMinAmount !== "",
    masterMaxAmount !== "",
  ].filter(Boolean).length;

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

  const exportCSV = (rowsToExport = anomalies, filename = "sakshi-ai-audit-report.csv") => {
    const headers = [
      "MP Name",
      "Vendor",
      "IDA",
      "Amount",
      "Status",
      "Reason",
    ];

    const rows = rowsToExport.map(
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
    link.download = filename;

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
    ["master", "Master Analysis"],
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
                  setSelectedMP(null);
                  setSelectedDistrict(null);
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
            onClick={() => exportCSV()}
          >
            Export all audit data
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

            {page === "master" &&
              "Master Analysis"}

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
                  onMPClick={goToMP}
                  onRowClick={(row) =>
                    goToMP(getMPName(row))
                  }
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
                  onClick={() =>
                    exportCSV(
                      filteredAnomalies,
                      "sakshi-ai-anomalies-filtered.csv"
                    )
                  }
                >
                  Export CSV
                </button>

              </div>

              <section className="panel">

                <TransactionTable
                  rows={
                    filteredAnomalies
                  }
                  onMPClick={goToMP}
                  onRowClick={(row) =>
                    goToMP(getMPName(row))
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

          {page === "master" && (
            <>

              <PageHeading
                eyebrow="ANALYSIS / MASTER VIEW"
                title="Master Analysis"
                description="Combine every filter — ministry, district, MP, reason, status and amount — to find any record without leaving this tab."
              />

              <div className="master-filter-bar">

                <input
                  type="text"
                  className="master-filter-search"
                  value={masterQuery}
                  onChange={(e) =>
                    setMasterQuery(e.target.value)
                  }
                  placeholder="Search anything — MP, vendor, district, ministry..."
                />

                <SearchableSelect
                  value={
                    masterMinistry === "all"
                      ? ""
                      : masterMinistry
                  }
                  onChange={(value) =>
                    setMasterMinistry(value || "all")
                  }
                  placeholder="Ministry"
                  allLabel="All Ministries"
                  className="master-select"
                  options={ministries.map((m) => ({
                    value: m,
                    label: m,
                  }))}
                />

                <SearchableSelect
                  value={
                    masterDistrict === "all"
                      ? ""
                      : masterDistrict
                  }
                  onChange={(value) =>
                    setMasterDistrict(value || "all")
                  }
                  placeholder="District / IDA"
                  allLabel="All Districts"
                  className="master-select"
                  options={districtData.map((d) => ({
                    value: d.name,
                    label: d.name,
                  }))}
                />

                <SearchableSelect
                  value={masterMP === "all" ? "" : masterMP}
                  onChange={(value) =>
                    setMasterMP(value || "all")
                  }
                  placeholder="MP Name"
                  allLabel="All MPs"
                  className="master-select"
                  options={mpOptions.map((opt) => ({
                    value: opt.name,
                    label: `${opt.name} — ${opt.district}`,
                  }))}
                />

                <select
                  value={masterReason}
                  onChange={(e) =>
                    setMasterReason(e.target.value)
                  }
                >
                  <option value="all">All Reasons</option>

                  {reasons.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={masterStatus}
                  onChange={(e) =>
                    setMasterStatus(e.target.value)
                  }
                >
                  <option value="all">All Statuses</option>

                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  className="master-amount-input"
                  value={masterMinAmount}
                  onChange={(e) =>
                    setMasterMinAmount(e.target.value)
                  }
                  placeholder="Min ₹"
                />

                <input
                  type="number"
                  className="master-amount-input"
                  value={masterMaxAmount}
                  onChange={(e) =>
                    setMasterMaxAmount(e.target.value)
                  }
                  placeholder="Max ₹"
                />

                <button
                  className="export-button"
                  onClick={() =>
                    exportCSV(
                      masterFilteredRecords,
                      "sakshi-ai-master-analysis-filtered.csv"
                    )
                  }
                >
                  Export CSV
                </button>

                <button
                  className="clear-filters-button"
                  onClick={resetMasterFilters}
                  disabled={masterActiveFilterCount === 0}
                >
                  Clear filters
                  {masterActiveFilterCount > 0
                    ? ` (${masterActiveFilterCount})`
                    : ""}
                </button>

              </div>

              <div className="master-summary">

                <span>
                  <strong>
                    {masterFilteredRecords.length}
                  </strong>{" "}
                  of {anomalies.length} records match
                </span>

                <span>
                  <strong>
                    {formatMoney(masterFilteredAmount)}
                  </strong>{" "}
                  in matched expenditure
                </span>

              </div>

              <section className="panel">

                <TransactionTable
                  rows={masterFilteredRecords}
                />

              </section>

            </>
          )}

          {}

          {page === "district" && (
            <>

              {selectedDistrict ? (

                <>

                  <PageHeading
                    eyebrow="ANALYSIS / DISTRICT"
                    title={selectedDistrict}
                    description={`${districtRecords.length} flagged records for this district.`}
                  />

                  <button
                    className="back-link"
                    onClick={() =>
                      setSelectedDistrict(
                        null
                      )
                    }
                  >
                    ← Back to all districts
                  </button>

                  <section className="panel">

                    <TransactionTable
                      rows={
                        districtRecords
                      }
                    />

                  </section>

                </>

              ) : (

                <>

                  <PageHeading
                    eyebrow="ANALYSIS / DISTRICT"
                    title="District Analysis"
                    description="Flagged expenditure distributed across implementing districts."
                  />

                  <div className="mp-search">

                    <SearchableSelect
                      value={districtSearch}
                      onChange={setDistrictSearch}
                      placeholder="Search district name..."
                      allLabel="All Districts"
                      options={districtData.map(
                        (d) => ({
                          value: d.name,
                          label: d.name,
                        })
                      )}
                    />

                  </div>

                  <div className="district-table">

                    {filteredDistrictData.length ===
                    0 ? (

                      <div className="empty-box">
                        No district data
                        available.
                      </div>

                    ) : (

                      filteredDistrictData.map(
                        (
                          district,
                          index
                        ) => (

                          <div
                            className="district-row"
                            key={
                              district.name
                            }
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setSelectedDistrict(
                                district.name
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key ===
                                  "Enter" ||
                                e.key === " "
                              ) {
                                setSelectedDistrict(
                                  district.name
                                );
                              }
                            }}
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

            </>
          )}

          {}

          {page === "mp" && (
            <>

              {selectedMP ? (

                <>

                  <PageHeading
                    eyebrow="ANALYSIS / MP"
                    title={selectedMP}
                    description={`${mpRecords.length} flagged records for this MP.`}
                  />

                  <button
                    className="back-link"
                    onClick={() =>
                      setSelectedMP(
                        null
                      )
                    }
                  >
                    ← Back to all MPs
                  </button>

                  <section className="panel">

                    <TransactionTable
                      rows={
                        mpRecords
                      }
                    />

                  </section>

                </>

              ) : (

                <>

                  <PageHeading
                    eyebrow="ANALYSIS / MP"
                    title="MP Analysis"
                    description="Search and inspect flagged expenditure records by MP."
                  />

                  <div className="mp-search">

                    <SearchableSelect
                      value={search}
                      onChange={setSearch}
                      placeholder="Search MP name..."
                      allLabel="All MPs"
                      options={mpOptions.map(
                        (opt) => ({
                          value: opt.name,
                          label: `${opt.name} — ${opt.district}`,
                        })
                      )}
                    />

                  </div>

                  <div className="district-table">

                    {filteredMpData.length ===
                    0 ? (

                      <div className="empty-box">
                        No MP data
                        available.
                      </div>

                    ) : (

                      filteredMpData.map(
                        (
                          mp,
                          index
                        ) => (

                          <div
                            className="district-row"
                            key={
                              mp.name
                            }
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setSelectedMP(
                                mp.name
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key ===
                                  "Enter" ||
                                e.key === " "
                              ) {
                                setSelectedMP(
                                  mp.name
                                );
                              }
                            }}
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
                              {mp.name}
                            </strong>

                            <span>
                              {
                                mp.count
                              }{" "}
                              flagged records
                            </span>

                            <b>
                              {formatMoney(
                                mp.amount
                              )}
                            </b>

                          </div>

                        )
                      )

                    )}

                  </div>

                </>

              )}

            </>
          )}

        </main>

      </div>

    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel,
  className,
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const filtered = useMemo(() => {
    if (!query) return options;

    return options.filter((opt) =>
      opt.label
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [options, query]);

  const handleSelect = (opt) => {
    setQuery(opt.value ? opt.label : "");
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div
      className={`searchable-select ${
        className || ""
      }`}
      ref={wrapRef}
    >
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
      />

      {open && (
        <div className="searchable-select-menu">

          <div
            className="searchable-select-option"
            onMouseDown={() =>
              handleSelect({
                value: "",
                label: allLabel,
              })
            }
          >
            {allLabel}
          </div>

          {filtered.length === 0 ? (
            <div className="searchable-select-empty">
              No matches
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className="searchable-select-option"
                onMouseDown={() =>
                  handleSelect(opt)
                }
              >
                {opt.label}
              </div>
            ))
          )}

        </div>
      )}

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
  onMPClick,
  onRowClick,
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

                <tr
                  key={index}
                  className={
                    onRowClick
                      ? "clickable-row"
                      : undefined
                  }
                  onClick={
                    onRowClick
                      ? () =>
                          onRowClick(row)
                      : undefined
                  }
                >

                  <td>
                    {onMPClick ? (
                      <strong
                        className="mp-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMPClick(
                            getMPName(row)
                          );
                        }}
                      >
                        {getMPName(
                          row
                        )}
                      </strong>
                    ) : (
                      <strong>
                        {getMPName(
                          row
                        )}
                      </strong>
                    )}
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