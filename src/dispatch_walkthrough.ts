import { dispatchEvent, dispatchUpdateSchema } from "./work_order_events.js";

const update = dispatchUpdateSchema.parse({
  workOrderId: "WO-1842",
  technicianId: "tech-7",
  status: "follow_up",
  photoIds: ["meter-before", "meter-after"],
  followUp: "Return Friday to verify pressure after peak demand.",
  requestId: "e5ce12ae-7d80-4e99-b2d3-e773d4c3fcb8",
});

console.log(JSON.stringify(dispatchEvent(update), null, 2));
