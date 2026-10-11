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

[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
$global:asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | ? { $_.Name -eq 'AsStream' -and $_.GetParameters().Count -eq 1 }
$global:tempThumbFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "overLy_smtc_thumb.jpg")
$global:lastThumbFile = ""
$global:lastManagerRefresh = $null

[Console]::Out.WriteLine("READY")
[Console]::Out.Flush()

$lastJson = ""

$global:lastActiveSession = $null
$global:lastAppId = $null
$global:noMediaCount = 0

function Get-ResolvedSession {
    # 0. Periodically refresh the WinRT session manager so new/closed sessions and track switches are never missed
    $now = [DateTimeOffset]::UtcNow
    if (-not $global:lastManagerRefresh -or ($now - $global:lastManagerRefresh).TotalSeconds -ge 1.5) {
        $global:lastManagerRefresh = $now
        try {
            $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
            $freshMgr = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
            if ($freshMgr) {
                $global:manager = $freshMgr
            }
        } catch {}
    }

    # 1. ALWAYS search all sessions first to find an actively PLAYING session!
    # In Windows, GetCurrentSession() frequently remains stuck on an old paused/idle app
    # while Spotify or another media player is actively playing in GetSessions().
    $playingCandidate = $null
    $playingProps = $null
    $lastAppCandidate = $null
    $lastAppProps = $null
    $pausedCandidate = $null
    $pausedProps = $null

    try {
        $sessions = $global:manager.GetSessions()
        if ($sessions -and $sessions.Count -gt 0) {
            foreach ($s in $sessions) {
                try {
                    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                    if ($props -and -not [string]::IsNullOrWhiteSpace($props.Title)) {
                        $pInfo = $s.GetPlaybackInfo()
                        $stat = if ($pInfo) { $pInfo.PlaybackStatus.ToString() } else { "Unknown" }

                        if ($stat -eq "Playing") {
                            $playingCandidate = $s
                            $playingProps = $props
                            break # Found actively playing session, prioritize immediately!
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
        }
    } catch {}

    # 2. If no actively playing session, check GetCurrentSession()
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

    # 3. Fallbacks from registered sessions
    if ($lastAppCandidate) {
        $global:lastActiveSession = $lastAppCandidate
        return @{ session = $lastAppCandidate; props = $lastAppProps }
    }
    if ($pausedCandidate) {
        $global:lastActiveSession = $pausedCandidate
        $global:lastAppId = $pausedCandidate.SourceAppId
        return @{ session = $pausedCandidate; props = $pausedProps }
    }

    return $null
}

while ($true) {
    # Process queued commands on the main thread where $global:manager exists
    $pendingCmd = $null
    while ($pendingCmd = [CommandBridge]::GetNextCommand()) {
        if ($pendingCmd -eq "exit") { [System.Environment]::Exit(0) }
        if ($pendingCmd -eq "refresh") {
            $global:lastManagerRefresh = [DateTime]::MinValue
            $global:lastRawTrackKey = ""
            $global:lastSentJson = ""
            continue
        }
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

            $trackKey = "$($props.Artist):::$($props.Title)"
            $isTrackChanged = ($global:lastTrackKey -and $trackKey -ne $global:lastTrackKey)
            if ($trackKey -ne $global:lastTrackKey) {
                $global:lastTrackKey = $trackKey
                $global:trackChangeUtc = [DateTimeOffset]::UtcNow
            }

            $pos = 0.0
            $dur = 0.0
            if ($timeline) {
                $rawPos = [Math]::Round($timeline.Position.TotalSeconds, 2)
                $dur = [Math]::Round($timeline.EndTime.TotalSeconds, 2)

                # If track just switched and WinRT still returns the previous song's high position, reset to 0.0
                if ($isTrackChanged -and $rawPos -gt 3.5) {
                    $rawPos = 0.0
                }

                $pos = $rawPos
                if ($status -eq "Playing" -and $timeline.LastUpdatedTime -and $timeline.LastUpdatedTime.Year -gt 2000) {
                    $timeDiff = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
                    
                    # Prevent stale LastUpdatedTime from creating false forward jumps at track start:
                    # When position is near 0s (< 2.0s), timeDiff cannot realistically exceed 1.5s
                    if ($rawPos -lt 2.0 -and $timeDiff -gt 1.5) {
                        $timeDiff = [Math]::Min($timeDiff, 0.8)
                    }

                    if ($timeDiff -gt 0 -and $timeDiff -lt 180) {
                        $interpolatedPos = $rawPos + $timeDiff
                        if ($dur -gt 0) {
                            $pos = [Math]::Round([Math]::Min($dur, $interpolatedPos), 2)
                        } else {
                            $pos = [Math]::Round($interpolatedPos, 2)
                        }
                    }
                }
            }

            $thumbFileAvailable = $null

            if ($props.Thumbnail -and ($trackKey -ne $global:lastThumbTrack -or (-not (Test-Path $global:lastThumbFile)))) {
                try {
                    $safeHash = [Math]::Abs($trackKey.GetHashCode())
                    $targetThumb = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "overLy_thumb_$safeHash.jpg")
                    $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
                    if ($stream -and $stream.Size -gt 0 -and $global:asStreamMethod) {
                        $netStream = $global:asStreamMethod.Invoke($null, @($stream))
                        $fileStream = [System.IO.File]::Create($targetThumb)
                        $netStream.CopyTo($fileStream)
                        $fileStream.Dispose()
                        $netStream.Dispose()
                        if ($global:lastThumbFile -and $global:lastThumbFile -ne $targetThumb -and (Test-Path $global:lastThumbFile)) {
                            try { Remove-Item -Force $global:lastThumbFile } catch {}
                        }
                        $global:lastThumbFile = $targetThumb
                        $global:lastThumbTrack = $trackKey
                    }
                } catch {}
            } elseif ($trackKey -ne $global:lastThumbTrack) {
                # New track without native thumbnail - reset tracking so old thumb is not reused
                $global:lastThumbTrack = $trackKey
                if ($global:lastThumbFile -and (Test-Path $global:lastThumbFile)) {
                    try { Remove-Item -Force $global:lastThumbFile } catch {}
                }
                $global:lastThumbFile = ""
            }

            if ($global:lastThumbTrack -eq $trackKey -and $global:lastThumbFile -and (Test-Path $global:lastThumbFile)) {
                $thumbFileAvailable = $global:lastThumbFile
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
                thumbnailPath = $thumbFileAvailable
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
