# Attachment Lifecycle Contract

## Scope

This contract defines the first usable attachment slice for inventory items. It
supports one JPEG, PNG, or PDF upload at a time, metadata listing, downloading,
and deletion. The maximum original-file size is 20 MiB (20 × 1024 × 1024
bytes).

The first slice deliberately excludes HEIC/HEIF, batch upload, reordering,
primary-photo selection, custom labels, rich viewers, item duplication,
resumable upload, and backup bundles containing blobs. Those capabilities remain
tracked by `bd-k9s.5` and must not be inferred from fields already present in the
model.

## Trust boundary

The application currently has no accounts or per-user ownership model. Version
1 attachment endpoints therefore share the existing single-user application's
deployment boundary; they do not create an authentication boundary of their
own. A deployment must remain behind the same localhost, VPN, reverse-proxy, or
private-network control used to protect the rest of the inventory.

Within that boundary, every operation still validates both the item and the
attachment relationship. Supplying an attachment ID with a different item ID
must return `404`, not expose or mutate the other item's file. Remote multi-user
authorization is out of scope until the application has an identity model.

State-changing HTTP requests require the non-simple
`X-Inventory-Attachment-Request: 1` header and same-origin requests. This blocks
ordinary cross-origin form submission, but it is CSRF hardening rather than
authentication. The server does not opt attachment routes into cross-origin
resource sharing.

## Stored record

Attachment metadata remains in the `attachments` MongoDB collection and file
bytes remain in the `attachments` GridFS bucket. Each metadata record owns one
original blob and, for images, one server-generated JPEG thumbnail.

The metadata record includes a storage state:

- `uploading`: invisible to normal clients; fixed blob IDs have been reserved
  and the upload is incomplete.
- `ready`: visible and downloadable; the original blob and any thumbnail exist.
- `deleting`: invisible to normal clients; blob and metadata cleanup may be
  retried idempotently.

GridFS file metadata includes `attachmentId`, `itemId`, and `role` (`original`
or `thumbnail`). This makes interrupted operations discoverable without trusting
filenames.

Normal publications return only `ready` records. They never publish file bytes.
The public metadata shape contains the attachment ID, item ID, type, canonical
MIME type, byte size, label/original filename, order, primary flag, image
dimensions when available, and timestamps.

## Upload request

`POST /api/items/:itemId/attachments`

Headers:

- `X-Inventory-Attachment-Request: 1`
- `X-Inventory-Filename`: `encodeURIComponent(file.name)`
- `Content-Type`: the browser-declared media type (advisory only)
- `Content-Length`: optional; values above 20 MiB are rejected before reading

The request body is the raw file. Empty bodies are invalid. The server reads at
most 20 MiB plus one byte so chunked requests cannot bypass the limit.

The server determines the canonical type from bytes, never from the filename or
declared `Content-Type`:

- JPEG begins `FF D8 FF`.
- PNG begins `89 50 4E 47 0D 0A 1A 0A`.
- PDF begins `%PDF-` at byte zero.

JPEG and PNG candidates must also decode successfully with Sharp before any
ready record is exposed. A decoded image receives a server-generated JPEG
thumbnail with EXIF orientation applied. PDF originals are stored without a
thumbnail. Unsupported, mismatched, malformed, or polyglot-looking inputs are
rejected with a stable `400` error and no ready metadata.

The original filename is decoded strictly, normalized to Unicode NFC, stripped
of control characters and path separators, trimmed, and capped at 255 Unicode
code points. An empty result becomes `attachment`. The first slice uses that
safe value as both `label` and `originalFilename`.

Successful upload returns `201` and the ready metadata object. Client errors
return JSON with a stable `error` code and human-readable `message`.

## Listing and file responses

`attachments.byItem(itemId)` publishes ready metadata for an existing item,
ordered by `order`, then creation time and ID. An invalid or missing item ID
publishes nothing.

`GET /api/items/:itemId/attachments/:attachmentId/content` downloads the
original only after the item/attachment relationship and `ready` state are
confirmed.

`GET /api/items/:itemId/attachments/:attachmentId/thumbnail` returns the
generated thumbnail and returns `404` for PDFs or missing thumbnails.

Original downloads use:

- the canonical media type;
- `Content-Disposition: attachment` with a quoted ASCII fallback plus RFC 5987
  `filename*=UTF-8''...`;
- `X-Content-Type-Options: nosniff`;
- `Cache-Control: private, no-store`.

Thumbnails use `image/jpeg`, `Content-Disposition: inline`, `nosniff`, and the
same private no-store policy. Stream errors must terminate the response without
exposing server details.

## Delete request

`DELETE /api/items/:itemId/attachments/:attachmentId`

The request requires `X-Inventory-Attachment-Request: 1`. A ready record first
moves to `deleting`, hiding it from clients. The server then deletes the original
and thumbnail blobs and finally removes the metadata record. Missing GridFS
files are treated as already deleted. Repeating deletion of a record already in
`deleting` retries cleanup. A fully absent or mismatched record returns `404`.

Successful deletion returns `204` with no body.

## Failure and recovery invariants

Upload reserves fixed blob IDs in an `uploading` record before writing bytes.
Only after all required blobs exist does one metadata update make the record
`ready`. Any ordinary upload failure runs compensation immediately. A startup
reconciler also removes stale `uploading` records and their reserved blobs, and
finishes stale `deleting` records, so a process interruption is recoverable.

Deletion never removes metadata first. This preserves the blob IDs needed for
retry. GridFS "file not found" during cleanup is success; other storage errors
leave the record in a retryable non-ready state and are logged using IDs only.

The explicit E2E reset path deletes attachment metadata and all files in the
attachments GridFS bucket. Tests must prove that rejected uploads, successful
deletes, and resets leave neither attachment documents nor GridFS files behind.

## Backup and export compatibility

CSV and the current JSON data export continue to omit attachment bytes. Future
backup export must enumerate `ready` attachment metadata, retrieve blobs by
`fileId`/`thumbnailId`, and preserve the association by attachment and item IDs.
Non-ready records must never enter a backup. A future import must allocate new
GridFS IDs and use the same staged lifecycle instead of inserting trusted IDs
from an archive.

## Error mapping

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `invalid-request` | Missing/invalid IDs, filename header, request marker, empty body, malformed encoding, or invalid route shape |
| `400` | `unsupported-file` | Bytes are not a supported JPEG, PNG, or PDF, or an image cannot be decoded |
| `413` | `file-too-large` | Declared or observed body exceeds 20 MiB |
| `404` | `not-found` | Item, attachment relationship, ready content, or thumbnail does not exist |
| `405` | `method-not-allowed` | Route exists but the method is unsupported |
| `409` | `storage-conflict` | A retryable non-ready lifecycle state prevents the requested transition |
| `500` | `storage-error` | Storage work failed; response omits internal details and state remains recoverable |

## Verification fixtures

Tests use tiny deterministic byte fixtures: a valid JPEG, valid PNG, valid PDF,
plain text with a forged image MIME type, a truncated image signature, an empty
body, and a generated 20 MiB plus one byte body. Filenames include ordinary
ASCII, Unicode, path separators, quotes, CR/LF, and an encoded malformed value.

The complete app flow is exercised only against the disposable Meteor database
guarded by `E2E_RESET_DATABASE=1`; tests must never point reset or attachment
mutation fixtures at `NAS_MONGO_URL`.
