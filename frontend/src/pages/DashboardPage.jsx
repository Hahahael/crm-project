import { useEffect, useState, useRef } from "react";
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
  LuFilter,
  LuX,
  LuRotateCcw,
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

export default function DashboardPage() {
  // workorders state intentionally omitted — server provides aggregated dashboard endpoints
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState(''); // Pending, In Progress, Completed
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState(''); // Today, This Week, This Month, This Quarter, This Year
  const [availableAssignees, setAvailableAssignees] = useState([]);
  
  // Legacy filter states (keeping for compatibility)
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Refs for date range pickers
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
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
  const [workflowStagesRaw, setWorkflowStagesRaw] = useState([]);

  // Helper function to calculate date ranges
  const getDateRangeValues = (rangeType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (rangeType) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        };
      }
      
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        };
      }
      
      case 'thisQuarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
        const endOfQuarter = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        return {
          start: startOfQuarter.toISOString().split('T')[0],
          end: endOfQuarter.toISOString().split('T')[0]
        };
      }
      
      case 'thisYear': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        return {
          start: startOfYear.toISOString().split('T')[0],
          end: endOfYear.toISOString().split('T')[0]
        };
      }
      
      default:
        return { start: '', end: '' };
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Set filter loading if this is not the initial load
        if (!loading) {
          setFilterLoading(true);
        }
        // Build query parameters for filters
        const queryParams = new URLSearchParams();
        
        // Add status filter
        if (statusFilter && statusFilter.trim() !== '') {
          queryParams.append('status', statusFilter);
        }
        
        // Add assignee filter
        if (assigneeFilter && assigneeFilter.trim() !== '') {
          queryParams.append('assignee', assigneeFilter);
        }
        
        // Add date range filter
        if (dateRangeFilter && dateRangeFilter.trim() !== '') {
          const dateRange = getDateRangeValues(dateRangeFilter);
          if (dateRange.start) queryParams.append('startDate', dateRange.start);
          if (dateRange.end) queryParams.append('endDate', dateRange.end);
        }
        
        const queryString = queryParams.toString();

        // Build separate query parameters for detailed sections (exclude work order statuses)
        const detailedQueryParams = new URLSearchParams();
        
        // Only add status filter if it's NOT a work order status (Pending/Completed)
        if (statusFilter && statusFilter.trim() !== '' && 
            statusFilter !== 'Pending' && statusFilter !== 'Completed') {
          detailedQueryParams.append('status', statusFilter);
        }
        
        // Add assignee filter (same as main)
        if (assigneeFilter && assigneeFilter.trim() !== '') {
          detailedQueryParams.append('assignee', assigneeFilter);
        }
        
        // Add date range filter (same as main)
        if (dateRangeFilter && dateRangeFilter.trim() !== '') {
          const dateRange = getDateRangeValues(dateRangeFilter);
          if (dateRange.start) detailedQueryParams.append('startDate', dateRange.start);
          if (dateRange.end) detailedQueryParams.append('endDate', dateRange.end);
        }
        
        const detailedQueryString = detailedQueryParams.toString();

        const workorderSummaryRes = await apiBackendFetch(
          `/api/workorders/summary/status${queryString ? `?${queryString}` : ''}`,
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
        } else if (workorderSummaryRes.status !== 401 && workorderSummaryRes.status !== 403) {
          // Log error but don't fail the whole dashboard for non-auth errors
          console.error("Failed to fetch workorder summary:", workorderSummaryRes.status, workorderSummaryRes.statusText);
        }

        const workflowStagesSummaryRes = await apiBackendFetch(
          `/api/dashboard/summary/latest${detailedQueryString ? `?${detailedQueryString}` : ''}`,
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
          apiBackendFetch(`/api/dashboard/summary${queryString ? `?${queryString}` : ''}`),
          apiBackendFetch(`/api/dashboard/due-performance${queryString ? `?${queryString}` : ''}`),
          apiBackendFetch(`/api/workflow-stages/summary/latest${detailedQueryString ? `?${detailedQueryString}` : ''}`),
        ]);

        if (!summaryRes.ok)
          throw new Error("Failed to fetch dashboard summary");
        if (!dueRes.ok) throw new Error("Failed to fetch due performance");
        if (!stageRes.ok) throw new Error("Failed to fetch stage distribution");

        const [summaryData, dueData, workflowStagesData, assigneesData] =
          await Promise.all([
            summaryRes.json(),
            dueRes.json(),
            stageRes.json(),
            apiBackendFetch("/api/dashboard/assignees"),
          ]);
        console.log("Fetched dashboard data:", summaryData, dueData, workflowStagesData, assigneesData);
        let assigneesJson = { totalActive: 0, top: [] };
        if (assigneesData.ok) {
          assigneesJson = await assigneesData.json();
        }

        // Store raw workflow stages data
        setWorkflowStagesRaw(Array.isArray(workflowStagesData) ? workflowStagesData : []);

        // Process workflow stages to create stage distribution
        const stageDistribution = [];
        if (Array.isArray(workflowStagesData)) {
          // Group by stage_name and count
          const stageGroups = workflowStagesData.reduce((acc, stage) => {
            const stageName = stage.stageName || stage.stage_name || 'Unknown';
            if (!acc[stageName]) {
              acc[stageName] = 0;
            }
            acc[stageName]++;
            return acc;
          }, {});

          // Convert to array format expected by the chart
          const total = Object.values(stageGroups).reduce((sum, count) => sum + count, 0);
          Object.entries(stageGroups).forEach(([stageName, count]) => {
            stageDistribution.push({
              stage: stageName,
              name: stageName,
              count: count,
              woPct: total > 0 ? (count / total) * 100 : 0
            });
          });
          
          // Sort by count descending
          stageDistribution.sort((a, b) => b.count - a.count);
        }

        console.log("Fetched dashboard data:", dueData);
        console.log("Processed stage distribution:", stageDistribution);
        setSummary(summaryData);
        setDuePerf(dueData);
        setStageDist(stageDistribution);
        setAssignees(assigneesJson || { totalActive: 0, top: [] });
      } catch (err) {
        console.error("Dashboard fetch error", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    }
    fetchData();
  }, [statusFilter, assigneeFilter, dateRangeFilter, dateRange.start, dateRange.end, loading]);

  // Fetch available assignees for the dropdown
  useEffect(() => {
    async function fetchAssignees() {
      try {
        const response = await apiBackendFetch('/api/users');
        if (response.ok) {
          const users = await response.json();
          setAvailableAssignees(users.filter(user => user.username)); // Only users with usernames
        }
      } catch (error) {
        console.error('Error fetching assignees:', error);
      }
    }
    fetchAssignees();
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

  // Process workflow stages for detailed status breakdown
  const processDetailedStatusBreakdown = () => {
    if (!Array.isArray(workflowStagesRaw) || workflowStagesRaw.length === 0) {
      return {};
    }

    // Group by status first, then by stageName
    const statusGroups = workflowStagesRaw.reduce((acc, stage) => {
      const status = stage.status || 'Unknown';
      const stageName = stage.stageName || stage.stage_name || 'Unknown';
      
      if (!acc[status]) {
        acc[status] = {};
      }
      if (!acc[status][stageName]) {
        acc[status][stageName] = [];
      }
      acc[status][stageName].push(stage);
      return acc;
    }, {});

    // Process each status group
    const processedBreakdown = {};
    Object.entries(statusGroups).forEach(([status, stageGroups]) => {
      const totalForStatus = Object.values(stageGroups).reduce((sum, stages) => sum + stages.length, 0);
      
      processedBreakdown[status] = {
        total: totalForStatus,
        percentage: workflowStagesRaw.length > 0 ? (totalForStatus / workflowStagesRaw.length) * 100 : 0,
        modules: Object.entries(stageGroups).map(([stageName, stages]) => ({
          name: stageName,
          count: stages.length,
          percentage: totalForStatus > 0 ? (stages.length / totalForStatus) * 100 : 0,
          stages
        })).sort((a, b) => b.count - a.count) // Sort modules by count descending
      };
    });

    return processedBreakdown;
  };

  const detailedStatusBreakdown = processDetailedStatusBreakdown();

  // Process active assignees from workflow stages data
  const processActiveAssignees = () => {
    if (!Array.isArray(workflowStagesRaw) || workflowStagesRaw.length === 0) {
      return { totalActive: 0, top: [] };
    }

    // Group workflow stages by assignee (only those with assigned_to)
    const assigneeGroups = workflowStagesRaw.reduce((acc, stage) => {
      const assigneeId = stage.assignedTo || stage.assigned_to;
      const assigneeName = stage.assignedToUsername || stage.assigned_to_username;
      
      // Only count stages that have an assignee and are not completed/approved
      if (assigneeId && !['completed', 'approved'].includes((stage.status || '').toLowerCase())) {
        const key = `${assigneeId}-${assigneeName || 'Unknown'}`;
        if (!acc[key]) {
          acc[key] = {
            id: assigneeId,
            name: assigneeName || `User ${assigneeId}`,
            count: 0,
            stages: []
          };
        }
        acc[key].count++;
        acc[key].stages.push(stage);
      }
      
      return acc;
    }, {});

    // Convert to array and sort by count
    const activeAssignees = Object.values(assigneeGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limit to top 10

    return {
      totalActive: activeAssignees.length,
      top: activeAssignees.map(assignee => ({
        assignee: assignee.name,
        count: assignee.count
      }))
    };
  };

  const processedAssignees = processActiveAssignees();

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
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Comprehensive analysis of workorder stages, status distribution, and due date performance</p>
      </div>

      {/* Filters Section */}
      <div className="p-4 mb-6 border border-gray-200 rounded-lg bg-white shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <LuFilter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
            {/* Loading Indicator */}
            {filterLoading && (
              <div className="inline-flex items-center">
                <div className="w-3 h-3 border border-blue-200 rounded-full animate-spin border-t-blue-600 mr-1"></div>
                <span className="text-xs text-gray-500">Updating...</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <optgroup label="Work Order Status">
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </optgroup>
              <optgroup label="Detailed Status">
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </optgroup>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Assignees</option>
              {availableAssignees.map((user) => (
                <option key={user.id} value={user.username}>
                  {user.username}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>
          
          <button
            onClick={() => {
              setStatusFilter('');
              setAssigneeFilter('');
              setDateRangeFilter('');
              setDateRange({ start: '', end: '' });
            }}
            disabled={filterLoading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 bg-white shadow-sm hover:bg-gray-50 h-9 px-4 py-2 disabled:opacity-50 disabled:pointer-events-none w-full md:w-auto"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Dashboard Content with Loading Overlay */}
      <div className="relative">
        {/* Loading Overlay with Smooth Animation */}
        <div className={`absolute inset-0 z-10 flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out ${
          filterLoading 
            ? 'opacity-100 visible bg-white/80 backdrop-blur-sm' 
            : 'opacity-0 invisible bg-white/0'
        }`}>
          <div className={`flex flex-col items-center gap-3 transition-all duration-300 ease-in-out ${
            filterLoading ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}>
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-200"></div>
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-transparent border-t-blue-600 absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-700 font-medium">Applying filters</p>
              <div className="flex items-center justify-center mt-1">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 transition-all duration-300 ease-in-out ${
          filterLoading ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'
        }`}>
        <div className={`rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6 transition-all duration-300 ${
          filterLoading ? 'animate-pulse bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Total Workorders
            </h3>
            <div className="p-2 rounded-full bg-blue-500 text-white">
              <LuFileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 transition-all duration-500 ease-out transform">
            <span className={`inline-block transition-all duration-300 ${filterLoading ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
              {workorderStatusSummary.total}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">All workorders in system</p>
          <div className="text-xs text-gray-600 mt-2">+0 this week</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Draft</h3>
            <div className="p-2 rounded-full bg-yellow-500 text-white">
              <LuClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2">{workorderStatusSummary.draft || 0}</div>
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
          <div className="text-2xl font-bold mt-2 transition-all duration-500 ease-out">
            <span className={`inline-block transition-all duration-300 ${filterLoading ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
              {workorderStatusSummary.inProgress}
            </span>
          </div>
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
          <div className="text-2xl font-bold mt-2 transition-all duration-500 ease-out">
            <span className={`inline-block transition-all duration-300 ${filterLoading ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
              {workorderStatusSummary.completed}
            </span>
          </div>
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
          <div className="text-2xl font-bold mt-2">{processedAssignees.totalActive}</div>
          <p className="text-xs text-gray-500 mt-1">Team members with active tasks</p>
          <div className="mt-2 text-xs">
            {processedAssignees.top && processedAssignees.top.length > 0 ? (
              <ul className="list-none p-0 m-0 space-y-1">
                {processedAssignees.top.slice(0, 3).map((a, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    <span className="text-gray-700">{a.assignee}</span>
                    <span className="font-medium text-purple-600">{a.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-gray-500">No active assignees</div>
            )}
          </div>
          {processedAssignees.top.length > 3 && (
            <div className="mt-2 text-xs text-gray-500">
              +{processedAssignees.totalActive - 3} more assignees
            </div>
          )}
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
      <div className={`grid grid-col-1 xl:grid-cols-2 gap-4 mb-6 transition-all duration-300 ease-in-out ${
        filterLoading ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'
      }`}>
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6 mb-6 xl:mb-0 flex flex-col">
          <h3 className="font-semibold mb-4">Sub-Stage Distribution</h3>
          {/* Pie Chart with Custom Tooltip */}
          <div className="w-full h-[450px] md:h-[600px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  innerRadius="45%"
                  paddingAngle={1.5}
                  label={false}
                >
                  {pieData.map((entry, index) => {
                    const colors = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#f97316", "#06b6d4"];
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    );
                  })}
                </Pie>
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const total = pieData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                      
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <div className="text-sm font-medium text-gray-600 mb-1">
                            {data.payload.name}
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            Count: {data.value} ({percentage}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Two-column stage indicators with color dots */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {stageDist.map((s, index) => {
              const colors = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#f97316", "#06b6d4"];
              const color = colors[index % colors.length];
              
              return (
                <div
                  key={s.stage || s.name}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 bg-gray-100"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {s.stage || s.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.count} WOs ({utils.formatNumber(s.woPct, 1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 shadow p-6 mb-6 xl:mb-0 space-y-6 flex flex-col">
          <h3 className="font-semibold mb-4 flex"><LuWorkflow className="h-6 w-6 mr-2"/>Detailed Status Breakdown</h3>
          
          {Object.entries(detailedStatusBreakdown).map(([status, data]) => {
            // Define status styling
            const getStatusStyling = (status) => {
              switch (status.toLowerCase()) {
                case 'draft':
                  return {
                    bgColor: 'bg-yellow-100',
                    textColor: 'text-yellow-700',
                    iconBg: 'bg-yellow-500',
                    icon: LuClock,
                    progressColor: 'bg-yellow-500'
                  };
                case 'in progress':
                  return {
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-700',
                    iconBg: 'bg-blue-500',
                    icon: LuPlay,
                    progressColor: 'bg-blue-500'
                  };
                case 'pending':
                  return {
                    bgColor: 'bg-yellow-100',
                    textColor: 'text-yellow-700',
                    iconBg: 'bg-yellow-500',
                    icon: LuClock,
                    progressColor: 'bg-yellow-500'
                  };
                case 'submitted':
                  return {
                    bgColor: 'bg-purple-100',
                    textColor: 'text-purple-700',
                    iconBg: 'bg-purple-500',
                    icon: LuCheck,
                    progressColor: 'bg-purple-500'
                  };
                case 'approved':
                  return {
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-700',
                    iconBg: 'bg-green-500',
                    icon: LuCheck,
                    progressColor: 'bg-green-500'
                  };
                case 'rejected':
                  return {
                    bgColor: 'bg-red-100',
                    textColor: 'text-red-700',
                    iconBg: 'bg-red-500',
                    icon: LuCircleAlert,
                    progressColor: 'bg-red-500'
                  };
                default:
                  return {
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-700',
                    iconBg: 'bg-gray-500',
                    icon: LuFileText,
                    progressColor: 'bg-gray-500'
                  };
              }
            };

            const styling = getStatusStyling(status);
            const IconComponent = styling.icon;

            return (
              <div key={status} className={`${styling.bgColor} p-4 rounded-lg space-y-4`}>
                {/* Status Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full ${styling.iconBg} p-2`}>
                      <IconComponent className="h-5 w-5 text-white"/>
                    </div>
                    <div className="flex flex-col">
                      <div className={`font-bold ${styling.textColor} text-lg`}>
                        {status}
                      </div>
                      <p className="text-gray-500 text-sm">
                        Total: {data.total} workorders ({utils.formatNumber(data.percentage, 1)}%)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div
                    className={`h-2 ${styling.progressColor} rounded-full transition-all duration-300`}
                    style={{ width: `${data.percentage}%` }}
                    aria-label={`${status} progress`}
                  />
                </div>

                {/* Module Breakdown */}
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-3">Module Breakdown:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {data.modules.map((module) => (
                      <div
                        key={module.name}
                        className="flex justify-between items-center bg-white/60 rounded-lg px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-800">
                            {module.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {utils.formatNumber(module.percentage, 1)}% of {status.toLowerCase()}
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${styling.textColor} bg-white`}>
                          {module.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Due date performance */}
      <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold mb-4">Due Date Performance Analysis</h3>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-300 ease-in-out ${
          filterLoading ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'
        }`}>
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
      </div> {/* End of relative wrapper for loading overlay */}
    </div>
  );
}
