# SalahTrack — Zero-Dependency Local TCP Server for Windows PowerShell
$port = 8085
$folder = $PSScriptRoot

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()

Write-Host "SalahTrack server active at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop."

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".svg"  = "image/svg+xml"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $writer = [System.IO.StreamWriter]::new($stream)
        $writer.AutoFlush = $true

        $requestLine = $reader.ReadLine()
        if ($requestLine) {
            # Drain remaining header lines
            while ($true) {
                $hdr = $reader.ReadLine()
                if ([string]::IsNullOrWhiteSpace($hdr)) { break }
            }
            $tokens = $requestLine.Split(' ')
            $path = if ($tokens.Length -gt 1) { $tokens[1].TrimStart('/') } else { "" }
            if ([string]::IsNullOrEmpty($path) -or $path -eq "") { $path = "index.html" }
            $cleanPath = $path.Split('?')[0]
            $localFile = Join-Path $folder $cleanPath

            if (Test-Path $localFile -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
                $ctype = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "text/plain" }
                $bytes = [System.IO.File]::ReadAllBytes($localFile)

                $writer.WriteLine("HTTP/1.1 200 OK")
                $writer.WriteLine("Content-Type: $ctype")
                $writer.WriteLine("Content-Length: $($bytes.Length)")
                $writer.WriteLine("Connection: close")
                $writer.WriteLine()
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $writer.WriteLine("HTTP/1.1 404 Not Found")
                $writer.WriteLine("Content-Length: $($notFound.Length)")
                $writer.WriteLine("Connection: close")
                $writer.WriteLine()
                $stream.Write($notFound, 0, $notFound.Length)
            }
        }
        $client.Close()
    }
} finally {
    $listener.Stop()
}
