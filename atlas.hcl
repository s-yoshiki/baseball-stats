data "external_schema" "published" {
  working_dir = "scripts/parser"
  program = [
    "node",
    "--import",
    "tsx",
    "src/atlas-schema.ts",
    "--database",
    "published",
  ]
}

data "external_schema" "raw" {
  working_dir = "scripts/parser"
  program = [
    "node",
    "--import",
    "tsx",
    "src/atlas-schema.ts",
    "--database",
    "raw",
  ]
}

env "published" {
  src = data.external_schema.published.url
  dev = "sqlite://file?mode=memory&_fk=1"

  migration {
    dir = "file://atlas/migrations/published"
  }
}

env "raw" {
  src = data.external_schema.raw.url
  dev = "sqlite://file?mode=memory&_fk=1"

  migration {
    dir = "file://atlas/migrations/raw"
  }
}
