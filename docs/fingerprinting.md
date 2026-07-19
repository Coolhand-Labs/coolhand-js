# User Fingerprinting *(Experimental)*

CoolhandJS can automatically generate and persist a unique user fingerprint ID via a first-party cookie. This enables cross-session feedback correlation without requiring you to implement user tracking yourself.

## How It Works

1. On `init()`, a UUID v4 fingerprint is generated (or retrieved if already exists)
2. The fingerprint is stored in a secure, first-party cookie (`coolhand_fingerprint`)
3. The `coolhand_fingerprint_id` is automatically included in all API requests
4. The cookie is refreshed on each `init()` call to extend its lifetime (Safari ITP workaround)
5. If cookies are blocked or the site uses HTTP, fingerprinting gracefully degrades (no error, just no fingerprint)

## Cookie Format

The cookie stores JSON with both fingerprint and feedback-viewed state:

```json
{
  "fingerprint": "550e8400-e29b-41d4-a716-446655440000",
  "feedbackViewed": false
}
```

Legacy cookies (plain UUID string) are automatically migrated to the new format.

## Cookie Attributes

| Attribute | Value | Reason |
|-----------|-------|--------|
| Name | `coolhand_fingerprint` | Identifies the cookie |
| Max Age | 365 days | Long-term tracking |
| Path | `/` | Available site-wide |
| SameSite | `None` | Supports third-party iframes |
| Secure | `true` | Required for `SameSite=None`; fingerprinting is disabled on HTTP sites |

## Relationship with `clientUniqueId`

Both identifiers serve different purposes and are sent together:
- `clientUniqueId`: Developer-provided identifier (e.g., your user ID or session ID)
- `coolhand_fingerprint_id`: Automatic browser-level identifier

This allows you to correlate feedback both with your own user system and across anonymous sessions.

## Disabling Fingerprinting

Fingerprinting is enabled by default. To disable it:

```javascript
CoolhandJS.init('your-api-key', { enableFingerprint: false });
```

## Browser Compatibility

- Requires HTTPS (fingerprinting silently disabled on HTTP)
- Works in Chrome, Firefox, Safari, Edge (modern versions)
- Gracefully degrades if cookies are blocked by the browser or extensions
- Safari ITP: Cookie is refreshed on each visit to work around the 7-day limit for client-set cookies

## Privacy Considerations

The fingerprint is a randomly generated UUID with no personal information. It cannot be used to identify individuals, only to correlate feedback from the same browser. Consider disclosing this cookie in your privacy policy if required by your jurisdiction.
