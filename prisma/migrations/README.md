# Prisma migration baseline

`20260925000000_baseline` represents the schema as it existed when migration
history was introduced. New databases can apply it normally with
`npm run db:migrate:deploy`.

An existing database that already matches `prisma/schema.prisma` must mark the
baseline as applied once before using deploy migrations:

```sh
npx prisma migrate resolve --applied 20260925000000_baseline --schema prisma/schema.prisma
```

Take a database backup and run `npx prisma migrate diff` against the target
database before baselining it. Do not mark the baseline applied to a database
whose schema differs from the checked-in Prisma schema.
