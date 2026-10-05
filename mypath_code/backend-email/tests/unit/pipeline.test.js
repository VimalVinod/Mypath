// tests/unit/pipeline.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { runPipeline } = require('../../src/scripts/pipeline');
const { main: runCli, parseCliArgs, cliOptionsSchema } = require('../../src/scripts/scrape');
const DedupStore = require('../../src/services/storage/dedup-store');

describe('Pipeline & CLI Runner Unit Tests', () => {
  let tempDir;
  let storePath;
  let previewPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypath-pipe-unit-'));
    storePath = path.join(tempDir, 'dedup-unit.json');
    previewPath = path.join(tempDir, 'preview-unit.html');
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  const sampleExams = [
    {
      id: 'SSC_MTS_2026',
      examName: 'Multi Tasking Staff Examination 2026',
      organization: 'SSC',
      importantDates: { applicationEndDate: '2026-11-15' },
      officialNotificationUrl: 'https://ssc.gov.in/mts.pdf',
      scrapedAt: new Date().toISOString()
    },
    {
      id: 'UPSC_CDS_2026',
      examName: 'Combined Defence Services 2026',
      organization: 'UPSC',
      importantDates: { applicationEndDate: '2026-12-01' },
      officialNotificationUrl: 'https://upsc.gov.in/cds.pdf',
      scrapedAt: new Date().toISOString()
    }
  ];

  it('test_pipeline_with_mock_data_filters_and_previews_correctly', async () => {
    const summary = await runPipeline({
      mock: true,
      mockData: sampleExams,
      storePath,
      dryRun: true,
      previewPath,
      email: 'applicant@example.com'
    });

    assert.equal(summary.scrapedCount, 2);
    assert.equal(summary.newCount, 2);
    assert.equal(summary.notifiedCount, 2);
    assert.equal(summary.skippedCount, 0);
    assert.ok(summary.emailResult?.success);
    assert.equal(summary.emailResult?.dryRun, true);
    assert.ok(fs.existsSync(previewPath));
  });

  it('test_pipeline_empty_exams_yields_zero_counts_without_error', async () => {
    const summary = await runPipeline({
      mock: true,
      mockData: [],
      storePath,
      dryRun: true
    });

    assert.equal(summary.scrapedCount, 0);
    assert.equal(summary.newCount, 0);
    assert.equal(summary.notifiedCount, 0);
    assert.equal(summary.skippedCount, 0);
    assert.equal(summary.emailResult, null);
  });

  it('test_pipeline_dedup_filtering_records_only_unnotified_items', async () => {
    const dedupStore = new DedupStore(storePath);
    dedupStore.markAsNotified([sampleExams[0]]);

    const summary = await runPipeline({
      mock: true,
      mockData: sampleExams,
      storePath,
      dryRun: true
    });

    assert.equal(summary.scrapedCount, 2);
    assert.equal(summary.newCount, 1);
    assert.equal(summary.skippedCount, 1);
    assert.equal(summary.newExams[0].id, sampleExams[1].id);
  });

  it('test_pipeline_force_flag_bypasses_dedup_store', async () => {
    const dedupStore = new DedupStore(storePath);
    dedupStore.markAsNotified(sampleExams);

    const summary = await runPipeline({
      mock: true,
      mockData: sampleExams,
      storePath,
      force: true,
      dryRun: true
    });

    assert.equal(summary.newCount, 2);
    assert.equal(summary.skippedCount, 0);
  });

  it('test_pipeline_file_output_option_writes_json_to_destination', async () => {
    const outputPath = path.join(tempDir, 'output-records.json');

    await runPipeline({
      mock: true,
      mockData: sampleExams,
      storePath,
      output: outputPath,
      dryRun: true
    });

    assert.ok(fs.existsSync(outputPath));
    const saved = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    assert.equal(saved.length, 2);
    assert.equal(saved[0].id, 'SSC_MTS_2026');
  });

  it('test_cli_parse_args_handles_all_flags_and_defaults', () => {
    const defaultArgs = parseCliArgs([]);
    assert.equal(defaultArgs.values.source, 'all');
    assert.equal(defaultArgs.values.notify, false);
    assert.equal(defaultArgs.values['dry-run'], false);
    assert.equal(defaultArgs.values.force, false);
    assert.equal(defaultArgs.values.help, false);

    const customArgs = parseCliArgs([
      '-s', 'ssc',
      '-n',
      '-e', 'override@domain.com',
      '--dry-run',
      '-f',
      '-o', 'data/out.json'
    ]);
    assert.equal(customArgs.values.source, 'ssc');
    assert.equal(customArgs.values.notify, true);
    assert.equal(customArgs.values.email, 'override@domain.com');
    assert.equal(customArgs.values['dry-run'], true);
    assert.equal(customArgs.values.force, true);
    assert.equal(customArgs.values.output, 'data/out.json');
  });

  it('test_cli_main_help_flag_returns_help_exit_code', async () => {
    const res = await runCli(['--help']);
    assert.equal(res.exitCode, 0);
    assert.equal(res.help, true);
  });

  it('test_cli_main_dry_run_executes_successfully_without_api_key', async () => {
    const res = await runCli(['--dry-run', '--mock']);
    assert.ok(res.scrapedCount > 0);
    assert.ok(res.newCount > 0);
    assert.equal(res.emailResult?.dryRun, true);
  });
});
