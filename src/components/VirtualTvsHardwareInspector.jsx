import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  Copy, 
  Play, 
  Volume2, 
  ShieldCheck, 
  Terminal, 
  Layers, 
  Check,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { generateTvsEscPosStream, formatTvsBillLines, ESC_P } from '../utils/tvsPrinterEngine';

/**
 * Virtual TVS Control Hardware Inspector
 * Analyzes the raw 9-pin dot-matrix ESC/P stream for TVS MSP 250 Star:
 * - Half-Sheet Continuous Tractor Paper verification (33 lines, 8.5" x 5.5")
 * - ESC/P Control Sequences: ESC @ (reset), ESC 2 (6 LPI), ESC C 33 (page length), FF (0x0C tear-off advance)
 * - Virtual Tractor-feed perforation paper rendering with sprocket holes
 * - Synthesized Audio/Visual Print Simulation (Web Audio 9-pin needle head buzz)
 * - Raw Hex stream inspector and one-click .PRN download for physical hardware testing
 */
export default function VirtualTvsHardwareInspector({ billData, onAfterSimulatePrint }) {
  const [activeTab, setActiveTab] = useState('paper'); // 'paper' | 'hex' | 'setup'
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLine, setSimulatedLine] = useState(0);
  const audioCtxRef = useRef(null);

  // Generate formatted lines (exactly 33 lines) and raw ESC/P byte buffer
  const formattedLines = useMemo(() => {
    return formatTvsBillLines(billData);
  }, [billData]);

  const rawStream = useMemo(() => {
    return generateTvsEscPosStream(billData);
  }, [billData]);

  // Hardware protocol checks
  const protocolChecks = useMemo(() => {
    if (!rawStream || rawStream.length === 0) return [];
    
    // Check for ESC @ (0x1B, 0x40)
    const hasEscInit = rawStream[0] === 0x1B && rawStream[1] === 0x40;
    
    // Check for ESC 2 (0x1B, 0x32)
    const hasEsc2 = rawStream.some((b, i) => b === 0x1B && rawStream[i + 1] === 0x32);
    
    // Check for ESC C 33 (0x1B, 0x43, 0x21)
    const hasPageLen33 = rawStream.some((b, i) => b === 0x1B && rawStream[i + 1] === 0x43 && rawStream[i + 2] === 33);
    
    // Check for Form Feed FF (0x0C)
    const hasFormFeed = rawStream.includes(0x0C);
    
    // Line count check
    const exact33Lines = formattedLines.length === 33;

    return [
      {
        id: 'esc-init',
        name: 'ESC @ (1B 40)',
        description: 'Initialize Printer / Clear Buffer',
        status: hasEscInit ? 'PASS' : 'FAIL',
        detail: hasEscInit ? 'Present at byte 0' : 'Missing hardware reset'
      },
      {
        id: 'esc-6lpi',
        name: 'ESC 2 (1B 32)',
        description: 'Set Standard 6 LPI Line Spacing',
        status: hasEsc2 ? 'PASS' : 'FAIL',
        detail: hasEsc2 ? 'Verified (6 lines/inch pitch)' : 'Missing 6 LPI pitch'
      },
      {
        id: 'esc-c33',
        name: 'ESC C 33 (1B 43 21)',
        description: 'Page Length 33 Lines (5.5" Half-Sheet)',
        status: hasPageLen33 ? 'PASS' : 'FAIL',
        detail: hasPageLen33 ? 'Verified 33-line fanfold boundary' : 'Missing 33-line page length'
      },
      {
        id: 'lines-count',
        name: 'Invoice Line Count',
        description: 'Exactly 33 Formatted Lines',
        status: exact33Lines ? 'PASS' : 'FAIL',
        detail: `${formattedLines.length} / 33 lines formatted`
      },
      {
        id: 'form-feed',
        name: 'Form Feed (0x0C)',
        description: 'Advance to Perforation Tear-Off Bar',
        status: hasFormFeed ? 'PASS' : 'WARN',
        detail: hasFormFeed ? 'Verified tear-off parking advance' : 'Tear-off requires manual feed'
      }
    ];
  }, [rawStream, formattedLines]);

  // Hex dump formatting
  const hexDump = useMemo(() => {
    if (!rawStream) return '';
    const lines = [];
    const bytesPerLine = 16;
    for (let i = 0; i < rawStream.length; i += bytesPerLine) {
      const chunk = rawStream.slice(i, i + bytesPerLine);
      const offset = i.toString(16).padStart(4, '0').toUpperCase();
      const hexParts = [];
      let ascii = '';
      for (let j = 0; j < bytesPerLine; j++) {
        if (j < chunk.length) {
          const byte = chunk[j];
          hexParts.push(byte.toString(16).padStart(2, '0').toUpperCase());
          ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
      }
      lines.push(`${offset}  ${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8).join(' ')}  |${ascii}|`);
    }
    return lines.join('\n');
  }, [rawStream]);

  // Copy raw hex stream
  const handleCopyHex = () => {
    if (!rawStream) return;
    const hex = Array.from(rawStream).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download raw .PRN binary stream for physical printer testing
  const handleDownloadPrn = () => {
    if (!rawStream) return;
    try {
      const blob = new Blob([rawStream], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TVS_BILL_${billData?.billNo || '000001'}.prn`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download .PRN', e);
    }
  };

  // Web Audio 9-Pin Needle Head & Stepper Motor Buzz Synthesizer
  const playDotMatrixAudioBurst = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Square wave with modulated frequency replicates 9-pin needle solenoid strike
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) {}
  };

  // Simulate print run without physical hardware
  const handleSimulatePrint = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedLine(0);

    let cur = 0;
    const interval = setInterval(() => {
      cur++;
      setSimulatedLine(cur);
      playDotMatrixAudioBurst();

      if (cur >= 33) {
        clearInterval(interval);
        setTimeout(() => {
          setIsSimulating(false);
          if (onAfterSimulatePrint) {
            onAfterSimulatePrint();
          }
        }, 400);
      }
    }, 45); // ~1.5 seconds for 33 lines, matching TVS MSP 250 250 CPS speed!
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-100 font-sans">
      {/* Top Telemetry Header */}
      <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-sky-950/80 border border-sky-800/80 rounded-lg text-sky-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-white tracking-wide">
                TVS MSP 250 STAR ESC/P HARDWARE INSPECTOR
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE VIRTUAL SPOOLER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous Fanfold Half-Sheet (8.5" × 5.5") • 9-Pin Tractor Feed • 80 Columns
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSimulatePrint}
            disabled={isSimulating}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
              isSimulating
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
            }`}
            title="Simulate print head movement and needle audio buzz without physical printer"
          >
            {isSimulating ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Printing Line {simulatedLine}/33...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Simulate Print & Audio Buzz</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPrn}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
            title="Download raw binary .PRN file to test directly with Windows copy /b command"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download .PRN File</span>
          </button>
        </div>
      </div>

      {/* Protocol Compliance Badges */}
      <div className="bg-slate-950/60 px-5 py-3 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {protocolChecks.map((check) => (
          <div 
            key={check.id}
            className={`p-2 rounded-lg border flex flex-col justify-between ${
              check.status === 'PASS' 
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[11px] truncate">{check.name}</span>
              {check.status === 'PASS' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate" title={check.description}>
              {check.description}
            </div>
          </div>
        ))}
      </div>

      {/* View Switcher Tabs */}
      <div className="bg-slate-950/40 px-5 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('paper')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'paper' 
                ? 'bg-sky-600 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tractor Fanfold Paper View (33 Lines)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hex')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'hex' 
                ? 'bg-sky-600 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Raw ESC/P Hex Stream ({rawStream.length} Bytes)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'setup' 
                ? 'bg-sky-600 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Instant Zero-Popup Driver Setup</span>
          </button>
        </div>

        {activeTab === 'hex' && (
          <button
            type="button"
            onClick={handleCopyHex}
            className="px-2.5 py-1 text-xs font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied Hex' : 'Copy Hex'}</span>
          </button>
        )}
      </div>

      {/* Main Body Content */}
      <div className="p-5 max-h-[520px] overflow-y-auto">
        {/* TAB 1: Tractor Fanfold Paper Visualizer */}
        {activeTab === 'paper' && (
          <div className="relative mx-auto max-w-3xl bg-[#fdfaf0] text-slate-900 rounded-sm shadow-xl p-6 font-mono text-[11px] leading-relaxed border-x-8 border-[#ede5d0]">
            {/* Left Tractor Sprocket Feed Holes Simulation */}
            <div className="absolute left-[-24px] top-0 bottom-0 flex flex-col justify-around py-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`l-sprocket-${i}`} className="w-3.5 h-3.5 rounded-full bg-slate-800 border-2 border-slate-600 shadow-inner" />
              ))}
            </div>

            {/* Right Tractor Sprocket Feed Holes Simulation */}
            <div className="absolute right-[-24px] top-0 bottom-0 flex flex-col justify-around py-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`r-sprocket-${i}`} className="w-3.5 h-3.5 rounded-full bg-slate-800 border-2 border-slate-600 shadow-inner" />
              ))}
            </div>

            {/* Invoice Line-by-Line Rendering (Exactly 33 lines) */}
            <div className="divide-y divide-slate-100">
              {formattedLines.map((line, idx) => {
                const lineNo = idx + 1;
                const isCurrentSimLine = isSimulating && simulatedLine === lineNo;
                const hasPrinted = isSimulating && simulatedLine >= lineNo;
                const isTearOffLine = lineNo === 33;

                return (
                  <div 
                    key={`line-${idx}`} 
                    className={`flex items-center px-1 font-mono transition-colors ${
                      isCurrentSimLine 
                        ? 'bg-amber-200/80 font-black' 
                        : isTearOffLine 
                          ? 'bg-rose-50 font-bold' 
                          : 'hover:bg-slate-100/60'
                    }`}
                  >
                    {/* Line Index Margin */}
                    <span className="w-8 shrink-0 select-none text-[9px] font-bold text-slate-400 font-mono">
                      {String(lineNo).padStart(2, '0')}
                    </span>

                    {/* Character Output */}
                    <pre className={`flex-1 whitespace-pre m-0 py-0.5 tracking-tight ${
                      isCurrentSimLine ? 'text-amber-950 font-black' : 'text-slate-900'
                    }`}>
                      {line}
                    </pre>

                    {/* Active Print Head Indicator during simulation */}
                    {isCurrentSimLine && (
                      <span className="shrink-0 px-1.5 py-0.2 bg-amber-600 text-white font-sans text-[8px] font-black rounded uppercase tracking-wider animate-pulse">
                        HEAD STRIKE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Red Dotted Tear-Off Perforation Bar Guide */}
            <div className="mt-4 pt-2 border-t-2 border-dashed border-rose-400 flex items-center justify-between text-[10px] text-rose-700 font-bold select-none">
              <span className="flex items-center space-x-1">
                <span>✂ - - - - - - - - - -</span>
                <span>TVS MSP 250 TEAR-OFF PERFORATION BAR (LINE 33 STOP)</span>
                <span>- - - - - - - - - - ✂</span>
              </span>
              <span className="px-1.5 py-0.5 bg-rose-100 border border-rose-300 rounded text-[9px]">
                PAGE LENGTH 5.5" EXACT
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: Raw Hex Stream Inspector */}
        {activeTab === 'hex' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
              <div className="text-slate-400 mb-2 font-sans font-bold flex items-center justify-between">
                <span>Raw Binary Byte Stream (ESC/P Standard)</span>
                <span className="text-sky-400">{rawStream.length} Total Bytes</span>
              </div>
              <pre className="text-[11px] leading-relaxed overflow-x-auto p-2 bg-slate-900/90 rounded border border-slate-800 text-emerald-400">
                {hexDump}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: Instant Zero-Popup Setup Instructions */}
        {activeTab === 'setup' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-w-2xl mx-auto">
            <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>How to eliminate print dialog popups once and for all:</span>
              </h4>
              <p className="text-slate-300">
                In retail pharmacy counters, cashiers should never see a Windows Print Preview dialog or click "Print" twice. Here are the two permanent industry solutions:
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h5 className="font-bold text-white text-xs flex items-center space-x-1.5">
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono text-[10px]">OPTION 1</span>
                <span>Chrome / Edge Silent POS Flag (Recommended - Zero Configuration)</span>
              </h5>
              <p className="text-slate-400 text-xs">
                Launch your desktop Chrome shortcut with the <code className="text-emerald-400 font-mono font-bold">--kiosk-printing</code> flag. Chrome bypasses the print dialog completely and sends the bill directly to the TVS printer the instant you press Enter or F10!
              </p>
              <pre className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-400 border border-slate-800">
                chrome.exe --kiosk-printing http://localhost:3000
              </pre>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h5 className="font-bold text-white text-xs flex items-center space-x-1.5">
                <span className="px-1.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-800 rounded font-mono text-[10px]">OPTION 2</span>
                <span>Direct Raw Spool via Windows Command (.PRN)</span>
              </h5>
              <p className="text-slate-400 text-xs">
                You can send the downloaded <code className="text-sky-400 font-mono">.prn</code> file directly to the printer port without any Windows driver re-formatting:
              </p>
              <pre className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-sky-400 border border-slate-800">
                copy /b TVS_BILL_000001.prn \\localhost\TVS_MSP250
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          <span>Target Paper: </span>
          <span className="font-bold text-slate-200">Continuous Fanfold 8.5" × 5.5" (33 Lines / 0.5 Form)</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>TVS Print Pitch: <strong className="text-slate-200">10 CPI Draft</strong></span>
          <span>Feed: <strong className="text-emerald-400">Tear-Off Auto-Stop</strong></span>
        </div>
      </div>
    </div>
  );
}
