import { strictEqual } from 'assert'
import getStream from 'get-stream'
import { isReadable, isWritable } from 'isstream'
import { describe, it } from 'mocha'
import nock from 'nock'
import rdf from 'rdf-ext'
import construct from '../construct.js'
import * as ns from './support/namespaces.js'

describe('construct', () => {
  it('should be a function', () => {
    strictEqual(typeof construct, 'function')
  })

  it('should return a readable stream', async () => {
    const endpoint = new URL('http://example.org/send-request')
    const query = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'

    nock(endpoint.origin)
      .get(`${endpoint.pathname}?query=${encodeURIComponent(query)}`)
      .reply(200, '{}')

    const result = await construct({ endpoint, query })

    strictEqual(isReadable(result), true)
    strictEqual(isWritable(result), false)
  })

  it('should send a GET request', async () => {
    let called = false
    const endpoint = new URL('http://example.org/send-request')
    const query = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'

    nock(endpoint.origin)
      .get(`${endpoint.pathname}?query=${encodeURIComponent(query)}`)
      .reply(200, () => {
        called = true

        return '{}'
      })

    await getStream.array(await construct({ endpoint, query }))

    strictEqual(called, true)
  })

  it('should send a POST request', async () => {
    let called = false
    const endpoint = new URL('http://example.org/send-request')
    const query = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'

    nock(endpoint.origin)
      .post(endpoint.pathname, query)
      .reply(200, () => {
        called = true

        return '{}'
      })

    await getStream.array(await construct({ endpoint, query, operation: 'postDirect' }))

    strictEqual(called, true)
  })

  it('should parse the response', async () => {
    const quad0 = rdf.quad(ns.ex(''), ns.ex.p, rdf.literal('0'))
    const quad1 = rdf.quad(ns.ex(''), ns.ex.p, rdf.literal('0'))
    const endpoint = new URL('http://example.org/parse-response')
    const query = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'
    const content = [quad0.toString(), quad1.toString()].join('\n')

    nock(endpoint.origin)
      .get(`${endpoint.pathname}?query=${encodeURIComponent(query)}`)
      .reply(200, content)

    const result = await getStream.array(await construct({ endpoint, query }))

    strictEqual(result.length, 2)
    strictEqual(quad0.equals(result[0]), true)
    strictEqual(quad0.equals(result[1]), true)
  })

  it('should support authentication headers', async () => {
    let credentials = null
    const endpoint = new URL('http://example.org/authentication')
    const user = 'testuser'
    const password = 'testpassword'
    const query = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'

    nock(endpoint.origin)
      .get(`${endpoint.pathname}?query=${encodeURIComponent(query)}`)
      .reply(200, function () {
        credentials = this.req.headers.authorization

        return '{}'
      })

    await getStream.array(await construct({ endpoint, user, password, query }))

    strictEqual(credentials[0], 'Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk')
  })
})
