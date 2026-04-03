const fs = require('fs');
const path = require('path');

function createLogReader(options) {
    const logDir = options.logDir;
    const fileRegex = options.fileRegex;
    const initialTailBytes = Number(options.initialTailBytes || 0);
    const maxRecentLines = Number(options.maxRecentLines || 100);

    const state = {
        currentFile: '',
        currentOffset: 0,
        carry: '',
        started: false,
        lastEvent: 'Initialized',
        lastError: '',
        lastReadBytes: 0,
        recentLines: []
    };

    function getErrorMessage(err) {
        if (!err) return '';
        if (typeof err.message === 'string') return err.message;
        return String(err);
    }

    function getNewestLogFile() {
        let files;
        try {
            files = fs.readdirSync(logDir);
        } catch (err) {
            state.lastError = `readdir failed: ${getErrorMessage(err)}`;
            state.lastEvent = 'Log directory read failed';
            return '';
        }

        const candidates = [];
        for (const file of files) {
            if (!fileRegex.test(file)) continue;

            const fullPath = path.join(logDir, file);
            try {
                const stat = fs.statSync(fullPath);
                if (!stat.isFile()) continue;
                candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
            } catch (e) {}
        }

        if (candidates.length === 0) {
            return '';
        }

        candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
        return candidates[0].fullPath;
    }

    function setCurrentFile(filePath, startAtTail) {
        state.currentFile = filePath;
        state.carry = '';

        try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                state.currentOffset = 0;
                return;
            }

            if (startAtTail && initialTailBytes > 0) {
                state.currentOffset = Math.max(0, stat.size - initialTailBytes);
            } else {
                state.currentOffset = 0;
            }

            state.lastEvent = `Following file: ${filePath}`;
            state.lastError = '';
        } catch (err) {
            state.currentOffset = 0;
            state.lastError = `reset failed: ${getErrorMessage(err)}`;
            state.lastEvent = 'Failed to follow file';
        }
    }

    function appendRecent(lines) {
        if (!lines.length) return;

        state.recentLines.push(...lines);
        if (state.recentLines.length > maxRecentLines) {
            state.recentLines.splice(0, state.recentLines.length - maxRecentLines);
        }
    }

    function snapshot(lines) {
        return {
            ok: true,
            currentFile: state.currentFile,
            currentOffset: state.currentOffset,
            lastEvent: state.lastEvent,
            lastError: state.lastError,
            lastReadBytes: state.lastReadBytes,
            lines,
            recentLines: state.recentLines.slice(-Math.min(20, maxRecentLines)),
            at: Date.now()
        };
    }

    function poll() {
        state.lastReadBytes = 0;

        const newest = getNewestLogFile();
        if (!newest) {
            state.lastEvent = 'No matching log files found';
            return snapshot([]);
        }

        if (!state.currentFile || state.currentFile !== newest) {
            setCurrentFile(newest, state.started);
            state.started = true;
        }

        let stat;
        try {
            stat = fs.statSync(state.currentFile);
            if (!stat.isFile()) {
                state.lastEvent = 'Current log target is not a file';
                return snapshot([]);
            }
        } catch (err) {
            state.lastError = `stat failed: ${getErrorMessage(err)}`;
            state.lastEvent = 'Stat failed for current log file';
            return snapshot([]);
        }

        if (state.currentOffset > stat.size) {
            state.currentOffset = 0;
            state.carry = '';
            state.lastEvent = 'File truncated or rotated';
        }

        if (stat.size <= state.currentOffset) {
            state.lastEvent = 'No new log data';
            return snapshot([]);
        }

        const len = stat.size - state.currentOffset;
        const fd = fs.openSync(state.currentFile, 'r');
        let lines = [];

        try {
            const buf = Buffer.allocUnsafe(len);
            const bytesRead = fs.readSync(fd, buf, 0, len, state.currentOffset);
            state.currentOffset += bytesRead;
            state.lastReadBytes = bytesRead;

            if (bytesRead > 0) {
                const merged = state.carry + buf.toString('utf8', 0, bytesRead);
                const split = merged.split(/\r?\n/);
                state.carry = split.pop() || '';
                lines = split.filter((line) => line.length > 0);
                appendRecent(lines);
                state.lastEvent = `Read ${bytesRead} bytes`;
            } else {
                state.lastEvent = 'No bytes read';
            }
        } finally {
            fs.closeSync(fd);
        }

        return snapshot(lines);
    }

    return { poll };
}

module.exports = {
    createLogReader
};
