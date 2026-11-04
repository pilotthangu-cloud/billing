param(
    [Parameter(Mandatory=$false)]
    [string]$PrinterName = "TVS",

    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

try {
    # 1. Resolve exact target printer
    $allPrinters = Get-CimInstance Win32_Printer
    $target = $null

    if ($PrinterName) {
        $target = $allPrinters | Where-Object { $_.Name -like "*$PrinterName*" } | Select-Object -First 1
    }
    if (-not $target) {
        $target = $allPrinters | Where-Object { $_.Name -like "*TVS*" -or $_.Name -like "*MSP*" } | Select-Object -First 1
    }
    if (-not $target) {
        $target = $allPrinters | Where-Object { $_.Default -eq $true } | Select-Object -First 1
    }
    if (-not $target -and $allPrinters.Count -gt 0) {
        $target = $allPrinters[0]
    }

    if (-not $target) {
        Write-Output "ERROR: No printers installed on this system."
        exit 1
    }

    $actualPrinterName = $target.Name

    # 2. Compile Win32 winspool.drv RAW helper
    $code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Beta Pharmacy Receipt";
        di.pDataType = "RAW";
        bool success = false;

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    int dwWritten = 0;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return success;
    }
}
"@

    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

    if (-not (Test-Path $FilePath)) {
        Write-Output "ERROR: Spool file not found at $FilePath"
        exit 2
    }

    $rawBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $ok = [RawPrinterHelper]::SendBytesToPrinter($actualPrinterName, $rawBytes)

    if ($ok) {
        Write-Output "SUCCESS: Printed raw stream to [$actualPrinterName] ($($rawBytes.Length) bytes)"
        exit 0
    } else {
        Write-Output "ERROR: winspool.drv WritePrinter failed for [$actualPrinterName]"
        exit 3
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    exit 4
}
