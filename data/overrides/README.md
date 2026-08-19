# Player overrides

`players/<player-id>.json` contains sparse manual corrections for the generated player API resource. The scraper and calculator apply these patches after creating the formatted data, so manual edits are not lost on the next run.

The patch may contain a `profile` object directly, or a JSON:API-style `data.attributes` object.

```json
{
  "profile": {
    "details": {
      "career": {
        "entries": ["春江工", "福井県立大学"]
      }
    }
  }
}
```
