const { execFileSync } = require('child_process');

// Which processes should be monitored by us as pertaining to Salad
// May reflect apps outside of Salad too :(
const DEFAULT_PROCESS_NAMES = [
    'Salad',
    'Salad.Bowl.Service',
    'Salad.Bootstrapper',
    'wsl',
    'wslhost',
    'vmmemWSL',
    'sgs-client',
    'speedtest-cli'
];

function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function safeNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

function buildPowerShellScript(processNames) {
    const quoted = processNames.map((name) => `'${String(name).replace(/'/g, "''")}'`).join(', ');

    return [
        "$ErrorActionPreference = 'Stop'",
        `$names = @(${quoted})`,
        "$counterPaths = @('\\Process(*)\\IO Read Bytes/sec','\\Process(*)\\IO Write Bytes/sec','\\Process(*)\\IO Other Bytes/sec','\\Process(*)\\ID Process')",
        "$sample = Get-Counter -Counter $counterPaths",
        "$rows = @{}",
        "foreach ($s in $sample.CounterSamples) {",
        "  $instance = [string]$s.InstanceName",
        "  if (-not $instance -or $instance -eq '_Total' -or $instance -eq 'Idle') { continue }",
        "  $baseName = ($instance -replace '#\\d+$','')",
        "  if ($names -notcontains $baseName) { continue }",
        "  if (-not $rows.ContainsKey($instance)) {",
        "    $rows[$instance] = @{ instance = $instance; name = $baseName; pid = 0; readBps = 0; writeBps = 0; otherBps = 0 }",
        "  }",
        "  if ($s.Path -like '*\\IO Read Bytes/sec') { $rows[$instance].readBps = [double]$s.CookedValue; continue }",
        "  if ($s.Path -like '*\\IO Write Bytes/sec') { $rows[$instance].writeBps = [double]$s.CookedValue; continue }",
        "  if ($s.Path -like '*\\IO Other Bytes/sec') { $rows[$instance].otherBps = [double]$s.CookedValue; continue }",
        "  if ($s.Path -like '*\\ID Process') { $rows[$instance].pid = [int]$s.CookedValue; continue }",
        "}",
        "$rows.Values | Sort-Object name, pid | ConvertTo-Json -Compress"
    ].join('; ');
}

function createProcessIoMonitor(options = {}) {
    const processNames = Array.isArray(options.processNames) && options.processNames.length
        ? options.processNames
        : DEFAULT_PROCESS_NAMES;
    const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 10000;
    const minPollIntervalMs = Number.isFinite(Number(options.minPollIntervalMs)) ? Number(options.minPollIntervalMs) : 5000;

    const state = {
        lastAt: 0,
        lastPollAt: 0,
        sessionDownBytes: 0,
        sessionUpBytes: 0,
        lastError: '',
        cachedSnapshot: null
    };

    const powerShellScript = buildPowerShellScript(processNames);

    function pollProcesses() {
        try {
            const stdout = execFileSync(
                'powershell.exe',
                ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powerShellScript],
                {
                    encoding: 'utf8',
                    timeout: timeoutMs,
                    windowsHide: true,
                    maxBuffer: 1024 * 1024
                }
            );

            const trimmed = String(stdout || '').trim();
            state.lastError = '';
            if (!trimmed) {
                return { ok: true, rows: [] };
            }

            return {
                ok: true,
                rows: toArray(JSON.parse(trimmed))
            };
        } catch (err) {
            state.lastError = err && err.message ? err.message : String(err);
            return {
                ok: false,
                rows: []
            };
        }
    }

    function poll() {
        const now = Date.now();

        if (state.cachedSnapshot && (now - state.lastPollAt) < minPollIntervalMs) {
            return {
                ...state.cachedSnapshot,
                cached: true,
                at: now
            };
        }

        state.lastPollAt = now;
        const elapsedSec = state.lastAt > 0 ? Math.max(0.001, (now - state.lastAt) / 1000) : 1;
        const processResult = pollProcesses();

        if (!processResult.ok) {
            if (!state.cachedSnapshot) {
                return {
                    ok: false,
                    source: 'process-io-estimate',
                    processNames,
                    processCount: 0,
                    sessionDownBytes: state.sessionDownBytes,
                    sessionUpBytes: state.sessionUpBytes,
                    downloadRateBps: 0,
                    uploadRateBps: 0,
                    processes: [],
                    lastError: state.lastError,
                    at: now
                };
            }

            return {
                ...state.cachedSnapshot,
                ok: false,
                stale: true,
                lastError: state.lastError,
                at: now
            };
        }

        const processRows = processResult.rows;

        const processes = processRows.map((row) => {
            const readBps = Math.max(0, safeNumber(row.readBps));
            const writeBps = Math.max(0, safeNumber(row.writeBps));
            return {
                pid: safeNumber(row.pid),
                name: String(row.name || row.instance || 'unknown'),
                instance: String(row.instance || ''),
                readTotalBytes: 0,
                writeTotalBytes: 0,
                downloadRateBps: readBps,
                uploadRateBps: writeBps,
                otherRateBps: Math.max(0, safeNumber(row.otherBps))
            };
        });

        const totalDownRate = processes.reduce((sum, p) => sum + p.downloadRateBps, 0);
        const totalUpRate = processes.reduce((sum, p) => sum + p.uploadRateBps, 0);

        state.sessionDownBytes += totalDownRate * elapsedSec;
        state.sessionUpBytes += totalUpRate * elapsedSec;
        state.lastAt = now;

        const snapshot = {
            ok: true,
            source: 'process-io-estimate',
            processNames,
            processCount: processes.length,
            sessionDownBytes: state.sessionDownBytes,
            sessionUpBytes: state.sessionUpBytes,
            downloadRateBps: totalDownRate,
            uploadRateBps: totalUpRate,
            processes,
            lastError: state.lastError,
            at: now
        };

        state.cachedSnapshot = snapshot;
        return snapshot;
    }

    return { poll };
}

module.exports = {
    createProcessIoMonitor
};
