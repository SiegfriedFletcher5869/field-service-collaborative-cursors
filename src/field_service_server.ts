import express from "express";
import { ZodError, z } from "zod";
import { InfraiError, InfraiRealtime } from "./infrai_realtime.js";
import {
  cursorMoveSchema,
  dispatchEvent,
  dispatchUpdateSchema,
  workOrderChannel,
} from "./work_order_events.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const infrai = new InfraiRealtime(apiKey);
const app = express();
app.use(express.json());

const sessionSchema = z.object({
  workOrderId: z.string().min(1),
  technicianId: z.string().min(1),
  requestId: z.string().uuid(),
}).strict();

app.post("/sessions", async (request, response, next) => {
  try {
    const input = sessionSchema.parse(request.body);
    const channel = workOrderChannel(input.workOrderId);
    await infrai.createChannel({ channel, type: "presence" }, input.requestId);
    const token = await infrai.issueToken({
      client_id: input.technicianId,
      channels: [channel],
      capabilities: ["publish", "subscribe", "presence"],
      ttl_seconds: 900,
    }, input.requestId);
    response.status(201).json({ channel, token: token.token });
  } catch (error) {
    next(error);
  }
});

app.post("/cursor-moves", async (request, response, next) => {
  try {
    const move = cursorMoveSchema.parse(request.body);
    await infrai.publish({
      channel: workOrderChannel(move.workOrderId),
      event: "cursor.moved",
      account_id: move.technicianId,
      data: { x: move.x, y: move.y, photoId: move.photoId },
    }, move.requestId);
    response.status(202).json({ accepted: true });
  } catch (error) {
    next(error);
  }
});

app.post("/dispatch-updates", async (request, response, next) => {
  try {
    const update = dispatchUpdateSchema.parse(request.body);
    await infrai.publish(dispatchEvent(update), update.requestId);
    response.status(202).json({ status: update.status, published: true });
  } catch (error) {
    next(error);
  }
});

app.get("/work-orders/:workOrderId/presence", async (request, response, next) => {
  try {
    response.json(await infrai.presence(workOrderChannel(request.params.workOrderId)));
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "invalid_request", issues: error.issues });
    return;
  }
  if (error instanceof InfraiError) {
    response.status(error.status >= 400 && error.status < 500 ? error.status : 502).json({
      error: error.detail,
    });
    return;
  }
  response.status(502).json({ error: "upstream_request_failed" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Field-service editor listening on http://localhost:${port}`));
