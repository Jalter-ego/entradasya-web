import { STATUS_LABEL, type EventStatus } from '../api';

export function StatusBadge({ status }: { status: EventStatus }) {
  return <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>;
}
