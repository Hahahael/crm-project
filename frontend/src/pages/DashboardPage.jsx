import { useEffect, useState } from "react";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils";
import {
  LuFileText,
  LuClock,
  LuPlay,
  LuCheck,
  LuCircleAlert,
  LuCalendar,
  LuUsers,
  LuTrendingUp,
  LuWorkflow,
  LuTriangleAlert,
} from "react-icons/lu";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import LoadingModal from "../components/LoadingModal";
import { workflowStages } from "../../../backend/mocks/workflowstagesMocks";

export default function DashboardPage() {
  // workorders state intentionally omitted — server provides aggregated dashboard endpoints
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workorderStatusSummary, setWorkorderStatusSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [workflowStagesSummary, setWorkflowStagesSummary] = useState({
    total: 0,
    pending: [],
    inProgress: [],
    completed: [],
  });
  const [summary, setSummary] = useState(null);
  const [duePerf, setDuePerf] = useState(null);
  const [stageDist, setStageDist] = useState([]);
  const [assignees, setAssignees] = useState({ totalActive: 0, top: [] });

  useEffect(() => {
    async function fetchData() {
      try {

        const workorderSummaryRes = await apiBackendFetch(
          "/api/workorders/summary/status",
        );
        if (workorderSummaryRes.ok) {
          const workorderSummaryData = await workorderSummaryRes.json();
          console.log("Fetched status summary:", workorderSummaryData);
          setWorkorderStatusSummary({
            total: Number(workorderSummaryData.total ?? 0) || 0,
            pending: Number(workorderSummaryData.pending ?? workorderSummaryData.inPendingFix ?? 0) || 0,
            inProgress: Number(
              workorderSummaryData.inProgress ?? workorderSummaryData.in_progress ?? 0,
            ) || 0,
            completed: Number(workorderSummaryData.completed ?? 0) || 0,
          });
        }

        const workflowStagesSummaryRes = await apiBackendFetch(
          "/api/dashboard/summary/latest",
        );
        if (workflowStagesSummaryRes.ok) {
          const workflowStagesSummaryData = await workflowStagesSummaryRes.json();
          console.log(
            "Fetched workflow stages status summary:",
            workflowStagesSummaryData,
          );
          setWorkflowStagesSummary({
            total: Number(workflowStagesSummaryData.total ?? 0) || 0,
            pending: Array.isArray(workflowStagesSummaryData.pending)
              ? workflowStagesSummaryData.pending
              : [],
            inProgress: Array.isArray(workflowStagesSummaryData.inProgress)
              ? workflowStagesSummaryData.inProgress
              : [],
            completed: Array.isArray(workflowStagesSummaryData.completed)
              ? workflowStagesSummaryData.completed
              : [],
          });
        }

        // Fetch server-side aggregates
        const [summaryRes, dueRes, stageRes] = await Promise.all([
          apiBackendFetch("/api/dashboard/summary"),
          apiBackendFetch("/api/dashboard/due-performance"),
          apiBackendFetch("/api/dashboard/stage-distribution"),
        ]);

        if (!summaryRes.ok)
          throw new Error("Failed to fetch dashboard summary");
        if (!dueRes.ok) throw new Error("Failed to fetch due performance");
        if (!stageRes.ok) throw new Error("Failed to fetch stage distribution");

        const [summaryData, dueData, stageData, assigneesData] =
          await Promise.all([
            summaryRes.json(),
            dueRes.json(),
            stageRes.json(),
            apiBackendFetch("/api/dashboard/assignees"),
          ]);
        let assigneesJson = { totalActive: 0, top: [] };
        if (assigneesData.ok) {
          assigneesJson = await assigneesData.json();
        }

        console.log("Fetched dashboard data:", dueData);
        setSummary(summaryData);
        setDuePerf(dueData);
        setStageDist(Array.isArray(stageData) ? stageData : []);
        setAssignees(assigneesJson || { totalActive: 0, top: [] });
      } catch (err) {
        console.error("Dashboard fetch error", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Use server-side summary when available
  const total = summary ? summary.total : 0;
  const pending = summary ? summary.pending : 0;
  const inProgress = summary ? summary.inProgress : 0;
  const completed = summary ? summary.completed : 0;
  const overdue = summary ? summary.overdue : 0;
  const dueSoon = summary ? summary.dueSoon : 0;
  const onTimeRate = summary ? summary.onTimeRate : 0;

  // activeAssignees will be derived from assignees.totalActive

  const duePerformanceData = duePerf
    ? [
        { name: "Early", value: duePerf.early || 0, color: "#10b981" },
        { name: "On Time", value: duePerf.onTime || 0, color: "#3b82f6" },
        { name: "Due Soon", value: summary.dueSoon || duePerf.dueSoon ||  0, color: "#f59e0b" },
        { name: "Overdue", value: summary.overdue || duePerf.overdue || 0, color: "#ef4444" },
        {
          name: "Not Completed",
          value: duePerf.notCompleted || 0,
          color: "#94a3b8",
        },
      ]
    : [];

  const pieData = stageDist.map((s) => ({
    name: s.stage || s.name,
    value: s.count,
  }));

  // Progress helpers
  const woTotal = Number(workorderStatusSummary.total || 0);
  const woPct = (n) => (woTotal > 0 ? (Number(n || 0) / woTotal) * 100 : 0);

  const wfTotal = Number(workflowStagesSummary.total || 0);
  const wfPct = (n) => (wfTotal > 0 ? (Number(n || 0) / wfTotal) * 100 : 0);

  if (loading)
    return (
      <LoadingModal
        message="Loading Dashboard"
        subtext="Please wait while we fetch your data."
      />
    );
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Total Workorders
            </h3>
            <div className="p-2 rounded-full bg-blue-500 text-white">
              <LuFileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{workorderStatusSummary.total}</div>
          <p className="text-xs text-gray-500 mt-1">All workorders in system</p>
          <div className="text-xs text-gray-600 mt-2">+0 this week</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Pending</h3>
            <div className="p-2 rounded-full bg-yellow-500 text-white">
              <LuClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{workorderStatusSummary.pending}</div>
          <p className="text-xs text-gray-500 mt-1">Waiting to be started</p>
          {/* Progress: pending vs total */}
          <div className="mt-3">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div
                className="h-2 bg-yellow-500 rounded"
                style={{ width: `${woPct(workorderStatusSummary.pending)}%` }}
                aria-label="Pending progress"
              />
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {utils.formatNumber(woPct(workorderStatusSummary.pending), 1)}% of total
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">In Progress</h3>
            <div className="p-2 rounded-full bg-blue-500 text-white">
              <LuPlay className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{workorderStatusSummary.inProgress}</div>
          <p className="text-xs text-gray-500 mt-1">Currently active</p>
          {/* Progress: in progress vs total */}
          <div className="mt-3">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-500 rounded"
                style={{ width: `${woPct(workorderStatusSummary.inProgress)}%` }}
                aria-label="In progress progress"
              />
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {utils.formatNumber(woPct(workorderStatusSummary.inProgress), 1)}% of total
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Completed</h3>
            <div className="p-2 rounded-full bg-green-500 text-white">
              <LuCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{workorderStatusSummary.completed}</div>
          <p className="text-xs text-gray-500 mt-1">Successfully finished</p>
          {/* Progress: completed vs total */}
          <div className="mt-3">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div
                className="h-2 bg-green-500 rounded"
                style={{ width: `${woPct(workorderStatusSummary.completed)}%` }}
                aria-label="Completed progress"
              />
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {utils.formatNumber(woPct(workorderStatusSummary.completed), 1)}% of total
            </div>
            <div className="text-xs text-green-600 mt-2">
              {utils.formatNumber(workorderStatusSummary.onTimeRate, 1)}% on-time
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Overdue</h3>
            <div className="p-2 rounded-full bg-red-500 text-white">
              <LuCircleAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{overdue}</div>
          <p className="text-xs text-gray-500 mt-1">Past due date</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Due Soon</h3>
            <div className="p-2 rounded-full bg-orange-500 text-white">
              <LuCalendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{dueSoon}</div>
          <p className="text-xs text-gray-500 mt-1">Due within 3 days</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Active Assignees
            </h3>
            <div className="p-2 rounded-full bg-purple-500 text-white">
              <LuUsers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{assignees.totalActive}</div>
          <p className="text-xs text-gray-500 mt-1">Team members assigned</p>
          <div className="mt-2 text-xs">
            {assignees.top && assignees.top.length > 0 ? (
              <ul className="list-none p-0 m-0 space-y-1">
                {assignees.top.slice(0, 3).map((a, idx) => (
                  <li key={idx}>
                    {a.assignee} — {a.count}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-gray-500">No active assignees</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">On-Time Rate</h3>
            <div className="p-2 rounded-full bg-yellow-500 text-white">
              <LuTrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">
            {utils.formatNumber(onTimeRate, 1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">Completion performance</p>
        </div>
      </div>

      {/* Stage distribution */}
      <div className="grid grid-col-1 xl:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6 mb-6">
          <h3 className="font-semibold mb-4">Sub Stage Distribution</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {stageDist.map((s) => (
              <div
                key={s.stage || s.name}
                className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-0.5 font-semibold text-xs"
              >
                {s.stage || s.name}: {s.count} ({utils.formatNumber(s.woPct, 1)}%)
              </div>
            ))}
          </div>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"][
                          index % 5
                        ]
                      }
                    />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 shadow p-6 mb-6 space-y-6">
          <h3 className="font-semibold mb-4 flex"><LuWorkflow className="h-6 w-6 mr-2"/>Detailed Status Breakdown</h3>
          <div className="bg-yellow-100 p-3 rounded-lg space-y-3">
            <div className="flex justify-between">
              <div className="flex">
                <div className="rounded-full bg-yellow-500 my-auto p-2 mr-2">
                  <LuClock className="h-5 w-5 text-white"/>
                </div>
                <div className="flex flex-col">
                  <div className="font-bold text-yellow-600">Pending</div>
                  <p className="text-gray-400 text-xs">Total: {workflowStagesSummary.pending?.length || 0} workorders ({wfPct(workflowStagesSummary.pending?.length)}%)</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <div className="border border-gray-300 rounded-sm px-2 py-1 my-auto h-6"><p className="text-xs font-semibold">{wfPct(workflowStagesSummary.pending?.length)}% On Time</p></div>
                <div className="flex bg-red-500 rounded-sm px-2 py-1 my-auto h-6 shadow-sm"><LuTriangleAlert className="h-3 w-3 mr-1 my-auto"/><p className="text-xs font-semibold text-white">{wfPct(workflowStagesSummary.pending?.length)} Overdue</p></div>
              </div>
            </div>
            <div>
              <div className="h-2 w-full bg-gray-400 rounded">
                <div
                  className="h-2 bg-amber-500 rounded"
                  style={{ width: `${woPct(workflowStagesSummary.pending.length)}%` }}
                  aria-label="In progress progress"
                />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Sub-Status Breakdown:</p>
              <div></div>
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg space-y-3">
            <div className="flex justify-between">
              <div className="flex">
                <div className="rounded-full bg-blue-500 my-auto p-2 mr-2">
                  <LuPlay className="h-5 w-5 text-white"/>
                </div>
                <div className="flex flex-col">
                  <div className="font-bold text-blue-600">In Progress</div>
                  <p className="text-gray-400 text-xs">Total: {workflowStagesSummary.inProgress?.length || 0} workorders ({wfPct(workflowStagesSummary.inProgress?.length)}%)</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <div className="border border-gray-300 rounded-sm px-2 py-1 my-auto h-6"><p className="text-xs font-semibold">{wfPct(workflowStagesSummary.inProgress?.length)}% On Time</p></div>
                <div className="flex bg-red-500 rounded-sm px-2 py-1 my-auto h-6 shadow-sm"><LuTriangleAlert className="h-3 w-3 mr-1 my-auto"/><p className="text-xs font-semibold text-white">{wfPct(workflowStagesSummary.inProgress?.length)} Overdue</p></div>
              </div>
            </div>
            <div>
              <div className="h-2 w-full bg-gray-400 rounded">
                <div
                  className="h-2 bg-blue-500 rounded"
                  style={{ width: `${woPct(workflowStagesSummary.inProgress.length)}%` }}
                  aria-label="In progress progress"
                />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Sub-Status Breakdown:</p>
              <div></div>
            </div>
          </div>
          <div className="bg-green-100 p-3 rounded-lg space-y-3">
            <div className="flex justify-between">
              <div className="flex">
                <div className="rounded-full bg-green-500 my-auto p-2 mr-2">
                  <LuClock className="h-5 w-5 text-white"/>
                </div>
                <div className="flex flex-col">
                  <div className="font-bold text-green-600">Completed</div>
                  <p className="text-gray-400 text-sm">Total: {workflowStagesSummary.completed?.length || 0} workorders ({wfPct(workflowStagesSummary.completed?.length)}%)</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <div className="border border-gray-300 rounded-sm px-2 py-1 my-auto h-6"><p className="text-xs font-semibold">{wfPct(workflowStagesSummary.completed?.length)}% On Time</p></div>
                <div className="flex bg-red-500 rounded-sm px-2 py-1 my-auto h-6 shadow-sm"><LuTriangleAlert className="h-3 w-3 mr-1 my-auto"/><p className="text-xs font-semibold text-white">{wfPct(workflowStagesSummary.completed?.length)} Overdue</p></div>
              </div>
            </div>
            <div>
              <div className="h-2 w-full bg-gray-400 rounded">
                <div
                  className="h-2 bg-green-500 rounded"
                  style={{ width: `${woPct(workflowStagesSummary.completed.length)}%` }}
                  aria-label="In progress progress"
                />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Sub-Status Breakdown:</p>
              <div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Due date performance */}
      <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold mb-4">Due Date Performance Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {utils.formatNumber(onTimeRate, 1)}%
            </div>
            <div className="text-xs text-green-600">On-Time Rate</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {duePerf ? duePerf.early || 0 : 0}
            </div>
            <div className="text-xs text-blue-600">Early Completions</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">
              {utils.formatNumber(overdue, 0)}
            </div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">{dueSoon}</div>
            <div className="text-xs text-orange-600">Due Soon</div>
          </div>
        </div>

        <div style={{ width: "100%", height: 260 }} className="mt-6">
          <ResponsiveContainer>
            <BarChart data={duePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="value">
                {duePerformanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TODO: charts and detailed tables */}
    </div>
  );
}
