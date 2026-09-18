import { describe, expect, it } from "vitest";
import { dispatchEvent, dispatchUpdateSchema } from "../src/work_order_events.js";

describe("follow-up dispatch decisions", () => {
  it("requires an instruction and publishes the photos with the state change", () => {
    expect(() => dispatchUpdateSchema.parse({
      workOrderId: "WO-1842",
      technicianId: "tech-7",
      status: "follow_up",
      photoIds: ["meter-after"],
      requestId: "e5ce12ae-7d80-4e99-b2d3-e773d4c3fcb8",
    })).toThrow("followUp is required");

    const accepted = dispatchUpdateSchema.parse({
      workOrderId: "WO-1842",
      technicianId: "tech-7",
      status: "follow_up",
      photoIds: ["meter-after"],
      followUp: "Verify pressure Friday.",
      requestId: "e5ce12ae-7d80-4e99-b2d3-e773d4c3fcb8",
    });

    expect(dispatchEvent(accepted)).toEqual({
      channel: "work-order:WO-1842",
      event: "dispatch.changed",
      account_id: "tech-7",
      data: {
        status: "follow_up",
        photoIds: ["meter-after"],
        followUp: "Verify pressure Friday.",
      },
    });
  });
});
