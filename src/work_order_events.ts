import { z } from "zod";

export const cursorMoveSchema = z.object({
  workOrderId: z.string().min(1),
  technicianId: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  photoId: z.string().min(1),
  requestId: z.string().uuid(),
}).strict();

export const dispatchUpdateSchema = z.object({
  workOrderId: z.string().min(1),
  technicianId: z.string().min(1),
  status: z.enum(["dispatched", "on_site", "follow_up"]),
  photoIds: z.array(z.string().min(1)).max(20),
  followUp: z.string().trim().max(500).optional(),
  requestId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.status === "follow_up" && !value.followUp) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["followUp"],
      message: "followUp is required when status is follow_up",
    });
  }
});

export type CursorMove = z.infer<typeof cursorMoveSchema>;
export type DispatchUpdate = z.infer<typeof dispatchUpdateSchema>;

export const workOrderChannel = (workOrderId: string) => `work-order:${workOrderId}`;

export function dispatchEvent(update: DispatchUpdate) {
  return {
    channel: workOrderChannel(update.workOrderId),
    event: "dispatch.changed",
    account_id: update.technicianId,
    data: {
      status: update.status,
      photoIds: update.photoIds,
      followUp: update.followUp ?? null,
    },
  };
}
