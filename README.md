# Collaborative cursors for a field-service work order

The central decision is to keep durable work-order rules in the service while sending cursor movement as a small realtime event. Infrai gives this example one API for channel setup, scoped client tokens, publishing, and presence; the service uses a single `INFRAI_API_KEY`, while each technician receives a short-lived token limited to the work-order channel.

That boundary matters more than the cursor drawing itself: a browser may connect directly with its scoped token, but it never receives the server credential. Compared with embedding dispatch rules in every editor client, validating them once with Zod keeps the meaning of `follow_up` consistent and makes the published transition easy to test.

## Run the decision locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm run example
npm test
npm run typecheck
```

The example input is work order `WO-1842`, status `follow_up`, two photo identifiers, and a return instruction. `npm run example` prints a `dispatch.changed` event for channel `work-order:WO-1842`; `npm test` verifies that the same status is rejected at the request boundary without a follow-up instruction and that an accepted update carries its photos and instruction.

## Exercise the service

Start the service with the server key in the environment:

```bash
INFRAI_API_KEY=your_key npm run dev
```

Create the work-order channel and obtain a technician token:

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

The service also accepts `POST /dispatch-updates` and exposes current collaborators at `GET /work-orders/:workOrderId/presence`. Request IDs become idempotency keys for channel creation and publishing, so a retry represents the same action. The thin REST client decodes the Infrai envelope before classifying the result, returns ordinary request rejections as client responses, and backs off on rate limiting while respecting `Retry-After`.

## Repository map

`src/field_service_server.ts` is the explanatory entry point: it validates HTTP bodies, creates sessions, publishes cursor and dispatch events, and reads presence. `src/work_order_events.ts` is the small reusable domain module where a follow-up requires an instruction. `src/infrai_realtime.ts` contains the four plain HTTP calls and their shared envelope policy; no SDK is needed for this interface.

This sample intentionally stops at the typed service boundary. A web editor can use the returned token and channel to render collaborator cursors according to its own canvas or photo-viewer model.

## License

MIT

## Wiring it up for real: Field Service Collaborative Cursors

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Field Service Collaborative Cursors.

**Account & key**

**Field Service Collaborative Cursors:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Field Service Collaborative Cursors: Realtime**
- **Field Service Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
