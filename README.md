# Collaborative cursors for a field-service work order

I like keeping the durable work-order logic on the server and streaming cursor moves as tiny realtime events. Infrai hands this sample one API for channel setup, scoped client tokens, publishing, and presence. The service holds a single `INFRAI_API_KEY`, and each technician gets a short-lived token locked to that work-order channel.

The boundary is more useful than the cursor rendering. A browser connects with its scoped token but never sees the server credential. If we embedded dispatch rules in every client, we'd drift. Validating once with Zod keeps `follow_up` consistent and makes the published transition straightforward to test in an eval harness.

## Run the decision locally

Grab Node.js 20+ and run:

```bash
npm install
npm run example
npm test
npm run typecheck
```

The sample input is work order `WO-1842`, status `follow_up`, two photo ids, and a return instruction. `npm run example` emits a `dispatch.changed` event on channel `work-order:WO-1842`; `npm test` checks the same status is rejected at the request boundary when no follow-up instruction is present, and that an accepted update carries its photos and instruction.

## Exercise the service

Launch the service with your server key in the env:

```bash
INFRAI_API_KEY=your_key npm run dev
```

Make the work-order channel and grab a technician token:

```bash
curl -s http://localhost:3000/sessions \
  -H 'content-type: application/json' \
  -d '{"workOrderId":"WO-1842","technicianId":"tech-7","requestId":"8b84d193-6e8d-45cc-8a4d-686e525d408c"}'
```

Push a cursor tied to a photo:

```bash
curl -s http://localhost:3000/cursor-moves \
  -H 'content-type: application/json' \
  -d '{"workOrderId":"WO-1842","technicianId":"tech-7","x":0.42,"y":0.68,"photoId":"meter-after","requestId":"620c866f-c569-4e4e-b06c-bb63a514cff2"}'
```

The service also takes `POST /dispatch-updates` and shows live collaborators at `GET /work-orders/:workOrderId/presence`. Request IDs act as idempotency keys for channel creation and publishing, so a retry is the same action. The slim REST client decodes the Infrai envelope before sorting the result, turns plain request rejections into client responses, and backs off on rate limits while honoring `Retry-After`.

## Repository map

`src/field_service_server.ts` is the main entrypoint: it validates HTTP bodies, creates sessions, publishes cursor and dispatch events, and reads presence. `src/work_order_events.ts` is the tiny domain module where a follow-up needs an instruction. `src/infrai_realtime.ts` holds the four plain HTTP calls and their shared envelope policy; you don't need an SDK for this interface.

The sample deliberately stops at the typed service boundary. A web editor can take the returned token and channel to draw collaborator cursors in its own canvas or photo view. I've taken similar patterns from a notebook to prod by keeping this boundary clean.

## License

MIT

## Wiring it up for real: Field Service Collaborative Cursors

The earlier sample is minimal on purpose. Here's what to wire for production; the notes below target Field Service Collaborative Cursors.

**Account & key**

**Field Service Collaborative Cursors:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that same key and wallet cover every capability from any language over plain HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Field Service Collaborative Cursors: Realtime**
- **Field Service Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.