import { mkdir, writeFile } from 'node:fs/promises'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import lighthouse from 'lighthouse'
import { launch as launchChrome } from 'chrome-launcher'
import { chromium } from '@playwright/test'

const host = '127.0.0.1'
const port = Number(process.env.LIGHTHOUSE_PORT ?? await getAvailablePort())
const origin = `http://${host}:${port}`
const targetUrls = process.argv.slice(2).length
  ? process.argv.slice(2).map((path) => new URL(path, origin).toString())
  : [`${origin}/`, `${origin}/nft/emerald-ape-042`]
const runId = new Date().toISOString().replaceAll(':', '-')
const outputDirectory = new URL(`./reports/${runId}/`, import.meta.url)
const scoreNames = ['performance', 'accessibility', 'best-practices', 'seo']
const metricNames = [
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'total-blocking-time',
]

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })

if (build.status !== 0) {
  throw new Error('The production build failed before the Lighthouse audit')
}

const preview = spawn(
  'npm',
  ['run', 'preview', '--', '--host', host, '--port', String(port), '--strictPort'],
  { stdio: 'inherit' },
)
let previewExited = false
preview.once('exit', () => {
  previewExited = true
})

try {
  await waitForPreview(preview)
  await mkdir(outputDirectory, { recursive: true })

  const results = []

  for (const targetUrl of targetUrls) {
    for (const formFactor of ['mobile', 'desktop']) {
      for (let run = 1; run <= 3; run += 1) {
        const chrome = await launchChrome({
          chromePath: chromium.executablePath(),
          chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
        })

        try {
          const report = await lighthouse(targetUrl, {
            logLevel: 'error',
            onlyCategories: scoreNames,
            output: ['html', 'json'],
            port: chrome.port,
            settings: {
              formFactor,
              screenEmulation: {
                mobile: formFactor === 'mobile',
                width: formFactor === 'mobile' ? 412 : 1350,
                height: formFactor === 'mobile' ? 823 : 940,
                deviceScaleFactor: formFactor === 'mobile' ? 1.75 : 1,
              },
            },
          })

          if (!report) {
            throw new Error(`Lighthouse returned no report for ${formFactor}, run ${run}`)
          }

          const stem = `${slugFor(targetUrl)}-${formFactor}-run-${run}`
          const reportDirectory = new URL(`${slugFor(targetUrl)}/`, outputDirectory)
          await mkdir(reportDirectory, { recursive: true })
          const reportContents = Array.isArray(report.report)
            ? report.report
            : [report.report]
          const jsonReport = reportContents.find((content) =>
            content.trimStart().startsWith('{'),
          )
          const htmlReport = reportContents.find((content) =>
            content.trimStart().startsWith('<'),
          )

          if (!jsonReport || !htmlReport) {
            throw new Error(`Lighthouse did not produce both report formats for ${stem}`)
          }

          await writeFile(new URL(`${stem}.json`, reportDirectory), jsonReport)
          await writeFile(new URL(`${stem}.html`, reportDirectory), htmlReport)
          results.push({
            page: new URL(targetUrl).pathname,
            formFactor,
            run,
            scores: Object.fromEntries(
              scoreNames.map((category) => [
                category,
                report.lhr.categories[category]?.score ?? null,
              ]),
            ),
            metrics: Object.fromEntries(
              metricNames.map((metric) => [
                metric,
                report.lhr.audits[metric]?.numericValue ?? null,
              ]),
            ),
          })
          console.log(
            `Completed ${new URL(targetUrl).pathname} ${formFactor} Lighthouse run ${run}/3`,
          )
        } finally {
          await chrome.kill()
        }
      }
    }
  }

  const summary = Object.fromEntries(
    targetUrls.map((targetUrl) => [
      new URL(targetUrl).pathname,
      Object.fromEntries(
        ['mobile', 'desktop'].map((formFactor) => {
          const profileResults = results.filter(
            (result) =>
              result.page === new URL(targetUrl).pathname &&
              result.formFactor === formFactor,
          )

          return [
            formFactor,
            Object.fromEntries(
              [
                ...scoreNames.map((name) => [
                  name,
                  median(
                    profileResults
                      .map((result) => result.scores[name])
                      .filter(
                        (value) =>
                          typeof value === 'number' && Number.isFinite(value),
                      ),
                  ),
                ]),
                ...metricNames.map((name) => [
                  name,
                  median(
                    profileResults
                      .map((result) => result.metrics[name])
                      .filter(
                        (value) =>
                          typeof value === 'number' && Number.isFinite(value),
                      ),
                  ),
                ]),
              ],
            ),
          ]
        }),
      ),
    ]),
  )

  await writeFile(
    new URL('summary.json', outputDirectory),
    JSON.stringify(
      {
        targetUrls,
        lighthouseVersion: await getLighthouseVersion(),
        results,
        medians: summary,
      },
      null,
      2,
    ),
  )
  console.log(`Lighthouse reports and medians written to ${outputDirectory.pathname}`)
} finally {
  preview.kill('SIGTERM')
  if (!previewExited) {
    await Promise.race([once(preview, 'exit'), delay(5_000)])
  }
}

async function getAvailablePort() {
  const server = createServer()
  server.listen(0, host)
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not allocate a port for the Lighthouse preview')
  }
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  return address.port
}

async function waitForPreview(preview) {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    if (preview.exitCode !== null || preview.signalCode !== null) {
      throw new Error(`Vite preview exited with status ${preview.exitCode}`)
    }

    try {
      const response = await fetch(origin)
      if (response.ok) {
        return
      }
    } catch {
      await delay(250)
    }
  }

  throw new Error(`Vite preview did not become available at ${origin}`)
}

function median(values) {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function slugFor(url) {
  const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '') || 'home'
  return path.replace(/[^a-z0-9-]+/gi, '-')
}

async function getLighthouseVersion() {
  const packageJson = await import('lighthouse/package.json', {
    with: { type: 'json' },
  })
  return packageJson.default.version
}
