type NotificationLike = {
  data?: Record<string, unknown> | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
};

const text = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;

type RouterLike = { push: (href: unknown) => unknown };

export function routeNotification(router: RouterLike, item: NotificationLike, role: "customer" | "merchant" | "courier"): boolean {
  const data = item.data ?? {};
  const type = text(item.related_entity_type) ?? text(data.related_entity_type) ?? text(data.entity_type);
  const id = text(item.related_entity_id) ?? text(data.related_entity_id) ?? text(data.entity_id);
  const conversationId = text(data.conversation_id);
  const messageId = text(data.message_id);
  const orderId = text(data.order_id) ?? (type === "orders" || type === "order" ? id : null);
  const assignmentId = text(data.assignment_id) ?? (type === "delivery_assignments" || type === "delivery" ? id : null);
  const storeId = text(data.store_id) ?? (type === "stores" || type === "store" ? id : null);
  const productId = text(data.product_id) ?? (type === "products" || type === "product" ? id : null);

  if (conversationId) {
    router.push({ pathname: "/chat/[id]", params: { id: conversationId, messageId: messageId ?? undefined } } as never);
    return true;
  }
  if (orderId) {
    const pathname = role === "customer" ? "/customer/orders" : "/orders";
    router.push({ pathname, params: { orderId } } as never);
    return true;
  }
  if (assignmentId) {
    router.push({ pathname: "/driver/deliveries", params: { assignmentId } } as never);
    return true;
  }
  if (storeId) {
    router.push({ pathname: "/store-details", params: { id: storeId } } as never);
    return true;
  }
  if (productId) {
    router.push({ pathname: "/product-details", params: { id: productId } } as never);
    return true;
  }
  return false;
}
