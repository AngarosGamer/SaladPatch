using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new LauncherForm());
    }
}

internal sealed class LauncherForm : Form
{
    private const int DefaultPort = 9222;

    private readonly string _baseDir;
    private readonly string _batchPath;
    private readonly string _pluginsDir;
    private readonly string _themesDir;
    private readonly string _availablePluginsDir;
    private readonly string _availableThemesDir;
    private readonly string _settingsPath;
    private readonly string _saladPidPath;

    private readonly CheckedListBox _pluginsList;
    private readonly CheckedListBox _themesList;
    private readonly NumericUpDown _portInput;
    private readonly Button _launchButton;
    private readonly Button _stopButton;
    private readonly Button _refreshButton;
    private readonly Button _saveSettingsButton;
    private readonly TextBox _logBox;
    private readonly Label _statusLabel;

    private Process _launcherProcess;
    private bool _suspendToggleEvents;

    public LauncherForm()
    {
        _baseDir = AppContext.BaseDirectory;
        _batchPath = Path.Combine(_baseDir, "start.bat");
        _pluginsDir = Path.Combine(_baseDir, "plugins");
        _themesDir = Path.Combine(_baseDir, "themes");
        _availablePluginsDir = Path.Combine(_baseDir, "available-plugins");
        _availableThemesDir = Path.Combine(_baseDir, "available-themes");
        _settingsPath = Path.Combine(_baseDir, "launcher-settings.ini");
        _saladPidPath = Path.Combine(_baseDir, "salad.pid");

        Text = "SaladPatch Launcher";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1080, 700);
        Size = new Size(1200, 760);
        BackColor = Color.FromArgb(245, 247, 252);
        Font = new Font("Segoe UI", 10F, FontStyle.Regular, GraphicsUnit.Point);

        var title = new Label
        {
            Text = "SaladPatch Control Center",
            AutoSize = true,
            Font = new Font("Segoe UI Semibold", 22F, FontStyle.Bold, GraphicsUnit.Point),
            ForeColor = Color.FromArgb(24, 34, 54),
            Location = new Point(24, 18)
        };
        Controls.Add(title);

        _statusLabel = new Label
        {
            Text = "Ready",
            AutoSize = true,
            ForeColor = Color.FromArgb(54, 88, 148),
            Location = new Point(28, 62)
        };
        Controls.Add(_statusLabel);

        var settingsCard = CreateCard(new Rectangle(24, 88, 1140, 74));
        Controls.Add(settingsCard);

        var portLabel = new Label
        {
            Text = "Debug Port",
            AutoSize = true,
            Location = new Point(18, 26),
            ForeColor = Color.FromArgb(44, 58, 84)
        };
        settingsCard.Controls.Add(portLabel);

        _portInput = new NumericUpDown
        {
            Minimum = 1024,
            Maximum = 65535,
            Value = DefaultPort,
            Width = 120,
            Location = new Point(104, 22),
            TextAlign = HorizontalAlignment.Right
        };
        settingsCard.Controls.Add(_portInput);

        _saveSettingsButton = CreateActionButton("Save Settings", new Point(250, 18), Color.FromArgb(61, 120, 219));
        _saveSettingsButton.Click += (_, __) => SaveSettingsFromUi();
        settingsCard.Controls.Add(_saveSettingsButton);

        _refreshButton = CreateActionButton("Refresh Lists", new Point(388, 18), Color.FromArgb(90, 102, 124));
        _refreshButton.Click += (_, __) => ReloadLists();
        settingsCard.Controls.Add(_refreshButton);

        _launchButton = CreateActionButton("Launch Salad", new Point(540, 18), Color.FromArgb(45, 173, 105));
        _launchButton.Click += (_, __) => LaunchHidden();
        settingsCard.Controls.Add(_launchButton);

        _stopButton = CreateActionButton("Stop Launch", new Point(676, 18), Color.FromArgb(216, 79, 79));
        _stopButton.Enabled = false;
        _stopButton.Click += (_, __) => StopLaunch();
        settingsCard.Controls.Add(_stopButton);

        var pluginsCard = CreateCard(new Rectangle(24, 176, 560, 254));
        Controls.Add(pluginsCard);

        var pluginsTitle = new Label
        {
            Text = "Plugins",
            AutoSize = true,
            Font = new Font("Segoe UI", 13F, FontStyle.Bold, GraphicsUnit.Point),
            ForeColor = Color.FromArgb(31, 45, 73),
            Location = new Point(16, 12)
        };
        pluginsCard.Controls.Add(pluginsTitle);

        var pluginsHint = new Label
        {
            Text = "Checked = active (in plugins). Unchecked = available only.",
            AutoSize = true,
            ForeColor = Color.FromArgb(97, 109, 131),
            Location = new Point(18, 42)
        };
        pluginsCard.Controls.Add(pluginsHint);

        _pluginsList = new CheckedListBox
        {
            CheckOnClick = true,
            BorderStyle = BorderStyle.FixedSingle,
            Location = new Point(18, 70),
            Size = new Size(520, 162),
            BackColor = Color.White
        };
        _pluginsList.ItemCheck += PluginsListOnItemCheck;
        pluginsCard.Controls.Add(_pluginsList);

        var themesCard = CreateCard(new Rectangle(604, 176, 560, 254));
        Controls.Add(themesCard);

        var themesTitle = new Label
        {
            Text = "Themes",
            AutoSize = true,
            Font = new Font("Segoe UI", 13F, FontStyle.Bold, GraphicsUnit.Point),
            ForeColor = Color.FromArgb(31, 45, 73),
            Location = new Point(16, 12)
        };
        themesCard.Controls.Add(themesTitle);

        var themesHint = new Label
        {
            Text = "Checked = active (in themes). Unchecked = available only.",
            AutoSize = true,
            ForeColor = Color.FromArgb(97, 109, 131),
            Location = new Point(18, 42)
        };
        themesCard.Controls.Add(themesHint);

        _themesList = new CheckedListBox
        {
            CheckOnClick = true,
            BorderStyle = BorderStyle.FixedSingle,
            Location = new Point(18, 70),
            Size = new Size(520, 162),
            BackColor = Color.White
        };
        _themesList.ItemCheck += ThemesListOnItemCheck;
        themesCard.Controls.Add(_themesList);

        var logsCard = CreateCard(new Rectangle(24, 446, 1140, 260));
        Controls.Add(logsCard);

        var logsTitle = new Label
        {
            Text = "Launcher Logs",
            AutoSize = true,
            Font = new Font("Segoe UI", 13F, FontStyle.Bold, GraphicsUnit.Point),
            ForeColor = Color.FromArgb(31, 45, 73),
            Location = new Point(16, 12)
        };
        logsCard.Controls.Add(logsTitle);

        _logBox = new TextBox
        {
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Consolas", 10F, FontStyle.Regular, GraphicsUnit.Point),
            BackColor = Color.FromArgb(20, 28, 44),
            ForeColor = Color.FromArgb(225, 235, 255),
            Location = new Point(18, 42),
            Size = new Size(1100, 196),
            ReadOnly = true
        };
        logsCard.Controls.Add(_logBox);

        EnsureFolders();
        LoadSettings();
        ReloadLists();
        UpdateStatus("Ready");
    }

    private static Panel CreateCard(Rectangle bounds)
    {
        return new Panel
        {
            Bounds = bounds,
            BackColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
    }

    private static Button CreateActionButton(string text, Point location, Color bg)
    {
        return new Button
        {
            Text = text,
            AutoSize = false,
            Size = new Size(126, 36),
            Location = location,
            FlatStyle = FlatStyle.Flat,
            BackColor = bg,
            ForeColor = Color.White,
            FlatAppearance = { BorderSize = 0 }
        };
    }

    private void EnsureFolders()
    {
        Directory.CreateDirectory(_pluginsDir);
        Directory.CreateDirectory(_themesDir);
        Directory.CreateDirectory(_availablePluginsDir);
        Directory.CreateDirectory(_availableThemesDir);
    }

    private void LoadSettings()
    {
        int port = DefaultPort;

        if (File.Exists(_settingsPath))
        {
            foreach (string line in File.ReadAllLines(_settingsPath))
            {
                string trimmed = line.Trim();
                if (trimmed.StartsWith("#", StringComparison.Ordinal) || trimmed.Length == 0)
                {
                    continue;
                }

                int sep = trimmed.IndexOf('=');
                if (sep < 0)
                {
                    continue;
                }

                string key = trimmed.Substring(0, sep).Trim();
                string value = trimmed.Substring(sep + 1).Trim();

                int parsed;
                if (key.Equals("debug_port", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out parsed))
                {
                    if (parsed >= 1024 && parsed <= 65535)
                    {
                        port = parsed;
                    }
                }
            }
        }

        _portInput.Value = port;
    }

    private void SaveSettingsFromUi()
    {
        int port = (int)_portInput.Value;
        File.WriteAllText(_settingsPath, "debug_port=" + port + Environment.NewLine);
        UpdateStatus("Settings saved");
        AppendLog("[OK] Saved settings: debug_port=" + port);
    }

    private void ReloadLists()
    {
        _suspendToggleEvents = true;
        try
        {
            FillList(_pluginsList, _availablePluginsDir, _pluginsDir, "*.js");
            FillList(_themesList, _availableThemesDir, _themesDir, "*.js");
            UpdateStatus("Lists refreshed");
        }
        finally
        {
            _suspendToggleEvents = false;
        }
    }

    private static void FillList(CheckedListBox list, string availableDir, string activeDir, string pattern)
    {
        list.Items.Clear();

        var available = Directory.GetFiles(availableDir, pattern).Select(Path.GetFileName).Where(name => !string.IsNullOrWhiteSpace(name));
        var active = Directory.GetFiles(activeDir, pattern).Select(Path.GetFileName).Where(name => !string.IsNullOrWhiteSpace(name));

        var all = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string item in available)
        {
            all.Add(item);
        }
        foreach (string item in active)
        {
            all.Add(item);
        }

        foreach (string file in all)
        {
            bool isActive = File.Exists(Path.Combine(activeDir, file));
            list.Items.Add(file, isActive);
        }
    }

    private void PluginsListOnItemCheck(object sender, ItemCheckEventArgs e)
    {
        if (_suspendToggleEvents)
        {
            return;
        }

        string file = _pluginsList.Items[e.Index] as string;
        ToggleFile(_availablePluginsDir, _pluginsDir, file, e.NewValue == CheckState.Checked, "plugin");
    }

    private void ThemesListOnItemCheck(object sender, ItemCheckEventArgs e)
    {
        if (_suspendToggleEvents)
        {
            return;
        }

        string file = _themesList.Items[e.Index] as string;
        ToggleFile(_availableThemesDir, _themesDir, file, e.NewValue == CheckState.Checked, "theme");
    }

    private void ToggleFile(string availableDir, string activeDir, string file, bool activate, string kind)
    {
        if (string.IsNullOrWhiteSpace(file))
        {
            return;
        }

        string from = activate ? Path.Combine(availableDir, file) : Path.Combine(activeDir, file);
        string to = activate ? Path.Combine(activeDir, file) : Path.Combine(availableDir, file);

        try
        {
            if (!File.Exists(from))
            {
                if (File.Exists(to))
                {
                    return;
                }

                throw new FileNotFoundException("Source file not found", from);
            }

            if (File.Exists(to))
            {
                File.Delete(to);
            }

            File.Move(from, to);
            AppendLog("[OK] " + (activate ? "Enabled " : "Disabled ") + kind + ": " + file);
            UpdateStatus((activate ? "Enabled " : "Disabled ") + kind + ": " + file);
        }
        catch (Exception ex)
        {
            AppendLog("[ERROR] Could not toggle " + kind + " " + file + ": " + ex.Message);
            UpdateStatus("Toggle failed");
            ReloadLists();
        }
    }

    private void LaunchHidden()
    {
        if (_launcherProcess != null && !_launcherProcess.HasExited)
        {
            UpdateStatus("Launcher is already running");
            return;
        }

        if (!File.Exists(_batchPath))
        {
            MessageBox.Show(this, "start.bat not found in:\n" + _baseDir, "SaladPatch", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        SaveSettingsFromUi();
        _logBox.Clear();
        TryDeletePidFile();

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c \"\"" + _batchPath + "\"\"",
                WorkingDirectory = _baseDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            psi.EnvironmentVariables["SALAD_DEBUG_PORT"] = ((int)_portInput.Value).ToString();
            psi.EnvironmentVariables["LAUNCHER_NO_PAUSE"] = "1";
            psi.EnvironmentVariables["AUTO_CONTINUE_ON_UPDATE"] = "1";
            psi.EnvironmentVariables["SALAD_PID_FILE"] = _saladPidPath;

            _launcherProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
            _launcherProcess.OutputDataReceived += (_, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                {
                    AppendLog(args.Data);
                }
            };
            _launcherProcess.ErrorDataReceived += (_, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                {
                    AppendLog("[stderr] " + args.Data);
                }
            };
            _launcherProcess.Exited += (_, __) =>
            {
                BeginInvoke((Action)(() =>
                {
                    int code = 0;
                    try
                    {
                        code = _launcherProcess.ExitCode;
                    }
                    catch
                    {
                    }

                    _launchButton.Enabled = true;
                    _stopButton.Enabled = false;
                    UpdateStatus("Launcher exited (code " + code + ")");
                }));
            };

            if (!_launcherProcess.Start())
            {
                throw new InvalidOperationException("Failed to start launcher process");
            }

            _launcherProcess.BeginOutputReadLine();
            _launcherProcess.BeginErrorReadLine();
            _launchButton.Enabled = false;
            _stopButton.Enabled = true;
            UpdateStatus("Launching Salad...");
            AppendLog("[INFO] Launcher started in hidden mode.");
        }
        catch (Exception ex)
        {
            UpdateStatus("Launch failed");
            AppendLog("[ERROR] " + ex.Message);
            MessageBox.Show(this, ex.Message, "SaladPatch", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void StopLaunch()
    {
        try
        {
            if (_launcherProcess != null && !_launcherProcess.HasExited)
            {
                _launcherProcess.Kill();
                AppendLog("[INFO] Launcher process terminated.");
            }
        }
        catch (Exception ex)
        {
            AppendLog("[ERROR] Could not stop launcher: " + ex.Message);
        }
        finally
        {
            TryStopTrackedSaladProcess();
            _launchButton.Enabled = true;
            _stopButton.Enabled = false;
            UpdateStatus("Stopped");
        }
    }

    private void TryDeletePidFile()
    {
        try
        {
            if (File.Exists(_saladPidPath))
            {
                File.Delete(_saladPidPath);
            }
        }
        catch
        {
        }
    }

    private void TryStopTrackedSaladProcess()
    {
        try
        {
            if (!File.Exists(_saladPidPath))
            {
                return;
            }

            string text = File.ReadAllText(_saladPidPath).Trim();
            int pid;
            if (!int.TryParse(text, out pid))
            {
                TryDeletePidFile();
                return;
            }

            try
            {
                Process salad = Process.GetProcessById(pid);
                if (!salad.HasExited)
                {
                    salad.Kill();
                    AppendLog("[INFO] Closed tracked Salad process (PID " + pid + ").");
                }
            }
            catch
            {
            }

            TryDeletePidFile();
        }
        catch (Exception ex)
        {
            AppendLog("[WARN] Could not close tracked Salad process: " + ex.Message);
        }
    }

    private void UpdateStatus(string message)
    {
        _statusLabel.Text = message;
    }

    private void AppendLog(string message)
    {
        if (InvokeRequired)
        {
            BeginInvoke((Action<string>)AppendLog, message);
            return;
        }

        _logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + Environment.NewLine);
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        StopLaunch();
        base.OnFormClosed(e);
    }
}
