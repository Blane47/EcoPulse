import { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, User, Clock, Eye, CheckCircle, AlertTriangle, UserCheck, ZoomIn, ListIcon, MapIcon, Camera } from 'lucide-react';
import api from '../api/axios';
import { getCollectors } from '../api/collectors';
import ReportsMap from '../components/reports/ReportsMap';
import PhotoLightbox from '../components/reports/PhotoLightbox';
import ProofOfCollection from '../components/reports/ProofOfCollection';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  reviewed: { label: 'Reviewed', color: 'bg-blue-100 text-blue-700', icon: Eye },
  assigned: { label: 'Assigned', color: 'bg-violet-100 text-violet-700', icon: UserCheck },
  // The collector sent a proof photo; an admin approves or rejects it
  awaiting_review: { label: 'Awaiting review', color: 'bg-orange-100 text-orange-700', icon: Camera },
  collected: { label: 'Collected', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

export default function CommunityReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [collectors, setCollectors] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [view, setView] = useState('list');
  // Photo shown in the full-screen viewer: { src, alt } or null
  const [photoView, setPhotoView] = useState(null);
  const [deepLink, setDeepLink] = useState(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // All reports are fetched once; the status filter is applied on the client so the stats always cover everything
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await api.get('/reports');
        setReports(data);
      } catch {
        setReports([]);
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

  useEffect(() => {
    getCollectors().then(setCollectors).catch(() => setCollectors([]));
  }, []);

  const selectReport = (report) => {
    setSelectedReport(report);
    setAssigneeId(report?.assignedCollector?._id || '');
    setActionError('');
    setPhotoView(null);
  };

  const openPhoto = (src, alt) => setPhotoView({ src, alt });
  const closePhoto = useCallback(() => setPhotoView(null), []);

  // Deep link from global search (?report=<id>): once loaded, open that report. Keyed on the
  // navigation so searching for the same report again reopens it; unknown ids are ignored.
  const linkedId = searchParams.get('report');
  if (!loading && linkedId && deepLink?.key !== location.key) {
    const match = reports.find((r) => r._id === linkedId);
    setDeepLink({ key: location.key, id: match?._id });
    if (match) {
      selectReport(match);
      if (filter !== 'all' && match.status !== filter) setFilter('all');
    }
  }

  // On desktop the list sits beside the panel, so bring the linked card into view
  useEffect(() => {
    if (!deepLink?.id || !window.matchMedia('(min-width: 1024px)').matches) return;
    document.getElementById(`report-${deepLink.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [deepLink]);

  const replaceReport = (updated) => {
    setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setSelectedReport((prev) => (prev?._id === updated._id ? updated : prev));
  };

  // Assign (or with null, unassign) — the server notifies the collector
  const assignReport = async (id, collectorId) => {
    setAssigning(true);
    setActionError('');
    try {
      const { data } = await api.patch(`/reports/${id}/assign`, { collectorId });
      replaceReport(data);
      setAssigneeId(data.assignedCollector?._id || '');
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not update the assignment.');
    }
    setAssigning(false);
  };

  // Reassigning or unassigning a report under review discards the collector's proof (server side)
  const changeAssignment = (report, collectorId) => {
    if (report.status === 'awaiting_review' && !window.confirm("This discards the collector's submitted proof. Continue?")) return;
    assignReport(report._id, collectorId);
  };

  // Collectors in the report's zone first, then the rest; inactive ones can't be picked
  const collectorOptions = (zone) =>
    [...collectors].sort((a, b) => (b.zone === zone) - (a.zone === zone) || a.name.localeCompare(b.name));

  const updateStatus = async (id, status) => {
    setActionError('');
    try {
      const { data } = await api.patch(`/reports/${id}`, { status });
      replaceReport(data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not update the status.');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewed: reports.filter((r) => r.status === 'reviewed').length,
    assigned: reports.filter((r) => r.status === 'assigned').length,
    awaiting_review: reports.filter((r) => r.status === 'awaiting_review').length,
    collected: reports.filter((r) => r.status === 'collected').length,
  };

  const filteredReports = filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Reports</h1>
          <p className="text-sm text-gray-500">View and manage waste reports submitted by community members</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total Reports', value: counts.all, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Reviewed', value: counts.reviewed, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Assigned', value: counts.assigned, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Awaiting review', value: counts.awaiting_review, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Collected', value: counts.collected, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-card-border`}>
            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Pills + List/Map toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'reviewed', 'assigned', 'awaiting_review', 'collected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-600 border border-card-border hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : statusConfig[f].label} ({counts[f]})
            </button>
          ))}
        </div>
        <div role="group" aria-label="Display as" className="inline-flex self-start shrink-0 gap-1 p-1 rounded-lg bg-white border border-card-border">
          {[
            { key: 'list', label: 'List', icon: <ListIcon size={14} /> },
            { key: 'map', label: 'Map', icon: <MapIcon size={14} /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === key ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* Reports List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading reports...</div>
          ) : view === 'map' ? (
            <ReportsMap reports={filteredReports} selectedId={selectedReport?._id} onSelect={selectReport} />
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500">{reports.length === 0 ? 'No reports yet' : `No ${statusConfig[filter].label.toLowerCase()} reports`}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports
                .map((report) => {
                  const sc = statusConfig[report.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const isSelected = selectedReport?._id === report._id;

                  return (
                    <div
                      key={report._id}
                      id={`report-${report._id}`}
                      onClick={() => selectReport(report)}
                      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'border-green-500 shadow-md' : 'border-card-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin size={14} className="text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900">{report.location}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(report.createdAt)}
                            </span>
                            {report.reporterName && (
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {report.reporterName}
                              </span>
                            )}
                            <span className="text-gray-300">{report.zone}</span>
                            {report.assignedCollector && (
                              <span className="flex items-center gap-1 text-violet-500">
                                <UserCheck size={12} />
                                {report.assignedCollector.name}
                              </span>
                            )}
                          </div>
                          {report.note && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{report.note}</p>
                          )}
                        </div>
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                          <StatusIcon size={12} />
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-5 lg:inset-auto lg:z-auto lg:max-h-[calc(100vh-3rem)] lg:w-[380px] lg:shrink-0 lg:rounded-xl lg:border lg:border-card-border lg:h-fit lg:sticky lg:top-6">
            {/* Full-screen sheet below lg, side panel from lg */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Report Details</h3>
              <button
                onClick={() => selectReport(null)}
                aria-label="Close report details"
                className="text-gray-400 hover:text-gray-600 text-2xl lg:text-lg leading-none p-1 -m-1"
              >
                ×
              </button>
            </div>

            {/* Photo (shown beside the collector's photo in the proof section when there is one) */}
            {selectedReport.photo && !selectedReport.proof?.photo && (
              <button
                type="button"
                onClick={() => openPhoto(selectedReport.photo, `Photo of the report at ${selectedReport.location}`)}
                aria-label="View photo full size"
                className="group relative block w-full mb-4 rounded-lg overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                <img
                  src={selectedReport.photo}
                  alt="Report"
                  className="w-full h-48 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-[11px] font-medium text-white">
                  <ZoomIn size={12} />
                  View full size
                </span>
              </button>
            )}

            {/* Location */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium mb-1">LOCATION</p>
              <p className="text-sm text-gray-900 font-semibold">{selectedReport.location}</p>
              {selectedReport.coordinates?.lat ? (
                <p className="text-xs text-green-600 mt-1">
                  📍 {selectedReport.coordinates.lat.toFixed(5)}, {selectedReport.coordinates.lng.toFixed(5)}
                </p>
              ) : null}
            </div>

            {/* Reporter */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium mb-1">REPORTED BY</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-xs font-bold">
                    {selectedReport.reporterName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedReport.reporterName || 'Anonymous'}
                  </p>
                  {selectedReport.reporterPhone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Phone size={10} />
                      {selectedReport.reporterPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Zone & Time */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">ZONE</p>
                <p className="text-sm text-gray-700">{selectedReport.zone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">SUBMITTED</p>
                <p className="text-sm text-gray-700">{formatDate(selectedReport.createdAt)}</p>
              </div>
            </div>

            {/* Note */}
            {selectedReport.note && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-1">NOTES</p>
                <p className="text-sm text-gray-600">{selectedReport.note}</p>
              </div>
            )}

            {/* Assignment */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium mb-2">ASSIGN TO COLLECTOR</p>
              {selectedReport.assignedCollector && (
                <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                  <span className="flex items-center gap-1.5 text-sm text-violet-700 font-medium">
                    <UserCheck size={14} />
                    {selectedReport.assignedCollector.name}
                  </span>
                  {selectedReport.status !== 'collected' && (
                    <button
                      onClick={() => changeAssignment(selectedReport, null)}
                      disabled={assigning}
                      className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Unassign
                    </button>
                  )}
                </div>
              )}
              {selectedReport.status === 'collected' ? (
                <p className="text-xs text-gray-400">This report has been collected.</p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border border-card-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">Select a collector</option>
                    {collectorOptions(selectedReport.zone).map((c) => (
                      <option key={c._id} value={c._id} disabled={c.status === 'inactive'}>
                        {c.name} — {c.zone}
                        {c.zone === selectedReport.zone ? ' ✓' : ''}
                        {c.status === 'on-leave' ? ' (on leave)' : c.status === 'inactive' ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => changeAssignment(selectedReport, assigneeId)}
                    disabled={!assigneeId || assigning || assigneeId === selectedReport.assignedCollector?._id}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40"
                  >
                    {assigning ? 'Saving…' : selectedReport.assignedCollector ? 'Reassign' : 'Assign'}
                  </button>
                </div>
              )}
              {selectedReport.status !== 'collected' && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  ✓ = works in {selectedReport.zone}. The collector is notified in the EcoPulse Collector app.
                </p>
              )}
            </div>

            <ProofOfCollection
              key={selectedReport._id}
              report={selectedReport}
              formatDate={formatDate}
              onOpenPhoto={openPhoto}
              onReviewed={replaceReport}
              onError={setActionError}
            />

            {actionError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{actionError}</div>
            )}

            {/* Status Actions — a report under review is settled by approving or rejecting its proof */}
            {selectedReport.status !== 'awaiting_review' && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">UPDATE STATUS</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selectedReport._id, 'reviewed')}
                    disabled={selectedReport.status !== 'pending'}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedReport.status === 'reviewed'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-blue-50 text-blue-600 enabled:hover:bg-blue-100 disabled:opacity-40'
                    }`}
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => updateStatus(selectedReport._id, 'collected')}
                    disabled={selectedReport.status === 'collected'}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedReport.status === 'collected'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    Mark Collected
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo viewer — above the full-screen detail sheet */}
      {photoView && selectedReport && (
        <PhotoLightbox src={photoView.src} alt={photoView.alt} onClose={closePhoto} />
      )}
    </div>
  );
}
