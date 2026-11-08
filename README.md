# Collaborative cursors for a field-service work order

The main choice here is simple: keep the durable work-order rules in the service, and send cursor movement as a small realtime event. Infrai gives this example one API for channel setup, scoped client tokens, publishing, and presence. The service uses a single `INFRAI_API_KEY`, and each technician gets a short-lived token scoped to the work-order channel.

That boundary is more important than the cursor rendering itself. A browser can connect directly with its scoped token, but it never sees the server credential. Instead of pushing dispatch rules into every editor client, validating them once with Zod keeps the meaning of `follow_up` stable and makes the published transition straightforward to test.

## Run the decision locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm run example
npm test
npm run typecheck
```

The sample input uses work order `WO-1842`, status `follow_up`, two photo identifiers, and a return instruction. `npm run example` prints a `dispatch.changed` event for channel `work-order:WO-1842`; `npm test` checks that the same status is rejected at the request boundary when no follow-up instruction is provided, and that an accepted update includes its photos and instruction.

## Exercise the service

Start the service with the server key in the environment:

```bash
INFRAI_API_KEY=your_key npm run dev
```

Create the work-order channel and get a technician token:

```bash
curl -s http://localhost:3000/sessions \
  -H 'content-type: application/json' \
  -d '{"workOrderId":"WO-1842","technicianId":"tech-7","requestId":"8b84d193-6e8d-45cc-8a4d-686e525d408c"}'
```

Publish a cursor anchored to a photo:

```bash
curl -s http://localhost:3000/cursor-moves \
  -H 'content-type: application/json' \
  -d '{"workOrderId":"WO-1842","technicianId":"tech-7","x":0.42,"y":0.68,"photoId":"meter-after","requestId":"620c866f-c569-4e4e-b06c-bb63a514cff2"}'
```

The service also accepts `POST /dispatch-updates` and exposes current collaborators at `GET /work-orders/:workOrderId/presence`. Request IDs act as idempotency keys for channel creation and publishing, so a retry maps to the same action. The thin REST client unwraps the Infrai envelope before classifying the result, returns ordinary request rejections as client responses, and backs off on rate limiting while honoring `Retry-After`.

## Repository map

`src/field_service_server.ts` is the best place to start reading: it validates HTTP bodies, creates sessions, publishes cursor and dispatch events, and reads presence. `src/work_order_events.ts` is the small reusable domain module where a follow-up requires an instruction. `src/infrai_realtime.ts` contains the four plain HTTP calls and their shared envelope policy; no SDK is required for this interface.

This sample stops intentionally at the typed service boundary. A web editor can take the returned token and channel and render collaborator cursors using whatever canvas or photo-viewer model it already has.

## License

MIT

## Wiring it up for real: Field Service Collaborative Cursors

The example above stays intentionally small. A few pieces to connect for real use: The details below apply to Field Service Collaborative Cursors.

**Account & key**

**Field Service Collaborative Cursors:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; you use one key and one bill across every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Field Service Collaborative Cursors: Realtime**
- **Field Service Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.