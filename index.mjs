#!/usr/bin/env nodejs

import fs from "node:fs/promises"
import { createHmac } from "node:crypto"
import Fastify from "fastify"

let urls = await (async function () {
  try {
    const fileBuffer = await fs.readFile("urls")

    return new Set([
      ...fileBuffer
        .toString()
        .split(/\r?\n/)
        .filter((x) => x !== ""),
    ])
  } catch {
    return new Set([])
  }
})()

const fastify = Fastify({ logger: true })

fastify.get("/", {}, (request, reply) => {
  return reply.code(200).header("Content-Type", "text/html; charset=utf-8")
    .send(`
    <!doctype html>
    <body>
    <form method="post" action="/" enctype="text/plain">
    <input name="url">
    <input type="submit">
  `)
})

fastify.post("/", {}, async (request, reply) => {
  const url = request.body.split("=")[1]

  const hash = createHmac("sha256", "secret")
    .update(url)
    .digest("hex")
    .slice(0, 8)

  const entry = `${hash}:${url}`
  const link = `http://localhost:3000/${hash}`

  try {
    await fs.appendFile("urls", entry)
    urls.add(entry)

    return link
  } catch (err) {
    fastify.log.error(err)
  }
})

fastify.get("/:hash", {}, (request, reply) => {
  const matcher = new RegExp(`^${request.params.hash}`)
  const url = Array.from(urls)
    .filter((x) => matcher.test(x))[0]
    .substring(9)

  return reply.code(200).header("Content-Type", "text/html; charset=utf-8")
    .send(`
    <!doctype html>
    <meta http-equiv="refresh" content="0; URL='${url}'" />
  `)
})

await fastify.listen("3000")
