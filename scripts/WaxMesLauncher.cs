using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Windows.Forms;

internal static class WaxMesLauncher
{
    [STAThread]
    private static void Main(string[] args)
    {
        var launcherDir = AppDomain.CurrentDomain.BaseDirectory;
        var target = Path.Combine(launcherDir, "win-unpacked", "WaxMes.exe");

        if (!File.Exists(target))
        {
            MessageBox.Show(
                "WaxMes uygulama dosyasi bulunamadi:\n" + target,
                "WaxMes",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return;
        }

        var startInfo = new ProcessStartInfo(target)
        {
            WorkingDirectory = Path.GetDirectoryName(target),
            UseShellExecute = false,
            Arguments = string.Join(" ", args.Select(QuoteArgument).ToArray())
        };

        Process.Start(startInfo);
    }

    private static string QuoteArgument(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "\"\"";
        }

        if (value.IndexOfAny(new[] { ' ', '\t', '"' }) < 0)
        {
            return value;
        }

        return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }
}
