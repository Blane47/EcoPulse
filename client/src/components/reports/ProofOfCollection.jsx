import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, ImageOff, MapPin, User, XCircle, ZoomIn } from 'lucide-react';
import api from '../../api/axios';

// Beyond this the proof photo may not show the reported spot
const FAR_METERS = 150;

const formatDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

function PhotoTile({ label, src, alt, viewLabel, onOpen }) {
  if (!src) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 h-32 rounded-lg border border-dashed border-card-border bg-gray-50 text-xs text-gray-400">
        <ImageOff size={18} />
        No photo from the resident
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={viewLabel}
      className="group relative block w-full rounded-lg overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <img src={src} alt={alt} className="w-full h-32 object-cover bg-gray-100 text-[11px] text-gray-400 transition-transform duration-200 group-hover:scale-[1.02]" />
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[11px] font-semibold text-white">{label}</span>
      <span className="absolute bottom-2 right-2 p-1 rounded-md bg-black/60 text-white">
        <ZoomIn size={12} />
      </span>
    </button>
  );
}

// The resident's photo beside the collector's photo of the cleared spot. While the proof awaits
// review the admin approves it (collected) or rejects it with a reason (back to the collector).
export default function ProofOfCollection({ report, formatDate, onOpenPhoto, onReviewed, onError }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const proof = report.proof;
  const review = report.review;
  const awaiting = report.status === 'awaiting_review';
  const wasRejected = review?.decision === 'rejected' && report.status === 'assigned';
  if (!proof?.photo && !wasRejected) return null;

  const collectorName = report.assignedCollector?.name || 'The collector';
  const distance = proof?.distanceMeters;
  const reasonOk = reason.trim().length >= 3;

  const submitReview = async (decision) => {
    setSaving(true);
    onError('');
    try {
      const body = decision === 'reject' ? { decision, note: reason.trim() } : { decision };
      const { data } = await api.patch(`/reports/${report._id}/review`, body);
      setRejecting(false);
      setReason('');
      onReviewed(data);
    } catch (err) {
      onError(err.response?.data?.message || 'Could not save the review.');
    }
    setSaving(false);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-gray-400 font-medium">PROOF OF COLLECTION</p>
        {review?.decision === 'approved' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
            <CheckCircle size={11} />
            Approved
          </span>
        )}
        {wasRejected && proof?.photo && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
            <XCircle size={11} />
            Rejected
          </span>
        )}
      </div>

      {wasRejected && (
        <p className="mb-2 px-3 py-2 rounded-lg bg-red-50 text-xs text-red-700 break-words">
          <span className="font-semibold">Previous proof rejected:</span> {review.note || 'No reason given'}
        </p>
      )}

      {proof?.photo && (
        <>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
            <PhotoTile
              label="Before"
              src={report.photo}
              alt={`Reported spot at ${report.location}, before collection`}
              viewLabel="View the resident's photo full size"
              onOpen={() => onOpenPhoto(report.photo, `Resident's photo of ${report.location}, before collection`)}
            />
            <PhotoTile
              label="After"
              src={proof.photo}
              alt={`Spot at ${report.location} after collection, photographed by ${collectorName}`}
              viewLabel="View the collector's proof photo full size"
              onOpen={() => onOpenPhoto(proof.photo, `Proof photo of ${report.location} after collection, by ${collectorName}`)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User size={12} />
              {collectorName}
            </span>
            {proof.submittedAt && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(proof.submittedAt)}
              </span>
            )}
          </div>

          {/* Where the proof was taken compared with the reported spot */}
          {distance == null ? (
            <p className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <MapPin size={12} className="shrink-0" />
              The report has no location to compare
            </p>
          ) : distance > FAR_METERS ? (
            <p className="flex items-start gap-1.5 mt-2 px-3 py-2 rounded-lg bg-amber-50 text-xs text-amber-700">
              <AlertTriangle size={14} className="shrink-0 mt-px" />
              <span>
                Taken <span className="font-semibold">{formatDistance(distance)}</span> from the reported spot — check the photo carefully
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <MapPin size={12} className="shrink-0" />
              Taken {formatDistance(distance)} from the reported spot
            </p>
          )}
        </>
      )}

      {/* Review */}
      {awaiting && (
        rejecting ? (
          <div className="mt-3">
            <label htmlFor="proof-reject-reason" className="block text-xs font-medium text-gray-700 mb-1">
              Why is the proof rejected?
            </label>
            <textarea
              id="proof-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              autoFocus
              aria-describedby="proof-reject-hint"
              placeholder="e.g. The photo doesn't show the spot that was reported"
              className="w-full px-3 py-2 border border-card-border rounded-lg text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
            <p id="proof-reject-hint" className="flex justify-between gap-2 text-[11px] text-gray-400 mt-1">
              <span>{collectorName} is told why and must collect again.</span>
              <span className="shrink-0">{reason.length}/500</span>
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setRejecting(false); setReason(''); }}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-card-border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitReview('reject')}
                disabled={!reasonOk || saving}
                className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-card-border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <XCircle size={14} />
              Reject
            </button>
            <button
              type="button"
              onClick={() => submitReview('approve')}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
            >
              <CheckCircle size={14} />
              {saving ? 'Saving…' : 'Approve'}
            </button>
          </div>
        )
      )}
    </div>
  );
}
