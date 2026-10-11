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

$global:lastActiveSession = $null
$global:lastAppId = $null
$global:noMediaCount = 0

function Get-ResolvedSession {
    # 1. Check GetCurrentSession()
    try {
        $cur = $global:manager.GetCurrentSession()
        if ($cur) {
            $props = Await ($cur.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            if ($props -and -not [string]::IsNullOrWhiteSpace($props.Title)) {
                $global:lastActiveSession = $cur
                $global:lastAppId = $cur.SourceAppId
                return @{ session = $cur; props = $props }
            }
        }
    } catch {}

    # 2. If GetCurrentSession() is null or returned empty title (common Windows bug when paused for a while),
    # search all registered sessions in GetSessions()
    try {
        $sessions = $global:manager.GetSessions()
        if ($sessions -and $sessions.Count -gt 0) {
            $playingCandidate = $null
            $playingProps = $null
            $lastAppCandidate = $null
            $lastAppProps = $null
            $pausedCandidate = $null
            $pausedProps = $null

            foreach ($s in $sessions) {
                try {
                    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                    if ($props -and -not [string]::IsNullOrWhiteSpace($props.Title)) {
                        $pInfo = $s.GetPlaybackInfo()
                        $stat = if ($pInfo) { $pInfo.PlaybackStatus.ToString() } else { "Unknown" }

                        if ($stat -eq "Playing") {
                            $playingCandidate = $s
                            $playingProps = $props
                            break # Found actively playing session, prioritize immediately
                        } elseif ($global:lastAppId -and $s.SourceAppId -eq $global:lastAppId -and -not $lastAppCandidate) {
                            $lastAppCandidate = $s
                            $lastAppProps = $props
                        } elseif (-not $pausedCandidate) {
                            $pausedCandidate = $s
                            $pausedProps = $props
                        }
                    }
                } catch {}
            }

            if ($playingCandidate) {
                $global:lastActiveSession = $playingCandidate
                $global:lastAppId = $playingCandidate.SourceAppId
                return @{ session = $playingCandidate; props = $playingProps }
            }
            if ($lastAppCandidate) {
                $global:lastActiveSession = $lastAppCandidate
                return @{ session = $lastAppCandidate; props = $lastAppProps }
            }
            if ($pausedCandidate) {
                $global:lastActiveSession = $pausedCandidate
                $global:lastAppId = $pausedCandidate.SourceAppId
                return @{ session = $pausedCandidate; props = $pausedProps }
            }
        }
    } catch {}

    # 3. If nothing found across several poll cycles, refresh the WinRT session manager cache
    $global:noMediaCount++
    if ($global:noMediaCount -ge 15) {
        $global:noMediaCount = 0
        try {
            $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
            $global:manager = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
        } catch {}
    }

    return $null
}

while ($true) {
    # Process queued commands on the main thread where $global:manager exists
    $pendingCmd = $null
    while ($pendingCmd = [CommandBridge]::GetNextCommand()) {
        if ($pendingCmd -eq "exit") { [System.Environment]::Exit(0) }
        $handled = $false
        try {
            $targetSession = $global:lastActiveSession
            if (-not $targetSession) {
                $resolved = Get-ResolvedSession
                if ($resolved) { $targetSession = $resolved.session }
            }
            if (-not $targetSession) {
                $targetSession = $global:manager.GetCurrentSession()
            }
            if ($targetSession) {
                if ($pendingCmd -eq "play_pause") {
                    $op = $targetSession.TryTogglePlayPauseAsync()
                    $handled = [bool](Await $op ([bool]))
                    Start-Sleep -Milliseconds 120
                } elseif ($pendingCmd -eq "next") {
                    $op = $targetSession.TrySkipNextAsync()
                    $handled = [bool](Await $op ([bool]))
                } elseif ($pendingCmd -eq "prev") {
                    $op = $targetSession.TrySkipPreviousAsync()
                    $handled = [bool](Await $op ([bool]))
                } elseif ($pendingCmd -match '^seek:?([0-9\.]+)') {
                    $seekSec = [double]$matches[1]
                    $ticks = [long]($seekSec * 10000000)
                    $op = $targetSession.TryChangePlaybackPositionAsync($ticks)
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
        $resolved = Get-ResolvedSession
        if ($resolved) {
            $global:noMediaCount = 0
            $session = $resolved.session
            $props = $resolved.props
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
