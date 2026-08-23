data "external_schema" "raw" {
  working_dir = "scripts/parser"
  program = [
    "node",
    "--import",
    "tsx",
    "src/atlas-schema.ts",
  ]
}

env "raw" {
  src = data.external_schema.raw.url
  dev = "sqlite://file?mode=memory&_fk=1"

  migration {
    dir = "file://atlas/migrations/raw"
  }
}
