import { z } from "zod";

const phoneRegex = /^\(?[1-9]{2}\)? ?(?:9[1-9]|[2-9])[0-9]{3}-?[0-9]{4}$/;
const cepRegex = /^\d{5}-?\d{3}$/;

export const deliveryInfoSchema = z.object({
  type: z.enum(["delivery", "pickup"]),
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  phone: z.string().regex(phoneRegex, "Telefone inválido (ex: (11) 99999-1234)"),
  // delivery only
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  reference: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === "delivery") {
    if (!data.cep || !cepRegex.test(data.cep)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CEP inválido", path: ["cep"] });
    }
    if (!data.street || data.street.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rua obrigatória", path: ["street"] });
    }
    if (!data.number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número obrigatório", path: ["number"] });
    }
    if (!data.neighborhood || data.neighborhood.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bairro obrigatório", path: ["neighborhood"] });
    }
  }
});

export const paymentSchema = z.object({
  method: z.enum(["pix", "credit", "debit", "cash", "on_delivery_card", "on_delivery_cash"]),
  changeFor: z.number().optional(),
  notes: z.string().max(300).optional(),
});

export const checkoutSchema = deliveryInfoSchema.and(paymentSchema);

export type DeliveryInfo = z.infer<typeof deliveryInfoSchema>;
export type PaymentInfo = z.infer<typeof paymentSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
