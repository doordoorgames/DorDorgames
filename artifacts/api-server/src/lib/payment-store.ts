import { pool } from "@workspace/db";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

interface PaymentRow {
  id: string;
  host_id: string;
  package_id: string;
  amount_fils: number;
  currency: "KWD";
  minutes: number;
  status: PaymentStatus;
  myfatoorah_invoice_id: string | null;
  myfatoorah_payment_id: string | null;
  payment_method: string | null;
  failure_message: string | null;
  created_at: string;
  paid_at: string | null;
  checkout_expires_at: Date | null;
  checkout_url: string | null;
}

export interface PaymentOrder {
  id: string;
  hostId: string;
  packageId: string;
  amountFils: number;
  currency: "KWD";
  minutes: number;
  status: PaymentStatus;
  invoiceId: string | null;
  paymentId: string | null;
  paymentMethod: string | null;
  failureMessage: string | null;
  createdAt: string;
  paidAt: string | null;
  checkoutExpiresAt: Date | null;
  checkoutUrl: string | null;
}

function rowToPayment(row: PaymentRow): PaymentOrder {
  return {
    id: row.id,
    hostId: row.host_id,
    packageId: row.package_id,
    amountFils: row.amount_fils,
    currency: row.currency,
    minutes: row.minutes,
    status: row.status,
    invoiceId: row.myfatoorah_invoice_id,
    paymentId: row.myfatoorah_payment_id,
    paymentMethod: row.payment_method,
    failureMessage: row.failure_message,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    checkoutExpiresAt: row.checkout_expires_at,
    checkoutUrl: row.checkout_url,
  };
}

export const paymentStore = {
  async beginCheckout(input: {
    hostId: string;
    packageId: string;
    amountFils: number;
    minutes: number;
  }): Promise<PaymentOrder> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`checkout:${input.hostId}:${input.packageId}`],
      );
      const existing = await client.query<PaymentRow>(
        `SELECT * FROM public.payments
         WHERE host_id = $1 AND package_id = $2
           AND (
             (status <> 'paid' AND checkout_expires_at > NOW() - INTERVAL '5 minutes')
             OR (status = 'paid' AND paid_at > NOW() - INTERVAL '1 minute')
           )
         ORDER BY (status = 'paid' AND paid_at > NOW() - INTERVAL '1 minute') DESC NULLS LAST,
                  created_at DESC
         LIMIT 1`,
        [input.hostId, input.packageId],
      );
      const order = existing.rows[0] ?? (await client.query<PaymentRow>(
        `INSERT INTO public.payments
           (host_id, package_id, amount_fils, currency, minutes, checkout_expires_at)
         VALUES ($1, $2, $3, 'KWD', $4, NOW() + INTERVAL '30 minutes')
         RETURNING *`,
        [input.hostId, input.packageId, input.amountFils, input.minutes],
      )).rows[0];
      await client.query("COMMIT");
      return rowToPayment(order);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async attachInvoice(id: string, invoiceId: string, paymentUrl: string): Promise<void> {
    const result = await pool.query(
      `UPDATE public.payments
       SET myfatoorah_invoice_id = $2, checkout_url = $3, updated_at = NOW()
       WHERE id = $1 AND (myfatoorah_invoice_id IS NULL OR myfatoorah_invoice_id = $2)`,
      [id, invoiceId, paymentUrl],
    );
    if (result.rowCount !== 1) throw new Error("Unable to persist payment invoice");
  },

  async markGatewayStatus(
    id: string,
    status: Extract<PaymentStatus, "failed" | "cancelled">,
  ): Promise<PaymentOrder> {
    const result = await pool.query<PaymentRow>(
      `UPDATE public.payments
       SET status = $2, updated_at = NOW()
       WHERE id = $1 AND status <> 'paid'
       RETURNING *`,
      [id, status],
    );
    if (result.rows[0]) return rowToPayment(result.rows[0]);
    const current = await pool.query<PaymentRow>(
      "SELECT * FROM public.payments WHERE id = $1",
      [id],
    );
    if (!current.rows[0]) throw new Error("Payment order not found");
    return rowToPayment(current.rows[0]);
  },

  async getByIdForHost(
    id: string,
    hostId: string,
  ): Promise<PaymentOrder | undefined> {
    const result = await pool.query<PaymentRow>(
      "SELECT * FROM public.payments WHERE id = $1 AND host_id = $2",
      [id, hostId],
    );
    return result.rows[0] ? rowToPayment(result.rows[0]) : undefined;
  },

  async getByInvoiceId(invoiceId: string): Promise<PaymentOrder | undefined> {
    const result = await pool.query<PaymentRow>(
      "SELECT * FROM public.payments WHERE myfatoorah_invoice_id = $1",
      [invoiceId],
    );
    return result.rows[0] ? rowToPayment(result.rows[0]) : undefined;
  },

  async fulfill(input: {
    orderId: string;
    paymentId: string;
    paymentMethod: string;
  }): Promise<PaymentOrder> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<PaymentRow>(
        "SELECT * FROM public.payments WHERE id = $1 FOR UPDATE",
        [input.orderId],
      );
      const row = selected.rows[0];
      if (!row) throw new Error("Payment order not found");

      if (row.status !== "paid") {
        const credited = await client.query(
          `UPDATE public.hosts
           SET remaining_minutes = remaining_minutes + $2,
               full_access = TRUE,
               updated_at = NOW()
           WHERE id = $1`,
          [row.host_id, row.minutes],
        );
        if (credited.rowCount !== 1) throw new Error("Payment host not found");
        const updated = await client.query<PaymentRow>(
          `UPDATE public.payments
           SET status = 'paid', myfatoorah_payment_id = $2,
               payment_method = $3, failure_message = NULL,
               paid_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [input.orderId, input.paymentId, input.paymentMethod],
        );
        await client.query("COMMIT");
        return rowToPayment(updated.rows[0]);
      }

      if (row.myfatoorah_payment_id !== input.paymentId) {
        throw new Error("A different transaction already fulfilled this order");
      }
      await client.query("COMMIT");
      return rowToPayment(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
