[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($winRtOp, $ResultType) {
    $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($winRtOp))
    $task.Wait()
    return $task.Result
}

# Native hardware media keys & command bridge
$bridgeSource = @"
using System;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;

public class CommandBridge {
    public static ConcurrentQueue<string> Queue = new ConcurrentQueue<string>();
    static CommandBridge() {
        System.Threading.ThreadPool.QueueUserWorkItem(_ => {
            try {
                string line;
                while ((line = Console.ReadLine()) != null) {
                    if (!string.IsNullOrWhiteSpace(line)) {
                        Queue.Enqueue(line.Trim().ToLowerInvariant());
                    }
                }
            } catch {}
        });
    }
    public static string GetNextCommand() {
        string cmd;
        if (Queue.TryDequeue(out cmd)) return cmd;
        return null;
    }
}

public class HardwareMediaKeys {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void PlayPause() {
        keybd_event(0xB3, 0, 0, UIntPtr.Zero);
        keybd_event(0xB3, 0, 2, UIntPtr.Zero);
    }
    public static void Next() {
        keybd_event(0xB0, 0, 0, UIntPtr.Zero);
        keybd_event(0xB0, 0, 2, UIntPtr.Zero);
    }
    public static void Prev() {
        keybd_event(0xB1, 0, 0, UIntPtr.Zero);
        keybd_event(0xB1, 0, 2, UIntPtr.Zero);
    }
}
"@
try {
    Add-Type -TypeDefinition $bridgeSource
} catch {}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime] | Out-Null
$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$global:manager = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

[Console]::Out.WriteLine("READY")
[Console]::Out.Flush()

$lastJson = ""

while ($true) {
    # Process queued commands on the main thread where $global:manager exists
    $pendingCmd = $null
    while ($pendingCmd = [CommandBridge]::GetNextCommand()) {
        if ($pendingCmd -eq "exit") { [System.Environment]::Exit(0) }
        $handled = $false
        try {
            $session = $global:manager.GetCurrentSession()
            if ($session) {
                if ($pendingCmd -eq "play_pause") {
                    $op = $session.TryTogglePlayPauseAsync()
                    $handled = [bool](Await $op ([bool]))
                } elseif ($pendingCmd -eq "next") {
                    $op = $session.TrySkipNextAsync()
                    $handled = [bool](Await $op ([bool]))
                } elseif ($pendingCmd -eq "prev") {
                    $op = $session.TrySkipPreviousAsync()
                    $handled = [bool](Await $op ([bool]))
                } elseif ($pendingCmd -match '^seek:?([0-9\.]+)') {
                    $seekSec = [double]$matches[1]
                    $ticks = [long]($seekSec * 10000000)
                    $op = $session.TryChangePlaybackPositionAsync($ticks)
                    $handled = [bool](Await $op ([bool]))
                }
            }
        } catch {}

        # If SMTC didn't handle or no session, fallback to native Windows Hardware Media Keys
        if (-not $handled) {
            try {
                if ($pendingCmd -eq "play_pause") { [HardwareMediaKeys]::PlayPause() }
                elseif ($pendingCmd -eq "next") { [HardwareMediaKeys]::Next() }
                elseif ($pendingCmd -eq "prev") { [HardwareMediaKeys]::Prev() }
            } catch {}
        }
    }
    try {
        $session = $global:manager.GetCurrentSession()
        if ($session) {
            $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $timeline = $session.GetTimelineProperties()
            $info = $session.GetPlaybackInfo()
            
            $status = "Unknown"
            if ($info) {
                $status = $info.PlaybackStatus.ToString()
            }

            $pos = 0.0
            $dur = 0.0
            if ($timeline) {
                $pos = [Math]::Round($timeline.Position.TotalSeconds, 2)
                $dur = [Math]::Round($timeline.EndTime.TotalSeconds, 2)
                if ($status -eq "Playing" -and $timeline.LastUpdatedTime -and $timeline.LastUpdatedTime.Year -gt 2000) {
                    $timeDiff = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
                    if ($timeDiff -gt 0 -and $timeDiff -lt 180) {
                        $interpolatedPos = $timeline.Position.TotalSeconds + $timeDiff
                        if ($dur -gt 0) {
                            $pos = [Math]::Round([Math]::Min($dur, $interpolatedPos), 2)
                        } else {
                            $pos = [Math]::Round($interpolatedPos, 2)
                        }
                    }
                }
            }

            $res = @{
                hasMedia = $true
                app = $session.SourceAppId
                title = $props.Title
                artist = $props.Artist
                album = $props.AlbumTitle
                position = $pos
                duration = $dur
                status = $status
            }
            $json = ConvertTo-Json -InputObject $res -Compress
            [Console]::Out.WriteLine("DATA:$json")
            [Console]::Out.Flush()
        } else {
            [Console]::Out.WriteLine('DATA:{"hasMedia":false}')
            [Console]::Out.Flush()
        }
    } catch {
        $errMsg = $_.Exception.Message -replace "`r|`n", " "
        [Console]::Out.WriteLine("ERR:$errMsg")
        [Console]::Out.Flush()
    }

    Start-Sleep -Milliseconds 200
}
