import type { OrderStatus } from '../api';
import { ORDER_STATUS_LABEL } from '../labels';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status order-status--${status}`}>{ORDER_STATUS_LABEL[status]}</span>;
}
