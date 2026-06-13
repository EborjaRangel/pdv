import { formatMxn, formatOrderNumber, formatUsd } from "@/lib/format";

type TicketProps = {
  type: "cliente" | "cocina";
  settings: {
    restaurantName: string;
    address: string | null;
    phone: string | null;
    rfc: string | null;
  } | null;
  order: {
    dailyNumber: number;
    customerName: string;
    customerPhone: string | null;
    subtotalMxn: string;
    totalMxn: string;
    totalUsd: string;
    createdAt: string;
    items: Array<{
      dishName: string;
      quantity: number;
      priceMxn: string;
    }>;
    payments?: Array<{
      method: string;
      currency: string;
      amount: string;
      cashReceived: string | null;
      changeGiven: string | null;
    }>;
  };
};

function lineTotal(priceMxn: string, quantity: number) {
  return Number(priceMxn) * quantity;
}

function Divider() {
  return <div className="ticket-divider" />;
}

export function TicketView({ order, settings, type }: TicketProps) {
  const date = new Date(order.createdAt);
  const fecha = date.toLocaleDateString("es-MX");
  const hora = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (type === "cocina") {
    return (
      <div className="ticket ticket-cocina">
        <p className="ticket-title">COMANDA COCINA</p>
        <p className="ticket-order-big">{formatOrderNumber(order.dailyNumber)}</p>
        <p className="ticket-meta">
          {fecha} · {hora}
        </p>
        <p className="ticket-meta">PARA LLEVAR</p>
        <Divider />
        <p>
          <strong>Cliente:</strong> {order.customerName}
        </p>
        {order.customerPhone ? (
          <p>
            <strong>Tel:</strong> {order.customerPhone}
          </p>
        ) : null}
        <Divider />
        <table className="ticket-table">
          <thead>
            <tr>
              <th className="col-cant">Cant</th>
              <th className="col-desc">Platillo</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td className="col-cant">{item.quantity}</td>
                <td className="col-desc">{item.dishName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Divider />
        <p className="ticket-order-big ticket-center">
          {formatOrderNumber(order.dailyNumber)}
        </p>
      </div>
    );
  }

  return (
    <div className="ticket ticket-cliente">
      <p className="ticket-order-big">{formatOrderNumber(order.dailyNumber)}</p>
      <p className="ticket-business">{settings?.restaurantName ?? "Restaurante"}</p>
      {settings?.address ? <p className="ticket-center">{settings.address}</p> : null}
      {settings?.phone ? <p className="ticket-center">Tel: {settings.phone}</p> : null}
      {settings?.rfc ? <p className="ticket-center">RFC: {settings.rfc}</p> : null}

      <Divider />
      <p className="ticket-title">NOTA DE VENTA</p>
      <p>
        <strong>Fecha:</strong> {fecha} {hora}
      </p>
      <p>
        <strong>Cliente:</strong> {order.customerName}
      </p>
      {order.customerPhone ? (
        <p>
          <strong>Tel:</strong> {order.customerPhone}
        </p>
      ) : null}
      <p>
        <strong>Tipo:</strong> PARA LLEVAR
      </p>

      <Divider />
      <table className="ticket-table">
        <thead>
          <tr>
            <th className="col-cant">Cant</th>
            <th className="col-desc">Descripción</th>
            <th className="col-importe">Importe</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td className="col-cant">{item.quantity}</td>
              <td className="col-desc">{item.dishName}</td>
              <td className="col-importe">
                {formatMxn(lineTotal(item.priceMxn, item.quantity))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Divider />
      <div className="ticket-totals">
        <div className="ticket-total-row">
          <span>Subtotal</span>
          <span>{formatMxn(Number(order.subtotalMxn))}</span>
        </div>
        <div className="ticket-total-row ticket-total-main">
          <span>TOTAL MXN</span>
          <span>{formatMxn(Number(order.totalMxn))}</span>
        </div>
        <div className="ticket-total-row">
          <span>TOTAL USD</span>
          <span>{formatUsd(Number(order.totalUsd))}</span>
        </div>
      </div>

      {order.payments && order.payments.length > 0 ? (
        <>
          <Divider />
          <p className="ticket-title">DESGLOSE DE PAGO</p>
          {order.payments.map((payment, index) => {
            const methodLabel = payment.method === "CASH" ? "Efectivo" : "Tarjeta";
            const amountFormatted =
              payment.currency === "MXN"
                ? formatMxn(Number(payment.amount))
                : formatUsd(Number(payment.amount));
            const received =
              payment.cashReceived != null ? Number(payment.cashReceived) : null;
            const change =
              payment.changeGiven != null
                ? Number(payment.changeGiven)
                : received != null
                  ? Math.round((received - Number(payment.amount)) * 100) / 100
                  : null;

            return (
              <div key={index} className="ticket-payment-block">
                <div className="ticket-total-row">
                  <span>
                    {methodLabel} {payment.currency}
                  </span>
                  <span>{amountFormatted}</span>
                </div>
                {payment.method === "CASH" && received != null ? (
                  <>
                    <div className="ticket-total-row">
                      <span>Recibido</span>
                      <span>
                        {payment.currency === "MXN"
                          ? formatMxn(received)
                          : formatUsd(received)}
                      </span>
                    </div>
                    {change != null ? (
                      <div className="ticket-total-row ticket-change-row">
                        <span>Cambio</span>
                        <span>
                          {payment.currency === "MXN"
                            ? formatMxn(change)
                            : formatUsd(change)}
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}

      <Divider />
      <p className="ticket-footer">Gracias por su compra</p>
    </div>
  );
}
